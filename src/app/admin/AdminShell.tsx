"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { platformLabel } from "@127si/admin-design-system";

const links = [
  ["/admin", "Dashboard"],
  ["/admin/records", "Records"],
  ["/admin/assets", "Assets"],
  ["/admin/integrations", "Integrations"],
  ["/admin/status", "System status"],
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div className="admin-layout">
    <aside className="admin-sidebar">
      <Link className="admin-logo" href="/admin">{platformLabel("content")}</Link>
      <p className="sidebar-label">Workspace</p>
      <nav className="sidebar-nav">{links.map(([href, label]) => <Link className={pathname === href ? "active" : ""} href={href} key={href}>{label}</Link>)}</nav>
      <div className="sidebar-bottom"><Link href="/admin/new" className="button full-button">+ New content</Link><Link href="/" className="sidebar-muted">View public site →</Link></div>
    </aside>
    <main className="admin-main"><div className="mobile-admin-nav">{links.map(([href, label]) => <Link className={pathname === href ? "active" : ""} href={href} key={href}>{label}</Link>)}</div>{children}</main>
  </div>;
}
