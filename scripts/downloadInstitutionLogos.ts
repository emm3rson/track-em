/* eslint-disable no-console */
declare const __dirname: string;
declare const process: { exitCode?: number; env: Record<string, string | undefined> };
type FsModule = {
  readFileSync: (filePath: string, encoding: string) => string;
  writeFileSync: (filePath: string, content: string | Uint8Array, encoding?: string) => void;
  existsSync: (filePath: string) => boolean;
  mkdirSync: (filePath: string, options?: { recursive?: boolean }) => void;
};
type PathModule = {
  resolve: (...segments: string[]) => string;
  join: (...segments: string[]) => string;
};
type FetchInit = {
  method?: string;
  redirect?: "follow" | "error" | "manual";
  headers?: Record<string, string>;
  signal?: unknown;
};
type FetchResponse = {
  ok: boolean;
  headers: { get: (name: string) => string | null };
  arrayBuffer: () => Promise<ArrayBuffer>;
};
declare function require(name: "node:fs"): FsModule;
declare function require(name: "node:path"): PathModule;
declare const fetch: (input: string, init?: FetchInit) => Promise<FetchResponse>;
declare const AbortSignal: { timeout: (milliseconds: number) => unknown };

const fs = require("node:fs");
const path = require("node:path");

type InstitutionMeta = {
  name: string;
  logoKey: string;
  domain: string;
};

type ManifestRow = {
  institution: string;
  logoKey: string;
  sourceUrl: string;
  lastChecked: string;
};

const SOURCE_OVERRIDES: Record<string, string> = {
  pagibig:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Pag-IBIG.svg/330px-Pag-IBIG.svg.png",
  maribank:
    "https://cdn.brandfetch.io/idpLlWyNrG/w/200/h/200/theme/dark/icon.jpeg?c=1bxid64Mup7aczewSAYMX&t=1768396570883",
};

function getBrandfetchPngUrl(domain: string): string {
  const clientId = process.env.BRANDFETCH_CLIENT_ID ?? "";
  const clientParam = clientId ? `?c=${clientId}` : "";
  return `https://cdn.brandfetch.io/${domain}/w/256/h/256/icon.png${clientParam}`;
}

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf8");
}

function writeFile(filePath: string, content: string): void {
  fs.writeFileSync(filePath, content, "utf8");
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
    const domain = block.match(/domain:\s*"([^"]+)"/)?.[1];
    if (!name || !logoKey || !domain) continue;

    result.push({ name, logoKey, domain });
  }

  return result;
}

function parseManifest(source: string): Map<string, ManifestRow> {
  const rows = new Map<string, ManifestRow>();

  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    if (trimmed.includes("institution") || trimmed.includes("---")) continue;

    const cells = trimmed.split("|").map((cell: string) => cell.trim()).filter(Boolean);
    if (cells.length < 4) continue;

    const row: ManifestRow = {
      institution: cells[0],
      logoKey: cells[1],
      sourceUrl: cells[2],
      lastChecked: cells[3],
    };
    rows.set(row.logoKey, row);
  }

  return rows;
}

function parseCatalogKeys(source: string): string[] {
  const direct = Array.from(source.matchAll(/^\s*"([^"]+)":\s*require\(/gm)).map(
    (match) => match[1]
  );
  const bare = Array.from(source.matchAll(/^\s*([a-z0-9-]+):\s*require\(/gm)).map(
    (match) => match[1]
  );
  return Array.from(new Set([...direct, ...bare]));
}

function getCandidates(entry: InstitutionMeta): string[] {
  const candidates: string[] = [];
  const override = SOURCE_OVERRIDES[entry.logoKey];
  if (override) {
    candidates.push(override);
  }
  candidates.push(getBrandfetchPngUrl(entry.domain));
  return candidates;
}

async function fetchImage(url: string): Promise<Uint8Array | null> {
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        Accept: "image/png,image/webp,image/jpeg,image/*;q=0.9,*/*;q=0.1",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return null;

    const contentType = String(response.headers.get("content-type") ?? "").toLowerCase();
    if (!contentType.startsWith("image/")) return null;

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length < 500) return null;
    return bytes;
  } catch {
    return null;
  }
}

function buildManifest(rows: ManifestRow[]): string {
  const lines: string[] = [];
  lines.push("# Institution Logo Manifest");
  lines.push("");
  lines.push("Lightweight provenance log for bundled institution logos.");
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

async function main() {
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
  const assetDir = path.join(repoRoot, "assets", "institutions");

  if (!fs.existsSync(assetDir)) {
    fs.mkdirSync(assetDir, { recursive: true });
  }

  const institutions = parseInstitutions(readFile(institutionsPath));
  const bundledLogoKeys = new Set(parseCatalogKeys(readFile(catalogPath)));
  const bundledInstitutions = institutions.filter((entry) => bundledLogoKeys.has(entry.logoKey));
  const previousManifest = fs.existsSync(manifestPath)
    ? parseManifest(readFile(manifestPath))
    : new Map<string, ManifestRow>();

  const today = new Date().toISOString().slice(0, 10);
  const manifestRows: ManifestRow[] = [];
  let downloaded = 0;
  let kept = 0;
  let unresolved = 0;

  for (const entry of bundledInstitutions) {
    const candidates = getCandidates(entry);
    const outputPath = path.join(assetDir, `${entry.logoKey}.png`);
    let appliedSource: string | null = null;

    for (const candidate of candidates) {
      const bytes = await fetchImage(candidate);
      if (!bytes) continue;
      fs.writeFileSync(outputPath, bytes);
      appliedSource = candidate;
      downloaded += 1;
      console.log(`[downloaded] ${entry.logoKey} <- ${candidate}`);
      break;
    }

    if (!appliedSource) {
      kept += 1;
      const previous = previousManifest.get(entry.logoKey);
      appliedSource = previous?.sourceUrl ?? "manual://pending";
      if (!previous) {
        unresolved += 1;
      }
      console.log(`[kept] ${entry.logoKey} (${appliedSource})`);
    }

    manifestRows.push({
      institution: entry.name,
      logoKey: entry.logoKey,
      sourceUrl: appliedSource,
      lastChecked: today,
    });
  }

  writeFile(manifestPath, buildManifest(manifestRows));
  console.log(
    `[done] downloaded=${downloaded}, kept=${kept}, unresolved=${unresolved}, bundled=${bundledInstitutions.length}`
  );
}

void main().catch((error) => {
  console.error("[downloadInstitutionLogos] failed:", error);
  process.exitCode = 1;
});
