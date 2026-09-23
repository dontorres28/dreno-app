// Single source of truth for the legal pages. Every TODO below MUST be
// replaced before these pages are considered published. Missing pieces
// render as a bright red [TODO: ...] token so you can't ship by accident.
//
// ponytail: string tokens instead of a CMS — flip once these are stable.

export const LEGAL = {
  // TODO: the exact legal entity name (e.g. "Dreno GmbH", "Dreno LLC").
  companyName: '[TODO: LEGAL COMPANY NAME]',

  // TODO: the entity's registered address (street, city, postcode, country).
  companyAddress: '[TODO: REGISTERED ADDRESS]',

  // TODO: commercial register / company number (Handelsregister, VAT ID, etc.).
  registryInfo: '[TODO: REGISTRY / VAT NUMBER]',

  // TODO: privacy contact — a real inbox that a human reads.
  contactEmail: 'legal@dreno.app',

  // TODO: jurisdiction whose law governs disputes (e.g. "Switzerland" / "Canton of Zurich").
  jurisdiction: '[TODO: GOVERNING JURISDICTION]',

  // Update whenever a legal page's text materially changes.
  lastUpdated: '2026-09-23',

  productUrl: 'https://dreno-app.vercel.app',
} as const;
