import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(request) {
  try {
    const { text, fileName, chunkIndex, totalChunks } = await request.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEY is not set");
      return NextResponse.json({ entities: [], connections: [], error: "API key not configured" }, { status: 500 });
    }

    const truncatedText = text.slice(0, 12000);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 4000,
        system: `You are an expert entity and relationship extractor. Given document text, extract key people, organizations, locations, and concepts, along with relationships between them. Respond ONLY with valid JSON, no markdown backticks, no preamble. Use this exact schema:
{
  "entities": [
    { "id": "unique_id", "name": "Full Name", "type": "person|organization|location|concept|event|document", "description": "Brief description", "category": "primary|secondary" }
  ],
  "connections": [
    { "source": "entity_id_1", "target": "entity_id_2", "relationship": "description of relationship", "strength": 1-5 }
  ]
}
Limit to 15 entities and 25 connections. Use lowercase_underscore ids. Return ONLY the JSON object.`,
        messages: [
          {
            role: "user",
            content: `Extract entities and relationships from this document chunk (file: "${fileName}", chunk ${chunkIndex + 1}/${totalChunks}):\n\n${truncatedText}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Anthropic API error (${response.status}):`, errorBody.slice(0, 300));
      return NextResponse.json({ entities: [], connections: [], error: `API error ${response.status}` }, { status: 500 });
    }

    const data = await response.json();

    if (data.error) {
      console.error("Anthropic error:", JSON.stringify(data.error));
      return NextResponse.json({ entities: [], connections: [], error: data.error.message }, { status: 500 });
    }

    const txt = data.content?.map((b) => b.text || "").join("") || "";
    if (!txt.trim()) {
      console.error("Empty response from API");
      return NextResponse.json({ entities: [], connections: [] }, { status: 500 });
    }

    const cleaned = txt.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

    try {
      const parsed = JSON.parse(cleaned);
      return NextResponse.json({ entities: parsed.entities || [], connections: parsed.connections || [] });
    } catch (parseErr) {
      console.error("JSON parse failed:", cleaned.slice(0, 300));
      return NextResponse.json({ entities: [], connections: [], error: "Parse failed" }, { status: 500 });
    }
  } catch (err) {
    console.error("Extraction error:", err.message);
    return NextResponse.json({ entities: [], connections: [], error: err.message }, { status: 500 });
  }
}