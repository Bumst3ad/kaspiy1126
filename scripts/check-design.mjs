// Design-slop guard. Exit 1 on any violation. Usage: node scripts/check-design.mjs
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = "src";
const EXT = /\.(tsx|jsx|ts|js|css)$/;
// Files where raw hex colours are allowed (single source of truth).
const HEX_ALLOWED = [/src[\\/]styles[\\/]tokens\.css$/, /src[\\/]design[\\/]/];

const PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";

const RULES = [
  { name: "hex colour outside tokens", re: /#[0-9a-fA-F]{3,8}\b/, hex: true },
  { name: "gradient", re: /\b(bg-gradient-|linear-gradient|radial-gradient|conic-gradient)|\b(from|via|to)-(\[|(?:${P})-\d)/ },
  { name: "coloured shadow / glow", re: /\bshadow-(\[|(?:${P})-)|drop-shadow-(\[|(?:${P})-)/ },
  { name: "raw Tailwind palette colour", re: /\b(text|bg|border|ring|fill|stroke|outline|divide|decoration|accent|caret)-(?:${P})-\d{2,3}\b/ },
  { name: "decorative animation", re: /\banimate-(pulse|bounce|ping)\b/ },
  { name: "emoji in source", re: /\p{Extended_Pictographic}/u },
].map((r) => ({ ...r, re: new RegExp(r.re.source.replaceAll("${P}", PALETTE), r.re.flags) }));

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (EXT.test(p)) yield p;
  }
}

let violations = 0;
for (const file of walk(ROOT)) {
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    if (line.includes("check-design-ignore")) return;
    for (const rule of RULES) {
      if (rule.hex && HEX_ALLOWED.some((a) => a.test(file))) continue;
      if (rule.re.test(line)) {
        violations++;
        console.error(`${relative(".", file)}:${i + 1}  [${rule.name}]  ${line.trim().slice(0, 100)}`);
      }
    }
  });
}

if (violations) {
  console.error(`\ncheck:design FAILED — ${violations} violation(s). Use tokens from src/styles/tokens.css.`);
  process.exit(1);
}
console.log("check:design OK");
