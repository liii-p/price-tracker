/**
 * Site-specific CSS selectors for the price element, used when a page has no
 * structured data (JSON-LD / meta tags). Keys match the end of the hostname.
 * Add entries here for shops you use often.
 */
export const SITE_SELECTORS: Record<string, string[]> = {
  amazon: [
    "#corePrice_feature_div .a-offscreen",
    "#corePriceDisplay_desktop_feature_div .a-offscreen",
    "#apex_desktop .a-price .a-offscreen",
    "#priceblock_dealprice",
    "#priceblock_ourprice",
  ],
  "ebay.com": [".x-price-primary .ux-textspans", "#prcIsum"],
  "ebay.com.au": [".x-price-primary .ux-textspans", "#prcIsum"],
  "ebay.co.uk": [".x-price-primary .ux-textspans", "#prcIsum"],
};

export function selectorsFor(hostname: string): string[] {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  for (const [key, selectors] of Object.entries(SITE_SELECTORS)) {
    // "amazon" matches any amazon.* domain; dotted keys match a domain suffix
    if (key.includes(".") ? host === key || host.endsWith(`.${key}`) : host.split(".").includes(key)) {
      return selectors;
    }
  }
  return [];
}
