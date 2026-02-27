export const SINGLE_BUSINESS_SLUG = "diamond-studio-by-nicole";
export const SINGLE_BUSINESS_NAME = "Diamond Studio by Nicole";

// Accept legacy slug variants so previously created data continues working.
export const SINGLE_BUSINESS_SLUG_ALIASES = [
  "diamond-studio-by-nicole",
  "diamonds-studio-by-nicole"
] as const;

export function isSingleBusinessSlug(slug: string) {
  return SINGLE_BUSINESS_SLUG_ALIASES.includes(slug as (typeof SINGLE_BUSINESS_SLUG_ALIASES)[number]);
}
