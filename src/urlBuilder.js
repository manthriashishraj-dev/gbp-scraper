/**
 * urlBuilder.js
 * Converts search inputs into Google Maps search URL objects.
 *
 * Two entry points:
 *
 *  buildSearchUrls(queries, language)
 *    — takes raw query strings like "dentist in Hanamkonda"
 *
 *  buildCityQueries(businessType, cityName, language)
 *    — takes a city name and auto-expands it to ALL constituent areas
 *      so businesses in merged towns (e.g. Hanamkonda inside Warangal)
 *      are captured even if their GMB address doesn't say the city name.
 */

import { getAreasForCity } from './cityAreas.js';

/**
 * Build search URLs from raw query strings.
 *
 * @param {string[]} queries  - e.g. ["dentist in Hanamkonda"]
 * @param {string}   language
 * @returns {{ url: string, searchString: string }[]}
 */
export function buildSearchUrls(queries, language = 'en') {
  return queries.map((q) => {
    const encoded = encodeURIComponent(q.trim());
    return {
      url: `https://www.google.com/maps/search/${encoded}/?hl=${language}`,
      searchString: q.trim(),
    };
  });
}

/**
 * Build search URLs for a city by expanding it to ALL known constituent areas.
 *
 * Example:
 *   buildCityQueries('dentist', 'Warangal')
 *   → ["dentist in Warangal", "dentist in Hanamkonda", "dentist in Kazipet", ...]
 *
 * If the city is not in the mapping, falls back to a single query for the city name.
 *
 * @param {string} businessType - e.g. "dentist", "gym", "restaurant"
 * @param {string} cityName     - e.g. "Warangal", "Hyderabad"
 * @param {string} language
 * @returns {{ url: string, searchString: string }[]}
 */
export function buildCityQueries(businessType, cityName, language = 'en') {
  const areas = getAreasForCity(cityName);
  const queries = areas.map(area => `${businessType.trim()} in ${area}`);
  return buildSearchUrls(queries, language);
}

/**
 * Converts a raw Google Maps place URL to a clean canonical URL.
 */
export function normaliseProfileUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.pathname.startsWith('/maps/place/')) return rawUrl;
    const cid = url.searchParams.get('cid');
    if (cid) return `https://www.google.com/maps?cid=${cid}`;
    return rawUrl;
  } catch {
    return rawUrl;
  }
}
