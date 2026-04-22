import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { listDeliverables, type Deliverable } from "../api";
import IntakeForm from "../components/IntakeForm";

const POLL_MS = 10_000;

export default function DeliverablesList() {
  const [items, setItems] = useState<Deliverable[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const d = await listDeliverables();
      setItems(
        d.sort((a, b) =>
          (b.last_transition_at ?? "").localeCompare(a.last_transition_at ?? "")
        )
      );
      setErr(null);
    } catch (e) {
      setErr((e as Error).message);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <>
      <section className="card">
        <h2>Create intake</h2>
        <IntakeForm onCreated={refresh} />
      </section>

      <section className="card">
        <h2>Deliverables</h2>
        {err && <p className="err">Error: {err}</p>}
        {!items && !err && <p className="loading">Loading…</p>}
        {items && items.length === 0 && (
          <p className="empty">
            No deliverables yet. Create one above or run{" "}
            <code>f4l intake create</code> from the CLI.
          </p>
        )}
        {items && items.length > 0 && (
          <table className="deliverables">
            <thead>
              <tr>
                <th>Slug</th>
                <th>Type</th>
                <th>State</th>
                <th>Profile</th>
                <th>Last transition</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.slug}>
                  <td>
                    <Link href={`/deliverables/${it.slug}`}>{it.slug}</Link>
                    <div className="muted" style={{ fontSize: "0.75rem" }}>
                      {it.title}
                    </div>
                  </td>
                  <td>
                    <span className={`pill type-${it.type}`}>{it.type}</span>
                  </td>
                  <td>
                    <span className={`pill state-${it.current_state}`}>
                      {it.current_state}
                    </span>
                  </td>
                  <td>
                    <span className="muted">{it.compliance_profile}</span>
                  </td>
                  <td className="muted">
                    {it.last_transition_at
                      ? new Date(it.last_transition_at).toLocaleString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
