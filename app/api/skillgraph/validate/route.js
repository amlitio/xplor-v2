// app/api/skillgraph/validate/route.js
// POST /api/skillgraph/validate
// Accepts a graph-core.md-compliant skill graph object and returns a full
// quality validation report per skill-graph-quality.md rubric.
// This is the server-side counterpart to the inline validation in SkillGraphUpload.
// Use it when you need: server-authoritative scores, rate-limited validation,
// or validation of graphs that were built server-side (e.g. from the CLI / MCP).

import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Rate limiting (in-memory, per IP — swap for Redis/Upstash in production)
// ---------------------------------------------------------------------------

const rateLimitMap = new Map(); // ip → { count, windowStart }
const RATE_LIMIT = 100;         // requests per window
const WINDOW_MS = 60 * 1000;    // 1 minute

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, windowStart: now };
  if (now - entry.windowStart > WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  rateLimitMap.set(ip, entry);
  return true;
}

// ---------------------------------------------------------------------------
// Slugify (mirrors client-side)
// ---------------------------------------------------------------------------

function slugify(str) {
  return String(str)
    .toLowerCase()
    .replace(/\.md$/i, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .trim();
}

// ---------------------------------------------------------------------------
// Cluster detection — union-find on undirected graph
// Returns array of arrays of node ids
// ---------------------------------------------------------------------------

function detectClusters(nodes, edges) {
  const parent = {};
  nodes.forEach((n) => (parent[n.id] = n.id));

  function find(x) {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }
  function union(a, b) {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }

  edges.forEach((e) => {
    if (parent[e.source] !== undefined && parent[e.target] !== undefined) {
      union(e.source, e.target);
    }
  });

  const clusters = {};
  nodes.forEach((n) => {
    const root = find(n.id);
    if (!clusters[root]) clusters[root] = [];
    clusters[root].push(n);
  });

  return Object.values(clusters).filter((c) => c.length > 1);
}

// ---------------------------------------------------------------------------
// Link density bonus
// ---------------------------------------------------------------------------

function linkDensityBonus(nodes, edges) {
  if (nodes.length === 0) return 0;
  const degrees = nodes.map((n) => {
    const inD = edges.filter((e) => e.target === n.id).length;
    const outD = edges.filter((e) => e.source === n.id).length;
    return inD + outD;
  });
  const deadEnds = degrees.filter((d) => d <= 1).length;
  const deadEndRatio = deadEnds / nodes.length;
  return {
    value: Math.round(Math.max(0, 10 * (1 - deadEndRatio * 2))),
    deadEnds,
    totalNodes: nodes.length,
  };
}

// ---------------------------------------------------------------------------
// MOC coverage bonus
// ---------------------------------------------------------------------------

function mocCoverageBonus(nodes, edges) {
  const clusters = detectClusters(nodes, edges);
  const clustersWithMoc = clusters.filter((c) =>
    c.some((n) => n.type === "moc")
  ).length;
  return {
    value: Math.round((clustersWithMoc / Math.max(1, clusters.length)) * 10),
    clustersWithMoc,
    totalClusters: clusters.length,
  };
}

// ---------------------------------------------------------------------------
// Main validation logic
// ---------------------------------------------------------------------------

function validateGraph(graph) {
  const { nodes = [], edges = [] } = graph;
  const nodeIds = new Set(nodes.map((n) => n.id));

  // Build a slug-to-id lookup from node IDs (strip "skill:" prefix for matching)
  const slugToId = new Map();
  nodes.forEach((n) => {
    const slug = n.id.startsWith("skill:") ? n.id.slice(6) : n.id;
    slugToId.set(slug, n.id);
    // Also map by name slug
    if (n.name) slugToId.set(slugify(n.name), n.id);
  });

  // ── 1. Broken links ─────────────────────────────────────────────────────
  // Any edge whose target doesn't exist in nodeIds
  const brokenLinks = edges
    .filter((e) => !nodeIds.has(e.target))
    .map((e) => ({
      source: e.source,
      target: e.target,
      context: e.context || "",
      penalty: -10,
    }));

  // ── 2. Missing descriptions ──────────────────────────────────────────────
  const missingDescriptions = nodes
    .filter((n) => !n.description || String(n.description).trim() === "")
    .map((n) => ({ file: n.source?.filePath || n.id, nodeId: n.id, penalty: -5 }));

  // ── 3. Missing types ─────────────────────────────────────────────────────
  const VALID_TYPES = new Set(["skill", "moc", "claim", "technique", "framework", "exploration"]);
  const missingTypes = nodes
    .filter((n) => !n.type || !VALID_TYPES.has(n.type))
    .map((n) => ({ file: n.source?.filePath || n.id, nodeId: n.id, type: n.type || null, penalty: -2 }));

  // ── 4. Missing domains ───────────────────────────────────────────────────
  const missingDomains = nodes
    .filter((n) => !n.domain || n.domain === "general")
    .map((n) => ({ file: n.source?.filePath || n.id, nodeId: n.id, penalty: -1 }));

  // ── 5. Orphan nodes ──────────────────────────────────────────────────────
  const inDegree = {};
  const outDegree = {};
  nodes.forEach((n) => { inDegree[n.id] = 0; outDegree[n.id] = 0; });
  edges.forEach((e) => {
    if (outDegree[e.source] !== undefined) outDegree[e.source]++;
    if (inDegree[e.target] !== undefined) inDegree[e.target]++;
  });
  const orphans = nodes
    .filter((n) => inDegree[n.id] === 0 && outDegree[n.id] === 0)
    .map((n) => ({ nodeId: n.id, name: n.name, penalty: -3 }));

  // ── 6. Circular-only nodes ───────────────────────────────────────────────
  // A node where ALL its edges form a closed pair with exactly one other node
  const circularOnly = [];
  for (const node of nodes) {
    const outTargets = edges.filter((e) => e.source === node.id).map((e) => e.target);
    const inSources = edges.filter((e) => e.target === node.id).map((e) => e.source);
    if (
      outTargets.length === 1 &&
      inSources.length === 1 &&
      outTargets[0] === inSources[0]
    ) {
      // Avoid double-reporting pairs
      const pair = [node.id, outTargets[0]].sort().join("||");
      if (!circularOnly.some((c) => [c.nodeId, c.partnerId].sort().join("||") === pair)) {
        circularOnly.push({ nodeId: node.id, partnerId: outTargets[0], penalty: -2 });
      }
    }
  }

  // ── 7. MOC health checks ─────────────────────────────────────────────────
  const mocNodes = nodes.filter((n) => n.type === "moc");
  const mocWarnings = [];
  for (const moc of mocNodes) {
    const childCount = edges.filter((e) => e.source === moc.id && e.type === "CLUSTERS").length;
    if (childCount < 3) {
      mocWarnings.push({ nodeId: moc.id, name: moc.name, childCount, issue: "Too few children (< 3)" });
    }
    if (childCount > 20) {
      mocWarnings.push({ nodeId: moc.id, name: moc.name, childCount, issue: "Too many children (> 20), consider splitting" });
    }
  }

  // ── 8. Scoring ────────────────────────────────────────────────────────────
  let score = 100;

  score -= brokenLinks.length * 10;
  score -= missingDescriptions.length * 5;
  score -= orphans.length * 3;
  score -= missingTypes.length * 2;
  score -= circularOnly.length * 2;
  score -= missingDomains.length * 1;

  score = Math.max(0, score);

  const mocBonus = mocCoverageBonus(nodes, edges);
  const densityBonus = linkDensityBonus(nodes, edges);

  score += mocBonus.value + densityBonus.value;
  score = Math.min(100, score);

  // ── 9. Graph metrics (server-authoritative) ───────────────────────────────
  const nodeCount = nodes.length;
  const edgeCount = edges.length;
  const density = nodeCount > 1 ? edgeCount / (nodeCount * (nodeCount - 1)) : 0;
  const avgDegree =
    nodeCount > 0
      ? nodes.reduce((s, n) => s + (inDegree[n.id] || 0) + (outDegree[n.id] || 0), 0) / nodeCount
      : 0;

  const typeBreakdown = {};
  nodes.forEach((n) => { typeBreakdown[n.type || "unknown"] = (typeBreakdown[n.type || "unknown"] || 0) + 1; });

  const edgeTypeBreakdown = {};
  edges.forEach((e) => { edgeTypeBreakdown[e.type || "unknown"] = (edgeTypeBreakdown[e.type || "unknown"] || 0) + 1; });

  const maxInNode = nodes.reduce(
    (a, b) => ((inDegree[b.id] || 0) > (inDegree[a.id] || 0) ? b : a),
    nodes[0] || { id: "", metadata: {} }
  );
  const maxOutNode = nodes.reduce(
    (a, b) => ((outDegree[b.id] || 0) > (outDegree[a.id] || 0) ? b : a),
    nodes[0] || { id: "", metadata: {} }
  );

  const clusterList = detectClusters(nodes, edges);
  const domains = [...new Set(nodes.map((n) => n.domain).filter(Boolean))];

  // ── 10. Human-readable summary ────────────────────────────────────────────
  const penaltySummary = [];
  if (brokenLinks.length) penaltySummary.push(`${brokenLinks.length} broken link${brokenLinks.length > 1 ? "s" : ""} (−${brokenLinks.length * 10})`);
  if (missingDescriptions.length) penaltySummary.push(`${missingDescriptions.length} missing description${missingDescriptions.length > 1 ? "s" : ""} (−${missingDescriptions.length * 5})`);
  if (orphans.length) penaltySummary.push(`${orphans.length} orphan node${orphans.length > 1 ? "s" : ""} (−${orphans.length * 3})`);
  if (missingTypes.length) penaltySummary.push(`${missingTypes.length} invalid/missing type${missingTypes.length > 1 ? "s" : ""} (−${missingTypes.length * 2})`);

  const summary = penaltySummary.length === 0
    ? `Perfect score! Graph has no structural issues.`
    : `Score ${score}/100. Fix: ${penaltySummary.join(", ")}.`;

  return {
    score,
    maxScore: 100,
    grade: score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F",
    issues: {
      brokenLinks,
      missingDescriptions,
      missingTypes,
      missingDomains,
      orphans,
      circularOnly,
      mocWarnings,
    },
    bonuses: {
      mocCoverage: mocBonus,
      linkDensityHealth: densityBonus,
    },
    metrics: {
      nodeCount,
      edgeCount,
      density: parseFloat(density.toFixed(4)),
      avgDegree: parseFloat(avgDegree.toFixed(2)),
      domains,
      typeBreakdown,
      edgeTypeBreakdown,
      clusterCount: clusterList.length,
      orphanCount: orphans.length,
      mocCount: mocNodes.length,
      maxInDegree: { nodeId: maxInNode.id, value: inDegree[maxInNode.id] || 0 },
      maxOutDegree: { nodeId: maxOutNode.id, value: outDegree[maxOutNode.id] || 0 },
    },
    summary,
  };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request) {
  // ── Rate limit ──────────────────────────────────────────────────────────
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Max 100 requests per minute." },
      { status: 429 }
    );
  }

  // ── Parse body ──────────────────────────────────────────────────────────
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // ── Accept either { graph } or a raw graph object ────────────────────────
  const graph = body.graph || body;

  // ── Minimal schema validation ────────────────────────────────────────────
  if (!graph || typeof graph !== "object") {
    return NextResponse.json({ error: "Request must include a graph object." }, { status: 400 });
  }

  if (graph.kind && graph.kind !== "skill") {
    return NextResponse.json(
      { error: `Validation is for skill graphs only. Received kind: "${graph.kind}".` },
      { status: 400 }
    );
  }

  if (!Array.isArray(graph.nodes)) {
    return NextResponse.json({ error: "graph.nodes must be an array." }, { status: 400 });
  }

  if (!Array.isArray(graph.edges)) {
    return NextResponse.json({ error: "graph.edges must be an array." }, { status: 400 });
  }

  // ── Size guard ───────────────────────────────────────────────────────────
  if (graph.nodes.length > 5000) {
    return NextResponse.json(
      { error: "Graph too large for validation endpoint. Max 5,000 nodes." },
      { status: 413 }
    );
  }

  // ── Run validation ───────────────────────────────────────────────────────
  let result;
  try {
    result = validateGraph(graph);
  } catch (err) {
    console.error("[validate] Validation error:", err);
    return NextResponse.json(
      { error: "Validation failed due to an internal error." },
      { status: 500 }
    );
  }

  // ── Respond ──────────────────────────────────────────────────────────────
  return NextResponse.json(
    {
      graphId: graph.id || null,
      kind: "skill",
      ...result,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json",
      },
    }
  );
}

// GET: health check / schema documentation
export async function GET() {
  return NextResponse.json({
    endpoint: "POST /api/skillgraph/validate",
    description: "Validate a skill graph using the skill-graph-quality.md rubric.",
    request: {
      body: {
        graph: {
          kind: "skill",
          nodes: "GraphNode[] — array of graph-core.md canonical nodes",
          edges: "GraphEdge[] — array of graph-core.md canonical edges",
        },
      },
    },
    response: {
      score: "0–100 quality score",
      grade: "A/B/C/D/F",
      issues: {
        brokenLinks: "Edges pointing to non-existent nodes (−10 each)",
        missingDescriptions: "Nodes without description frontmatter (−5 each)",
        missingTypes: "Nodes with invalid/missing type (−2 each)",
        missingDomains: "Nodes missing domain field (−1 each)",
        orphans: "Nodes with no connections (−3 each)",
        circularOnly: "Node pairs with only mutual links (−2 per pair)",
        mocWarnings: "MOC nodes with too few or too many children (informational)",
      },
      bonuses: {
        mocCoverage: "MOC cluster coverage up to +10",
        linkDensityHealth: "Balanced degree distribution up to +10",
      },
      metrics: "Graph-level statistics (nodeCount, edgeCount, density, etc.)",
      summary: "Human-readable description of issues",
    },
    limits: {
      maxNodes: 5000,
      rateLimit: "100 requests per minute per IP",
    },
  });
}
