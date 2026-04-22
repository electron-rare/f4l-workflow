import { Route, Switch } from "wouter";
import DeliverablesList from "./views/DeliverablesList";
import DeliverableDetail from "./views/DeliverableDetail";

export default function App() {
  return (
    <main
      style={{
        maxWidth: "960px",
        margin: "2rem auto",
        padding: "0 1rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <header style={{ borderBottom: "1px solid #ddd", paddingBottom: "1rem" }}>
        <h1>Factory 4 Life cockpit</h1>
      </header>
      <Switch>
        <Route path="/" component={DeliverablesList} />
        <Route path="/deliverables/:slug" component={DeliverableDetail} />
        <Route>
          <p>Not found.</p>
        </Route>
      </Switch>
    </main>
  );
}
