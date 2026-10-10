import Link from "next/link";

export default function Home() {
  return <main className="shell">
    <nav className="nav"><div className="brand">127SI CONTENT PLATFORM</div><div className="navlinks"><Link href="/content">Content</Link><Link href="/admin">Admin</Link></div></nav>
    <section className="hero"><div className="eyebrow">127 Sports Intensity</div><h1>One home for the content that powers the ecosystem.</h1><p className="muted">Tutorials, FBC Book readings, and athlete Shout Outs—organized once and ready to serve Challenge-Platform and future 127SI applications.</p><Link className="button" href="/content">Explore content</Link></section>
    <section className="grid"><div className="card"><h2>Tutorials</h2><p className="muted">Skill instruction, drills, coaching points, and practice guidance.</p></div><div className="card"><h2>FBC Book</h2><p className="muted">Educational readings and character-development material.</p></div><div className="card"><h2>Shout Outs</h2><p className="muted">Short stories celebrating athlete effort, dedication, and growth.</p></div></section>
  </main>;
}
