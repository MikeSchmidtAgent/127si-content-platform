"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { AdminShell } from "../AdminShell";
type Item = { id:string; content_type:string; title:string; status:string; visibility?:string; created_at?:string };
export default function RecordsPage() { const [items,setItems]=useState<Item[]>([]); const [filter,setFilter]=useState("all");
 useEffect(()=>{(async()=>{const {data}=await (getSupabaseBrowser().auth as any).getSession(); if(!data.session){window.location.href="/admin/login";return;} const r=await fetch("/api/admin/content",{headers:{Authorization:`Bearer ${data.session.access_token}`}}); const j=await r.json();setItems(j.data??[]);})();},[]);
 const shown=filter==="all"?items:items.filter(i=>i.status===filter);
 return <AdminShell><div className="page-heading"><div><div className="eyebrow">Workspace</div><h1>Records</h1><p className="muted">Every tutorial, book entry, and shout out in one place.</p></div><Link className="button" href="/admin/new">+ New content</Link></div><div className="toolbar"><div className="tabs">{["all","draft","published","unpublished"].map(x=><button className={filter===x?"selected":""} onClick={()=>setFilter(x)} key={x}>{x[0].toUpperCase()+x.slice(1)}</button>)}</div><span className="muted">{shown.length} record{shown.length===1?"":"s"}</span></div><div className="record-table">{shown.map(i=><div className="record-row" key={i.id}><div><strong>{i.title}</strong><p className="muted compact">{i.content_type.replaceAll("_"," ")} · {i.visibility??"not set"}</p></div><span className={`status status-${i.status}`}>{i.status}</span><Link className="text-link" href={`/admin/${i.id}/edit`}>Edit →</Link></div>)}{shown.length===0&&<div className="empty-state">No records match this filter.</div>}</div></AdminShell> }
