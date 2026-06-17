export const metadata = { title: "Terms of service · Shipgate QA" };

export default function TermsPage() {
  return (
    <div className="container">
      <nav className="nav">
        <a className="brand" href="/" style={{ textDecoration: "none", color: "inherit" }}>
          <span className="dot" />
          Shipgate QA
        </a>
      </nav>
      <section className="section narrow" style={{ marginTop: 40 }}>
        <h1 className="section-title">Terms of service</h1>
        <p className="section-body">
          [Placeholder. Replace with your terms of service before launch.]
        </p>
        <a className="btn btn-ghost" href="/">
          Back to home
        </a>
      </section>
    </div>
  );
}
