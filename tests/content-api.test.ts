import assert from "node:assert/strict";
import test from "node:test";
import { MAX_PAGE_SIZE, paginationMeta, parseContentType, parsePositiveInt } from "../src/lib/content-api.ts";

test("pagination metadata is stable and complete", () => {
  assert.deepEqual(paginationMeta(2, 10, 25), { page: 2, page_size: 10, total: 25, total_pages: 3, has_next_page: true, has_previous_page: true });
});

test("pagination handles empty results", () => {
  assert.equal(paginationMeta(1, 20, 0).total_pages, 0);
  assert.equal(paginationMeta(1, 20, 0).has_next_page, false);
});

test("page values are positive integers and page size is capped", () => {
  assert.equal(parsePositiveInt("0", 1), 1);
  assert.equal(parsePositiveInt("nope", 1), 1);
  assert.equal(parsePositiveInt("3", 1), 3);
  assert.equal(parsePositiveInt("500", 20, MAX_PAGE_SIZE), MAX_PAGE_SIZE);
});

test("content types are explicit", () => {
  assert.equal(parseContentType("shout_out"), "shout_out");
  assert.equal(parseContentType("informational"), null);
  assert.equal(parseContentType(null), null);
});
