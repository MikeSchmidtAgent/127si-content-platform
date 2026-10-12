"use client";

import { FormEvent, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export default function NewContentPage() {
  const [type, setType] = useState("shout_out");
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Saving...");
    const values = new FormData(event.currentTarget);
    const { data: sessionData } = await getSupabaseBrowser().auth.getSession();
    if (!sessionData.session) { window.location.href = "/admin/login"; return; }
    const title = String(values.get("title") ?? "").trim();
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `content-${Date.now()}`;
    const typeData = type === "shout_out" ? { athlete_name: String(values.get("athlete") ?? "").trim(), story: String(values.get("story") ?? "").trim(), permission_confirmed: values.get("permission_confirmed") === "on" } : {};
    const response = await fetch("/api/admin/content", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionData.session.access_token}` }, body: JSON.stringify({ content_type: type, title, slug, short_description: String(values.get("description") ?? "").trim(), type_data: typeData, visibility: "public" }) });
    const result = await response.json();
    setMessage(response.ok ? "Draft saved." : result.error ?? "Could not save this item.");
  }
  return <main className="shell">
    <nav className="nav"><div className="brand">127SI ADMIN</div><a href="/admin">Back</a></nav>
    <section className="hero">
      <div className="eyebrow">New content</div><h1>Add something in minutes.</h1>
      <form onSubmit={submit} style={{display:"grid", gap:16, maxWidth:720}}>
        <label>Content type<select value={type} onChange={e=>setType(e.target.value)} style={{display:"block", width:"100%", padding:12, marginTop:6}}><option value="shout_out">Shout Out</option><option value="tutorial">Tutorial</option><option value="fbc_book">FBC Book reading</option></select></label>
        <label>Title<input required name="title" placeholder="Night Shooting" style={{display:"block", width:"100%", padding:12, marginTop:6}} /></label>
        <label>Short description<textarea name="description" rows={3} placeholder="What is this about?" style={{display:"block", width:"100%", padding:12, marginTop:6}} /></label>
        {type === "shout_out" && <><label>Athlete name<input name="athlete" placeholder="Full athlete name" style={{display:"block", width:"100%", padding:12, marginTop:6}} /></label><label>Achievement story<textarea name="story" rows={5} placeholder="What did the athlete accomplish?" style={{display:"block", width:"100%", padding:12, marginTop:6}} /></label><label><input name="permission_confirmed" type="checkbox" required /> Permission confirmed</label></>}
        <label>Media<input type="file" accept="image/*,video/*,.pdf" style={{display:"block", marginTop:8}} /></label>
        <button className="button" type="submit" style={{border:0, cursor:"pointer", width:"fit-content"}}>Save draft</button>
        {message && <p className="muted">{message}</p>}
      </form>
    </section>
  </main>;
}
