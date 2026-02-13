import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(request) {
  try {
    const { text, fileName, chunkIndex, totalChunks } = await request.json();

    if (!text || text.trim().length < 10) {
      console.error("Extract: Text too short or empty");
      return NextResponse.json({ entities: [], connections: [], error: "Text too short" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("Extract: ANTHROPIC_API_KEY is not set");
      return NextResponse.json({ entities: [], connections: [], error: "API key not configured" }, { status: 500 });
    }

    console.log(`Extract: Processing "${fileName}" chunk ${chunkIndex + 1}/${totalChunks} (${text.length} chars)`);

    // Truncate very long text
    const truncatedText = text.slice(0, 12000);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
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
Extract the most important entities with clear relationships. Limit to 20 entities and 30 connections per chunk. Use lowercase_underscore ids.`,
        messages: [
          {
            role: "user",
            content: `Extract entities and relationships from this document chunk (file: "${fileName}", chunk ${chunkIndex + 1}/${totalChunks}):\n\n${truncatedText}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Extract: Anthropic API error ${response.status}: ${errorText}`);
      return NextResponse.json(
        { entities: [], connections: [], error: `API error: ${response.status}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const txt = data.content?.map((b) => b.text || "").join("") || "";

    if (!txt) {
      console.error("Extract: Empty response from API");
      return NextResponse.json({ entities: [], connections: [], error: "Empty API response" }, { status: 500 });
    }

    // Clean markdown fences if present
    const cleaned = txt.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("Extract: JSON parse error:", parseErr.message, "Raw:", cleaned.slice(0, 200));
      return NextResponse.json({ entities: [], connections: [], error: "Failed to parse response" }, { status: 500 });
    }

    console.log(`Extract: Success - ${parsed.entities?.length || 0} entities, ${parsed.connections?.length || 0} connections`);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Extract: Unexpected error:", err.message, err.stack);
    return NextResponse.json({ entities: [], connections: [], error: err.message }, { status: 500 });
  }
}