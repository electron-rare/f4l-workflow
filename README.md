# f4l-workflow

Control plane for the Factory 4 Life workflow. Three subsystems:

- `engine/` — TypeScript/Hono state machine + webhook receivers
- `cockpit/` — React/Vite web UI
- `cli/` — Python Typer CLI

See the design spec in the parent monorepo at
`docs/superpowers/specs/2026-04-22-f4l-workflow-design.md`.
