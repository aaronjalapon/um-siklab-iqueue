import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tokenPath = path.join(repositoryRoot, "docs/brand/design-tokens.json");
const cssPath = path.join(repositoryRoot, "frontend/src/app/globals.css");

const [tokens, css] = await Promise.all([
  readFile(tokenPath, "utf8").then(JSON.parse),
  readFile(cssPath, "utf8"),
]);

const failures = [];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function visit(value, trail = []) {
  if (!value || typeof value !== "object") return;
  if (typeof value.$cssVariable === "string" && typeof value.$value === "string") {
    const themeSelector = value.$theme === "dark" ? '[data-theme="dark"]' : ":root";
    const blockPattern = new RegExp(`${escapeRegExp(themeSelector)}\\s*\\{([\\s\\S]*?)\\}`);
    const block = css.match(blockPattern)?.[1] ?? "";
    const variablePattern = new RegExp(`${escapeRegExp(value.$cssVariable)}\\s*:\\s*${escapeRegExp(value.$value)}`, "i");
    if (!variablePattern.test(block)) {
      failures.push(`${trail.join(".")}: expected ${value.$cssVariable}: ${value.$value} in ${themeSelector}`);
    }
  }
  for (const [key, child] of Object.entries(value)) {
    if (!key.startsWith("$")) visit(child, [...trail, key]);
  }
}

visit(tokens);

if (failures.length) {
  console.error("Brand token validation failed:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log("Brand tokens match the runtime CSS variables.");
}
