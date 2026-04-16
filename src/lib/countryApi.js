import countriesLocalData from "@/data/countries.json";

/**
 * Fetches country data from the /api/country route.
 * @param {string} countryCode - ISO Alpha-2 code (e.g. "MM")
 * @returns {Promise<Object>} Resolved country data
 */
export async function fetchCountryData(countryCode) {
  const res = await fetch(`/api/country?code=${encodeURIComponent(countryCode)}`);
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({}));
    throw new Error(error ?? `Failed to fetch country data for "${countryCode}"`);
  }
  return res.json();
}

/**
 * Fetches a Wikipedia summary from the /api/wiki route.
 * @param {string} countryName - Country name as it appears on Wikipedia (e.g. "Myanmar")
 * @returns {Promise<Object>} Resolved wiki summary { title, extract, thumbnail }
 */
export async function fetchWikiData(countryName) {
  const res = await fetch(`/api/wiki?name=${encodeURIComponent(countryName)}`);
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({}));
    throw new Error(error ?? `Failed to fetch Wikipedia data for "${countryName}"`);
  }
  return res.json();
}

/**
 * Returns the local cultural data for a country from countries.json.
 * @param {string} countryCode - ISO Alpha-2 code (e.g. "MM")
 * @returns {Object|null} Local data or null if code is not found
 */
export function getCountryLocalData(countryCode) {
  return countriesLocalData[countryCode.toUpperCase()] ?? null;
}

/**
 * Returns the flag image URL from flagcdn.com.
 * @param {string} countryCode - ISO Alpha-2 code (e.g. "MM")
 * @returns {string} Flag image URL (320px wide PNG)
 */
export function getFlagUrl(countryCode) {
  return `https://flagcdn.com/w320/${countryCode.toLowerCase()}.png`;
}
