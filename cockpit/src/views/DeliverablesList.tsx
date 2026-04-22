import { useEffect, useState } from "react";
import { Link } from "wouter";
import { listDeliverables, type Deliverable } from "../api";

export default function DeliverablesList() {
  const [items, setItems] = useState<Deliverable[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listDeliverables()
      .then((d) => {
        setItems(d);
        setLoading(false);
      })
      .catch((e: Error) => {
        setErr(String(e));
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading deliverables…</p>;
  if (err) return <p style={{ color: "#b91c1c" }}>Error: {err}</p>;

  return (
    <section>
      <h2>Deliverables</h2>
      {items.length === 0 ? (
        <p>No deliverables yet. Create one via <code>f4l intake create</code>.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Slug</th>
              <th style={th}>Type</th>
              <th style={th}>State</th>
              <th style={th}>Profile</th>
              <th style={th}>Last transition</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.slug}>
                <td style={td}>
                  <Link href={`/deliverables/${it.slug}`}>{it.slug}</Link>
                </td>
                <td style={td}>{it.type}</td>
                <td style={td}>{it.current_state}</td>
                <td style={td}>{it.compliance_profile}</td>
                <td style={td}>{it.last_transition_at ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  borderBottom: "1px solid #ccc",
  padding: "0.5rem",
};
const td: React.CSSProperties = { padding: "0.5rem", borderBottom: "1px solid #eee" };
