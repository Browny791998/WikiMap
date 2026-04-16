import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { error: "Missing required query parameter: code" },
      { status: 400 }
    );
  }

  const sanitized = code.trim().toUpperCase();
  if (!/^[A-Z]{2,3}$/.test(sanitized)) {
    return NextResponse.json(
      { error: "Invalid country code. Must be a 2 or 3 letter ISO code." },
      { status: 400 }
    );
  }

  let res;
  try {
    res = await fetch(`https://restcountries.com/v3.1/alpha/${sanitized}`, {
      next: { revalidate: 86400 },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to reach restcountries.com" },
      { status: 502 }
    );
  }

  if (res.status === 404) {
    return NextResponse.json(
      { error: `Country with code "${sanitized}" not found` },
      { status: 404 }
    );
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: "Upstream error from restcountries.com" },
      { status: 502 }
    );
  }

  const data = await res.json();
  const country = Array.isArray(data) ? data[0] : data;

  const currencies = country.currencies
    ? Object.values(country.currencies)
        .map((c) => `${c.name} (${c.symbol ?? ""})`.trim())
        .join(", ")
    : null;

  const languages = country.languages
    ? Object.values(country.languages).join(", ")
    : null;

  return NextResponse.json({
    name: country.name?.common ?? null,
    capital: country.capital?.[0] ?? null,
    population: country.population ?? null,
    currency: currencies,
    language: languages,
    region: country.region ?? null,
    subregion: country.subregion ?? null,
    flag: country.flags?.png ?? null,
    flagSvg: country.flags?.svg ?? null,
    area: country.area ?? null,
  });
}
