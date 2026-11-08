#!/usr/bin/env node
/**
 * Frontend audit extractor: builds a structured inventory of routes, forms,
 * tables, actions, mock datasets, interfaces and API surface from src/.
 * Output: audit-out.json + human-readable sections on stdout.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "src");
const out = { routes: [], interfaces: [], mockDatasets: [], apiCalls: [], authSignals: [], components: [], libFiles: [], envUsage: [] };

function walk(d, acc = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}
const files = walk(ROOT);

// ---------- helpers ----------
const grab = (code, re) => { const m = code.match(re); return m ? m[1].trim().replace(/\s+/g, " ") : null; };

function extractForms(code) {
  const forms = [];
  // <form ...> blocks (naive balanced scan)
  let idx = 0;
  while ((idx = code.indexOf("<form", idx)) !== -1) {
    const end = code.indexOf("</form>", idx);
    const block = end === -1 ? code.slice(idx, idx + 2000) : code.slice(idx, end);
    const fields = [];
    const fieldRe = /<(input|textarea|select)\b([^>]*)>/g;
    let m;
    while ((m = fieldRe.exec(block))) {
      const attrs = m[2];
      fields.push({
        type: m[1],
        inputType: grab(attrs, /\btype="([^"]+)"/),
        name: grab(attrs, /\bname="([^"]+)"/) || grab(attrs, /\bdata-name="([^"]+)"/),
        placeholder: grab(attrs, /\bplaceholder="([^"]+)"/),
        required: /\brequired\b/.test(attrs),
        minLength: grab(attrs, /\bminLength="([^"]+)"/) || grab(attrs, /\bminlength="([^"]+)"/),
        pattern: grab(attrs, /\bpattern="([^"]+)"/),
      });
    }
    const action = grab(block, /onSubmit=\{([^}]+)\}/);
    const submitLabel = grab(block, /type="submit"[^>]*>([^<]+)</) || grab(block, /<button[^>]*type="submit"[^>]*>\s*([^<{\n]+)/);
    forms.push({ fields, onSubmit: action, submitLabel: submitLabel?.trim() });
    idx = end === -1 ? idx + 6 : end + 7;
  }
  return forms;
}

function extractTables(code) {
  const tables = [];
  const thRe = /<th\b[^>]*>([\s\S]*?)<\/th>/g;
  let m;
  const headers = [];
  while ((m = thRe.exec(code))) {
    headers.push(m[1].replace(/<[^>]+>/g, "").replace(/\{[^}]+\}/g, "").trim());
  }
  if (headers.length) tables.push(headers);
  // header-less tables: look for grid-cols definitions with labels
  return tables;
}

function extractActions(code) {
  const actions = [];
  const btnRe = /<button\b([^>]*)>([\s\S]*?)<\/button>/g;
  let m;
  while ((m = btnRe.exec(code))) {
    const attrs = m[1];
    const inner = m[2].replace(/<[^>]+>/g, " ").replace(/\{[^}]+\}/g, "").replace(/\s+/g, " ").trim();
    const onClick = grab(attrs, /onClick=\{([^}]+)\}/);
    if (!inner && !onClick) continue;
    actions.push({ label: inner.slice(0, 80) || "(icon)", onClick: onClick ? onClick.slice(0, 120) : null, disabled: /disabled=\{[^}]*true/.test(attrs) });
  }
  // anchors with href
  const aRe = /<a\b([^>]*)>([\s\S]*?)<\/a>/g;
  while ((m = aRe.exec(code))) {
    const href = grab(m[1], /\bhref="([^"]+)"/);
    if (href && (href.startsWith("/") || href.startsWith("http"))) {
      const inner = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      actions.push({ label: inner.slice(0, 60), href });
    }
  }
  return actions;
}

function extractMockData(code) {
  const sets = [];
  const constRe = /const\s+([A-Za-z0-9_]+)\s*(?::\s*[A-Za-z0-9_<>\[\]| ]+)?\s*=\s*\[/g;
  let m;
  while ((m = constRe.exec(code))) {
    const start = m.index + m[0].length - 1;
    let depth = 0, end = -1;
    for (let i = start; i < Math.min(code.length, start + 40000); i++) {
      if (code[i] === "[") depth++;
      else if (code[i] === "]") { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end === -1) continue;
    const body = code.slice(start, end + 1);
    if (!body.includes("{")) continue;
    if (/fetch\(|axios|api\./.test(body)) continue;
    // count items and grab first item's keys
    const firstItem = body.slice(body.indexOf("{"), body.indexOf("}") + 1);
    const keys = [...firstItem.matchAll(/([A-Za-z0-9_]+)\s*:/g)].map((k) => k[1]);
    if (keys.length < 2) continue;
    sets.push({ name: m[1], approxItems: (body.match(/\{/g) || []).length, keys: [...new Set(keys)].slice(0, 25) });
  }
  return sets;
}

function extractTypes(code) {
  const types = [];
  const re = /export\s+(?:interface|type)\s+([A-Za-z0-9_]+)\s*(?:=)?\s*([\s\S]*?)(?=\nexport\s+(?:interface|type)|\n\s*\/\*|\n\}|$)/g;
  let m;
  while ((m = re.exec(code))) {
    const body = m[2].trim();
    const fields = [...body.matchAll(/(?:^|[;{\n])\s*([A-Za-z0-9_]+\??)\s*:/g)].map((f) => f[1]).slice(0, 30);
    types.push({ name: m[1], fields });
  }
  return types;
}

// ---------- per-file pass ----------
for (const f of files) {
  const rel = path.relative(ROOT, f);
  const code = fs.readFileSync(f, "utf8");

  if (f.endsWith(".tsx") && rel.startsWith("app/")) {
    const route = "/" + rel.replace(/^app\//, "").replace(/\/page\.tsx$/, "").replace(/page\.tsx$/, "");
    const forms = extractForms(code);
    const tables = extractTables(code);
    const actions = extractActions(code);
    const mocks = extractMockData(code);
    out.routes.push({
      route: route === "/" ? "/" : route.replace(/\/$/, ""),
      file: rel,
      lines: code.split("\n").length,
      isClient: /^"use client"/.test(code),
      forms, tables, actions: actions.slice(0, 40), mockDatasets: mocks,
      usesFetch: /fetch\(|axios/.test(code),
      usesRouter: /useRouter|router\.(push|replace)/.test(code),
      useStateCount: (code.match(/useState/g) || []).length,
    });
    mocks.forEach((m) => out.mockDatasets.push({ route, ...m }));
  } else if (f.endsWith(".ts") || f.endsWith(".tsx")) {
    const types = extractTypes(code);
    types.forEach((t) => out.interfaces.push({ file: rel, ...t }));
    if (/fetch\(|axios|api\//.test(code)) {
      const urls = [...code.matchAll(/["'`](\/api\/[^"'`]+|https?:\/\/[^"'`]*)["'`]/g)].map((u) => u[1]);
      out.apiCalls.push({ file: rel, urls: [...new Set(urls)] });
    }
    if (/password|token|session|auth|login/i.test(code) && /useState|localStorage|cookie/.test(code)) {
      out.authSignals.push({ file: rel, hints: [...new Set((code.match(/password|token|session|localStorage|cookie|jwt/gi) || []))].slice(0, 10) });
    }
    if (rel.startsWith("lib/") || rel.startsWith("components/")) out.components.push(rel);
  }
}

// env usage
for (const f of files) {
  const code = fs.readFileSync(f, "utf8");
  const m = code.match(/process\.env\.([A-Z0-9_]+)/g);
  if (m) out.envUsage.push({ file: path.relative(ROOT, f), vars: [...new Set(m)] });
}

fs.writeFileSync(path.join(__dirname, "audit-out.json"), JSON.stringify(out, null, 2));

// ---------- summary ----------
console.log(`ROUTES: ${out.routes.length}`);
for (const r of out.routes) {
  const bits = [];
  if (r.forms.length) bits.push(`forms:${r.forms.length}`);
  if (r.tables.length) bits.push(`tables:${r.tables.length}(${r.tables[0]?.length}col)`);
  if (r.mockDatasets.length) bits.push(`mock:${r.mockDatasets.map((m) => m.name).join(",")}`);
  if (r.actions.length) bits.push(`actions:${r.actions.length}`);
  if (r.usesFetch) bits.push("FETCH");
  console.log(`  ${r.route.padEnd(22)} ${r.lines.toString().padStart(4)}L ${r.isClient ? "client" : "server"} ${bits.join(" ")}`);
}
console.log(`\nINTERFACES/TYPES: ${out.interfaces.length}`);
const byFile = {};
out.interfaces.forEach((i) => (byFile[i.file] = (byFile[i.file] || 0) + 1));
Object.entries(byFile).forEach(([f, n]) => console.log(`  ${f}: ${n}`));
console.log(`\nAPI CALLS FOUND: ${out.apiCalls.length}`);
out.apiCalls.forEach((a) => console.log(`  ${a.file} -> ${a.urls.join(", ") || "(none)"}`));
console.log(`\nENV USAGE: ${JSON.stringify(out.envUsage)}`);
console.log(`\nAUTH SIGNALS: ${out.authSignals.map((a) => a.file).join(", ") || "none"}`);
console.log(`\nTOTAL mock datasets: ${out.mockDatasets.length}`);
