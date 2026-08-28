import { cpSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "contracts", "managed", "veilcast-market");
const target = path.join(root, "public", "midnight");

for (const dir of ["zkir", "keys"]) {
  const from = path.join(source, dir);
  const to = path.join(target, dir);
  rmSync(to, { recursive: true, force: true });
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
  console.log(`copied ${from} -> ${to}`);
}