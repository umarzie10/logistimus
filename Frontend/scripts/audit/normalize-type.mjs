/**
 * Phase C (part 2) — type weight pass, DESIGN.md §3.1:
 *   Display / Heading / Stat number → 300 (font-light)
 *   Button → 500 (font-medium)
 *   Table numbers → tabular-nums (font-variant-numeric)
 *
 * Rules:
 *  A. stat classNames: big text-size + font-semibold + font-mono
 *     → font-light + tabular-nums (mono is not the stat role)
 *  B. <h1>/<h2>/<h3> opening tags: font-semibold → font-light
 *  C. <button>/<Link> opening tags: font-semibold → font-medium
 *
 * usage: node scripts/audit/normalize-type.mjs
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

/* quote- and brace-aware tag end (same guard as normalize-design.mjs) */
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
      if (prev === "=" || prev === "-") continue;
      return i;
    }
  }
  return -1;
}

function tagChunks(s, re) {
  const ranges = [];
  let m;
  re.lastIndex = 0;
  while ((m = re.exec(s))) {
    const end = findTagEnd(s, m.index);
    if (end > m.index) ranges.push([m.index, end]);
  }
  return ranges;
}

/* A. stat numbers — className level */
function fixStats(s) {
  return s.replace(/className=(?:"([^"]*)"|`([^`]*)`)/g, (whole, dq, bq) => {
    const cls = dq ?? bq;
    if (cls === undefined) return whole;
    const hasSize = /\b(?:sm:)?text-(?:xl|2xl|3xl|4xl|5xl)\b/.test(cls);
    if (!hasSize || !cls.includes("font-semibold") || !cls.includes("font-mono")) {
      return whole;
    }
    const fixed = cls
      .replace(/\bfont-semibold\b/g, "font-light")
      .replace(/\bfont-mono\b/g, "tabular-nums");
    return `className=${dq !== undefined ? `"${fixed}"` : `\`${fixed}\``}`;
  });
}

/* B. headings → 300 ; C. buttons/links → 500 — tag level */
function fixTagWeights(s) {
  const rules = [
    [/<h[123]\b/g, "font-semibold", "font-light"],
    [/<(?:button|Link)\b/g, "font-semibold", "font-medium"],
  ];
  let out = s;
  for (const [re, from, to] of rules) {
    const ranges = tagChunks(out, re);
    for (let i = ranges.length - 1; i >= 0; i--) {
      const [a, b] = ranges[i];
      const chunk = out.slice(a, b);
      if (chunk.includes(from)) {
        out = out.slice(0, a) + chunk.split(from).join(to) + out.slice(b);
      }
    }
  }
  return out;
}

let files = 0;
let hits = 0;

for (const file of walk(ROOT)) {
  const before = readFileSync(file, "utf8");
  let after = fixStats(before);
  after = fixTagWeights(after);

  if (after !== before) {
    const changed = after.split("\n").filter((l, i) => l !== before.split("\n")[i]).length;
    hits += changed;
    files++;
    writeFileSync(file, after);
    console.log(`~ ${file.slice(ROOT.length)} (${changed} lines)`);
  }
}

console.log(`\nType pass: ${files} files / ${hits} changed lines.`);
