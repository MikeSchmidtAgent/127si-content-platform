import { NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabasePublic } from "@/lib/supabase";

async function authorized(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const publicClient = getSupabasePublic(); const adminClient = getSupabaseAdmin();
  if (!token || !publicClient || !adminClient) return null;
  const authClient = publicClient.auth as unknown as { getUser: (jwt: string) => Promise<{ data: { user: { id: string } | null }; error: Error | null }> };
  const { data, error } = await authClient.getUser(token);
  return error || !data.user ? null : adminClient;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const client = await authorized(request);
  if (!client) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { id } = await params; const body = await request.json();
  const status = body.status === "published" ? "published" : body.status === "unpublished" ? "unpublished" : "draft";
  if (status === "published") {
    const { data: item, error: itemError } = await client.from("content_items").select("id, content_type, title, slug, short_description, long_description, rationale, type_data, visibility").eq("id", id).single();
    if (itemError || !item) return NextResponse.json({ error: itemError?.message ?? "Content not found" }, { status: 404 });
    const { data: latest } = await client.from("content_revisions").select("revision_number").eq("content_item_id", id).order("revision_number", { ascending: false }).limit(1).maybeSingle();
    const { error: revisionError } = await client.from("content_revisions").insert({ content_item_id: id, revision_number: (latest?.revision_number ?? 0) + 1, snapshot: item });
    if (revisionError) return NextResponse.json({ error: revisionError.message }, { status: 500 });
  }
  const { error } = await client.from("content_items").update({ status, published_at: status === "published" ? new Date().toISOString() : null }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
