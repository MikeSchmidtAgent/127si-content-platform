import { getSupabasePublic } from "@/lib/supabase";

export default async function ContentPage() {
  const supabase = getSupabasePublic();
  const { data } = supabase ? await supabase.from("published_content").select("id,title,content_type,short_description").order("published_at", { ascending:false }) : { data:null };
  return <main className="shell"><nav className="nav"><div className="brand">127SI CONTENT</div><a href="/">Home</a></nav><section className="hero"><div className="eyebrow">Published content</div><h1>Resources for the work.</h1><p className="muted">This page will display published content from the Content Platform.</p>{data?.length ? <div className="grid">{data.map((item) => <article className="card" key={item.id}><div className="eyebrow">{item.content_type}</div><h2>{item.title}</h2><p className="muted">{item.short_description}</p></article>)}</div> : <p className="muted">No published content is connected yet. The Airtable migration will populate this view.</p>}</section></main>;
}
