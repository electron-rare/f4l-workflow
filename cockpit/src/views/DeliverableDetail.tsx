import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import {
  advanceGate,
  byRecentFirst,
  formatGristDate,
  getDeliverable,
  getToken,
  type Deliverable,
  type Gate,
} from "../api";

const GATES_FOR_TYPE_A = ["G-spec", "G-impl", "G-ship"] as const;
const GATES_FOR_TYPE_B = ["G-ready", "G-release"] as const;

export default function DeliverableDetail() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";
  const [deliverable, setDeliverable] = useState<Deliverable | null>(null);
  const [gates, setGates] = useState<Gate[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!slug) return;
    try {
      const d = await getDeliverable(slug);
      setDeliverable(d.deliverable);
      setGates(d.gates.sort((a, b) => byRecentFirst(a.decided_at, b.decided_at)));
      setErr(null);
    } catch (e) {
      setErr((e as Error).message);
    }
  }, [slug]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 10_000);
    return () => clearInterval(id);
  }, [refresh]);

  const onAdvance = async (gate: string, verdict: "pass" | "fail") => {
    if (!getToken()) {
      setErr("Set the bearer token first (top right).");
      return;
    }
    if (!deliverable) return;
    setBusy(true);
    try {
      await advanceGate({
        deliverable_id: deliverable.slug,
        gate,
        verdict,
      });
      await refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (err) return <p className="err">Error: {err}</p>;
  if (!deliverable)
    return (
      <p className="loading">
        Loading {slug}… <Link href="/">back</Link>
      </p>
    );

  const possibleGates =
    deliverable.type === "A" ? GATES_FOR_TYPE_A : GATES_FOR_TYPE_B;

  return (
    <>
      <p>
        <Link href="/">← back</Link>
      </p>
      <section className="card">
        <div className="row">
          <h2 style={{ margin: 0 }}>{deliverable.slug}</h2>
          <span className={`pill type-${deliverable.type}`}>
            {deliverable.type}
          </span>
          <span className={`pill state-${deliverable.current_state}`}>
            {deliverable.current_state}
          </span>
          <span className="spacer" />
          <span className="muted">{deliverable.compliance_profile}</span>
        </div>
        <p className="muted" style={{ marginTop: "0.4rem" }}>
          {deliverable.title}
        </p>
        <dl className="detail">
          <dt>Owner</dt>
          <dd>{deliverable.owner || "—"}</dd>
          <dt>Last transition</dt>
          <dd>{formatGristDate(deliverable.last_transition_at)}</dd>
        </dl>
      </section>

      <section className="card">
        <h2>Advance a gate</h2>
        <div className="gate-actions">
          {possibleGates.map((g) => (
            <div className="row" key={g}>
              <span style={{ fontFamily: "monospace" }}>{g}</span>
              <button
                className="btn ok"
                disabled={busy}
                onClick={() => onAdvance(g, "pass")}
              >
                pass
              </button>
              <button
                className="btn danger"
                disabled={busy}
                onClick={() => onAdvance(g, "fail")}
              >
                fail
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Gate history</h2>
        {gates.length === 0 ? (
          <p className="empty">No gate events yet.</p>
        ) : (
          <div className="gates-grid">
            <div className="head">Gate</div>
            <div className="head">Verdict</div>
            <div className="head">By</div>
            <div className="head">Reasons</div>
            <div className="head">When</div>
            {gates.map((g) => (
              <div
                key={g.gate_id}
                style={{ display: "contents", fontSize: "0.85rem" }}
              >
                <div style={{ fontFamily: "monospace" }}>{g.gate_name}</div>
                <div>
                  <span
                    className={`pill state-${g.verdict === "pass" ? "done" : g.verdict === "fail" ? "aborted" : "intake"}`}
                  >
                    {g.verdict}
                  </span>
                </div>
                <div className="muted">{g.decided_by ?? "—"}</div>
                <div className="muted">{g.reasons || "—"}</div>
                <div className="muted">{formatGristDate(g.decided_at)}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
