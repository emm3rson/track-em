export type InstitutionMetadata = {
  name: string;
  domain: string;
  logoKey: string;
  aliases?: string[];
};

export const INSTITUTION_METADATA: readonly InstitutionMetadata[] = [
  {
    name: "BPI",
    domain: "bpi.com.ph",
    logoKey: "bpi",
    aliases: ["Bank of the Philippine Islands"],
  },
  {
    name: "BDO",
    domain: "bdo.com.ph",
    logoKey: "bdo",
    aliases: ["Banco de Oro"],
  },
  {
    name: "Metrobank",
    domain: "metrobank.com.ph",
    logoKey: "metrobank",
    aliases: ["Metropolitan Bank"],
  },
  {
    name: "UnionBank",
    domain: "unionbankph.com",
    logoKey: "unionbank",
    aliases: ["Union Bank"],
  },
  {
    name: "Security Bank",
    domain: "securitybank.com",
    logoKey: "security-bank",
  },
  {
    name: "RCBC",
    domain: "rcbc.com",
    logoKey: "rcbc",
    aliases: ["Rizal Commercial Banking Corporation"],
  },
  {
    name: "CIMB",
    domain: "cimbbank.com.ph",
    logoKey: "cimb",
    aliases: ["CIMB Bank"],
  },
  {
    name: "Landbank",
    domain: "landbank.com",
    logoKey: "landbank",
    aliases: ["Land Bank", "LANDBANK"],
  },
  {
    name: "PNB",
    domain: "pnb.com.ph",
    logoKey: "pnb",
    aliases: ["Philippine National Bank"],
  },
  {
    name: "Chinabank",
    domain: "chinabank.ph",
    logoKey: "chinabank",
    aliases: ["China Bank", "China Banking Corporation"],
  },
  {
    name: "EastWest Bank",
    domain: "eastwestbanker.com",
    logoKey: "eastwest-bank",
    aliases: ["EastWest"],
  },
  {
    name: "PSBank",
    domain: "psbank.com.ph",
    logoKey: "psbank",
    aliases: ["Philippine Savings Bank"],
  },
  {
    name: "GCash",
    domain: "gcash.com",
    logoKey: "gcash",
  },
  {
    name: "Maya",
    domain: "maya.ph",
    logoKey: "maya",
    aliases: ["PayMaya", "Maya Bank"],
  },
  {
    name: "GrabPay",
    domain: "grab.com",
    logoKey: "grabpay",
  },
  {
    name: "ShopeePay",
    domain: "shopee.ph",
    logoKey: "shopeepay",
  },
  {
    name: "COL Financial",
    domain: "colfinancial.com",
    logoKey: "col-financial",
    aliases: ["COL"],
  },
  {
    name: "FirstMetroSec",
    domain: "firstmetrosec.com.ph",
    logoKey: "firstmetrosec",
    aliases: ["First Metro Securities"],
  },
  {
    name: "Pag-IBIG",
    domain: "pagibigfund.gov.ph",
    logoKey: "pagibig",
    aliases: ["Pag-IBIG Fund", "HDMF"],
  },
  {
    name: "SSS",
    domain: "sss.gov.ph",
    logoKey: "sss",
    aliases: ["Social Security System"],
  },
  {
    name: "PhilHealth",
    domain: "philhealth.gov.ph",
    logoKey: "philhealth",
  },
  {
    name: "GSIS",
    domain: "gsis.gov.ph",
    logoKey: "gsis",
  },
  {
    name: "Tonik",
    domain: "tonikbank.com",
    logoKey: "tonik",
    aliases: ["Tonik Bank"],
  },
  {
    name: "MariBank",
    domain: "maribank.ph",
    logoKey: "maribank",
    aliases: ["SeaBank", "Seabank", "Sea Bank"],
  },
  {
    name: "GoTyme",
    domain: "gotyme.com",
    logoKey: "gotyme",
    aliases: ["Go Tyme"],
  },
  {
    name: "OFBank",
    domain: "ofbank.com.ph",
    logoKey: "ofbank",
  },
  {
    name: "Robinsons Bank",
    domain: "robinsonsbank.com.ph",
    logoKey: "robinsons-bank",
  },
  {
    name: "AUB",
    domain: "aub.com.ph",
    logoKey: "aub",
    aliases: ["Asia United Bank"],
  },
  {
    name: "CTBC Bank",
    domain: "ctbcbank.com.ph",
    logoKey: "ctbc-bank",
    aliases: ["CTBC"],
  },
];

export const INSTITUTION_METADATA_BY_NAME = new Map(
  INSTITUTION_METADATA.map((institution) => [institution.name, institution] as const)
);

export const INSTITUTION_METADATA_BY_LOGO_KEY = new Map(
  INSTITUTION_METADATA.map((institution) => [institution.logoKey, institution] as const)
);

export function getInstitutionMetadataByName(name: string): InstitutionMetadata | undefined {
  return INSTITUTION_METADATA_BY_NAME.get(name);
}

export function getInstitutionMetadataByLogoKey(logoKey: string): InstitutionMetadata | undefined {
  return INSTITUTION_METADATA_BY_LOGO_KEY.get(logoKey);
}
