import { useState } from "react";
import { createIntake, getToken } from "../api";

export default function IntakeForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"A" | "B">("A");
  const [profile, setProfile] = useState<"prototype" | "iot_wifi_eu">(
    "prototype"
  );
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOk(null);
    if (!getToken()) {
      setErr("Set the bearer token first.");
      return;
    }
    setBusy(true);
    try {
      const r = await createIntake({
        title,
        deliverable_type: type,
        details,
        compliance_profile: profile,
      });
      setOk(`Created ${r.slug ?? r.intake_id}`);
      setTitle("");
      setDetails("");
      onCreated();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="intake" onSubmit={submit}>
      <label>
        Title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="e.g. KXKM parallelator v2"
        />
      </label>
      <label>
        Deliverable type
        <select
          value={type}
          onChange={(e) => setType(e.target.value as "A" | "B")}
        >
          <option value="A">A — hardware evidence pack</option>
          <option value="B">B — product increment</option>
        </select>
      </label>
      <label>
        Compliance profile
        <select
          value={profile}
          onChange={(e) =>
            setProfile(e.target.value as "prototype" | "iot_wifi_eu")
          }
        >
          <option value="prototype">prototype</option>
          <option value="iot_wifi_eu">iot_wifi_eu</option>
        </select>
      </label>
      <label className="wide">
        Details
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Goal + initial constraints"
        />
      </label>
      <div className="actions">
        {err && <span className="err">Error: {err}</span>}
        {ok && <span style={{ color: "var(--ok)" }}>{ok}</span>}
        <button type="submit" className="btn primary" disabled={busy}>
          {busy ? "Creating…" : "Create intake"}
        </button>
      </div>
    </form>
  );
}
