export type DeliverableState =
  | "intake"
  | "spec"
  | "impl"
  | "ship"
  | "ready"
  | "release"
  | "done"
  | "aborted"
  | "blocked-by-fix";

export type Event =
  | { kind: "SpecDraftCompleted" }
  | { kind: "GateSpecPass" }
  | { kind: "GateSpecFail" }
  | { kind: "GateImplPass" }
  | { kind: "GateImplFail"; category?: "compliance" | "test" | "build" }
  | { kind: "GateShipPass" }
  | { kind: "GateShipFail" }
  | { kind: "FixResolved" };

export function transition(
  state: DeliverableState,
  event: Event
): DeliverableState {
  switch (state) {
    case "intake":
      if (event.kind === "SpecDraftCompleted") return "spec";
      return state;
    case "spec":
      if (event.kind === "GateSpecPass") return "impl";
      if (event.kind === "GateSpecFail") return "spec";
      return state;
    case "impl":
      if (event.kind === "GateImplPass") return "ship";
      if (event.kind === "GateImplFail") {
        return event.category === "compliance" ? "blocked-by-fix" : "impl";
      }
      return state;
    case "ship":
      if (event.kind === "GateShipPass") return "done";
      if (event.kind === "GateShipFail") return "aborted";
      return state;
    case "blocked-by-fix":
      if (event.kind === "FixResolved") return "impl";
      return state;
    default:
      return state;
  }
}
