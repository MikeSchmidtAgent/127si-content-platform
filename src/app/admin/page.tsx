"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
export default function AdminPage() {
  const [count, setCount] = useState(0);
  useEffect(() => { void (async () => { const { data } = await (getSupabaseBrowser().auth as any).getSession(); if (!data.session) { window.location.href = "/admin/login"; return; } const response = await fetch("/api/admin/content", { headers: { Authorization: `Bearer ${data.session.access_token}` } }); const result = await response.json(); setCount(result.data?.length ?? 0); })(); }, []);
  return <main className="shell"><nav className="nav"><div className="brand">127SI ADMIN</div><div className="navlinks"><Link href="/admin/content">Content records</Link><a href="/">View site</a></div></nav><section className="hero"><div className="eyebrow">Admin home</div><h1>Content workspace.</h1><p className="muted">Create, review, and publish the content that powers 127SI.</p><div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><Link className="button" href="/admin/content">Manage content records</Link><Link className="button" href="/admin/new">New content</Link></div><p className="muted" style={{ marginTop: 28 }}>You have {count} content record{count === 1 ? "" : "s"}.</p></section></main>;
}
