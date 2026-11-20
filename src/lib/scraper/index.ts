import * as cheerio from "cheerio";
import { parsePrice } from "../price";
import { selectorsFor } from "./sites";

export type ScrapedProduct = {
  title: string | null;
  price: number | null;
  currency: string | null;
  imageUrl: string | null;
  source: "json-ld" | "meta" | "selector" | null;
};

export class ScrapeError extends Error {}

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

type Json = unknown;
type Obj = Record<string, Json>;

function asArray(v: Json): Json[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

/** Normalise a JSON-LD value that may be one object or an array into object nodes. */
function objects(v: Json): Obj[] {
  return asArray(v).filter((o): o is Obj => !!o && typeof o === "object" && !Array.isArray(o));
}

function hasType(node: Obj, type: string): boolean {
  return asArray(node["@type"]).some((t) => typeof t === "string" && t.toLowerCase() === type.toLowerCase());
}

/** Walk a JSON-LD document and collect every object node. */
function collectNodes(data: Json, out: Obj[] = []): Obj[] {
  if (Array.isArray(data)) {
    data.forEach((d) => collectNodes(d, out));
  } else if (data && typeof data === "object") {
    const node = data as Obj;
    out.push(node);
    for (const value of Object.values(node)) {
      if (value && typeof value === "object") collectNodes(value, out);
    }
  }
  return out;
}

function offerPrice(offer: Obj): { price: number | null; currency: string | null } {
  const spec = objects(offer.priceSpecification)[0];
  const raw = offer.price ?? offer.lowPrice ?? spec?.price;
  const cur = offer.priceCurrency ?? spec?.priceCurrency;
  const currency = typeof cur === "string" ? cur : null;
  return { price: parsePrice(raw as string | number), currency };
}

function imageFrom(v: Json): string | null {
  const first = asArray(v)[0];
  if (typeof first === "string") return first;
  const obj = objects(first)[0];
  const url = obj?.url ?? obj?.contentUrl;
  return typeof url === "string" ? url : null;
}

function fromJsonLd($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const nodes: Obj[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      collectNodes(JSON.parse($(el).text()), nodes);
    } catch {
      // ignore malformed JSON-LD blocks
    }
  });

  const products = nodes.filter((n) => hasType(n, "Product") || hasType(n, "ProductGroup"));
  for (const product of products) {
    const offers = [...objects(product.offers), ...objects(product.hasVariant).flatMap((v) => objects(v.offers))];

    for (const offer of offers) {
      const { price, currency } = offerPrice(offer);
      if (price != null && price > 0) {
        return {
          price,
          currency,
          title: typeof product.name === "string" ? product.name : null,
          imageUrl: imageFrom(product.image),
          source: "json-ld",
        };
      }
    }
  }
  const first = products[0];
  return first
    ? { title: typeof first.name === "string" ? first.name : null, imageUrl: imageFrom(first.image) }
    : {};
}

function meta($: cheerio.CheerioAPI, ...names: string[]): string | null {
  for (const name of names) {
    const v = $(`meta[property="${name}"], meta[name="${name}"]`).attr("content");
    if (v?.trim()) return v.trim();
  }
  return null;
}

function fromMeta($: cheerio.CheerioAPI): Partial<ScrapedProduct> {
  const itemprop = $('[itemprop="price"]').first();
  const raw =
    meta($, "product:price:amount", "og:price:amount") ??
    (itemprop.attr("content") || itemprop.text() || null);
  const price = parsePrice(raw);
  if (price == null || price <= 0) return {};
  return {
    price,
    currency:
      meta($, "product:price:currency", "og:price:currency") ??
      $('[itemprop="priceCurrency"]').first().attr("content") ??
      null,
    source: "meta",
  };
}

function fromSelectors($: cheerio.CheerioAPI, hostname: string): Partial<ScrapedProduct> {
  for (const selector of selectorsFor(hostname)) {
    const price = parsePrice($(selector).first().text());
    if (price != null && price > 0) return { price, source: "selector" };
  }
  return {};
}

function absolutize(url: string | null | undefined, base: string): string | null {
  if (!url) return null;
  try {
    return new URL(url, base).toString();
  } catch {
    return null;
  }
}

/** Extract product info from raw HTML. Pure function, used by tests. */
export function extractProduct(html: string, pageUrl: string): ScrapedProduct {
  const $ = cheerio.load(html);
  const hostname = new URL(pageUrl).hostname;

  const ld = fromJsonLd($);
  const priceInfo = ld.price != null ? ld : { ...fromMeta($) };
  if (priceInfo.price == null) Object.assign(priceInfo, fromSelectors($, hostname));

  const title =
    ld.title ?? meta($, "og:title", "twitter:title") ?? ($("title").first().text().trim() || null);

  return {
    title: title?.replace(/\s+/g, " ").trim() || null,
    price: priceInfo.price ?? null,
    currency: (priceInfo.currency ?? ld.currency ?? null)?.toUpperCase() ?? null,
    imageUrl: absolutize(ld.imageUrl ?? meta($, "og:image", "twitter:image"), pageUrl),
    source: priceInfo.source ?? null,
  };
}

export function validateUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new ScrapeError("That doesn't look like a valid URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ScrapeError("Only http(s) URLs are supported.");
  }
  return url;
}

export async function fetchHtml(url: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-AU,en;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });
  } catch (err) {
    throw new ScrapeError(`Couldn't reach the page: ${(err as Error).message}`);
  }
  if (!res.ok) {
    throw new ScrapeError(
      `The shop responded with HTTP ${res.status}${res.status === 403 || res.status === 503 ? " (it may be blocking automated requests)" : ""}.`,
    );
  }
  return res.text();
}

/** Fetch a product page and extract its details. Throws ScrapeError when no price is found. */
export async function scrapeProduct(rawUrl: string): Promise<ScrapedProduct & { price: number }> {
  const url = validateUrl(rawUrl).toString();
  const product = extractProduct(await fetchHtml(url), url);
  if (product.price == null) {
    throw new ScrapeError(
      "Couldn't find a price on that page. The shop may render prices with JavaScript or block scrapers — you can enter the price manually.",
    );
  }
  return product as ScrapedProduct & { price: number };
}
