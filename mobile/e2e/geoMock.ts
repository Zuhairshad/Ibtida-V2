import type { Page } from '@playwright/test';

/** Offline stand-in for the Open-Meteo geocoding API (same response shape, a few known places). */
const PLACES = [
  { id: 2643743, name: 'London', latitude: 51.50853, longitude: -0.12574, country_code: 'GB', country: 'United Kingdom', admin1: 'England' },
  { id: 6058560, name: 'London', latitude: 42.98339, longitude: -81.23304, country_code: 'CA', country: 'Canada', admin1: 'Ontario' },
  { id: 1172451, name: 'Lahore', latitude: 31.558, longitude: 74.35071, country_code: 'PK', country: 'Pakistan', admin1: 'Punjab' },
  { id: 1880252, name: 'Singapore', latitude: 1.28967, longitude: 103.85007, country_code: 'SG', country: 'Singapore' },
];

export async function mockGeocoding(page: Page) {
  await page.route('**://geocoding-api.open-meteo.com/**', route => {
    const q = (new URL(route.request().url()).searchParams.get('name') || '').toLowerCase();
    const results = PLACES.filter(p => p.name.toLowerCase().startsWith(q));
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(results.length ? { results } : {}) });
  });
}
