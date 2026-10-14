"use client";
import { useEffect, useState } from "react";
import { AdminShell } from "../AdminShell";

export default function StatusPage() {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/health")
      .then(async (r) => {
        if (!r.ok) {
          setOk(false);
          return;
        }
        const body = (await r.json()) as { status?: string };
        setOk(body.status === "ok");
      })
      .catch(() => setOk(false));
  }, []);
  return (
    <AdminShell>
      <div className="eyebrow">Operations</div>
      <h1>System status</h1>
      <p className="muted">A quick view of the services that power your content platform.</p>
      <div className="status-list">
        <div>
          <span className={`health-dot ${ok === true ? "good" : "pending"}`}></span>
          <div>
            <strong>Published content API</strong>
            <p className="muted compact">{ok === true ? "Responding normally" : "Checking connection…"}</p>
          </div>
          <span className="status status-published">{ok === true ? "Operational" : "Checking"}</span>
        </div>
        <div>
          <span className="health-dot good"></span>
          <div>
            <strong>Admin workspace</strong>
            <p className="muted compact">Sign-in and record editing are available.</p>
          </div>
          <span className="status status-published">Operational</span>
        </div>
        <div>
          <span className="health-dot pending"></span>
          <div>
            <strong>Media storage</strong>
            <p className="muted compact">Available when the storage migration is enabled.</p>
          </div>
          <span className="status status-draft">Setup</span>
        </div>
      </div>
    </AdminShell>
  );
}
