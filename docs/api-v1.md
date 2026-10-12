# Content API v1

The public API is read-only and returns published content only. It is intended for Challenge-Platform and other consumer apps.

Base URL (local): `http://localhost:3000/api/v1`

## List published content

`GET /content`

Optional query parameters: `type` (`tutorial`, `fbc_book`, `shout_out`), `challenge_id`, `page` (default `1`), and `page_size` (`1`–`50`, default `20`).

Results are ordered newest published first, with the content ID as a stable tie-breaker.

```json
{
  "data": [],
  "pagination": {
    "page": 1, "page_size": 20, "total": 0, "total_pages": 0,
    "has_next_page": false, "has_previous_page": false
  }
}
```

`data` contains the stable content ID, type, title/description fields, revision metadata, challenge references, and type-specific data.

## Get one published item

`GET /content/:id` returns `{ "data": { ... } }`. An unpublished, draft, removed, or unknown ID returns `404` with `{ "error": "Content not found" }`.

## Errors and caching

`400` means an invalid filter, `404` means not found, `500` means a temporary service failure, and `503` means the service is not configured. Errors use `{ "error": "..." }`; internal database details are not exposed.

Published responses include `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`.
