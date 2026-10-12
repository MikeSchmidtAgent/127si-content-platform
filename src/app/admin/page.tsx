"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

type Item = { id: string; content_type: string; title: string; status: string; visibility?: string; created_at?: string };

export default function AdminPage() {
  const [items, setItems] = useState<Item[]>([]); const [message, setMessage] = useState("");
  async function load() {
    const { data } = await (getSupabaseBrowser().auth as any).getSession();
    if (!data.session) { window.location.href = "/admin/login"; return; }
    const response = await fetch("/api/admin/content", { headers: { Authorization: `Bearer ${data.session.access_token}` } });
    if (response.status === 401) { window.location.href = "/admin/login"; return; }
    const result = await response.json(); setItems(result.data ?? []);
  }
  useEffect(() => { void load(); }, []);
  async function changeStatus(item: Item) {
    const { data } = await (getSupabaseBrowser().auth as any).getSession(); if (!data.session) return;
    const status = item.status === "published" ? "unpublished" : "published"; setMessage("Updating...");
    const response = await fetch(`/api/admin/content/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ status }) });
    setMessage(response.ok ? "Updated." : "Could not update item."); await load();
  }
  return <main className="shell"><nav className="nav"><div className="brand">127SI ADMIN</div><a href="/">View site</a></nav><section className="hero"><div className="eyebrow">Content workspace</div><h1>Manage your content.</h1><p className="muted">Create a draft, review it here, then publish it when ready.</p><Link className="button" href="/admin/new">New content</Link>{message && <p className="muted">{message}</p>}<div style={{display:"grid", gap:12, marginTop:28}}>{items.length === 0 ? <p className="muted">No content yet.</p> : items.map(item => <div className="card" key={item.id} style={{display:"flex", justifyContent:"space-between", alignItems:"center", gap:16}}><div><h2>{item.title}</h2><p className="muted" style={{textTransform:"capitalize"}}>{item.content_type.replaceAll("_", " ")} · {item.status}{item.visibility ? ` · ${item.visibility.replace("_", " ")}` : ""}</p>{item.created_at && <small className="muted">Created {new Date(item.created_at).toLocaleDateString()}</small>}</div><button className="button" onClick={() => void changeStatus(item)} style={{border:0, cursor:"pointer"}}>{item.status === "published" ? "Unpublish" : "Publish"}</button></div>)}</div></section></main>;
}
