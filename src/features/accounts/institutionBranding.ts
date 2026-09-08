import { INSTITUTION_LOGO_ASSETS } from "./institutionLogoCatalog";
import { findInstitution } from "./institutionMatching";

export type ResolvedInstitutionBranding = {
  fallbackLabel: string;
  institutionName: string | null;
  institutionLogoKey: string | null;
  localSource: number | undefined;
};

function toFallbackLabel(value: string | null | undefined): string {
  const source = (value ?? "").trim();
  if (!source) return "?";

  const tokens = source
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) return "?";
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
  return `${tokens[0][0] ?? ""}${tokens[1][0] ?? ""}`.toUpperCase();
}

export function resolveInstitutionBranding(input: {
  institution?: string | null;
  accountName?: string | null;
}): ResolvedInstitutionBranding {
  const matchedInstitution = findInstitution(input.institution);
  const fallbackLabel = toFallbackLabel(
    matchedInstitution?.name ?? input.institution ?? input.accountName
  );
  const logoKey = matchedInstitution?.logoKey ?? null;
  const localSource = logoKey ? INSTITUTION_LOGO_ASSETS[logoKey] : undefined;

  return {
    fallbackLabel,
    institutionName: matchedInstitution?.name ?? null,
    institutionLogoKey: logoKey,
    localSource,
  };
}
