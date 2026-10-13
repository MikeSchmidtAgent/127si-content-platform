import { NextResponse } from "next/server";
import { authenticateContentAdmin } from "@/lib/admin-auth";

const MAX_FILE_SIZE = 50 * 1024 * 1024;


export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateContentAdmin(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id: contentItemId } = await params;
  const { data: item, error: itemError } = await auth.adminClient.from("content_items").select("id").eq("id", contentItemId).maybeSingle();
  if (itemError) return NextResponse.json({ error: itemError.message }, { status: 500 });
  if (!item) return NextResponse.json({ error: "Content item not found" }, { status: 404 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "A media file is required" }, { status: 400 });
  if (!file.type || file.type === "application/octet-stream") return NextResponse.json({ error: "This file type could not be identified. Choose an image, video, or document with a file extension." }, { status: 400 });
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "Files must be 50 MB or smaller" }, { status: 400 });
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const storagePath = `${contentItemId}/${crypto.randomUUID()}.${extension}`;
  const upload = await auth.adminClient.storage.from("content-media").upload(storagePath, await file.arrayBuffer(), { contentType: file.type, upsert: false });
  if (upload.error) return NextResponse.json({ error: upload.error.message }, { status: 500 });
  const mediaType = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "document";
  const { data: asset, error: assetError } = await auth.adminClient.from("media_assets").insert({ storage_bucket: "content-media", asset_kind: mediaType === "document" ? "document" : mediaType, storage_path: storagePath, media_type: mediaType, mime_type: file.type, filename: file.name, display_name: String(form.get("display_name") ?? file.name).trim() || file.name, description: String(form.get("description") ?? "").trim() || null, tags: String(form.get("tags") ?? "").split(",").map(tag => tag.trim().toLowerCase()).filter(Boolean), file_size: file.size, alt_text: String(form.get("alt_text") ?? "").trim() || null, caption: String(form.get("caption") ?? "").trim() || null, uploaded_by: auth.userId }).select("id, storage_path, media_type, mime_type, filename, file_size, alt_text, caption").single();
  if (assetError) { await auth.adminClient.storage.from("content-media").remove([storagePath]); return NextResponse.json({ error: assetError.message }, { status: 500 }); }
  const { error: linkError } = await auth.adminClient.from("content_media").insert({ content_item_id: contentItemId, media_asset_id: asset.id, role: "primary", display_order: 0 });
  if (linkError) { await auth.adminClient.from("media_assets").delete().eq("id", asset.id); await auth.adminClient.storage.from("content-media").remove([storagePath]); return NextResponse.json({ error: linkError.message }, { status: 500 }); }
  return NextResponse.json({ data: asset }, { status: 201 });
}

