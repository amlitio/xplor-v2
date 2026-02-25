import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
    apiVersion: "2023-10-16",
  });
  try {
    const { priceId, userId, userEmail, annual } = await request.json();

    const finalPriceId = priceId 
      || (annual ? process.env.STRIPE_PRO_ANNUAL_PRICE_ID : process.env.STRIPE_PRO_MONTHLY_PRICE_ID)
      || process.env.STRIPE_PRO_MONTHLY_PRICE_ID;

    if (!finalPriceId) {
      return NextResponse.json({ error: "No price ID configured" }, { status: 400 });
    }

    const origin = request.headers.get("origin") || "https://file-xplor.vercel.app";

    const sessionConfig = {
      payment_method_types: ["card"],
      line_items: [
        {
          price: finalPriceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?upgrade=cancelled`,
      metadata: {
        userId: userId || "",
      },
    };

    if (userEmail) {
      sessionConfig.customer_email = userEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
