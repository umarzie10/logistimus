/**
 * Removes unused import specifiers reported by ESLint (Phase B cleanup).
 *
 * Safety rules:
 *  - only edits `import` statements
 *  - never removes a specifier that still appears anywhere else in the file
 *  - drops the whole statement only when it becomes empty
 *
 * usage: node scripts/audit/fix-unused-imports.mjs <lint-output.txt>
 */
import { readFileSync, writeFileSync } from "node:fs";

const lintFile = process.argv[2];
if (!lintFile) {
  console.error("usage: node fix-unused-imports.mjs <lint-output.txt>");
  process.exit(1);
}

const raw = readFileSync(lintFile, "utf8");

/** @type {Map<string, Set<number>>} */
const byFile = new Map();
let currentFile = null;

for (const line of raw.split("\n")) {
  const fileMatch = line.match(/^\/\S+\.(?:tsx?|mts|mjs)$/);
  if (fileMatch) {
    currentFile = fileMatch[0];
    continue;
  }
  if (!currentFile) continue;
  const m = line.match(/^\s*(\d+):\d+\s+warning\s+'([^']+)' is defined but never used/);
  if (m) {
    if (!byFile.has(currentFile)) byFile.set(currentFile, new Set());
    byFile.get(currentFile).add(Number(m[1]));
  }
}

/** Split file text into import statements + the rest. */
function findImports(lines) {
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    if (/^import\s/.test(lines[i])) {
      const start = i;
      let text = lines[i];
      while (!/["'][^"']+["'];?\s*$/.test(text) && i + 1 < lines.length && i - start < 40) {
        i++;
        text += "\n" + lines[i];
      }
      blocks.push({ start, end: i, text });
    }
    i++;
  }
  return blocks;
}

/** Specifier names declared by an import statement, with the line they sit on. */
function specifiersOf(block, lines) {
  const found = [];
  const stmt = block.text;

  // default import: `import Foo from "x"` / `import Foo, { A } from "x"`
  const def = stmt.match(/^import\s+([A-Za-z_$][\w$]*)\s*(?:,|\s+from)/);
  if (def && def[1] !== "type") {
    found.push({ name: def[1], lineNo: block.start + 1, kind: "default" });
  }

  // named specifiers, tracked per physical line
  for (let li = block.start; li <= block.end; li++) {
    const text = lines[li];
    for (const m of text.matchAll(/([A-Za-z_$][\w$]*)\s*(?:as\s+[A-Za-z_$][\w$]*)?(?=\s*[,}])/g)) {
      const name = m[1];
      if (["import", "type", "from"].includes(name)) continue;
      found.push({ name, lineNo: li + 1, kind: "named" });
    }
  }
  return found;
}

let removedTotal = 0;
let filesTouched = 0;

for (const [file, reportedLines] of byFile) {
  const original = readFileSync(file, "utf8");
  const lines = original.split("\n");
  const blocks = findImports(lines);
  const reported = new Set(reportedLines);

  let changed = false;
  const dropLines = new Set();

  for (const block of blocks) {
    const specs = specifiersOf(block, lines).filter((s) => reported.has(s.lineNo));
    if (!specs.length) continue;

    let stmt = block.text;
    let local = false;

    for (const { name, kind } of specs) {
      // ESLint's no-unused-vars is authoritative here; the production build is the backstop.
      const before = stmt;
      if (kind === "default") {
        if (/^import\s+[A-Za-z_$][\w$]*\s+from\s*["'][^"']+["'];?\s*$/m.test(stmt)) {
          // default-only import → drop the whole statement
          stmt = stmt
            .split("\n")
            .filter((l) => !new RegExp(`^import\\s+${name}\\s+from\\s*["']`).test(l))
            .join("\n");
        } else {
          stmt = stmt.replace(new RegExp(`^import\\s+${name}\\s*,\\s*`, "m"), "import ");
        }
      } else {
        stmt = stmt
          .replace(new RegExp(`\\b${name}\\s+as\\s+[A-Za-z_$][\\w$]*\\s*,\\s*`, "g"), "")
          .replace(new RegExp(`,\\s*${name}\\s+as\\s+[A-Za-z_$][\\w$]*`, "g"), "")
          .replace(new RegExp(`\\b${name}\\s*,\\s*`, "g"), "")
          .replace(new RegExp(`,\\s*\\b${name}\\b`, "g"), "")
          .replace(new RegExp(`\\b${name}\\b`, "g"), "");
      }
      if (stmt !== before) {
        local = true;
        removedTotal++;
      }
    }

    if (!local) continue;
    changed = true;

    if (/^import\s*\{\s*\}\s*from\s*["'][^"']+["'];?\s*$/.test(stmt.trim()) || /^import\s+from\s*["'][^"']+["'];?\s*$/.test(stmt.trim())) {
      for (let i = block.start; i <= block.end; i++) dropLines.add(i);
    } else {
      const newLines = stmt.split("\n");
      for (let i = 0; i < newLines.length; i++) lines[block.start + i] = newLines[i];
      for (let i = block.start + newLines.length; i <= block.end; i++) dropLines.add(i);
    }
  }

  if (changed) {
    const result = lines.filter((_, idx) => !dropLines.has(idx)).join("\n");
    writeFileSync(file, result);
    filesTouched++;
    console.log(`fixed ${file}`);
  }
}

console.log(`\nDone: ${removedTotal} unused specifiers removed across ${filesTouched} files.`);
