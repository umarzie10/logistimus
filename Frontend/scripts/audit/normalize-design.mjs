/**
 * Phase C — mechanical design-system normalisation.
 * Source of truth: DESIGN.md (Ice/Powder/Royal/Midnight, muted state colours,
 * no shadows, no gradients on UI surfaces, radii 28/20/16/full).
 *
 * Guards built in after pre-run review:
 *  - dark-surface state text maps to text-success/warning/danger, not text-midnight
 *  - arbitrary drop-shadow-[...] / shadow-[...] are stripped
 *  - <button>/<Link> radii become rounded-full (DESIGN §3.1), inputs keep 16
 *
 * usage: node scripts/audit/normalize-design.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = new URL("../../src/", import.meta.url).pathname;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if ([".tsx", ".ts"].includes(extname(p))) out.push(p);
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * 1. Shadows — DESIGN.md §4 "Shadow: none / Never"
 *    arbitrary values first so shadow-[..] is not half-eaten
 * ------------------------------------------------------------------ */
function stripShadows(s) {
  return s
    .replace(/\b(?:[a-z0-9]+:)*drop-shadow-\[[^\]]*\]\s*/g, "")
    .replace(/\b(?:[a-z0-9]+:)*shadow-\[[^\]]*\]\s*/g, "")
    .replace(/\b(?:[a-z0-9]+:)*drop-shadow-[a-z0-9]+\b\s*/g, "")
    .replace(/\b(?:[a-z0-9]+:)*shadow-(?:xs|sm|md|lg|xl|2xl)\b\s*/g, "")
    .replace(/\b(?:[a-z0-9]+:)*shadow-\b\s*/g, "");
}

/* ------------------------------------------------------------------ *
 * 1b. Dark-surface state text — MUST run before HUE_MAP.
 *     On midnight/royal surfaces Midnight text is invisible; DESIGN §2.5
 *     inverse applies: state text becomes text-success/warning/danger.
 * ------------------------------------------------------------------ */
const DARK_OVERRIDES = {
  // whole page sits on bg-[#061336]
  "app/admin/page.tsx": [
    [/\btext-emerald-(?:300|400)\b/g, "text-success"],
    [/\btext-red-(?:300|400)\b/g, "text-danger"],
    [/\btext-amber-(?:300|400)\b/g, "text-warning"],
    [/\btext-yellow-\d+\b/g, "text-warning"],
  ],
  // dark sidebar — only state text usage is the dark "Live" badge
  "components/app/AppSidebar.tsx": [[/\btext-emerald-300\b/g, "text-success"]],
  // only text-emerald-300 is the icon chip inside the dark chat header
  "app/ai/page.tsx": [[/\btext-emerald-300\b/g, "text-success"]],
  // only text-emerald-400 is "On Highway" inside the royal trip banner
  "app/driver/page.tsx": [[/\btext-emerald-400\b/g, "text-success"]],
  // popular (dark) tier vs standard (light) tier — conditional must survive
  "app/pricing/page.tsx": [
    [/"text-emerald-400" : "text-emerald-600"/g, '"text-success" : "text-midnight"'],
  ],
};

/* ------------------------------------------------------------------ *
 * 2. Off-palette hues → DESIGN palette
 *    slash-variants first so bg-emerald-50/40 does not become
 *    bg-success/15/40 (invalid class)
 * ------------------------------------------------------------------ */
const HUE_MAP = [
  // --- success family (emerald/green) --------------------------------
  [/\bbg-emerald-(?:50|100|200)\/(\d+)\b/g, "bg-success/$1"],
  [/\bbg-emerald-(?:50|100|200)\b/g, "bg-success/15"],
  [/\bbg-emerald-(?:300|400|500|600)\b/g, "bg-success"],
  [/\bborder-emerald-(?:100|200|300)\/(\d+)\b/g, "border-success/$1"],
  [/\bborder-emerald-(?:100|200|300)\b/g, "border-success/40"],
  [/\bborder-emerald-(?:400|500)\b/g, "border-success"],
  [/\btext-emerald-(?:300|400|500|600|700|800)\b/g, "text-midnight"],
  [/\bring-emerald-\d+\b/g, "ring-success"],
  [/\bbg-green-\d+\b/g, "bg-success"],
  [/\btext-green-\d+\b/g, "text-midnight"],

  // --- warning family (amber/yellow) ---------------------------------
  [/\bbg-amber-(?:50|100|200)\/(\d+)\b/g, "bg-warning/$1"],
  [/\bbg-amber-(?:50|100|200)\b/g, "bg-warning/15"],
  [/\bbg-amber-(?:300|400|500|600)\b/g, "bg-warning"],
  [/\bborder-amber-(?:100|200|300)\/(\d+)\b/g, "border-warning/$1"],
  [/\bborder-amber-(?:100|200|300)\b/g, "border-warning/40"],
  [/\bborder-amber-(?:400|500)\b/g, "border-warning"],
  [/\btext-amber-(?:300|400|500|600|700|800)\b/g, "text-midnight"],
  [/\btext-amber-\d+\b/g, "text-midnight"],
  [/\bbg-yellow-\d+\b/g, "bg-warning"],
  [/\btext-yellow-\d+\b/g, "text-midnight"],
  [/\bbg-orange-\d+\b/g, "bg-warning"],
  [/\btext-orange-\d+\b/g, "text-midnight"],

  // --- danger family (red/rose) --------------------------------------
  [/\bbg-red-(?:50|100|200)\/(\d+)\b/g, "bg-danger/$1"],
  [/\bbg-red-(?:50|100|200)\b/g, "bg-danger/15"],
  [/\bbg-red-(?:300|400|500|600)\b/g, "bg-danger"],
  [/\bborder-red-(?:100|200|300)\/(\d+)\b/g, "border-danger/$1"],
  [/\bborder-red-(?:100|200|300)\b/g, "border-danger/40"],
  [/\bborder-red-(?:400|500)\b/g, "border-danger"],
  [/\btext-red-(?:300|400|500|600|700|800)\b/g, "text-midnight"],
  [/\btext-red-\d+\b/g, "text-midnight"],
  [/\bbg-rose-\d+\b/g, "bg-danger"],
  [/\btext-rose-\d+\b/g, "text-midnight"],

  // --- info / accent blues that are not on the Logistimus ramp -------
  [/\bbg-indigo-(?:50|100|200)\b/g, "bg-blue-100"],
  [/\bbg-indigo-(?:300|400|500|600)\b/g, "bg-royal"],
  [/\bborder-indigo-(?:100|200|300)\b/g, "border-line"],
  [/\btext-indigo-\d+\b/g, "text-royal"],
  [/\bbg-cyan-(?:50|100|200)\b/g, "bg-blue-100"],
  [/\bbg-cyan-(?:300|400|500|600)\b/g, "bg-royal"],
  [/\bborder-cyan-(?:100|200|300)\b/g, "border-line"],
  [/\btext-cyan-\d+\b/g, "text-royal"],
  [/\bbg-sky-\d+\b/g, "bg-blue-100"],
  [/\btext-sky-\d+\b/g, "text-royal"],
  [/\bbg-violet-\d+\b/g, "bg-royal"],
  [/\btext-violet-\d+\b/g, "text-royal"],
  [/\bbg-teal-\d+\b/g, "bg-success"],
  [/\btext-teal-\d+\b/g, "text-midnight"],
  [/\bbg-purple-\d+\b/g, "bg-royal"],
  [/\btext-purple-\d+\b/g, "text-royal"],

  // --- greys (slate/gray/zinc/neutral) → blue ramp -------------------
  [/\bbg-slate-(?:50|100|200)\b/g, "bg-blue-100"],
  [/\bbg-(?:gray|zinc|neutral)-(?:50|100|200)\b/g, "bg-blue-100"],
  [/\btext-slate-\d+\b/g, "text-muted"],
  [/\btext-(?:gray|zinc|neutral)-\d+\b/g, "text-muted"],
  [/\bborder-(?:slate|gray|zinc|neutral)-\d+\b/g, "border-line"],
  [/\bbg-slate-\d+\b/g, "bg-blue-100"],
];

/* ------------------------------------------------------------------ *
 * 3. Raw hex literals that are off the Logistimus ramp
 * ------------------------------------------------------------------ */
const HEX_MAP = [
  // soft surface tints → --surf / blue-100
  [/#f8fbfe/gi, "#ffffff"],
  [/#f7fbfe/gi, "#ffffff"],
  [/#eaf2fb/gi, "#dbe9f5"],
  [/#e8f1fa/gi, "#dbe9f5"],
  // ad-hoc navies → blue-900 / midnight
  [/#162b5e/gi, "#2a4a8e"], // dark-mode --line
  [/#1a3a75/gi, "#0a2156"],
  [/#1a4294/gi, "#0e2f76"],
  [/#163b84/gi, "#0e2f76"],
  [/#0a1a40/gi, "#061336"],
  [/#040c22/gi, "#061336"],
  // tailwind blues → Logistimus ramp
  [/#60a5fa/gi, "#8aa3cb"], // blue-400
  [/#93c5fd/gi, "#a9c0e0"], // powder
  [/#3b82f6/gi, "#4c69a0"], // blue-600
  // tailwind states → muted semantic states
  [/#34d399/gi, "#7fa9a6"],
  [/#10b981/gi, "#7fa9a6"],
  [/#f59e0b/gi, "#c9b58a"],
];

/* ------------------------------------------------------------------ *
 * 4. Radii → DESIGN tokens (28 card / 20 frame / 16 input / full pill)
 *    bare `rounded` (4px) appears only on chips, checkboxes and small
 *    icon buttons → full radius per DESIGN §3.1.
 * ------------------------------------------------------------------ */
function normalizeRadii(s) {
  return s
    .replace(/\brounded-3xl\b/g, "rounded-card")
    .replace(/\brounded-2xl\b/g, "rounded-card")
    .replace(/\brounded-xl\b/g, "rounded-input")
    .replace(/\brounded-lg\b/g, "rounded-input")
    .replace(/\brounded-md\b/g, "rounded-full")
    .replace(/\brounded-sm\b/g, "rounded-input")
    .replace(/\brounded(?![-a-zA-Z0-9])/g, "rounded-full");
}

/* ------------------------------------------------------------------ *
 * 4b. Buttons and links get the full radius (DESIGN §3.1 "Buttons,
 *     chips, nav"). Real <input>/<textarea> keep rounded-input (16).
 *     Small JSX scanner: quotes and brace depth guard the tag-end `>`.
 * ------------------------------------------------------------------ */
function findTagEnd(s, start) {
  let depth = 0;
  let quote = null;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      quote = c;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") depth = Math.max(0, depth - 1);
    else if (c === ">" && depth === 0) {
      const prev = s[i - 1];
      if (prev === "=" || prev === "-") continue; // '=>' / '->'
      return i;
    }
  }
  return -1;
}

const RADIUS_ANY =
  /\brounded(?:-(?:full|card|frame|input|3xl|2xl|xl|lg|md|sm))\b/g;

function normalizeButtonRadii(s) {
  const TAG_RE = /<(button|Link)\b/g;
  const ranges = [];
  let m;
  while ((m = TAG_RE.exec(s))) {
    const end = findTagEnd(s, m.index);
    if (end > m.index) ranges.push([m.index, end]);
  }
  // apply from the end so earlier indices stay valid (ranges never overlap:
  // a child tag always starts after its parent's opening tag ends)
  let out = s;
  for (let i = ranges.length - 1; i >= 0; i--) {
    const [a, b] = ranges[i];
    const chunk = out.slice(a, b);
    const fixed = chunk.replace(RADIUS_ANY, "rounded-full");
    if (fixed !== chunk) out = out.slice(0, a) + fixed + out.slice(b);
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * 5. Type weight — 700 is not a loaded Hanken Grotesk weight (300/400/500/600)
 * ------------------------------------------------------------------ */
function normalizeWeights(s) {
  return s
    .replace(/\bfont-black\b/g, "font-semibold")
    .replace(/\bfont-extrabold\b/g, "font-semibold")
    .replace(/\bfont-bold\b/g, "font-semibold");
}

/* ------------------------------------------------------------------ *
 * Runner
 * ------------------------------------------------------------------ */
let files = 0;
let hits = 0;

for (const file of walk(ROOT)) {
  const before = readFileSync(file, "utf8");
  const rel = file.slice(ROOT.length);
  let after = before;

  const overrides = DARK_OVERRIDES[rel] || [];
  for (const [re, to] of overrides) after = after.replace(re, to);

  after = stripShadows(after);
  for (const [re, to] of HUE_MAP) after = after.replace(re, to);
  for (const [re, to] of HEX_MAP) after = after.replace(re, to);
  after = normalizeRadii(after);
  after = normalizeButtonRadii(after);
  after = normalizeWeights(after);

  if (after !== before) {
    const changed = after.split("\n").filter((l, i) => l !== before.split("\n")[i]).length;
    hits += changed;
    files++;
    writeFileSync(file, after);
    console.log(`~ ${rel} (${changed} lines)`);
  }
}

console.log(`\nNormalised ${files} files / ${hits} changed lines.`);
