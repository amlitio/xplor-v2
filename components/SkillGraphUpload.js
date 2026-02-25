"use client";

// components/SkillGraphUpload.js
// Skill Graph Mode ingestion — drag-drop ZIP → parse markdown → build graph-core.md-compliant graph
// Dependencies: jszip (npm install jszip), gray-matter (npm install gray-matter)
// gray-matter runs client-side fine; JSZip handles ZIP decompression in the browser.

import { useState, useCallback, useRef } from "react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_COLORS = {
  skill: "#FF9F43",
  moc: "#EE5A24",
  claim: "#A3CB38",
  technique: "#FDA7DF",
  framework: "#9AECDB",
  exploration: "#7158e2",
  default: "#636e72",
};

const MAX_ZIP_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_FILE_COUNT = 500;
const MAX_TOTAL_MARKDOWN_BYTES = 5 * 1024 * 1024; // 5 MB

// ---------------------------------------------------------------------------
// Pure parsing utilities (no React, no side-effects)
// ---------------------------------------------------------------------------

/** Slugify a string to a valid node ID fragment */
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/\.md$/i, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .trim();
}

/** Derive a title from a file path when frontmatter.name is absent */
function titleFromPath(filePath) {
  const base = filePath.split("/").pop().replace(/\.md$/i, "");
  return base
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Extract wikilinks from markdown body with sentence-level context.
 * Supports [[target]], [[target#anchor]], [[target|alias]], [[target#anchor|alias]]
 */
function extractWikilinks(markdownBody) {
  // Split on sentence boundaries (keep delimiter)
  const sentences = markdownBody.match(/[^.!?\n]+[.!?\n]+/g) || [markdownBody];
  const links = [];
  const WIKILINK_RE = /\[\[([^\]|#\n]+?)(?:#([^\]|\n]+?))?(?:\|([^\]\n]+?))?\]\]/g;

  for (const sentence of sentences) {
    let match;
    const re = new RegExp(WIKILINK_RE.source, "g");
    while ((match = re.exec(sentence)) !== null) {
      const rawTarget = match[1].trim();
      const slug = slugify(rawTarget);
      if (!slug) continue;
      links.push({
        target: slug,
        anchor: match[2] ? match[2].trim() : null,
        alias: match[3] ? match[3].trim() : null,
        contextSentence: sentence.trim(),
      });
    }
  }

  // Deduplicate by target+contextSentence
  const seen = new Set();
  return links.filter((l) => {
    const key = `${l.target}||${l.contextSentence}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Extract section previews from markdown body (Level 3 progressive disclosure)
 * Returns: [{ heading, level, preview }]
 */
function extractSections(markdownBody) {
  const sections = [];
  const lines = markdownBody.split("\n");
  let currentHeading = null;
  let currentContent = [];

  const flush = () => {
    if (!currentHeading) return;
    sections.push({
      heading: currentHeading.text,
      level: currentHeading.level,
      preview: currentContent
        .join(" ")
        .replace(/\s+/g, " ")
        .slice(0, 400)
        .trim(),
    });
  };

  for (const line of lines) {
    const hMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (hMatch) {
      flush();
      currentHeading = { text: hMatch[2].trim(), level: hMatch[1].length };
      currentContent = [];
    } else if (line.trim()) {
      // Strip markdown syntax for plain-text preview
      const plain = line
        .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, (_, t, a) => a || t)
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/[*_`#>]/g, "")
        .trim();
      if (plain) currentContent.push(plain);
    }
  }
  flush();

  return sections;
}

/**
 * Parse a single markdown file using gray-matter (bundled inline to avoid
 * server-only import issues). If gray-matter isn't available we fall back
 * to a minimal regex-based YAML parser.
 */
async function parseFrontmatter(rawContent) {
  // Dynamically import gray-matter so it's code-split and only loaded when needed
  try {
    const matter = (await import("gray-matter")).default;
    const { data, content } = matter(rawContent);
    return { frontmatter: data || {}, body: content || "" };
  } catch {
    // Fallback: minimal YAML block parser
    const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
    const match = rawContent.match(FM_RE);
    if (!match) return { frontmatter: {}, body: rawContent };
    const yamlBlock = match[1];
    const body = match[2] || "";
    const fm = {};
    for (const line of yamlBlock.split("\n")) {
      const kv = line.match(/^(\w[\w-]*):\s*(.+)/);
      if (kv) {
        const val = kv[2].trim().replace(/^["']|["']$/g, "");
        fm[kv[1]] = val;
      }
    }
    return { frontmatter: fm, body };
  }
}

/**
 * Main pipeline: array of { path, content } → { nodes, edges, metrics, validation }
 * Conforms to graph-core.md canonical schema.
 */
async function buildSkillGraph(files) {
  // ── Step 1: Parse every file ──────────────────────────────────────────────
  const parsed = [];
  for (const { path: filePath, content: rawContent } of files) {
    const { frontmatter, body } = await parseFrontmatter(rawContent);
    const slug = slugify(filePath.split("/").pop());
    const id = `skill:${slug}`;
    const wordCount = body.split(/\s+/).filter(Boolean).length;

    parsed.push({
      filePath,
      slug,
      id,
      frontmatter,
      body,
      wordCount,
      links: extractWikilinks(body),
      sections: extractSections(body),
    });
  }

  // Build a slug → id lookup for edge resolution
  const slugToId = new Map(parsed.map((p) => [p.slug, p.id]));
  const idSet = new Set(parsed.map((p) => p.id));

  // ── Step 2: Build nodes ───────────────────────────────────────────────────
  const nodes = parsed.map((p) => {
    const fm = p.frontmatter;
    const name = fm.name || titleFromPath(p.filePath);
    const type = fm.type || "skill";
    const domain = fm.domain || "general";
    const tags = Array.isArray(fm.tags)
      ? fm.tags
      : typeof fm.tags === "string"
      ? fm.tags.split(/[,\s]+/).filter(Boolean)
      : [];

    return {
      // Required
      id: p.id,
      kind: "skill",
      type,
      name,

      // Recommended
      description: fm.description || "",
      domain,
      tags,

      // Provenance
      source: {
        filePath: p.filePath,
        updatedAt: new Date().toISOString(),
      },

      // Progressive disclosure content
      content: {
        full: p.body,
        sections: p.sections,
      },

      // Computed metadata (in-/out-degree filled after edge assembly)
      metadata: {
        wordCount: p.wordCount,
        aliases: Array.isArray(fm.aliases)
          ? fm.aliases
          : typeof fm.aliases === "string"
          ? [fm.aliases]
          : [],
        inDegree: 0,
        outDegree: 0,
      },
    };
  });

  // ── Step 3: Build edges ───────────────────────────────────────────────────
  const edges = [];
  let edgeCounter = 0;

  // Helper to push an edge safely
  const addEdge = (sourceId, targetId, type, label, context = "") => {
    if (!idSet.has(targetId)) return null; // broken link — still track for validation
    const edge = {
      id: `edge-${++edgeCounter}`,
      kind: "skill",
      type,
      source: sourceId,
      target: targetId,
      label,
      context,
      weight: type === "CLUSTERS" ? 1.0 : 0.7,
    };
    edges.push(edge);
    return edge;
  };

  // Track broken links for validation
  const brokenLinks = [];

  for (const p of parsed) {
    const fm = p.frontmatter;
    const sourceType = fm.type || "skill";

    // Wikilinks from body
    for (const link of p.links) {
      const targetId = slugToId.get(link.target);
      if (!targetId) {
        brokenLinks.push({
          source: p.filePath,
          target: link.target,
          context: link.contextSentence,
          penalty: -10,
        });
        continue;
      }
      const edgeType = sourceType === "moc" ? "CLUSTERS" : "REFERENCES";
      addEdge(p.id, targetId, edgeType, link.alias || link.target, link.contextSentence);
    }

    // Frontmatter: extends: [...]
    const extendsList = Array.isArray(fm.extends)
      ? fm.extends
      : typeof fm.extends === "string"
      ? [fm.extends]
      : [];
    for (const ext of extendsList) {
      const targetId = slugToId.get(slugify(ext));
      if (targetId) addEdge(p.id, targetId, "EXTENDS", `extends ${ext}`);
      else brokenLinks.push({ source: p.filePath, target: slugify(ext), context: "frontmatter extends", penalty: -10 });
    }

    // Frontmatter: contradicts: [...]
    const contradictsList = Array.isArray(fm.contradicts)
      ? fm.contradicts
      : typeof fm.contradicts === "string"
      ? [fm.contradicts]
      : [];
    for (const con of contradictsList) {
      const targetId = slugToId.get(slugify(con));
      if (targetId) addEdge(p.id, targetId, "CONTRADICTS", `contradicts ${con}`);
      else brokenLinks.push({ source: p.filePath, target: slugify(con), context: "frontmatter contradicts", penalty: -10 });
    }
  }

  // ── Step 4: Compute degree metadata ──────────────────────────────────────
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  for (const edge of edges) {
    const src = nodeMap.get(edge.source);
    const tgt = nodeMap.get(edge.target);
    if (src) src.metadata.outDegree++;
    if (tgt) tgt.metadata.inDegree++;
  }

  // ── Step 5: Compute metrics ───────────────────────────────────────────────
  const nodeCount = nodes.length;
  const edgeCount = edges.length;
  const density = nodeCount > 1 ? edgeCount / (nodeCount * (nodeCount - 1)) : 0;
  const avgDegree = nodeCount > 0
    ? nodes.reduce((s, n) => s + n.metadata.inDegree + n.metadata.outDegree, 0) / nodeCount
    : 0;

  const typeBreakdown = {};
  nodes.forEach((n) => { typeBreakdown[n.type] = (typeBreakdown[n.type] || 0) + 1; });

  const edgeTypeBreakdown = {};
  edges.forEach((e) => { edgeTypeBreakdown[e.type] = (edgeTypeBreakdown[e.type] || 0) + 1; });

  const domains = [...new Set(nodes.map((n) => n.domain))];

  const orphans = nodes.filter(
    (n) => n.metadata.inDegree === 0 && n.metadata.outDegree === 0
  );

  const maxInNode = nodes.reduce((a, b) => (b.metadata.inDegree > a.metadata.inDegree ? b : a), nodes[0] || { id: "", metadata: { inDegree: 0 } });
  const maxOutNode = nodes.reduce((a, b) => (b.metadata.outDegree > a.metadata.outDegree ? b : a), nodes[0] || { id: "", metadata: { outDegree: 0 } });

  // Connected components (union-find)
  const parent = {};
  nodes.forEach((n) => (parent[n.id] = n.id));
  const find = (x) => { if (parent[x] !== x) parent[x] = find(parent[x]); return parent[x]; };
  const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent[ra] = rb; };
  edges.forEach((e) => { if (nodeMap.has(e.source) && nodeMap.has(e.target)) union(e.source, e.target); });
  const clusters = {};
  nodes.forEach((n) => { const root = find(n.id); if (!clusters[root]) clusters[root] = []; clusters[root].push(n); });
  const clusterList = Object.values(clusters).filter((c) => c.length > 1);
  const clusterCount = clusterList.length;
  const mocCount = nodes.filter((n) => n.type === "moc").length;

  const metrics = {
    nodeCount,
    edgeCount,
    density: parseFloat(density.toFixed(4)),
    domains,
    typeBreakdown,
    edgeTypeBreakdown,
    avgDegree: parseFloat(avgDegree.toFixed(2)),
    maxInDegree: { nodeId: maxInNode.id, value: maxInNode.metadata?.inDegree || 0 },
    maxOutDegree: { nodeId: maxOutNode.id, value: maxOutNode.metadata?.outDegree || 0 },
    orphanCount: orphans.length,
    clusterCount,
    mocCount,
  };

  // ── Step 6: Inline quality validation ────────────────────────────────────
  const missingDescriptions = parsed
    .filter((p) => !p.frontmatter.description)
    .map((p) => ({ file: p.filePath, penalty: -5 }));

  const missingTypes = parsed
    .filter((p) => !p.frontmatter.type)
    .map((p) => ({ file: p.filePath, penalty: -2 }));

  const missingDomains = parsed
    .filter((p) => !p.frontmatter.domain)
    .map((p) => ({ file: p.filePath, penalty: -1 }));

  const orphanIssues = orphans.map((n) => ({ nodeId: n.id, name: n.name, penalty: -3 }));

  // Circular-only: nodes where ALL edges form closed pairs with one other node
  const circularOnly = [];
  for (const node of nodes) {
    const outTargets = edges.filter((e) => e.source === node.id).map((e) => e.target);
    const inSources = edges.filter((e) => e.target === node.id).map((e) => e.source);
    if (outTargets.length === 1 && inSources.length === 1 && outTargets[0] === inSources[0]) {
      circularOnly.push({ nodeId: node.id, partnerId: outTargets[0], penalty: -2 });
    }
  }

  // MOC coverage bonus
  const clustersWithMoc = clusterList.filter((c) => c.some((n) => n.type === "moc")).length;
  const mocBonus = Math.round((clustersWithMoc / Math.max(1, clusterList.length)) * 10);

  // Link density bonus
  const degrees = nodes.map((n) => n.metadata.inDegree + n.metadata.outDegree);
  const deadEnds = degrees.filter((d) => d <= 1).length;
  const deadEndRatio = nodeCount > 0 ? deadEnds / nodeCount : 0;
  const densityBonus = Math.round(Math.max(0, 10 * (1 - deadEndRatio * 2)));

  let score = 100;
  score -= brokenLinks.length * 10;
  score -= missingDescriptions.length * 5;
  score -= orphanIssues.length * 3;
  score -= missingTypes.length * 2;
  score -= circularOnly.length * 2;
  score -= missingDomains.length * 1;
  score = Math.max(0, score);
  score += mocBonus + densityBonus;
  score = Math.min(100, score);

  const validation = {
    score,
    issues: {
      brokenLinks,
      missingDescriptions,
      missingTypes,
      missingDomains,
      orphans: orphanIssues,
      circularOnly,
    },
    bonuses: {
      mocCoverage: { value: mocBonus, clustersWithMoc, totalClusters: clusterList.length },
      linkDensityHealth: { value: densityBonus, deadEnds, totalNodes: nodeCount },
    },
  };

  return {
    id: `skill-graph-${Date.now()}`,
    kind: "skill",
    schemaVersion: "1.0.0",
    xplorVersion: "1.0.0",
    nodes,
    edges,
    metrics,
    validation,
  };
}

// ---------------------------------------------------------------------------
// ZIP extraction utility
// ---------------------------------------------------------------------------

async function extractZip(file) {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(file);

  const mdFiles = [];
  let totalMarkdownBytes = 0;

  const entries = Object.entries(zip.files).filter(
    ([name, entry]) =>
      !entry.dir &&
      name.endsWith(".md") &&
      !name.startsWith("__MACOSX/") &&
      !name.includes("node_modules/") &&
      !name.includes(".git/")
  );

  if (entries.length === 0) throw new Error("No .md files found in ZIP.");
  if (entries.length > MAX_FILE_COUNT) throw new Error(`Too many files (${entries.length}). Max is ${MAX_FILE_COUNT}.`);

  for (const [name, entry] of entries) {
    const content = await entry.async("string");
    totalMarkdownBytes += new TextEncoder().encode(content).length;
    if (totalMarkdownBytes > MAX_TOTAL_MARKDOWN_BYTES) {
      throw new Error("Total markdown content exceeds 5 MB limit.");
    }
    mdFiles.push({ path: name, content });
  }

  return mdFiles;
}

// ---------------------------------------------------------------------------
// React component
// ---------------------------------------------------------------------------

export default function SkillGraphUpload({ onGraphReady }) {
  const [phase, setPhase] = useState("idle"); // idle | dragging | parsing | validating | done | error
  const [progress, setProgress] = useState({ step: "", pct: 0 });
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { graph, fileName, fileCount }
  const inputRef = useRef(null);

  // ── Drag & drop handlers ──────────────────────────────────────────────────

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setPhase("dragging");
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setPhase("idle");
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setPhase("idle");
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const handleFileInput = useCallback((e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
  }, []);

  // ── Core processing pipeline ──────────────────────────────────────────────

  const processFile = async (file) => {
    setError(null);
    setResult(null);

    // Validate file
    if (!file.name.endsWith(".zip")) {
      setError("Please upload a .zip file containing your markdown files.");
      return;
    }
    if (file.size > MAX_ZIP_SIZE_BYTES) {
      setError(`ZIP file is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.`);
      return;
    }

    try {
      // Step 1: Extract ZIP
      setPhase("parsing");
      setProgress({ step: "Extracting ZIP…", pct: 10 });
      const mdFiles = await extractZip(file);

      // Step 2: Parse files
      setProgress({ step: `Parsing ${mdFiles.length} markdown files…`, pct: 30 });
      // Small yield so the UI updates
      await new Promise((r) => setTimeout(r, 0));

      // Step 3: Build graph
      setProgress({ step: "Building knowledge graph…", pct: 55 });
      await new Promise((r) => setTimeout(r, 0));
      const graph = await buildSkillGraph(mdFiles);

      // Step 4: Validate (already embedded in buildSkillGraph, but surface it)
      setPhase("validating");
      setProgress({ step: "Running quality validation…", pct: 80 });
      await new Promise((r) => setTimeout(r, 0));

      // Step 5: Done
      setProgress({ step: "Complete!", pct: 100 });
      setPhase("done");
      setResult({
        graph,
        fileName: file.name,
        fileCount: mdFiles.length,
      });
    } catch (err) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
      setPhase("error");
    }
  };

  const handleExplore = () => {
    if (result?.graph) onGraphReady(result.graph);
  };

  const handleReset = () => {
    setPhase("idle");
    setError(null);
    setResult(null);
    setProgress({ step: "", pct: 0 });
    if (inputRef.current) inputRef.current.value = "";
  };

  // ── Pre-built example graph ────────────────────────────────────────────────
  const handleTryExample = async () => {
    setPhase("parsing");
    setProgress({ step: "Loading example knowledge graph…", pct: 20 });
    await new Promise((r) => setTimeout(r, 300));

    const exampleFiles = [
      { path: "cognitive-behavioral-therapy.md", content: `---\nname: Cognitive Behavioral Therapy\ntype: moc\ndomain: psychology\ndescription: A structured approach to treating mental health issues by changing thought patterns and behaviors\ntags: [therapy, evidence-based, structured]\n---\n# Cognitive Behavioral Therapy\n\nCBT is the gold standard of evidence-based psychotherapy. It focuses on the relationship between [[thoughts-feelings-behaviors]] and uses structured techniques to create lasting change.\n\n## Core Techniques\n- [[cognitive-restructuring]] — identifying and challenging distorted thinking\n- [[behavioral-activation]] — scheduling activities to combat depression\n- [[exposure-therapy]] — gradual confrontation of feared situations\n- [[thought-records]] — documenting and analyzing automatic thoughts\n\n## Theoretical Foundations\nCBT draws from [[becks-cognitive-model]] and integrates concepts from [[attachment-theory]] when working with relational patterns.\n\n## Applications\nEffective for [[depression]], [[anxiety-disorders]], [[ptsd]], and increasingly used in [[addiction-treatment]].` },
      { path: "cognitive-restructuring.md", content: `---\nname: Cognitive Restructuring\ntype: technique\ndomain: psychology\ndescription: The process of identifying, challenging, and replacing distorted automatic thoughts with balanced alternatives\ntags: [technique, core, thoughts]\n---\n# Cognitive Restructuring\n\nCognitive restructuring is the cornerstone technique of [[cognitive-behavioral-therapy]]. The client learns to catch [[automatic-thoughts]], evaluate their accuracy, and develop more balanced perspectives.\n\n## Steps\n1. Identify the triggering situation\n2. Notice the [[automatic-thoughts]] that arise\n3. Recognize [[cognitive-distortions]] in those thoughts\n4. Challenge the evidence for and against\n5. Develop a balanced alternative thought\n\nThis technique is documented through [[thought-records]] and builds on [[becks-cognitive-model]].` },
      { path: "becks-cognitive-model.md", content: `---\nname: Beck's Cognitive Model\ntype: framework\ndomain: psychology\ndescription: Aaron Beck's foundational model proposing that thoughts, feelings, and behaviors are interconnected\ntags: [framework, foundational, beck]\n---\n# Beck's Cognitive Model\n\nDeveloped by Aaron T. Beck in the 1960s, this model is the theoretical foundation of [[cognitive-behavioral-therapy]].\n\n## Core Propositions\nThe model proposes that [[thoughts-feelings-behaviors]] form an interconnected triangle. Changing any one element affects the others.\n\n## Key Concepts\n- Core beliefs — deep-level assumptions about self, others, and the world\n- Intermediate beliefs — rules and attitudes derived from core beliefs\n- [[automatic-thoughts]] — surface-level cognitions triggered by situations\n\nThis model directly informs techniques like [[cognitive-restructuring]] and [[thought-records]].` },
      { path: "thoughts-feelings-behaviors.md", content: `---\nname: Thoughts-Feelings-Behaviors Triangle\ntype: concept\ndomain: psychology\ndescription: The CBT model showing how thoughts, feelings, and behaviors are interconnected and mutually reinforcing\ntags: [concept, core, model]\n---\n# The CBT Triangle\n\nAt the heart of [[cognitive-behavioral-therapy]] is the insight that thoughts, feelings, and behaviors form an interconnected system.\n\nA negative [[automatic-thoughts|automatic thought]] triggers negative emotions, which drive avoidance behaviors, which reinforce the original thought. [[cognitive-restructuring]] breaks this cycle by targeting the thought component.\n\nThis concept comes directly from [[becks-cognitive-model]].` },
      { path: "automatic-thoughts.md", content: `---\nname: Automatic Thoughts\ntype: concept\ndomain: psychology\ndescription: Rapid, involuntary cognitions that arise in response to situations, often containing cognitive distortions\ntags: [concept, thoughts, distortions]\n---\n# Automatic Thoughts\n\nAutomatic thoughts are the rapid-fire interpretations our minds generate in response to events. In [[cognitive-behavioral-therapy]], learning to catch these thoughts is the first step toward change.\n\nAutomatic thoughts often contain [[cognitive-distortions]] — systematic errors in thinking like catastrophizing, black-and-white thinking, or mind reading.\n\nThey are documented using [[thought-records]] and addressed through [[cognitive-restructuring]].\n\nThe concept originates from [[becks-cognitive-model]].` },
      { path: "cognitive-distortions.md", content: `---\nname: Cognitive Distortions\ntype: concept\ndomain: psychology\ndescription: Systematic patterns of biased thinking that lead to inaccurate conclusions about reality\ntags: [concept, distortions, thinking-errors]\n---\n# Cognitive Distortions\n\nCognitive distortions are the thinking errors that [[cognitive-behavioral-therapy]] aims to correct. They appear in [[automatic-thoughts]] and maintain psychological distress.\n\n## Common Distortions\n- **All-or-nothing thinking** — seeing things in black and white\n- **Catastrophizing** — expecting the worst possible outcome\n- **Mind reading** — assuming you know what others think\n- **Emotional reasoning** — treating feelings as facts\n- **Should statements** — rigid rules about how things must be\n\nIdentifying these patterns is central to [[cognitive-restructuring]].` },
      { path: "thought-records.md", content: `---\nname: Thought Records\ntype: technique\ndomain: psychology\ndescription: Structured worksheets for documenting situations, automatic thoughts, emotions, and balanced alternatives\ntags: [technique, tool, documentation]\n---\n# Thought Records\n\nThought records are the practical worksheets used in [[cognitive-behavioral-therapy]] to apply [[cognitive-restructuring]] in daily life.\n\n## Columns\n1. Situation — what happened\n2. [[automatic-thoughts]] — what went through your mind\n3. Emotions — what you felt (0-100 intensity)\n4. Evidence for — facts supporting the thought\n5. Evidence against — facts contradicting it\n6. Balanced thought — a more accurate perspective\n7. Re-rate emotions\n\nThey make [[cognitive-distortions]] visible and trackable over time.` },
      { path: "behavioral-activation.md", content: `---\nname: Behavioral Activation\ntype: technique\ndomain: psychology\ndescription: A technique that combats depression by scheduling meaningful activities to break the cycle of withdrawal\ntags: [technique, depression, activity]\n---\n# Behavioral Activation\n\nBehavioral activation is a core technique in [[cognitive-behavioral-therapy]] that targets the behavioral component of the [[thoughts-feelings-behaviors]] triangle.\n\nWhen people are depressed, they withdraw from activities. This withdrawal reduces positive reinforcement, deepening [[depression]]. Behavioral activation breaks this cycle by scheduling activities that provide mastery and pleasure.\n\nIt is often used alongside [[cognitive-restructuring]] for comprehensive treatment.` },
      { path: "exposure-therapy.md", content: `---\nname: Exposure Therapy\ntype: technique\ndomain: psychology\ndescription: Systematic gradual exposure to feared stimuli to reduce avoidance and anxiety responses\ntags: [technique, anxiety, exposure]\n---\n# Exposure Therapy\n\nExposure therapy is used within [[cognitive-behavioral-therapy]] to treat [[anxiety-disorders]] and [[ptsd]].\n\nThe principle is simple: gradual, repeated exposure to feared situations reduces the anxiety response over time. This works because avoidance maintains anxiety — facing the fear allows the brain to learn that the situation is safe.\n\n## Types\n- In vivo (real-life) exposure\n- Imaginal exposure\n- Interoceptive exposure (body sensations)\n- Virtual reality exposure` },
      { path: "depression.md", content: `---\nname: Depression\ntype: concept\ndomain: psychology\ndescription: A mood disorder characterized by persistent sadness, loss of interest, and cognitive distortions\ntags: [condition, mood, treatment]\n---\n# Depression\n\n[[cognitive-behavioral-therapy]] is one of the most effective treatments for depression. The CBT model of depression emphasizes how negative [[automatic-thoughts]] and [[cognitive-distortions]] maintain depressive cycles.\n\nKey treatment approaches include [[behavioral-activation]] to increase activity levels and [[cognitive-restructuring]] to challenge negative thinking patterns.` },
      { path: "anxiety-disorders.md", content: `---\nname: Anxiety Disorders\ntype: concept\ndomain: psychology\ndescription: A group of conditions characterized by excessive worry, fear, and avoidance behaviors\ntags: [condition, anxiety, treatment]\n---\n# Anxiety Disorders\n\n[[cognitive-behavioral-therapy]] is the first-line treatment for anxiety disorders. [[exposure-therapy]] is particularly effective, helping clients gradually face feared situations.\n\n[[cognitive-restructuring]] addresses the overestimation of threat and underestimation of coping ability that characterize anxious thinking. [[automatic-thoughts]] in anxiety often involve catastrophizing and probability overestimation.` },
      { path: "attachment-theory.md", content: `---\nname: Attachment Theory\ntype: framework\ndomain: psychology\ndescription: Bowlby's theory that early relational experiences shape internal working models of self and others\ntags: [framework, relational, development]\n---\n# Attachment Theory\n\nAttachment theory, while not originally part of [[cognitive-behavioral-therapy]], increasingly informs modern CBT practice. Early attachment experiences shape core beliefs — the deep-level cognitions described in [[becks-cognitive-model]].\n\nUnderstanding attachment patterns helps therapists identify why certain [[cognitive-distortions]] are so persistent and resistant to standard [[cognitive-restructuring]].` },
      { path: "ptsd.md", content: `---\nname: PTSD\ntype: concept\ndomain: psychology\ndescription: Post-traumatic stress disorder — a condition caused by experiencing or witnessing traumatic events\ntags: [condition, trauma, treatment]\n---\n# PTSD\n\nTrauma-focused [[cognitive-behavioral-therapy]] is the gold standard treatment for PTSD. [[exposure-therapy]] — particularly prolonged exposure — helps process traumatic memories.\n\n[[cognitive-restructuring]] targets the distorted beliefs that develop after trauma, such as "the world is completely dangerous" or "I am permanently damaged."` },
      { path: "addiction-treatment.md", content: `---\nname: Addiction Treatment\ntype: concept\ndomain: psychology\ndescription: CBT-based approaches to treating substance use disorders and behavioral addictions\ntags: [condition, addiction, treatment]\n---\n# Addiction Treatment\n\n[[cognitive-behavioral-therapy]] for addiction focuses on identifying triggers, challenging beliefs about substance use, and developing coping skills.\n\nKey techniques include [[cognitive-restructuring]] of permission-giving thoughts ("I deserve this") and [[behavioral-activation]] to build a rewarding substance-free lifestyle. Understanding the [[thoughts-feelings-behaviors]] cycle is essential for relapse prevention.` },
    ];

    setProgress({ step: `Parsing ${exampleFiles.length} markdown files…`, pct: 40 });
    await new Promise((r) => setTimeout(r, 200));

    setProgress({ step: "Building knowledge graph…", pct: 60 });
    await new Promise((r) => setTimeout(r, 200));
    const graph = await buildSkillGraph(exampleFiles);

    setPhase("validating");
    setProgress({ step: "Running quality validation…", pct: 85 });
    await new Promise((r) => setTimeout(r, 200));

    setProgress({ step: "Complete!", pct: 100 });
    setPhase("done");
    setResult({
      graph,
      fileName: "therapy-cbt-example.zip",
      fileCount: exampleFiles.length,
    });
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const isDragging = phase === "dragging";
  const isProcessing = phase === "parsing" || phase === "validating";
  const isDone = phase === "done";
  const isError = phase === "error";

  const scoreColor = (score) => {
    if (score >= 85) return "#82E0AA";
    if (score >= 60) return "#F7DC6F";
    return "#FF6B6B";
  };

  return (
    <div style={styles.wrapper}>
      {/* ── Header ── */}
      <div style={styles.header}>
        <div style={styles.modeBadge}>
          <span style={styles.modeBadgeIcon}>🧠</span>
          <span style={styles.modeBadgeText}>Skill Graph Mode</span>
        </div>
        <h1 style={styles.title}>Explore a Knowledge Graph</h1>
        <p style={styles.subtitle}>
          See how Xplor turns connected knowledge into an interactive, explorable graph.
        </p>
      </div>

      {/* ── Try Example (Primary CTA) ── */}
      {phase === "idle" && (
        <div style={{
          textAlign: "center", padding: "32px 24px", marginBottom: 16,
          borderRadius: 16, background: "rgba(238,90,36,0.04)",
          border: "1px solid rgba(238,90,36,0.12)",
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🧠</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#EE5A24", margin: "0 0 8px" }}>
            Try It Now — No Files Needed
          </h3>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "0 0 20px", lineHeight: 1.6 }}>
            Load a pre-built knowledge graph about Cognitive Behavioral Therapy —
            14 interconnected topics with quality scoring, relationship mapping, and full exploration.
          </p>
          <button
            onClick={handleTryExample}
            style={{
              padding: "12px 32px", borderRadius: 10,
              border: "none",
              background: "linear-gradient(135deg, #EE5A24, #FF6B6B)",
              color: "#fff", fontSize: 14, fontWeight: 700,
              cursor: "pointer", fontFamily: "'Outfit', sans-serif",
              transition: "all 0.2s",
              boxShadow: "0 4px 20px rgba(238,90,36,0.25)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 28px rgba(238,90,36,0.35)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(238,90,36,0.25)"; }}
          >
            Load Example Graph →
          </button>
        </div>
      )}

      {/* ── Drop Zone (secondary — advanced users) ── */}
      {!isDone && (
        <div>
          {phase === "idle" && (
            <p style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.2)", margin: "0 0 12px" }}>
              Or upload your own ZIP of Markdown files
            </p>
          )}
          <div
            style={{
              ...styles.dropZone,
              ...(isDragging ? styles.dropZoneDragging : {}),
              ...(isError ? styles.dropZoneError : {}),
              ...(isProcessing ? styles.dropZoneProcessing : {}),
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isProcessing && inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".zip"
              style={{ display: "none" }}
              onChange={handleFileInput}
            />

            {isProcessing ? (
              <ProcessingState progress={progress} />
            ) : (
              <IdleState isDragging={isDragging} isError={isError} error={error} />
            )}
          </div>
        </div>
      )}

      {/* ── Results Card ── */}
      {isDone && result && (
        <ResultsCard
          result={result}
          scoreColor={scoreColor}
          onExplore={handleExplore}
          onReset={handleReset}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function IdleState({ isDragging, isError, error }) {
  return (
    <>
      <div style={styles.dropIcon}>{isError ? "⚠️" : isDragging ? "📂" : "🗂️"}</div>
      <p style={styles.dropTitle}>
        {isDragging ? "Release to process" : "Drop your ZIP file here"}
      </p>
      <p style={styles.dropSub}>
        {isError ? (
          <span style={{ color: "#FF6B6B" }}>{error}</span>
        ) : (
          "or click to browse — up to 10 MB, 500 .md files"
        )}
      </p>
      <div style={styles.dropButton}>Choose File</div>
    </>
  );
}

function ProcessingState({ progress }) {
  return (
    <div style={styles.processingWrap}>
      <div style={styles.processingIcon}>⚙️</div>
      <p style={styles.processingLabel}>{progress.step}</p>
      <div style={styles.progressTrack}>
        <div
          style={{
            ...styles.progressBar,
            width: `${progress.pct}%`,
          }}
        />
      </div>
      <p style={styles.progressPct}>{progress.pct}%</p>
    </div>
  );
}

function ResultsCard({ result, scoreColor, onExplore, onReset }) {
  const { graph, fileName, fileCount } = result;
  const { metrics, validation } = graph;
  const score = validation.score;
  const issues = validation.issues;
  const totalIssues =
    issues.brokenLinks.length +
    issues.missingDescriptions.length +
    issues.orphans.length;

  return (
    <div style={styles.resultsCard}>
      {/* Score banner */}
      <div style={styles.scoreBanner}>
        <div style={styles.scoreCircle}>
          <span style={{ ...styles.scoreNumber, color: scoreColor(score) }}>
            {score}
          </span>
          <span style={styles.scoreLabel}>/ 100</span>
        </div>
        <div style={styles.scoreInfo}>
          <h2 style={styles.scoreTitle}>
            {score >= 85 ? "Excellent graph!" : score >= 60 ? "Good graph — some improvements available" : "Needs attention before exploration"}
          </h2>
          <p style={styles.scoreFile}>
            {fileName} · {fileCount} files parsed
          </p>
        </div>
      </div>

      {/* Metrics grid */}
      <div style={styles.metricsGrid}>
        {[
          { label: "Nodes", value: metrics.nodeCount, icon: "◉" },
          { label: "Edges", value: metrics.edgeCount, icon: "⟶" },
          { label: "MOCs", value: metrics.mocCount || 0, icon: "🗺️" },
          { label: "Clusters", value: metrics.clusterCount, icon: "◈" },
          { label: "Avg Degree", value: metrics.avgDegree, icon: "⬡" },
          { label: "Domains", value: metrics.domains.length, icon: "◐" },
        ].map(({ label, value, icon }) => (
          <div key={label} style={styles.metricTile}>
            <span style={styles.metricIcon}>{icon}</span>
            <span style={styles.metricValue}>{value}</span>
            <span style={styles.metricLabel}>{label}</span>
          </div>
        ))}
      </div>

      {/* Type breakdown */}
      <div style={styles.typeRow}>
        {Object.entries(metrics.typeBreakdown).map(([type, count]) => (
          <div key={type} style={styles.typePill}>
            <span
              style={{
                ...styles.typeDot,
                background: TYPE_COLORS[type] || TYPE_COLORS.default,
              }}
            />
            <span style={styles.typePillText}>
              {type} ({count})
            </span>
          </div>
        ))}
      </div>

      {/* Issues (if any) */}
      {totalIssues > 0 && (
        <div style={styles.issuesSection}>
          <p style={styles.issuesTitle}>⚠️ {totalIssues} issue{totalIssues !== 1 ? "s" : ""} found</p>
          <div style={styles.issuesList}>
            {issues.brokenLinks.slice(0, 5).map((b, i) => (
              <div key={i} style={styles.issueRow}>
                <span style={styles.issueBadge}>−10</span>
                <span style={styles.issueText}>
                  Broken link: <strong>{b.source}</strong> → <code style={styles.code}>[[{b.target}]]</code>
                </span>
              </div>
            ))}
            {issues.brokenLinks.length > 5 && (
              <div style={styles.issueRow}>
                <span style={{ ...styles.issueBadge, opacity: 0.6 }}>···</span>
                <span style={styles.issueText}>
                  {issues.brokenLinks.length - 5} more broken link{issues.brokenLinks.length - 5 !== 1 ? "s" : ""}
                </span>
              </div>
            )}
            {issues.missingDescriptions.slice(0, 3).map((m, i) => (
              <div key={i} style={styles.issueRow}>
                <span style={{ ...styles.issueBadge, background: "rgba(247,220,111,0.15)", color: "#F7DC6F" }}>−5</span>
                <span style={styles.issueText}>
                  Missing description: <strong>{m.file}</strong>
                </span>
              </div>
            ))}
            {issues.orphans.slice(0, 3).map((o, i) => (
              <div key={i} style={styles.issueRow}>
                <span style={{ ...styles.issueBadge, background: "rgba(130,224,170,0.15)", color: "#82E0AA" }}>−3</span>
                <span style={styles.issueText}>
                  Orphan node: <strong>{o.name}</strong> (no connections)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={styles.actions}>
        <button style={styles.exploreBtn} onClick={onExplore}>
          Explore Graph →
        </button>
        <button style={styles.resetBtn} onClick={onReset}>
          Upload Different File
        </button>
      </div>
    </div>
  );
}

function FormatGuide() {
  return (
    <div style={styles.guide}>
      <p style={styles.guideTitle}>Expected file format</p>
      <div style={styles.guideGrid}>
        <div style={styles.guideCard}>
          <p style={styles.guideCardTitle}>📄 Frontmatter (YAML)</p>
          <pre style={styles.pre}>{`---
name: Cognitive Reframing
description: Technique for challenging
  distorted thought patterns.
type: technique
domain: therapy
tags: [cbt, cognitive]
---`}</pre>
        </div>
        <div style={styles.guideCard}>
          <p style={styles.guideCardTitle}>🔗 Wikilinks in body</p>
          <pre style={styles.pre}>{`# Cognitive Reframing

Core skill. Start with
[[cognitive-distortions]] to identify
patterns, then use [[thought-records]]
to document and reframe them.

See also [[socratic-questioning]].`}</pre>
        </div>
        <div style={styles.guideCard}>
          <p style={styles.guideCardTitle}>🗺️ Map of Content (MOC)</p>
          <pre style={styles.pre}>{`---
name: CBT Techniques
type: moc
domain: therapy
description: Navigation hub for
  all CBT technique nodes.
---

- [[cognitive-reframing]]
- [[thought-records]]
- [[behavioral-activation]]`}</pre>
        </div>
      </div>
      <p style={styles.guideHint}>
        Valid <code style={styles.code}>type</code> values:{" "}
        {["skill", "moc", "technique", "claim", "framework", "exploration"].map((t) => (
          <span
            key={t}
            style={{
              ...styles.typeTag,
              color: TYPE_COLORS[t],
              background: (TYPE_COLORS[t] || "#636e72") + "20",
            }}
          >
            {t}
          </span>
        ))}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = {
  wrapper: {
    maxWidth: 800,
    margin: "0 auto",
    padding: "40px 24px",
    fontFamily: "'Outfit', system-ui, sans-serif",
    color: "rgba(255,255,255,0.6)",
  },
  header: {
    textAlign: "center",
    marginBottom: 32,
  },
  modeBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 12px",
    borderRadius: 20,
    background: "rgba(238,90,36,0.12)",
    border: "1px solid rgba(238,90,36,0.25)",
    marginBottom: 16,
  },
  modeBadgeIcon: { fontSize: 14 },
  modeBadgeText: {
    fontSize: 12,
    fontWeight: 600,
    color: "#EE5A24",
    fontFamily: "'Outfit', sans-serif",
  },
  title: {
    fontSize: 28,
    fontWeight: 800,
    fontFamily: "'Space Grotesk', sans-serif",
    color: "rgba(255,255,255,1)",
    margin: "0 0 12px",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 1.6,
    color: "rgba(255,255,255,0.4)",
    maxWidth: 520,
    margin: "0 auto",
  },
  code: {
    fontFamily: "monospace",
    fontSize: "0.9em",
    background: "rgba(255,255,255,0.07)",
    padding: "1px 5px",
    borderRadius: 4,
    color: "#9AECDB",
  },
  dropZone: {
    border: "2px dashed rgba(255,255,255,0.1)",
    borderRadius: 16,
    padding: "56px 24px",
    textAlign: "center",
    cursor: "pointer",
    transition: "all 0.2s",
    background: "rgba(255,255,255,0.02)",
    marginBottom: 32,
    userSelect: "none",
  },
  dropZoneDragging: {
    border: "2px dashed #EE5A24",
    background: "rgba(238,90,36,0.06)",
    transform: "scale(1.01)",
  },
  dropZoneError: {
    border: "2px dashed rgba(255,107,107,0.4)",
    background: "rgba(255,107,107,0.04)",
  },
  dropZoneProcessing: {
    cursor: "default",
    border: "2px dashed rgba(78,205,196,0.3)",
    background: "rgba(78,205,196,0.04)",
  },
  dropIcon: { fontSize: 48, marginBottom: 16 },
  dropTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: "rgba(255,255,255,0.8)",
    margin: "0 0 8px",
    fontFamily: "'Space Grotesk', sans-serif",
  },
  dropSub: { fontSize: 13, color: "rgba(255,255,255,0.35)", margin: "0 0 20px" },
  dropButton: {
    display: "inline-block",
    padding: "9px 22px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "transparent",
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  processingWrap: { padding: "8px 0" },
  processingIcon: { fontSize: 36, marginBottom: 12 },
  processingLabel: {
    fontSize: 14,
    fontWeight: 500,
    color: "rgba(255,255,255,0.7)",
    margin: "0 0 16px",
  },
  progressTrack: {
    height: 4,
    borderRadius: 4,
    background: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    maxWidth: 320,
    margin: "0 auto 8px",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
    background: "linear-gradient(90deg, #FF6B6B, #4ECDC4)",
    transition: "width 0.4s ease",
  },
  progressPct: { fontSize: 12, color: "rgba(255,255,255,0.3)", margin: 0 },
  resultsCard: {
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    overflow: "hidden",
    marginBottom: 32,
  },
  scoreBanner: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    padding: "24px 28px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(255,255,255,0.02)",
  },
  scoreCircle: {
    display: "flex",
    alignItems: "baseline",
    gap: 2,
    flexShrink: 0,
  },
  scoreNumber: {
    fontSize: 42,
    fontWeight: 800,
    fontFamily: "'Space Grotesk', sans-serif",
    lineHeight: 1,
  },
  scoreLabel: { fontSize: 16, color: "rgba(255,255,255,0.3)", fontWeight: 400 },
  scoreInfo: {},
  scoreTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "rgba(255,255,255,0.9)",
    margin: "0 0 4px",
    fontFamily: "'Space Grotesk', sans-serif",
  },
  scoreFile: { fontSize: 12, color: "rgba(255,255,255,0.35)", margin: 0 },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(6, 1fr)",
    gap: 1,
    background: "rgba(255,255,255,0.04)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  metricTile: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    padding: "16px 8px",
    background: "rgba(10,10,15,1)",
  },
  metricIcon: { fontSize: 16, marginBottom: 2 },
  metricValue: {
    fontSize: 22,
    fontWeight: 700,
    color: "rgba(255,255,255,0.9)",
    fontFamily: "'Space Grotesk', sans-serif",
  },
  metricLabel: { fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 500 },
  typeRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    padding: "16px 24px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  typePill: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 10px",
    borderRadius: 6,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.06)",
  },
  typeDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
  },
  typePillText: { fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.5)" },
  issuesSection: {
    padding: "16px 24px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  issuesTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "#F7DC6F",
    margin: "0 0 12px",
  },
  issuesList: { display: "flex", flexDirection: "column", gap: 6 },
  issueRow: { display: "flex", alignItems: "flex-start", gap: 10 },
  issueBadge: {
    fontSize: 10,
    fontWeight: 700,
    padding: "2px 6px",
    borderRadius: 4,
    background: "rgba(255,107,107,0.15)",
    color: "#FF6B6B",
    flexShrink: 0,
    marginTop: 1,
    fontFamily: "monospace",
  },
  issueText: { fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 },
  actions: {
    display: "flex",
    gap: 12,
    padding: "20px 24px",
    alignItems: "center",
  },
  exploreBtn: {
    padding: "11px 28px",
    borderRadius: 8,
    border: "none",
    background: "linear-gradient(135deg, #FF6B6B, #4ECDC4)",
    color: "#000",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'Outfit', sans-serif",
  },
  resetBtn: {
    padding: "10px 20px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "transparent",
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "'Outfit', sans-serif",
  },
  guide: {
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(255,255,255,0.02)",
    padding: 24,
  },
  guideTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: "rgba(255,255,255,0.3)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    margin: "0 0 16px",
  },
  guideGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16,
    marginBottom: 16,
  },
  guideCard: {
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.06)",
    padding: 14,
    background: "rgba(255,255,255,0.02)",
  },
  guideCardTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: "rgba(255,255,255,0.5)",
    margin: "0 0 10px",
  },
  pre: {
    fontFamily: "monospace",
    fontSize: 10,
    color: "#9AECDB",
    margin: 0,
    whiteSpace: "pre-wrap",
    lineHeight: 1.6,
  },
  guideHint: { fontSize: 12, color: "rgba(255,255,255,0.3)", margin: 0 },
  typeTag: {
    display: "inline-block",
    padding: "1px 7px",
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    marginLeft: 5,
  },
};
