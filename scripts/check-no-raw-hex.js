#!/usr/bin/env node
/**
 * R6 (I21) CI guard: no raw `#hex` color literal in `src/**` or `app/**` outside
 * `src/theme/`, the single source of truth for color values (ADR-0021). A raw
 * hex duplicated from a token drifts silently the next time the token changes
 * — this is exactly how BrandSplash/WelcomeScreen/ProgressScreen ended up with
 * stale/undocumented greens.
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const SCAN_DIRS = ["src", "app"];
const EXCLUDE_DIRS = new Set(["theme", "node_modules", ".expo", "dist", "__tests__"]);
const FILE_EXT = /\.(ts|tsx)$/;
const HEX_LITERAL = /#[0-9A-Fa-f]{3}\b|#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{8}\b/g;

/**
 * Pre-existing hex usage this R6 pass didn't touch — each is a design decision
 * outside I21's scope (a generic non-brand shadow color, and two bespoke
 * one-off gradient colors that don't duplicate any existing token), not an
 * oversight. Tracked as follow-up debt rather than silently ignored; remove an
 * entry here as each is resolved.
 */
const ALLOWLIST = new Set([
  "src/components/Segmented.tsx", // shadowColor: "#000" — iOS shadow convention, not a design token
  "app/(onboarding)/start-free.tsx", // bespoke trial-card gradient colors, not duplicates of any token
]);

/** @typedef {{ file: string, line: number, snippet: string }} Violation */

/** @returns {Violation[]} */
function findViolations(file, source) {
  const violations = [];
  const lines = source.split("\n");
  lines.forEach((lineText, idx) => {
    const matches = lineText.match(HEX_LITERAL);
    if (matches) {
      for (const m of matches) {
        violations.push({ file, line: idx + 1, snippet: `${m} — ${lineText.trim()}` });
      }
    }
  });
  return violations;
}

function walk(dir) {
  /** @type {string[]} */
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      files.push(...walk(path.join(dir, entry.name)));
    } else if (FILE_EXT.test(entry.name)) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

function run() {
  /** @type {Violation[]} */
  const violations = [];
  for (const dir of SCAN_DIRS) {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const file of walk(abs)) {
      const relative = path.relative(ROOT, file).replace(/\\/g, "/");
      if (ALLOWLIST.has(relative)) continue;
      violations.push(...findViolations(relative, fs.readFileSync(file, "utf8")));
    }
  }

  if (violations.length > 0) {
    console.error("Raw #hex color literal(s) found outside src/theme/ (ADR-0021):\n");
    for (const v of violations) {
      console.error(`  ${v.file}:${v.line} — ${v.snippet}`);
    }
    console.error("\nAdd a token to src/theme/colors.ts and reference it instead.");
    process.exit(1);
  }
  console.log("OK — no raw hex color literals outside src/theme/.");
}

module.exports = { findViolations };

if (require.main === module) run();
