# Parts DB Helper

A small React + Vite app for building up a parts database from product web
links and exporting it as a CSV in the format
[IndaBOM's parts upload](https://indabom.com/bom/upload-parts-help/) expects.

## How it works

1. Paste a product page URL (distributor, manufacturer site, etc.) and click
   **Fetch details**. The app fetches the page (via a public CORS proxy,
   since browsers block direct cross-origin requests to arbitrary sites) and
   looks for `schema.org/Product` structured data or Open Graph meta tags to
   pre-fill description, manufacturer, MPN, seller, and price.
2. Review/edit the pre-filled fields (extraction is best-effort — many
   retailer sites block scraping or don't expose structured data, in which
   case you'll need to fill fields in manually or use the "paste HTML"
   fallback that appears if the automatic fetch fails).
3. Click **Add to database** to save the part. Parts persist in the browser's
   `localStorage`, so your database survives page reloads.
4. Click **Export CSV** to download a CSV with the exact column set/order
   IndaBOM's parts upload expects.

## CSV column reference (from IndaBOM's upload help)

| Column | Notes |
|---|---|
| `part_number` | Required unless your org's numbering scheme derives it from `part_class` + revision |
| `part_class` | Part category/class code |
| `revision` | Up to 4 characters |
| `description` | Up to 255 characters |
| `manufacturer_name` | Paired with `manufacturer_part_number` |
| `manufacturer_part_number` | MPN |
| `seller` | Paired with `unit_cost`/`nre_cost` for sourcing info |
| `unit_cost` | Plain decimal number |
| `nre_cost` | Plain decimal number |
| `seller_part_number` | Optional |
| `minimum_order_quantity` | Optional |
| `minimum_pack_quantity` | Optional |
| `lead_time_days` | Optional |

IndaBOM accepts common aliases for these headers (e.g. `mfg`, `mpn`, `moq`),
but the exporter always writes the canonical names above.

## Privacy note

Automatic fetching sends the URL you paste through a third-party public CORS
proxy (`api.allorigins.win`) so it can be read from the browser. If you'd
rather not do that for a given link, use the "paste HTML" fallback instead —
copy the page source yourself (View Page Source) and paste it in, and
extraction runs entirely in your browser.

## Development

```bash
npm install
npm run dev
```

```bash
npm run build   # type-check + production build to dist/
```
