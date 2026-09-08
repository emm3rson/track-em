import { resolveInstitutionBranding } from "./institutionBranding";

type ResolverInput = {
  institution?: string | null;
  accountName?: string | null;
};

type BaseLogoResolution = {
  fallbackLabel: string;
  institutionName: string | null;
  institutionLogoKey: string | null;
};

type LocalLogoResolution = BaseLogoResolution & {
  kind: "local";
  source: number;
};

type InitialsLogoResolution = BaseLogoResolution & {
  kind: "initials";
  reason: "missing-source";
};

export type InstitutionLogoResolution = LocalLogoResolution | InitialsLogoResolution;

export function resolveInstitutionLogoSource({
  institution,
  accountName,
}: ResolverInput): InstitutionLogoResolution {
  const branding = resolveInstitutionBranding({ institution, accountName });

  if (branding.localSource !== undefined) {
    return {
      kind: "local",
      source: branding.localSource,
      fallbackLabel: branding.fallbackLabel,
      institutionName: branding.institutionName,
      institutionLogoKey: branding.institutionLogoKey,
    };
  }

  return {
    kind: "initials",
    reason: "missing-source",
    fallbackLabel: branding.fallbackLabel,
    institutionName: branding.institutionName,
    institutionLogoKey: branding.institutionLogoKey,
  };
}
