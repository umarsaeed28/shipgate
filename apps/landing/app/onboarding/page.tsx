import { OnboardingWizard } from "../OnboardingWizard";

export const metadata = { title: "Get started · Shipgate QA" };

export default function OnboardingPage() {
  return (
    <div className="container">
      <nav className="nav">
        <a
          className="brand"
          href="/"
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <span className="dot" />
          Shipgate QA
        </a>
        <div className="nav-links">
          <a href="/">Back to home</a>
        </div>
      </nav>

      <section className="lead onboarding-page">
        <div className="lead-copy">
          <span className="eyebrow">Get started</span>
          <h2>Tell us about your team</h2>
          <p>
            Answer a few quick multiple choice questions about your team, your
            goals, and where you are with automation and AI. It takes a few
            minutes, and your assigned QA lead walks into the first meeting
            already informed.
          </p>
        </div>
        <OnboardingWizard />
      </section>
    </div>
  );
}
