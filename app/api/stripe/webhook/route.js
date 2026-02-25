import { NextResponse } from "next/server";
import Stripe from "stripe";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export async function POST(request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
    apiVersion: "2023-10-16",
  });

  // Initialize Firebase Admin (only once)
  if (!getApps().length) {
    initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }
  const db = getFirestore();
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  let event;

  try {
    if (process.env.STRIPE_WEBHOOK_SECRET) {
      event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } else {
      // In development without webhook secret, parse directly
      event = JSON.parse(body);
    }
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log(`Stripe webhook: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const customerEmail = session.customer_email || session.customer_details?.email;
        const customerId = session.customer;
        const subscriptionId = session.subscription;

        if (userId) {
          await db.collection("users").doc(userId).set({
            pro: true,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            email: customerEmail,
            upgradedAt: new Date().toISOString(),
          }, { merge: true });
          console.log(`User ${userId} upgraded to Pro`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const status = subscription.status;
        const customerId = subscription.customer;

        // Find user by Stripe customer ID
        const snapshot = await db.collection("users")
          .where("stripeCustomerId", "==", customerId)
          .limit(1)
          .get();

        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          await userDoc.ref.update({
            pro: status === "active" || status === "trialing",
            subscriptionStatus: status,
          });
          console.log(`Subscription ${status} for customer ${customerId}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        const snapshot = await db.collection("users")
          .where("stripeCustomerId", "==", customerId)
          .limit(1)
          .get();

        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          await userDoc.ref.update({
            pro: false,
            subscriptionStatus: "canceled",
            canceledAt: new Date().toISOString(),
          });
          console.log(`Subscription canceled for customer ${customerId}`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        const snapshot = await db.collection("users")
          .where("stripeCustomerId", "==", customerId)
          .limit(1)
          .get();

        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          await userDoc.ref.update({
            paymentFailed: true,
            lastPaymentFailure: new Date().toISOString(),
          });
          console.log(`Payment failed for customer ${customerId}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
