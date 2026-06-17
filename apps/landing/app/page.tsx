import { LeadForm } from "./LeadForm";

const APP_DEMO_URL =
  process.env.NEXT_PUBLIC_APP_DEMO_URL ?? "http://localhost:3100/app-acme";

export default function LandingPage() {
  return (
    <div className="container">
      <nav className="nav">
        <div className="brand">
          <span className="dot" />
          ShipGate QA
        </div>
        <div className="nav-links">
          <a href="#agents">Agents</a>
          <a href="#how">How it works</a>
          <a href="#contact">Contact</a>
        </div>
      </nav>

      <header className="hero">
        <span className="eyebrow">Managed QA, run by AI agents</span>
        <h1>
          Quality assurance that <span className="grad">writes its own tests</span>.
        </h1>
        <p>
          ShipGate runs a managed-QA team for your product: Claude-driven agents
          read your Jira stories and code changes, draft test scenarios for your
          QA lead to approve, then keep regressions and trends under control —
          all backed by a complete history of every run and decision.
        </p>
        <div className="cta" id="access">
          <a className="btn btn-primary" href="#contact">
            Request access →
          </a>
          <a className="btn btn-ghost" href={APP_DEMO_URL}>
            Open a demo workspace
          </a>
        </div>
      </header>

      <section className="grid" id="how">
        <div className="card">
          <span className="tag">Human in the loop</span>
          <h3>You approve, agents execute</h3>
          <p>
            Agents draft plain-language scenarios. Your QA lead approves or
            discards before a single test is written.
          </p>
        </div>
        <div className="card">
          <span className="tag">One client per instance</span>
          <h3>Isolated by construction</h3>
          <p>
            Every client gets their own deployment and database. No query ever
            spans clients — tenant isolation isn&apos;t a feature, it&apos;s the
            architecture.
          </p>
        </div>
        <div className="card">
          <span className="tag">Full history</span>
          <h3>Every run is remembered</h3>
          <p>
            Runs, failures, classifications, and human decisions are all recorded
            — the backbone for trustworthy trend analysis.
          </p>
        </div>
      </section>

      <section className="agents" id="agents">
        <div className="agents-head">The three agents</div>
        <div className="agent-row">
          <span className="num">1</span>
          <span className="desc">
            <strong>Scenario &amp; test writer</strong> — reads stories, diffs,
            and docs; drafts reviewable scenarios; writes CodeceptJS tests on
            approval.
          </span>
          <span className="pill live">Built</span>
        </div>
        <div className="agent-row">
          <span className="num">2</span>
          <span className="desc">
            <strong>Regression analyzer</strong> — ingests CI runs and classifies
            failures as real bug, test issue, or flaky.
          </span>
          <span className="pill">Scaffold</span>
        </div>
        <div className="agent-row">
          <span className="num">3</span>
          <span className="desc">
            <strong>Trend analyzer</strong> — charts quality over time and answers
            questions only from recorded history.
          </span>
          <span className="pill">Scaffold</span>
        </div>
      </section>

      <section className="lead" id="contact">
        <div className="lead-copy">
          <span className="eyebrow">Get started</span>
          <h2>Bring managed QA to your product</h2>
          <p>
            Tell us where to point the agents. We&apos;ll set up a dedicated
            instance with its own database and your QA lead in the loop.
          </p>
        </div>
        <LeadForm />
      </section>

      <footer className="footer">
        <span>© {new Date().getFullYear()} ShipGate QA — MVP</span>
        <span>Claude · CodeceptJS · Playwright · Postgres</span>
      </footer>
    </div>
  );
}
