import { Route, Switch } from "wouter";
import DeliverablesList from "./views/DeliverablesList";
import DeliverableDetail from "./views/DeliverableDetail";
import TokenBar from "./components/TokenBar";
import "./styles.css";

export default function App() {
  return (
    <div className="shell">
      <header className="top">
        <div>
          <h1>Factory 4 Life · Workflow cockpit</h1>
          <span className="muted">
            engine.saillant.cc · deliverables, gates, intake
          </span>
        </div>
        <TokenBar />
      </header>
      <main>
        <Switch>
          <Route path="/" component={DeliverablesList} />
          <Route path="/deliverables/:slug" component={DeliverableDetail} />
          <Route>
            <div className="card empty">Not found.</div>
          </Route>
        </Switch>
      </main>
    </div>
  );
}
