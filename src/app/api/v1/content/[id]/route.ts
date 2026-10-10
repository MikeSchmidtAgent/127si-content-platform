import { NextResponse } from "next/server";
import { getSupabasePublic } from "@/lib/supabase";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = getSupabasePublic();
  if (!supabase) return NextResponse.json({ error: "Content service is not configured" }, { status: 503 });
  const { data, error } = await supabase.from("published_content").select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Content not found" }, { status: 404 });
  return NextResponse.json({ data }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
