import { INSTITUTION_METADATA, type InstitutionMetadata } from "./institutionMetadata";

const GENERIC_INSTITUTION_TOKENS = new Set([
  "and",
  "the",
  "of",
  "bank",
  "banking",
  "corporation",
  "corp",
  "company",
  "co",
  "inc",
  "limited",
  "ltd",
  "fund",
  "philippines",
  "philippine",
  "ph",
]);

type InstitutionIndexEntry = {
  institution: InstitutionMetadata;
  compactValues: string[];
  coreCompactValues: string[];
  coreTokens: string[];
  lookupKeySet: Set<string>;
  coreTokenSet: Set<string>;
};

function normalizeInstitutionText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function compactInstitutionText(value: string): string {
  return normalizeInstitutionText(value).replace(/\s+/g, "");
}

function uniqueStrings(values: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    if (!value) continue;
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }

  return result;
}

function toCoreTokens(value: string): string[] {
  const normalized = normalizeInstitutionText(value);
  if (!normalized) return [];

  return normalized
    .split(" ")
    .filter((token) => token.length > 0)
    .filter((token) => !GENERIC_INSTITUTION_TOKENS.has(token));
}

function toAcronym(value: string): string {
  const tokens = normalizeInstitutionText(value).split(" ").filter(Boolean);
  if (tokens.length < 2) return "";
  return tokens.map((token) => token[0]).join("");
}

function getDomainVariants(domain: string): string[] {
  const firstLabel = domain.trim().toLowerCase().split(".")[0] ?? "";
  if (!firstLabel) return [];

  const variants = [firstLabel];
  if (firstLabel.endsWith("ph") && firstLabel.length > 2) {
    variants.push(firstLabel.slice(0, -2));
  }

  return uniqueStrings(variants);
}

function sameInstitution(left: InstitutionMetadata, right: InstitutionMetadata): boolean {
  return left.name === right.name && left.domain === right.domain;
}

function createInstitutionIndexEntry(institution: InstitutionMetadata): InstitutionIndexEntry {
  const rawValues = uniqueStrings([
    institution.name,
    ...(institution.aliases ?? []),
    ...getDomainVariants(institution.domain),
  ]);

  const normalizedValues = uniqueStrings(rawValues.map((value) => normalizeInstitutionText(value)));
  const compactValues = uniqueStrings(normalizedValues.map((value) => value.replace(/\s+/g, "")));

  const coreTokenGroups = rawValues
    .map((value) => uniqueStrings(toCoreTokens(value)))
    .filter((tokens) => tokens.length > 0);

  const coreCompactValues = uniqueStrings(coreTokenGroups.map((tokens) => tokens.join("")));
  const coreTokens = uniqueStrings(coreTokenGroups.flat());
  const acronyms = uniqueStrings(rawValues.map((value) => toAcronym(value))).filter(
    (value) => value.length >= 2
  );

  const lookupKeys = uniqueStrings([
    ...compactValues,
    ...coreCompactValues,
    ...acronyms,
    ...coreTokens,
  ]);

  return {
    institution,
    compactValues,
    coreCompactValues,
    coreTokens,
    lookupKeySet: new Set(lookupKeys),
    coreTokenSet: new Set(coreTokens),
  };
}

function createUniqueLookupMap(
  keyPairs: { key: string; institution: InstitutionMetadata }[]
): Map<string, InstitutionMetadata> {
  const owners = new Map<string, InstitutionMetadata | null>();

  for (const { key, institution } of keyPairs) {
    const normalizedKey = key.trim().toLowerCase();
    if (!normalizedKey) continue;

    const existing = owners.get(normalizedKey);
    if (existing === undefined) {
      owners.set(normalizedKey, institution);
      continue;
    }

    if (existing !== null && !sameInstitution(existing, institution)) {
      owners.set(normalizedKey, null);
    }
  }

  const uniqueMap = new Map<string, InstitutionMetadata>();
  for (const [key, institution] of owners) {
    if (institution) uniqueMap.set(key, institution);
  }

  return uniqueMap;
}

type MatchInput = {
  compact: string;
  coreCompact: string;
  coreTokens: string[];
};

function createMatchInput(value: string): MatchInput {
  const compact = compactInstitutionText(value);
  const coreTokens = uniqueStrings(toCoreTokens(value));

  return {
    compact,
    coreCompact: coreTokens.join(""),
    coreTokens,
  };
}

function scoreInstitutionMatch(entry: InstitutionIndexEntry, input: MatchInput): number {
  const { compact, coreCompact, coreTokens } = input;
  if (!compact) return 0;

  if (entry.lookupKeySet.has(compact)) return 100;
  if (coreCompact && entry.lookupKeySet.has(coreCompact)) return 95;

  let score = 0;

  for (const value of entry.compactValues) {
    if (value.startsWith(compact)) {
      score = Math.max(score, 80);
      continue;
    }

    if (compact.length >= 3 && value.includes(compact)) {
      score = Math.max(score, 65);
    }
  }

  if (coreCompact) {
    for (const value of entry.coreCompactValues) {
      if (value.startsWith(coreCompact)) {
        score = Math.max(score, 75);
        continue;
      }

      if (coreCompact.length >= 3 && value.includes(coreCompact)) {
        score = Math.max(score, 60);
      }
    }
  }

  if (coreTokens.length > 0) {
    let tokenHits = 0;
    for (const token of coreTokens) {
      if (entry.coreTokenSet.has(token)) tokenHits += 1;
    }

    if (tokenHits === coreTokens.length && tokenHits >= 2) {
      score = Math.max(score, 85);
    } else if (tokenHits >= 1 && coreTokens.length === 1) {
      score = Math.max(score, 55);
    }
  }

  return score;
}

const INSTITUTION_INDEX = INSTITUTION_METADATA.map((institution) =>
  createInstitutionIndexEntry(institution)
);

const INSTITUTION_LOOKUP = createUniqueLookupMap(
  INSTITUTION_INDEX.flatMap((entry) =>
    Array.from(entry.lookupKeySet).map((key) => ({
      key,
      institution: entry.institution,
    }))
  )
);

const CORE_TOKEN_LOOKUP = createUniqueLookupMap(
  INSTITUTION_INDEX.flatMap((entry) =>
    entry.coreTokens.map((token) => ({ key: token, institution: entry.institution }))
  )
);

export function findInstitution(name: string | null | undefined): InstitutionMetadata | undefined {
  if (!name?.trim()) return undefined;

  const input = createMatchInput(name);
  if (!input.compact) return undefined;

  const directKeys = uniqueStrings([input.compact, input.coreCompact, ...input.coreTokens]);
  for (const key of directKeys) {
    const directMatch = INSTITUTION_LOOKUP.get(key);
    if (directMatch) return directMatch;
  }

  const tokenMatches = new Set<InstitutionMetadata>();
  for (const token of input.coreTokens) {
    const tokenMatch = CORE_TOKEN_LOOKUP.get(token);
    if (tokenMatch) tokenMatches.add(tokenMatch);
  }
  if (tokenMatches.size === 1) {
    for (const match of tokenMatches) {
      return match;
    }
  }

  let bestScore = 0;
  let bestMatch: InstitutionMetadata | undefined;

  for (const entry of INSTITUTION_INDEX) {
    const score = scoreInstitutionMatch(entry, input);
    if (score <= bestScore) continue;
    bestScore = score;
    bestMatch = entry.institution;
  }

  if (bestScore >= 60) {
    return bestMatch;
  }

  return undefined;
}

export function resolveCanonicalInstitutionName(input: string | null | undefined): string | null {
  const trimmed = input?.trim();
  if (!trimmed) return null;

  const matched = findInstitution(trimmed);
  return matched?.name ?? trimmed;
}

export function filterInstitutions(query: string, limit = 5): InstitutionMetadata[] {
  if (!query.trim()) return [];

  const input = createMatchInput(query);
  if (!input.compact) return [];

  return INSTITUTION_INDEX.map((entry) => ({
    institution: entry.institution,
    score: scoreInstitutionMatch(entry, input),
  }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.institution.name.length - b.institution.name.length)
    .slice(0, Math.max(1, limit))
    .map((candidate) => candidate.institution);
}
