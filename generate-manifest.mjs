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

// Extract image dimensions by parsing common image-format headers.
// Reads the whole file: simple, dependency-free, fine for a static gallery.
async function readImageSize(filepath) {
  const buf = await readFile(filepath);

  // PNG: \x89PNG\r\n\x1a\n then IHDR at offset 16.
  if (
    buf.length >= 24 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }

  // GIF: "GIF87a" or "GIF89a"; LE width/height at offset 6.
  if (
    buf.length >= 10 &&
    buf[0] === 0x47 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46
  ) {
    return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
  }

  // WebP: "RIFF"...."WEBP".
  if (
    buf.length >= 30 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    const fourCC = buf.toString("ascii", 12, 16);
    if (fourCC === "VP8 ") {
      return {
        width: buf.readUInt16LE(26) & 0x3fff,
        height: buf.readUInt16LE(28) & 0x3fff,
      };
    }
    if (fourCC === "VP8L") {
      const b0 = buf[21], b1 = buf[22], b2 = buf[23], b3 = buf[24];
      return {
        width: 1 + (((b1 & 0x3f) << 8) | b0),
        height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
      };
    }
    if (fourCC === "VP8X") {
      return {
        width: 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16)),
        height: 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16)),
      };
    }
  }

  // JPEG: walk segments to the first SOFn marker.
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) return null;
      let marker = buf[i + 1];
      i += 2;
      while (marker === 0xff && i < buf.length) marker = buf[i++];
      if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
        continue;
      }
      if (
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc
      ) {
        return {
          height: buf.readUInt16BE(i + 3),
          width: buf.readUInt16BE(i + 5),
        };
      }
      const segLen = buf.readUInt16BE(i);
      i += segLen;
    }
  }

  return null;
}

let prior = [];
try {
  prior = JSON.parse(await readFile(OUT, "utf8"));
  if (!Array.isArray(prior)) prior = [];
} catch {
  prior = [];
}

const srcOf = (item) => (typeof item === "string" ? item : item?.src);
const priorBySrc = new Map(
  prior.filter((e) => srcOf(e)).map((e) => [srcOf(e), e])
);

const entries = await readdir(PHOTOS_DIR, { withFileTypes: true });
const files = entries
  .filter((e) => e.isFile() && EXTS.has(path.extname(e.name).toLowerCase()))
  .map((e) => `${PHOTOS_DIR}/${e.name}`);

const items = [];
for (const src of files) {
  const old = priorBySrc.get(src);
  if (old && typeof old === "object" && old.width && old.height) {
    items.push(old);
    continue;
  }
  const size = await readImageSize(src).catch(() => null);
  items.push(size ? { src, width: size.width, height: size.height } : { src });
}

// Sort by filename, descending — newest camera shots (highest DSCF number)
// appear first. Uses natural comparison so DSCF1000 sorts after DSCF999.
const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});
items.sort((a, b) => collator.compare(b.src, a.src));

await writeFile(OUT, JSON.stringify(items, null, 2) + "\n");

console.log(
  `photos.json: ${items.length} photos sorted by filename (newest first)`
);
