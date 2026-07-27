// Best-effort extraction of part info from a product page.
//
// Browsers block cross-origin fetches to arbitrary retailer/manufacturer
// sites (CORS), so page HTML is retrieved through a public read-only CORS
// proxy (api.allorigins.win). This means the URL you paste is sent through
// a third-party service before it reaches you — see the README for the
// "paste HTML instead" fallback if that's not acceptable for a given link.
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

export interface ExtractedFields {
  description: string;
  manufacturer_name: string;
  manufacturer_part_number: string;
  seller: string;
  unit_cost: string;
}

export function isFetchableUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function fetchPageHtml(url: string): Promise<string> {
  if (!isFetchableUrl(url)) {
    throw new Error('Enter a valid http(s) URL.');
  }
  const res = await fetch(CORS_PROXY + encodeURIComponent(url));
  if (!res.ok) {
    throw new Error(`Could not fetch page (HTTP ${res.status}).`);
  }
  return res.text();
}

function textOf(doc: Document, selector: string, attr?: string): string {
  const el = doc.querySelector(selector);
  if (!el) return '';
  return (attr ? el.getAttribute(attr) : el.textContent) ?? '';
}

function firstProductLd(doc: Document): any | null {
  const scripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent ?? '');
      const candidates = Array.isArray(data) ? data : [data, ...(data['@graph'] ?? [])];
      const product = candidates.find(c => {
        const type = c?.['@type'];
        return type === 'Product' || (Array.isArray(type) && type.includes('Product'));
      });
      if (product) return product;
    } catch {
      // ignore malformed JSON-LD blocks
    }
  }
  return null;
}

function hostnameToSeller(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    const name = host.split('.')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return '';
  }
}

export function extractFromHtml(html: string, sourceUrl: string): ExtractedFields {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const product = firstProductLd(doc);

  const ogTitle = textOf(doc, 'meta[property="og:title"]', 'content');
  const ogDescription = textOf(doc, 'meta[property="og:description"]', 'content')
    || textOf(doc, 'meta[name="description"]', 'content');
  const title = doc.querySelector('title')?.textContent ?? '';

  const brand = product?.brand?.name ?? product?.brand ?? '';
  const mpn = product?.mpn ?? product?.sku ?? '';
  const offers = Array.isArray(product?.offers) ? product.offers[0] : product?.offers;
  const price = offers?.price ?? offers?.lowPrice ?? '';

  return {
    description: (product?.name || ogTitle || title || '').trim().slice(0, 255),
    manufacturer_name: typeof brand === 'string' ? brand.trim() : '',
    manufacturer_part_number: (mpn || '').toString().trim(),
    seller: hostnameToSeller(sourceUrl),
    unit_cost: price ? String(price) : '',
    ...(!product && !ogTitle && !title
      ? { description: ogDescription.trim().slice(0, 255) }
      : {}),
  };
}

export async function extractFromUrl(url: string): Promise<ExtractedFields> {
  const html = await fetchPageHtml(url);
  return extractFromHtml(html, url);
}
