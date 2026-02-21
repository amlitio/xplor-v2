import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(request) {
  try {
    const { context, messages } = await request.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    if (!messages || !messages.length) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 2000,
        system: context || "You are a helpful document analyst.",
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Chat API error ${response.status}: ${errorText}`);
      return NextResponse.json({ error: `API error: ${response.status}` }, { status: 500 });
    }

    const data = await response.json();
    const text = data.content?.map(b => b.text || "").join("") || "";

    return NextResponse.json({ response: text });
  } catch (err) {
    console.error("Chat error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
