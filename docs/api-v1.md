# Content API v1

## Published content list

`GET /api/v1/content`

Query parameters:

- `type`
- `challenge_id`
- `page`
- `page_size`

Only published content is returned. Draft, unpublished, and removed records are never exposed through the public read API.

## Published content item

`GET /api/v1/content/:id`

The permanent content ID is authoritative. A readable slug may be used by a future public page, but it is not required by the API.

## Response requirements

- Stable content ID
- Content type
- Title and descriptions
- Published revision number
- Media metadata
- Challenge references
- Athlete snapshot fields when applicable
- Pagination metadata for list responses
- Cache headers for published responses
