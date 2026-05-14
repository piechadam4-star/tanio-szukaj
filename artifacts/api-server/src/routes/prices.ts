import { Router } from "express";
import * as cheerio from "cheerio";
import { logger } from "../lib/logger";

const router = Router();

interface PriceResult {
  title: string;
  url: string;
  store: string;
  price: number;
  priceText: string | null;
  currency: string;
  imageUrl: string | null;
  publishedDate: string;
  favicon: string | null;
}

interface PopularSearch {
  query: string;
  category: string;
}

const POPULAR_SEARCHES: PopularSearch[] = [
  { query: "iPhone 16", category: "Elektronika" },
  { query: "Samsung Galaxy S25", category: "Elektronika" },
  { query: "PlayStation 5", category: "Gaming" },
  { query: "AirPods Pro", category: "Audio" },
  { query: "MacBook Air M3", category: "Komputery" },
  { query: "Nike Air Max 2024", category: "Obuwie" },
  { query: "Dyson V15", category: "AGD" },
  { query: "Kindle Paperwhite", category: "Czytniki" },
  { query: "GoPro Hero 13", category: "Foto/Wideo" },
  { query: "Lego Technic", category: "Zabawki" },
];

function parsePricePLN(raw: string): number | null {
  const cleaned = raw.replace(/\s/g, "").replace(",", ".").replace("zł", "").replace("PLN", "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function extractDomainName(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

async function searchCeneo(query: string): Promise<PriceResult[]> {
  const encoded = encodeURIComponent(query);
  const searchUrl = `https://www.ceneo.pl/szukaj-${encoded}.htm`;

  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
  };

  const res = await fetch(searchUrl, { headers, signal: AbortSignal.timeout(15000) });
  if (!res.ok) {
    throw new Error(`Ceneo returned ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const results: PriceResult[] = [];
  const now = new Date().toISOString();

  $(".cat-prod-row, .product-list__item, [data-productid]").each((_, el) => {
    const $el = $(el);

    const title =
      $el.find(".cat-prod-row__name, .product-name, [class*='name']").first().text().trim() ||
      $el.find("a[title]").first().attr("title") ||
      $el.find("h2, h3").first().text().trim();

    const priceText =
      $el.find(".price-box, .product-price, [class*='price']").first().text().trim() ||
      $el.find(".price").first().text().trim();

    const href =
      $el.find("a.cat-prod-row__name, a[class*='name'], a.product-link").first().attr("href") ||
      $el.find("a").first().attr("href");

    if (!title || !priceText || !href) return;

    const price = parsePricePLN(priceText);
    if (!price || price <= 0) return;

    const fullUrl = href.startsWith("http") ? href : `https://www.ceneo.pl${href}`;

    const imgEl = $el.find("img").first();
    const imageUrl = imgEl.attr("data-src") || imgEl.attr("src") || null;
    const cleanImage = imageUrl && !imageUrl.includes("pixel") && !imageUrl.startsWith("data:") ? imageUrl : null;

    const store = $el.find("[class*='shop'], [class*='producer'], .cat-prod-row__info-box").first().text().trim() || "ceneo.pl";

    results.push({
      title: title.slice(0, 200),
      url: fullUrl,
      store: store.slice(0, 100) || "ceneo.pl",
      price,
      priceText: priceText.trim().slice(0, 50),
      currency: "PLN",
      imageUrl: cleanImage,
      publishedDate: now,
      favicon: `https://www.google.com/s2/favicons?domain=ceneo.pl&sz=32`,
    });
  });

  return results;
}

async function searchAllegro(query: string): Promise<PriceResult[]> {
  const encoded = encodeURIComponent(query);
  const searchUrl = `https://allegro.pl/listing?string=${encoded}&order=p`;

  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pl-PL,pl;q=0.9",
  };

  const res = await fetch(searchUrl, { headers, signal: AbortSignal.timeout(15000) });
  if (!res.ok) return [];

  const html = await res.text();
  const $ = cheerio.load(html);
  const results: PriceResult[] = [];
  const now = new Date().toISOString();

  $("article[data-role='offer'], [data-box-name='items container'] article").each((_, el) => {
    const $el = $(el);
    const title = $el.find("h2, [class*='title']").first().text().trim();
    const priceRaw = $el.find("[class*='price']").first().text().trim();
    const href = $el.find("a[href*='/oferta/'], a[href*='/listing/']").first().attr("href");

    if (!title || !priceRaw || !href) return;

    const price = parsePricePLN(priceRaw);
    if (!price || price <= 0) return;

    const fullUrl = href.startsWith("http") ? href : `https://allegro.pl${href}`;
    const imgEl = $el.find("img").first();
    const imageUrl = imgEl.attr("src") || imgEl.attr("data-src") || null;
    const cleanImage = imageUrl && !imageUrl.includes("pixel") && !imageUrl.startsWith("data:") ? imageUrl : null;

    results.push({
      title: title.slice(0, 200),
      url: fullUrl,
      store: "allegro.pl",
      price,
      priceText: priceRaw.trim().slice(0, 50),
      currency: "PLN",
      imageUrl: cleanImage,
      publishedDate: now,
      favicon: `https://www.google.com/s2/favicons?domain=allegro.pl&sz=32`,
    });
  });

  return results;
}

async function searchOLX(query: string): Promise<PriceResult[]> {
  const encoded = encodeURIComponent(query);
  const searchUrl = `https://www.olx.pl/oferty/q-${encoded}/`;

  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pl-PL,pl;q=0.9",
  };

  const res = await fetch(searchUrl, { headers, signal: AbortSignal.timeout(15000) });
  if (!res.ok) return [];

  const html = await res.text();
  const $ = cheerio.load(html);
  const results: PriceResult[] = [];
  const now = new Date().toISOString();

  $("[data-cy='l-card']").each((_, el) => {
    const $el = $(el);
    const title = $el.find("h6, h4, [class*='title']").first().text().trim();
    const priceRaw = $el.find("[data-testid='ad-price'], [class*='price']").first().text().trim();
    const href = $el.find("a").first().attr("href");

    if (!title || !href) return;
    if (priceRaw.toLowerCase().includes("zamienię") || priceRaw.toLowerCase().includes("do negocjacji")) return;

    const price = parsePricePLN(priceRaw);
    if (!price || price <= 0) return;

    const fullUrl = href.startsWith("http") ? href : `https://www.olx.pl${href}`;
    const imgEl = $el.find("img").first();
    const imageUrl = imgEl.attr("src") || imgEl.attr("data-src") || null;
    const cleanImage = imageUrl && !imageUrl.includes("pixel") && !imageUrl.startsWith("data:") ? imageUrl : null;

    results.push({
      title: title.slice(0, 200),
      url: fullUrl,
      store: "olx.pl",
      price,
      priceText: priceRaw.trim().slice(0, 50),
      currency: "PLN",
      imageUrl: cleanImage,
      publishedDate: now,
      favicon: `https://www.google.com/s2/favicons?domain=olx.pl&sz=32`,
    });
  });

  return results.slice(0, 10);
}

router.get("/prices/search", async (req, res) => {
  const { q } = req.query;

  if (!q || typeof q !== "string" || q.trim().length === 0) {
    res.status(400).json({ error: "Query parameter 'q' is required" });
    return;
  }

  const query = q.trim();
  req.log.info({ query }, "Searching for prices");

  try {
    const [ceneoResults, allegroResults, olxResults] = await Promise.allSettled([
      searchCeneo(query),
      searchAllegro(query),
      searchOLX(query),
    ]);

    const allResults: PriceResult[] = [];

    if (ceneoResults.status === "fulfilled") {
      allResults.push(...ceneoResults.value);
    } else {
      req.log.warn({ err: ceneoResults.reason }, "Ceneo search failed");
    }

    if (allegroResults.status === "fulfilled") {
      allResults.push(...allegroResults.value.slice(0, 15));
    } else {
      req.log.warn({ err: allegroResults.reason }, "Allegro search failed");
    }

    if (olxResults.status === "fulfilled") {
      allResults.push(...olxResults.value);
    } else {
      req.log.warn({ err: olxResults.reason }, "OLX search failed");
    }

    const deduplicated = allResults
      .filter((r, index, self) =>
        index === self.findIndex((t) => t.url === r.url)
      )
      .sort((a, b) => a.price - b.price);

    req.log.info({ count: deduplicated.length }, "Price search complete");
    res.json(deduplicated);
  } catch (err) {
    req.log.error({ err }, "Price search error");
    res.status(500).json({ error: "Failed to fetch prices" });
  }
});

router.get("/prices/popular", (_req, res) => {
  res.json(POPULAR_SEARCHES);
});

export default router;
