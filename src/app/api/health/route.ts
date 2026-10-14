import { NextResponse } from "next/server";
import { getSupabasePublic } from "@/lib/supabase";

/** Operational probe: configured public Supabase client and published read model reachable (no destination filter). */
export async function GET() {
  const supabase = getSupabasePublic();
  if (!supabase) {
    return NextResponse.json(
      { status: "degraded", checks: { configured: false, published_content: "skipped" } },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  const { error, count } = await supabase.from("published_content").select("*", { count: "exact", head: true });
  if (error) {
    return NextResponse.json(
      { status: "degraded", checks: { configured: true, published_content: "error" } },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.json(
    { status: "ok", checks: { configured: true, published_content: "ok", published_count: count ?? 0 } },
    { headers: { "Cache-Control": "no-store" } },
  );
}
