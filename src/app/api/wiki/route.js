import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");

  if (!name) {
    return NextResponse.json(
      { error: "Missing required query parameter: name" },
      { status: 400 }
    );
  }

  const encoded = encodeURIComponent(name.trim());

  let res;
  try {
    res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
      {
        headers: { "User-Agent": "CountryMapWiki/1.0" },
        next: { revalidate: 86400 },
      }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to reach Wikipedia API" },
      { status: 502 }
    );
  }

  if (res.status === 404) {
    return NextResponse.json(
      { error: `Wikipedia page not found for "${name}"` },
      { status: 404 }
    );
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: "Upstream error from Wikipedia API" },
      { status: 502 }
    );
  }

  const data = await res.json();

  return NextResponse.json({
    title: data.title ?? null,
    extract: data.extract ?? null,
    thumbnail: data.thumbnail
      ? {
          url: data.thumbnail.source ?? null,
          width: data.thumbnail.width ?? null,
          height: data.thumbnail.height ?? null,
        }
      : null,
  });
}
