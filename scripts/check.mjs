import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const roots = ["src", "test", "scripts"];
const files = [];
for (const directory of roots) {
  for (const name of await readdir(path.join(root, directory))) {
    if (name.endsWith(".mjs")) files.push(path.join(root, directory, name));
  }
}
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(`Syntax check: PASS (${files.length} modules)`);
