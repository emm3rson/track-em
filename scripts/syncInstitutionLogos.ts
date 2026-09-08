/* eslint-disable no-console */
declare const __dirname: string;
declare const process: { argv: string[]; exitCode?: number };
declare const Buffer: {
  from: (value: string | Uint8Array, encoding?: string) => {
    length: number;
    equals: (other: unknown) => boolean;
    [index: number]: number;
  };
};
type FsModule = {
  readFileSync: (filePath: string, encoding?: string) => string | Uint8Array;
  writeFileSync: (filePath: string, content: string | Uint8Array, encoding?: string) => void;
  readdirSync: (dirPath: string) => string[];
  existsSync: (filePath: string) => boolean;
};
type PathModule = {
  resolve: (...segments: string[]) => string;
  join: (...segments: string[]) => string;
};
declare function require(name: "node:fs"): FsModule;
declare function require(name: "node:path"): PathModule;
declare function require(name: "sharp"): unknown;

const fs = require("node:fs");
const path = require("node:path");

type InstitutionMeta = {
  name: string;
  logoKey: string;
};

type ManifestRow = {
  institution: string;
  logoKey: string;
  sourceUrl: string;
  lastChecked: string;
};

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf8") as string;
}

function readOptionalFile(filePath: string): string | null {
  return fs.existsSync(filePath) ? readFile(filePath) : null;
}

function normalizeLineEndings(source: string): string {
  return source.replace(/\r\n/g, "\n");
}

function readBytes(filePath: string): Uint8Array {
  return fs.readFileSync(filePath) as Uint8Array;
}

function isPngSignature(bytes: Uint8Array): boolean {
  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < pngSignature.length) return false;
  for (let index = 0; index < pngSignature.length; index += 1) {
    if (bytes[index] !== pngSignature[index]) return false;
  }
  return true;
}

function parseInstitutions(source: string): InstitutionMeta[] {
  const arrayMatch = source.match(
    /export const INSTITUTION_METADATA(?:\s*:\s*[^=]+)?\s*=\s*\[([\s\S]*?)\n\];/
  );
  if (!arrayMatch) {
    throw new Error(
      "Unable to locate INSTITUTION_METADATA array in institutionMetadata.ts"
    );
  }

  const listText = arrayMatch[1];
  const result: InstitutionMeta[] = [];
  const objectRegex = /\{([\s\S]*?)\n\s*\},?/g;

  for (const match of listText.matchAll(objectRegex)) {
    const block = match[1];
    const name = block.match(/name:\s*"([^"]+)"/)?.[1];
    const logoKey = block.match(/logoKey:\s*"([^"]+)"/)?.[1];
    if (!name || !logoKey) continue;
    result.push({ name, logoKey });
  }

  return result;
}

function parseManifest(source: string): Map<string, ManifestRow> {
  const rows = new Map<string, ManifestRow>();

  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    if (trimmed.includes("institution") || trimmed.includes("---")) continue;

    const cells = trimmed.split("|").map((cell) => cell.trim()).filter(Boolean);
    if (cells.length < 4) continue;

    rows.set(cells[1], {
      institution: cells[0],
      logoKey: cells[1],
      sourceUrl: cells[2],
      lastChecked: cells[3],
    });
  }

  return rows;
}

function buildCatalog(keys: string[]): string {
  const lines: string[] = [];
  lines.push("// AUTO-GENERATED FILE. DO NOT EDIT MANUALLY.");
  lines.push("// Run: npm run logos:sync");
  lines.push(
    "// Curated bundled logos only. Missing keys fall through to brand-color initials avatars (100% offline)."
  );
  lines.push("export const INSTITUTION_LOGO_ASSETS: Record<string, number> = {");

  for (const key of keys) {
    const entry = /^[a-z_][a-z0-9_]*$/i.test(key) ? key : `"${key}"`;
    lines.push(`  ${entry}: require("../../../assets/institutions/${key}.png"),`);
  }

  lines.push("};");
  lines.push("");
  return lines.join("\n");
}

function buildManifest(rows: ManifestRow[]): string {
  const lines: string[] = [];
  lines.push("# Institution Logo Manifest");
  lines.push("");
  lines.push("AUTO-GENERATED FILE. DO NOT EDIT MANUALLY.");
  lines.push("Run: `npm run logos:sync`");
  lines.push("");
  lines.push("Lightweight provenance log for bundled official institution logos.");
  lines.push("Primary runtime usage:");
  lines.push("- `src/components/ui/InstitutionLogo.tsx`");
  lines.push("- `src/features/accounts/institutionLogoCatalog.ts`");
  lines.push("");
  lines.push("| institution | logoKey | source_url | last_checked |");
  lines.push("| --- | --- | --- | --- |");

  for (const row of rows) {
    lines.push(
      `| ${row.institution} | ${row.logoKey} | ${row.sourceUrl} | ${row.lastChecked} |`
    );
  }

  lines.push("");
  return lines.join("\n");
}

type SharpLike = {
  (input: string | Uint8Array): {
    png: () => { toBuffer: () => Promise<Uint8Array> };
  };
};

async function renderSvgToPng(svgPath: string): Promise<Uint8Array> {
  const sharpModule = require("sharp") as { default?: SharpLike } | SharpLike;
  const sharp = (sharpModule as { default?: SharpLike }).default ?? (sharpModule as SharpLike);
  return sharp(readBytes(svgPath)).png().toBuffer();
}

async function normalizeImageToPng(imagePath: string): Promise<Uint8Array> {
  const sharpModule = require("sharp") as { default?: SharpLike } | SharpLike;
  const sharp = (sharpModule as { default?: SharpLike }).default ?? (sharpModule as SharpLike);
  return sharp(readBytes(imagePath)).png().toBuffer();
}

async function main() {
  const checkOnly = process.argv.includes("--check");
  const repoRoot = path.resolve(__dirname, "..");
  const institutionsPath = path.join(
    repoRoot,
    "src",
    "features",
    "accounts",
    "institutionMetadata.ts"
  );
  const manifestPath = path.join(repoRoot, "docs", "institution-logo-manifest.md");
  const catalogPath = path.join(
    repoRoot,
    "src",
    "features",
    "accounts",
    "institutionLogoCatalog.ts"
  );
  const assetsPath = path.join(repoRoot, "assets", "institutions");

  const institutions = parseInstitutions(readFile(institutionsPath));
  const institutionByKey = new Map(institutions.map((entry) => [entry.logoKey, entry]));
  const assetFiles = fs.readdirSync(assetsPath);
  const pngKeys = assetFiles
    .filter((fileName) => fileName.toLowerCase().endsWith(".png"))
    .map((fileName) => fileName.replace(/\.png$/i, ""));
  const svgKeys = assetFiles
    .filter((fileName) => fileName.toLowerCase().endsWith(".svg"))
    .map((fileName) => fileName.replace(/\.svg$/i, ""));
  const assetKeys = Array.from(new Set([...pngKeys, ...svgKeys])).sort((a, b) =>
    a.localeCompare(b)
  );

  const unknownKeys = assetKeys.filter((key) => !institutionByKey.has(key));
  if (unknownKeys.length > 0) {
    console.error(
      "[syncInstitutionLogos] Found PNG files not mapped in INSTITUTION_METADATA:"
    );
    for (const key of unknownKeys) {
      console.error(`- ${key}.png`);
    }
    console.error(
      "[syncInstitutionLogos] Rename files to an existing logoKey or add the institution entry first."
    );
    process.exitCode = 1;
    return;
  }

  const conversionErrors: string[] = [];
  let convertedCount = 0;
  for (const key of svgKeys.sort((a, b) => a.localeCompare(b))) {
    const svgPath = path.join(assetsPath, `${key}.svg`);
    const pngPath = path.join(assetsPath, `${key}.png`);

    try {
      const renderedPng = await renderSvgToPng(svgPath);
      const existingPng = fs.existsSync(pngPath) ? readBytes(pngPath) : null;
      const needsWrite = !existingPng || !Buffer.from(renderedPng).equals(Buffer.from(existingPng));

      if (!needsWrite) continue;

      if (checkOnly) {
        conversionErrors.push(`- assets/institutions/${key}.svg -> ${key}.png`);
        continue;
      }

      fs.writeFileSync(pngPath, renderedPng);
      convertedCount += 1;
      console.log(`[syncInstitutionLogos] Converted ${key}.svg -> ${key}.png`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[syncInstitutionLogos] Failed to convert ${key}.svg: ${message}`);
      process.exitCode = 1;
      return;
    }
  }

  if (checkOnly && conversionErrors.length > 0) {
    console.error("[syncInstitutionLogos] SVG conversions are out of date. Run: npm run logos:sync");
    for (const line of conversionErrors) {
      console.error(line);
    }
    process.exitCode = 1;
    return;
  }

  const normalizeErrors: string[] = [];
  for (const key of pngKeys.sort((a, b) => a.localeCompare(b))) {
    if (svgKeys.includes(key)) continue;

    const pngPath = path.join(assetsPath, `${key}.png`);
    const existingPng = readBytes(pngPath);
    if (isPngSignature(existingPng)) continue;

    try {
      const normalizedPng = await normalizeImageToPng(pngPath);

      if (checkOnly) {
        normalizeErrors.push(`- assets/institutions/${key}.png`);
        continue;
      }

      fs.writeFileSync(pngPath, normalizedPng);
      convertedCount += 1;
      console.log(`[syncInstitutionLogos] Normalized ${key}.png to true PNG bytes`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[syncInstitutionLogos] Failed to normalize ${key}.png: ${message}`);
      process.exitCode = 1;
      return;
    }
  }

  if (checkOnly && normalizeErrors.length > 0) {
    console.error("[syncInstitutionLogos] PNG normalization is required. Run: npm run logos:sync");
    for (const line of normalizeErrors) {
      console.error(line);
    }
    process.exitCode = 1;
    return;
  }

  const currentManifest = readOptionalFile(manifestPath);
  const previousManifest =
    currentManifest === null ? new Map<string, ManifestRow>() : parseManifest(currentManifest);
  const today = new Date().toISOString().slice(0, 10);
  const manifestRows = assetKeys.map((key) => {
    const institution = institutionByKey.get(key);
    if (!institution) {
      throw new Error(`Missing institution metadata for key: ${key}`);
    }
    const previous = previousManifest.get(key);
    return {
      institution: institution.name,
      logoKey: key,
      sourceUrl: previous?.sourceUrl ?? `manual://local-drop/${key}.png`,
      lastChecked: previous?.lastChecked ?? today,
    };
  });

  const nextCatalog = buildCatalog(assetKeys);
  const nextManifest = buildManifest(manifestRows);
  const currentCatalog = readFile(catalogPath);
  const manifestChanged =
    currentManifest !== null &&
    normalizeLineEndings(currentManifest) !== normalizeLineEndings(nextManifest);

  const catalogChanged =
    normalizeLineEndings(currentCatalog) !== normalizeLineEndings(nextCatalog);

  if (checkOnly) {
    if (catalogChanged || manifestChanged) {
      console.error(
        "[syncInstitutionLogos] Generated files are out of date. Run: npm run logos:sync"
      );
      if (catalogChanged) console.error("- src/features/accounts/institutionLogoCatalog.ts");
      if (manifestChanged) console.error("- docs/institution-logo-manifest.md");
      process.exitCode = 1;
      return;
    }
    console.log("[syncInstitutionLogos] OK: generated files are up to date.");
    return;
  }

  if (catalogChanged) {
    fs.writeFileSync(catalogPath, nextCatalog, "utf8");
    console.log("[syncInstitutionLogos] Updated institutionLogoCatalog.ts");
  }

  if (manifestChanged) {
    fs.writeFileSync(manifestPath, nextManifest, "utf8");
    console.log("[syncInstitutionLogos] Updated institution-logo-manifest.md");
  }

  if (currentManifest === null) {
    console.log(
      "[syncInstitutionLogos] Skipped ignored docs/institution-logo-manifest.md (not present)."
    );
  }

  if (!catalogChanged && !manifestChanged) {
    if (convertedCount === 0) {
      console.log("[syncInstitutionLogos] No changes needed.");
    }
  }
}

void main().catch((error) => {
  console.error("[syncInstitutionLogos] failed:", error);
  process.exitCode = 1;
});
