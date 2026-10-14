export const CONTENT_TYPES = ["tutorial", "fbc_book", "shout_out"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];
export const CONTENT_DESTINATIONS = ["challenge", "referee"] as const;
export type ContentDestination = (typeof CONTENT_DESTINATIONS)[number];
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;
export function parseDestination(value: string | null): ContentDestination | null {
  if (value === null) return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  return (CONTENT_DESTINATIONS as readonly string[]).includes(normalized) ? (normalized as ContentDestination) : null;
}
export function contentV1RequiresDestination(): boolean {
  return process.env.CONTENT_V1_REQUIRE_DESTINATION === "true";
}
export function destinationQueryError(rawDestination: string | null, destination: ContentDestination | null) {
  if (contentV1RequiresDestination() && !destination) {
    return { status: 400 as const, error: "Missing required query parameter: destination. Use challenge or referee." };
  }
  if (rawDestination !== null && rawDestination.trim() !== "" && !destination) {
    return { status: 400 as const, error: "Invalid destination. Use challenge or referee." };
  }
  return null;
}
export function stripDestinationField<T extends Record<string, unknown>>(row: T) {
  const {
    destination: _legacyDestination,
    destination_key: _destinationKey,
    destination_released_at: _legacyReleasedAt,
    release_id: _releaseId,
    release_featured: _releaseFeatured,
    release_display_order: _releaseDisplayOrder,
    release_starts_at: _releaseStartsAt,
    release_ends_at: _releaseEndsAt,
    release_published_at: _releasePublishedAt,
    ...rest
  } = row;
  return rest;
}
export function publishedContentSource(destination: ContentDestination | null) {
  return destination ? "published_destination_content" : "published_content";
}
export function destinationFilterColumn() {
  return "destination_key" as const;
}
export function parsePositiveInt(value: string | null, fallback: number, max?: number) {
  if (value === null || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
  return max ? Math.min(parsed, max) : parsed;
}
export function parseContentType(value: string | null): ContentType | null {
  return value && (CONTENT_TYPES as readonly string[]).includes(value) ? (value as ContentType) : null;
}
export function paginationMeta(page: number, pageSize: number, total: number) {
  return { page, page_size: pageSize, total, total_pages: total === 0 ? 0 : Math.ceil(total / pageSize), has_next_page: page * pageSize < total, has_previous_page: page > 1 };
}
export function publicContentResponse(data: unknown, pagination?: ReturnType<typeof paginationMeta>) {
  return pagination ? { data, pagination } : { data };
}
