import { useState } from "react";
import { getToken, setToken } from "../api";

export default function TokenBar() {
  const [value, setValue] = useState(getToken());
  const [editing, setEditing] = useState(false);
  const masked = value ? `${value.slice(0, 4)}…${value.slice(-4)}` : "(none)";

  if (!editing) {
    return (
      <div className="token-box">
        <span className="muted">Bearer token:</span>
        <code>{masked}</code>
        <button className="btn" onClick={() => setEditing(true)}>
          {value ? "change" : "set"}
        </button>
      </div>
    );
  }

  return (
    <form
      className="token-box"
      onSubmit={(e) => {
        e.preventDefault();
        setToken(value.trim());
        setEditing(false);
      }}
    >
      <input
        className="btn"
        style={{ minWidth: "260px" }}
        type="password"
        placeholder="F4L_BEARER_TOKEN"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
      />
      <button className="btn primary" type="submit">
        save
      </button>
      <button
        type="button"
        className="btn"
        onClick={() => {
          setValue(getToken());
          setEditing(false);
        }}
      >
        cancel
      </button>
    </form>
  );
}
