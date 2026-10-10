import Link from "next/link";

export default function AdminPage() {
  return <main className="shell"><nav className="nav"><div className="brand">127SI ADMIN</div><a href="/">View site</a></nav><section className="hero"><div className="eyebrow">Content workspace</div><h1>Add content in minutes.</h1><p className="muted">Create a draft, attach media, and publish when ready.</p><Link className="button" href="/admin/new">New content</Link><div className="grid"><div className="card"><h2>Tutorials</h2><p className="muted">Add instruction, media, and coaching context.</p></div><div className="card"><h2>Readings</h2><p className="muted">Add an article, chapter, document, or link.</p></div><div className="card"><h2>Shout Outs</h2><p className="muted">Celebrate an athlete accomplishment with a story and media.</p></div></div></section></main>;
}
