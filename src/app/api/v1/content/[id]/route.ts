import { NextResponse } from "next/server";
import { getSupabasePublic } from "@/lib/supabase";
const CACHE_HEADERS = { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" };

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = getSupabasePublic();
  if (!supabase) return NextResponse.json({ error: "Content service is not configured" }, { status: 503, headers: CACHE_HEADERS });
  const { data, error } = await supabase.from("published_content").select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: "Unable to load published content" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Content not found" }, { status: 404 });
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const normalized = { ...data, media: (data.media ?? []).map((asset: any) => ({ ...asset, public_url: asset.public_url?.startsWith("http") ? asset.public_url : base ? `${base}${asset.public_url ?? ""}` : asset.public_url })) };
  return NextResponse.json({ data: normalized }, { headers: CACHE_HEADERS });
}
