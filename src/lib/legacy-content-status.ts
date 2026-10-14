// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = { from(table: string): any };

/** Pre-0008 publish path: revision snapshot + status update (no atomic RPC). */
export async function applyLegacyContentStatus(
  client: AdminClient,
  id: string,
  bodyStatus: string,
): Promise<{ error: string; status: 404 | 500 } | { ok: true }> {
  const status = bodyStatus === "published" ? "published" : bodyStatus === "unpublished" ? "unpublished" : "draft";
  if (status === "published") {
    const { data: item, error: itemError } = await client
      .from("content_items")
      .select("id, content_type, title, slug, short_description, long_description, rationale, type_data, visibility")
      .eq("id", id)
      .single();
    if (itemError || !item) {
      return { error: itemError?.message ?? "Content not found", status: 404 };
    }
    const { data: latest } = await client
      .from("content_revisions")
      .select("revision_number")
      .eq("content_item_id", id)
      .order("revision_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error: revisionError } = await client.from("content_revisions").insert({
      content_item_id: id,
      revision_number: (latest?.revision_number ?? 0) + 1,
      snapshot: item,
    });
    if (revisionError) return { error: revisionError.message, status: 500 };
  }
  const { error } = await client
    .from("content_items")
    .update({ status, published_at: status === "published" ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { error: error.message, status: 500 };
  return { ok: true };
}
