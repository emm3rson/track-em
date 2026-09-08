import { INSTITUTION_METADATA } from "./institutionMetadata";

describe("institutionMetadata", () => {
  it("uses unique names, domains, and logo keys", () => {
    expect(INSTITUTION_METADATA.length).toBeGreaterThan(0);

    const names = new Set<string>();
    const domains = new Set<string>();
    const logoKeys = new Set<string>();

    for (const institution of INSTITUTION_METADATA) {
      expect(names.has(institution.name)).toBe(false);
      expect(domains.has(institution.domain)).toBe(false);
      expect(logoKeys.has(institution.logoKey)).toBe(false);

      names.add(institution.name);
      domains.add(institution.domain);
      logoKeys.add(institution.logoKey);
    }
  });

  it("only contains non-empty aliases and slug-safe logo keys", () => {
    for (const institution of INSTITUTION_METADATA) {
      expect(institution.logoKey).toMatch(/^[a-z0-9-]+$/);
      for (const alias of institution.aliases ?? []) {
        expect(alias.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
