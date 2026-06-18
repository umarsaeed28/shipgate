const APP_DEMO_URL =
  process.env.NEXT_PUBLIC_APP_DEMO_URL ?? "http://localhost:3100/app-acme";

export default function LandingPage() {
  return (
    <div className="container">
      <nav className="nav">
        <div className="brand">
          <span className="dot" />
          Shipgate QA
        </div>
        <div className="nav-links">
          <a href="#agents">Agents</a>
          <a href="#how">How it works</a>
          <a href="#contact">Contact</a>
        </div>
      </nav>

      <header className="hero">
        <h1>
          Managed QA, powered by <span className="grad">intelligent agents</span>
        </h1>
        <p>
          Shipgate gives your product a full QA team. Agents powered by Claude
          read your stories and code, design the tests, run them, and flag what
          matters. Your QA lead holds final approval, so nothing reaches your
          suite without sign off.
        </p>
        <div className="cta" id="access">
          <a className="btn btn-primary" href="/onboarding">
            Request access →
          </a>
          <a className="btn btn-ghost" href={APP_DEMO_URL}>
            Open a demo workspace
          </a>
        </div>
      </header>

      <section className="section" id="how">
        <div className="section-eyebrow">How it works</div>
        <h2 className="section-title">From a story to a tested release</h2>
        <div className="steps">
          <div className="step">
            <span className="step-num">1</span>
            <h3>Connect</h3>
            <p>
              Link Jira, your repository, and your staging environment in a guided
              setup.
            </p>
          </div>
          <div className="step">
            <span className="step-num">2</span>
            <h3>Agents design the tests</h3>
            <p>
              Agents read each story and code change, then design test scenarios
              and explain their reasoning.
            </p>
          </div>
          <div className="step">
            <span className="step-num">3</span>
            <h3>Your lead signs off</h3>
            <p>
              Your QA lead reviews every scenario and gives approval. Approval
              authority always rests with a person.
            </p>
          </div>
          <div className="step">
            <span className="step-num">4</span>
            <h3>Tests run and report</h3>
            <p>
              Approved tests run on every change and on a schedule, and results
              land in your dashboard.
            </p>
          </div>
        </div>
        <p className="section-note">
          The agents do the work. Approval stays with your team.
        </p>
      </section>

      <section className="section" id="security">
        <div className="section-eyebrow">Security and data handling</div>
        <h2 className="section-title">Built for teams that take access seriously</h2>
        <div className="sec-grid">
          <div className="point">
            <h3>Runs inside AWS</h3>
            <p>
              Shipgate runs Claude through Amazon Bedrock. Inference stays inside
              AWS, in the region you choose.
            </p>
          </div>
          <div className="point">
            <h3>Never used to train models</h3>
            <p>
              Your prompts and results are never used to train any model and are
              not retained by the model provider.
            </p>
          </div>
          <div className="point">
            <h3>Your code stays yours</h3>
            <p>
              We read your repository on demand to design tests. Source is not
              retained in our systems.
            </p>
          </div>
          <div className="point">
            <h3>Isolated by design</h3>
            <p>
              Every client runs on a dedicated instance with its own database. No
              query ever spans clients.
            </p>
          </div>
          <div className="point">
            <h3>Encrypted and controlled</h3>
            <p>
              Data is encrypted with keys we manage in AWS KMS. Access uses least
              privilege IAM roles, and model calls can run over private
              networking that never touches the public internet.
            </p>
          </div>
          <div className="point">
            <h3>Fully auditable</h3>
            <p>
              Every model call and every approval is recorded, using the same AWS
              audit tooling your team relies on.
            </p>
          </div>
        </div>
        <p className="section-note">
          AWS provides the certified infrastructure. Securing our application on
          top of it is our responsibility, and one we take seriously.
        </p>
      </section>

      <section className="section narrow" id="triage">
        <div className="section-eyebrow">When a test fails</div>
        <h2 className="section-title">Intelligent triage, human approval</h2>
        <p className="section-body">
          When a test fails, the agent investigates and classifies it as a real
          defect, a test issue, or a flaky result, with the evidence attached.
          Your QA lead confirms the call and decides what gets escalated. You are
          never handed a wall of red to sort out alone.
        </p>
      </section>

      <section className="agents" id="agents">
        <div className="agents-head">The agents</div>
        <div className="agent-row">
          <span className="num">1</span>
          <span className="desc">
            <strong>Scenario and test author</strong> reads stories, code changes,
            and documentation, designs test scenarios for review, and writes
            CodeceptJS tests once approved.
          </span>
          <span className="pill live">Available now</span>
        </div>
        <div className="agent-row">
          <span className="num">2</span>
          <span className="desc">
            <strong>Regression analyst</strong> analyzes CI runs and classifies
            each failure as a real defect, a test issue, or a flaky result, with
            supporting evidence.
          </span>
          <span className="pill">Rolling out</span>
        </div>
        <div className="agent-row">
          <span className="num">3</span>
          <span className="desc">
            <strong>Trend analyst</strong> tracks quality over time and answers
            questions using only your recorded history, never guesswork.
          </span>
          <span className="pill">Rolling out</span>
        </div>
      </section>

      <section className="section narrow" id="pricing">
        <div className="section-eyebrow">Pricing</div>
        <h2 className="section-title">Predictable pricing, no surprises</h2>
        <p className="section-body">
          Managed QA on a fixed monthly retainer per application. Every engagement
          begins with a paid audit, so you see the value before you commit. No
          long term lock in.
        </p>
        <a className="btn btn-primary" href="#contact">
          Request a quote →
        </a>
      </section>

      <section className="section" id="faq">
        <div className="section-eyebrow">FAQ</div>
        <h2 className="section-title">Answers for engineering leaders</h2>
        <div className="faq">
          <details className="faq-item">
            <summary>Does Shipgate touch our production code?</summary>
            <p>
              No. We read your repository to design tests and never modify product
              code. Tests live separately.
            </p>
          </details>
          <details className="faq-item">
            <summary>Who has the final say on the agents work?</summary>
            <p>
              A QA lead assigned to your account approves every scenario and
              confirms every failure. Agents recommend, people approve.
            </p>
          </details>
          <details className="faq-item">
            <summary>What do we need to start?</summary>
            <p>
              Three connections, Jira, your repository, and a staging environment,
              plus a short kickoff call.
            </p>
          </details>
          <details className="faq-item">
            <summary>Which tests are supported today?</summary>
            <p>
              Automated web tests in CodeceptJS on Playwright. Regression analysis
              and trend reporting follow.
            </p>
          </details>
          <details className="faq-item">
            <summary>Can we keep our existing CI?</summary>
            <p>
              Yes. Tests run in your pipeline or ours, and results return to your
              dashboard either way.
            </p>
          </details>
          <details className="faq-item">
            <summary>How is our data kept separate?</summary>
            <p>
              Each client has a dedicated instance and database. There is no
              shared data layer between clients.
            </p>
          </details>
        </div>
      </section>

      <section className="section" id="about">
        <div className="section-eyebrow">About</div>
        <h2 className="section-title">Why we built Shipgate</h2>
        <p className="section-body">
          QA is the bottleneck on most engineering teams. Coverage is unclear,
          regressions slip through, and standing up a QA function is slow and
          costly. Shipgate runs that function for you. Intelligent agents do the
          work at scale, experienced QA engineers hold the standard, and approval
          always rests with a person. You get the speed of automation with the
          accountability your releases require.
        </p>
        <h3 className="about-sub">Founder</h3>
        <div className="founder">
          <div className="avatar" aria-hidden="true" />
          <div className="founder-body">
            <div className="founder-name">[Full name]</div>
            <div className="founder-role">Founder</div>
            <p className="founder-bio">
              [Two or three factual sentences. Years in software, the companies or
              domains you worked in, and the experience that makes building a QA
              company credible. Concrete facts, not adjectives.]
            </p>
            <a className="founder-link" href="[LinkedIn URL]">
              [LinkedIn URL]
            </a>
          </div>
        </div>
      </section>

      <section className="lead" id="contact">
        <div className="lead-copy">
          <span className="eyebrow">Get started</span>
          <h2>Tell us about your team</h2>
          <p>
            Answer a few quick multiple choice questions about your team, your
            goals, and where you are with automation and AI. It takes a few
            minutes, and your assigned QA lead walks into the first meeting
            already informed.
          </p>
          <a className="btn btn-primary lead-cta" href="/onboarding">
            Start the questionnaire →
          </a>
        </div>
      </section>

      <footer className="footer big">
        <div className="footer-main">
          <div className="brand">
            <span className="dot" />
            Shipgate
          </div>
          <p className="footer-tag">Managed QA, powered by intelligent agents.</p>
        </div>
        <div className="footer-cols">
          <div>
            <span className="footer-h">Contact</span>
            <a href="mailto:[contact email]">[contact email]</a>
          </div>
          <div>
            <span className="footer-h">Legal</span>
            <a href="/privacy">Privacy policy</a>
            <a href="/terms">Terms of service</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Shipgate</span>
        </div>
      </footer>
    </div>
  );
}
