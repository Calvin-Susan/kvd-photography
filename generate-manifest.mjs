import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const PHOTOS_DIR = "photos";
const OUT = "photos.json";
const EXTS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
  ".gif",
  ".heic",
  ".heif",
]);

// Read current photos.json so we can preserve any manual ordering.
let current = [];
try {
  current = JSON.parse(await readFile(OUT, "utf8"));
  if (!Array.isArray(current)) current = [];
} catch {
  current = [];
}

// Discover all photos on disk.
const entries = await readdir(PHOTOS_DIR, { withFileTypes: true });
const present = new Set(
  entries
    .filter((e) => e.isFile() && EXTS.has(path.extname(e.name).toLowerCase()))
    .map((e) => `${PHOTOS_DIR}/${e.name}`)
);

const srcOf = (item) => (typeof item === "string" ? item : item?.src);

// Keep entries that still exist on disk, in their existing order.
const kept = current.filter((item) => present.has(srcOf(item)));

// Append any new photos (alphabetical so additions are predictable).
const known = new Set(kept.map(srcOf));
const added = [...present].filter((p) => !known.has(p)).sort();

const updated = [...kept, ...added];
await writeFile(OUT, JSON.stringify(updated, null, 2) + "\n");

const removed = current.length - kept.length;
console.log(
  `photos.json: ${kept.length} kept, ${added.length} added, ${removed} removed (total ${updated.length})`
);
