import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { getDeliverable, type Deliverable, type Gate } from "../api";

export default function DeliverableDetail() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";
  const [deliverable, setDeliverable] = useState<Deliverable | null>(null);
  const [gates, setGates] = useState<Gate[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    getDeliverable(slug)
      .then((d) => {
        setDeliverable(d.deliverable);
        setGates(d.gates);
      })
      .catch((e: Error) => setErr(String(e)));
  }, [slug]);

  if (err) return <p style={{ color: "#b91c1c" }}>Error: {err}</p>;
  if (!deliverable) return <p>Loading {slug}…</p>;

  return (
    <section>
      <p>
        <Link href="/">← back</Link>
      </p>
      <h2>
        {deliverable.slug} — {deliverable.title}
      </h2>
      <dl>
        <dt>Type</dt>
        <dd>{deliverable.type}</dd>
        <dt>State</dt>
        <dd>
          <strong>{deliverable.current_state}</strong>
        </dd>
        <dt>Compliance profile</dt>
        <dd>{deliverable.compliance_profile}</dd>
        <dt>Owner</dt>
        <dd>{deliverable.owner}</dd>
      </dl>
      <h3>Gates</h3>
      {gates.length === 0 ? (
        <p>No gate events yet.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Gate</th>
              <th style={th}>Verdict</th>
              <th style={th}>Decided by</th>
              <th style={th}>At</th>
              <th style={th}>Reasons</th>
            </tr>
          </thead>
          <tbody>
            {gates.map((g) => (
              <tr key={g.gate_id}>
                <td style={td}>{g.gate_name}</td>
                <td style={td}>{g.verdict}</td>
                <td style={td}>{g.decided_by ?? "—"}</td>
                <td style={td}>{g.decided_at ?? "—"}</td>
                <td style={td}>{g.reasons ?? "—"}</td>
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
