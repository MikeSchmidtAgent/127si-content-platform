import { NextResponse } from "next/server";
import { getSupabasePublic } from "@/lib/supabase";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const challengeId = url.searchParams.get("challenge_id");
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get("page_size") ?? "20")));
  const supabase = getSupabasePublic();
  if (!supabase) return NextResponse.json({ error: "Content service is not configured" }, { status: 503 });
  let query = supabase.from("published_content").select("*", { count: "exact" }).order("published_at", { ascending:false }).range((page-1)*pageSize, page*pageSize-1);
  if (type) query = query.eq("content_type", type);
  if (challengeId) query = query.contains("challenge_ids", [challengeId]);
  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, pagination: { page, page_size: pageSize, total: count ?? 0 } }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
