import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractProduct, validateUrl } from "@/lib/scraper";
import { selectorsFor as siteSelectors } from "@/lib/scraper/sites";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

describe("extractProduct", () => {
  it("reads JSON-LD inside @graph, skipping malformed blocks", () => {
    expect(extractProduct(fixture("jsonld-graph.html"), "https://shop.test/p/1")).toEqual({
      title: "Noise Cancelling Headphones",
      price: 349.95,
      currency: "AUD",
      imageUrl: "https://cdn.shop.test/hp.jpg",
      source: "json-ld",
    });
  });

  it("skips zero-priced offers and reads priceSpecification", () => {
    const p = extractProduct(fixture("jsonld-offers-array.html"), "https://shop.test/p/2");
    expect(p).toMatchObject({ title: "Espresso Machine", price: 1299, currency: "USD", source: "json-ld" });
  });

  it("falls back to product meta tags and resolves relative images", () => {
    expect(extractProduct(fixture("meta-tags.html"), "https://furniture.test/desks/standing")).toEqual({
      title: "Standing Desk",
      price: 1249,
      currency: "EUR",
      imageUrl: "https://furniture.test/desks/images/desk.jpg",
      source: "meta",
    });
  });

  it("reads schema.org microdata", () => {
    const p = extractProduct(fixture("microdata.html"), "https://keys.test/kb");
    expect(p).toMatchObject({ title: "Mechanical Keyboard", price: 189, currency: "USD", source: "meta" });
  });

  it("uses site-specific selectors (Amazon)", () => {
    const p = extractProduct(fixture("amazon.html"), "https://www.amazon.com.au/dp/B0TEST");
    expect(p).toMatchObject({ price: 239, source: "selector", title: "Amazon.com.au: Kindle Paperwhite" });
  });

  it("returns a null price when nothing is found", () => {
    expect(extractProduct(fixture("no-price.html"), "https://shop.test/about")).toMatchObject({
      price: null,
      source: null,
      title: "About us",
    });
  });
});

describe("selectorsFor", () => {
  it("matches amazon on any TLD and eBay by domain suffix", () => {
    expect(siteSelectors("www.amazon.co.uk").length).toBeGreaterThan(0);
    expect(siteSelectors("smile.amazon.com").length).toBeGreaterThan(0);
    expect(siteSelectors("www.ebay.com.au").length).toBeGreaterThan(0);
    expect(siteSelectors("notamazonshop.com")).toEqual([]);
    expect(siteSelectors("ebay.com.evil.test")).toEqual([]);
  });
});

describe("validateUrl", () => {
  it("accepts http(s) and rejects others", () => {
    expect(validateUrl(" https://shop.test/x ").hostname).toBe("shop.test");
    expect(() => validateUrl("ftp://shop.test")).toThrow(/http/);
    expect(() => validateUrl("not a url")).toThrow(/valid URL/);
  });
});
