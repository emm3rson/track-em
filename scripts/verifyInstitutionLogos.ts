/* eslint-disable no-console */
declare const __dirname: string;
declare const process: { argv: string[]; exitCode?: number };
declare const Buffer: {
  from: (value: string, encoding: string) => {
    length: number;
    subarray: (start: number, end?: number) => { toString: (encoding: string) => string };
    readUInt32BE: (offset: number) => number;
    [index: number]: number;
  };
};
type FsModule = {
  readFileSync: (filePath: string, encoding: string) => string;
  readdirSync: (filePath: string) => string[];
  existsSync: (filePath: string) => boolean;
};
type PathModule = {
  resolve: (...segments: string[]) => string;
  join: (...segments: string[]) => string;
};
declare function require(name: "node:fs"): FsModule;
declare function require(name: "node:path"): PathModule;

const fs = require("node:fs");
const path = require("node:path");

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf8");
}

function readOptionalFile(filePath: string): string | null {
  return fs.existsSync(filePath) ? readFile(filePath) : null;
}

function toSortedSet(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function parseInstitutionLogoKeys(source: string): string[] {
  return toSortedSet(Array.from(source.matchAll(/logoKey:\s*"([^"]+)"/g)).map((match) => match[1]));
}

function parseCatalogKeys(source: string): string[] {
  const direct = Array.from(source.matchAll(/^\s*"([^"]+)":\s*require\(/gm)).map((match) => match[1]);
  const bare = Array.from(source.matchAll(/^\s*([a-z0-9-]+):\s*require\(/gm)).map((match) => match[1]);
  return toSortedSet([...direct, ...bare]);
}

function parseManifestKeys(source: string): string[] {
  const keys: string[] = [];
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    if (trimmed.includes("institution") || trimmed.includes("---")) continue;

    const cells = trimmed.split("|").map((cell: string) => cell.trim()).filter(Boolean);
    if (cells.length < 4) continue;
    keys.push(cells[1]);
  }
  return toSortedSet(keys);
}

function isValidPng(filePath: string): boolean {
  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const bytes = Buffer.from(fs.readFileSync(filePath, "binary"), "binary");
  if (bytes.length < 24) return false;

  for (let index = 0; index < pngSignature.length; index += 1) {
    if (bytes[index] !== pngSignature[index]) return false;
  }

  const ihdr = bytes.subarray(12, 16).toString("ascii");
  if (ihdr !== "IHDR") return false;

  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  return width > 0 && height > 0;
}

function main() {
  const repoRoot = path.resolve(__dirname, "..");
  const institutionsPath = path.join(
    repoRoot,
    "src",
    "features",
    "accounts",
    "institutionMetadata.ts"
  );
  const catalogPath = path.join(
    repoRoot,
    "src",
    "features",
    "accounts",
    "institutionLogoCatalog.ts"
  );
  const manifestPath = path.join(repoRoot, "docs", "institution-logo-manifest.md");
  const assetsDir = path.join(repoRoot, "assets", "institutions");

  const institutionKeys = parseInstitutionLogoKeys(readFile(institutionsPath));
  const catalogKeys = parseCatalogKeys(readFile(catalogPath));
  const manifestSource = readOptionalFile(manifestPath);
  const manifestKeys =
    manifestSource === null ? [] : parseManifestKeys(manifestSource);
  const assetFileKeys = toSortedSet(
    fs
      .readdirSync(assetsDir)
      .filter((fileName) => fileName.toLowerCase().endsWith(".png"))
      .map((fileName) => fileName.replace(/\.png$/i, ""))
  );
  const warnings: string[] = [];

  for (const key of catalogKeys) {
    const assetPath = path.join(assetsDir, `${key}.png`);
    if (!fs.existsSync(assetPath)) {
      warnings.push(`Missing asset file: assets/institutions/${key}.png`);
    } else if (!isValidPng(assetPath)) {
      warnings.push(`Invalid or unreadable PNG asset: assets/institutions/${key}.png`);
    }
    if (manifestSource !== null && !manifestKeys.includes(key)) {
      warnings.push(`Missing manifest entry in docs/institution-logo-manifest.md: ${key}`);
    }
  }

  for (const key of catalogKeys) {
    if (!institutionKeys.includes(key)) {
      warnings.push(`Catalog key is not referenced by INSTITUTION_METADATA: ${key}`);
    }
  }

  for (const key of catalogKeys) {
    if (manifestSource !== null && !manifestKeys.includes(key)) {
      warnings.push(`Catalog key is missing in manifest: ${key}`);
    }
  }

  for (const key of manifestKeys) {
    if (!catalogKeys.includes(key)) {
      warnings.push(`Manifest key is missing in catalog: ${key}`);
    }
  }

  for (const key of manifestKeys) {
    if (!institutionKeys.includes(key)) {
      warnings.push(`Manifest key is not referenced by INSTITUTION_METADATA: ${key}`);
    }
  }

  for (const key of assetFileKeys) {
    if (!catalogKeys.includes(key)) {
      warnings.push(`Orphan asset file not referenced by institutionLogoCatalog.ts: ${key}.png`);
    }
  }

  if (warnings.length === 0) {
    console.log("[verifyInstitutionLogos] OK: no issues found.");
    return;
  }

  console.log(`[verifyInstitutionLogos] Found ${warnings.length} warning(s):`);
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }

  if (process.argv.includes("--strict")) {
    process.exitCode = 1;
  }
}

main();
