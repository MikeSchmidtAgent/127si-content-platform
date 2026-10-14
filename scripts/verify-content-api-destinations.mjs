#!/usr/bin/env node
/**
 * Smoke-test destination-scoped Content API totals against expected Production counts.
 * Usage: node scripts/verify-content-api-destinations.mjs [baseUrl]
 * Default baseUrl: https://content.fairfieldbasketballclub.com
 */
const base = (process.argv[2] ?? "https://content.fairfieldbasketballclub.com").replace(/\/$/, "");

const destinationExpectations = [
  { label: "challenge", path: "/api/v1/content?destination=challenge&page_size=1", total: 29 },
  { label: "referee", path: "/api/v1/content?destination=referee&page_size=1", total: 2 },
];
const expectedCombinedTotal = 31;

async function fetchTotal(path) {
  const res = await fetch(`${base}${path}`);
  const body = await res.json().catch(() => ({}));
  return { status: res.status, total: body.pagination?.total, error: body.error };
}

let failed = false;
const destinationTotals = [];

for (const spec of destinationExpectations) {
  const { status, total, error } = await fetchTotal(spec.path);
  destinationTotals.push(total ?? 0);
  const ok = status === 200 && total === spec.total;
  console.log(`${ok ? "OK" : "FAIL"} ${spec.label}: HTTP ${status}, total=${total}${error ? ` (${error})` : ""}`);
  if (!ok) failed = true;
}

const combined = destinationTotals.reduce((sum, n) => sum + n, 0);
const combinedOk = combined === expectedCombinedTotal;
console.log(`${combinedOk ? "OK" : "FAIL"} combined (challenge+referee): total=${combined} (expected ${expectedCombinedTotal})`);
if (!combinedOk) failed = true;

const unscoped = await fetchTotal("/api/v1/content?page_size=1");
if (unscoped.status === 400) {
  console.log("OK unscoped list rejected (CONTENT_V1_REQUIRE_DESTINATION):", unscoped.error ?? "400");
} else if (unscoped.status === 200) {
  console.log(`OK unscoped list allowed, total=${unscoped.total}`);
} else {
  console.log(`FAIL unscoped list: HTTP ${unscoped.status}`, unscoped.error ?? "");
  failed = true;
}

process.exit(failed ? 1 : 0);
