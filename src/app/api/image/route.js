import { NextResponse } from "next/server";

/**
 * GET /api/image?q=Mohinga&ctx=food|place|dress
 *
 * Strategy (in order):
 *  1. Wikipedia pageimages API  — exact article thumbnail (best quality)
 *  2. Wikimedia Commons file search → imageinfo — picks the best match
 *     from top-5 results, skipping maps/icons/flags/diagrams
 *
 * Returns { url: string | null }
 */

// File name fragments that indicate a non-photo result
const BAD_FILENAME_PATTERNS = [
  /map/i, /flag/i, /icon/i, /logo/i, /coat.?of.?arms/i,
  /emblem/i, /diagram/i, /stamp/i, /seal/i, /locator/i,
  /location/i, /outline/i, /blank/i, /silhouette/i,
];

function isBadFile(title = "") {
  return BAD_FILENAME_PATTERNS.some((re) => re.test(title));
}

async function tryWikipediaPageImage(q) {
  const url =
    "https://en.wikipedia.org/w/api.php?" +
    new URLSearchParams({
      action:      "query",
      titles:      q,
      prop:        "pageimages",
      format:      "json",
      pithumbsize: "600",
      origin:      "*",
    });

  const res = await fetch(url, {
    headers: { "User-Agent": "CountryMapWiki/1.0" },
    next:    { revalidate: 86400 },
  });
  if (!res.ok) return null;

  const data  = await res.json();
  const pages = data?.query?.pages ?? {};
  const page  = Object.values(pages)[0];

  // Reject if the thumbnail source looks like a map/flag/icon
  const src = page?.thumbnail?.source ?? null;
  if (!src) return null;
  if (isBadFile(src)) return null;
  return src;
}

async function tryCommonsSearch(q) {
  const searchUrl =
    "https://commons.wikimedia.org/w/api.php?" +
    new URLSearchParams({
      action:      "query",
      list:        "search",
      srsearch:    q,
      srnamespace: "6",   // File: namespace
      format:      "json",
      srlimit:     "8",   // Fetch more so we can skip bad ones
      origin:      "*",
    });

  const searchRes = await fetch(searchUrl, {
    headers: { "User-Agent": "CountryMapWiki/1.0" },
    next:    { revalidate: 86400 },
  });
  if (!searchRes.ok) return null;

  const searchData = await searchRes.json();
  const results    = searchData?.query?.search ?? [];
  if (results.length === 0) return null;

  // Filter out maps, flags, icons etc. from the title
  const good = results.filter((r) => !isBadFile(r.title));
  const candidates = good.length > 0 ? good : results; // fall back to all if all filtered
  const fileTitle  = candidates[0].title;

  const infoUrl =
    "https://commons.wikimedia.org/w/api.php?" +
    new URLSearchParams({
      action:    "query",
      titles:    fileTitle,
      prop:      "imageinfo",
      iiprop:    "thumburl|mime",
      iiurlwidth:"600",
      format:    "json",
      origin:    "*",
    });

  const infoRes = await fetch(infoUrl, {
    headers: { "User-Agent": "CountryMapWiki/1.0" },
    next:    { revalidate: 86400 },
  });
  if (!infoRes.ok) return null;

  const infoData  = await infoRes.json();
  const infoPages = infoData?.query?.pages ?? {};
  const info      = Object.values(infoPages)[0]?.imageinfo?.[0];

  // Skip SVGs and non-photo mime types
  if (!info?.thumburl) return null;
  if (info.mime === "image/svg+xml") return null;

  return info.thumburl;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q   = searchParams.get("q")?.trim();
  const ctx = searchParams.get("ctx") ?? ""; // "food" | "place" | "dress"

  if (!q) {
    return NextResponse.json({ url: null }, { status: 400 });
  }

  try {
    // Build a context-aware Wikipedia query for a tighter article match
    const wikiQuery =
      ctx === "food"  ? `${q} dish` :
      ctx === "place" ? q :
      ctx === "dress" ? `${q} clothing` :
      q;

    const wikiUrl = await tryWikipediaPageImage(wikiQuery);
    if (wikiUrl) return NextResponse.json({ url: wikiUrl });

    // Commons fallback — use the original query plus context hint
    const commonsQuery =
      ctx === "food"  ? `${q} food` :
      ctx === "place" ? `${q}` :
      ctx === "dress" ? `${q} traditional costume` :
      q;

    const commonsUrl = await tryCommonsSearch(commonsQuery);
    return NextResponse.json({ url: commonsUrl ?? null });
  } catch {
    return NextResponse.json({ url: null });
  }
}
