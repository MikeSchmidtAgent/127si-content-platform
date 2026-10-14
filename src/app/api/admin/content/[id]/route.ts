import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateContentAdmin } from "@/lib/admin-auth";
import { isSecurePublishingEnabled } from "@/lib/admin-authorization";
import { applyLegacyContentStatus } from "@/lib/legacy-content-status";

const editSchema = z.object({
  content_type: z.enum(["tutorial", "fbc_book", "shout_out"]),
  title: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  short_description: z.string().optional(),
  type_data: z.record(z.string(), z.unknown()).default({}),
  visibility: z.enum(["public", "link_only"]).default("public"),
});


export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateContentAdmin(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const client = auth.adminClient;
  const { id } = await params; const body = await request.json();
  if (body.status === undefined) {
    const parsed = editSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    if (parsed.data.content_type === "shout_out" && parsed.data.type_data.permission_confirmed !== true) {
      return NextResponse.json({ error: "Shout Outs require permission confirmation" }, { status: 400 });
    }
    const { data, error } = await client.from("content_items").update({ ...parsed.data, status: "draft", updated_at: new Date().toISOString() }).eq("id", id).select("id, content_type, title, slug, short_description, type_data, status, visibility, updated_at").single();
    if (error) return NextResponse.json({ error: error.message }, { status: error.code === "PGRST116" ? 404 : 500 });
    return NextResponse.json({ data });
  }
  if (!["published", "unpublished", "draft"].includes(body.status)) {
    return NextResponse.json({ error: "Invalid content status" }, { status: 400 });
  }
  if (isSecurePublishingEnabled()) {
    const { error } = await client.rpc("set_content_status", { p_content_id: id, p_status: body.status });
    if (error) return NextResponse.json({ error: error.message }, { status: error.code === "P0002" ? 404 : error.code === "22023" ? 400 : 500 });
    return NextResponse.json({ ok: true });
  }
  const legacy = await applyLegacyContentStatus(client, id, body.status);
  if ("error" in legacy) return NextResponse.json({ error: legacy.error }, { status: legacy.status });
  return NextResponse.json({ ok: true });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateContentAdmin(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const client = auth.adminClient;
  const { id } = await params;
  const { data, error } = await client.from("content_items").select("id, content_type, title, slug, short_description, type_data, status, visibility, updated_at").eq("id", id).single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Content not found" }, { status: 404 });
  return NextResponse.json({ data });
}

