import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
    apiVersion: "2023-10-16",
  });
  try {
    const { customerId } = await request.json();

    if (!customerId) {
      return NextResponse.json({ error: "No customer ID provided" }, { status: 400 });
    }

    const origin = request.headers.get("origin") || "https://file-xplor.vercel.app";

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Portal error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
