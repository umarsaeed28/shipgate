import express from "express";
import cookieParser from "cookie-parser";

const app = express();
const PORT = process.env.DUMMY_PORT || 3099;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

const VALID_USER = { username: "admin", password: "admin" };

function auth(req, res, next) {
  if (!req.cookies.user) return res.redirect("/login");
  next();
}

function layout(title, body, showNav = false) {
  const nav = showNav
    ? `<nav class="nav">
        <a href="/calculator" class="nav-link">Calculator</a>
        <a href="/history" class="nav-link">History</a>
        <form method="POST" action="/logout" style="margin-left:auto">
          <button type="submit" class="nav-link nav-logout">Logout</button>
        </form>
      </nav>`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Mortgage Calculator</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #f0f4f8; color: #1a202c; }
    .nav { display: flex; align-items: center; gap: 1.5rem; background: #1a365d; padding: .75rem 2rem; }
    .nav-link { color: #bee3f8; text-decoration: none; font-size: .875rem; font-weight: 500; background: none; border: none; cursor: pointer; }
    .nav-link:hover { color: #fff; }
    .nav-logout { color: #fed7d7 !important; }
    .center { display: flex; align-items: center; justify-content: center; min-height: ${showNav ? "calc(100vh - 48px)" : "100vh"}; padding: 2rem; }
    .card { background: #fff; border-radius: 12px; padding: 2rem; box-shadow: 0 4px 24px rgba(0,0,0,.06); width: 100%; max-width: 480px; }
    h1 { margin-bottom: 1.25rem; font-size: 1.5rem; text-align: center; color: #1a365d; }
    h2 { font-size: 1.125rem; color: #2d3748; margin-bottom: 1rem; }
    label { display: block; font-size: .8125rem; font-weight: 600; margin-bottom: .25rem; color: #4a5568; }
    input, select { width: 100%; padding: .5rem .75rem; border: 1px solid #cbd5e0; border-radius: 6px; margin-bottom: .875rem; font-size: .875rem; }
    input:focus, select:focus { outline: none; border-color: #3182ce; box-shadow: 0 0 0 3px rgba(49,130,206,.15); }
    button { width: 100%; padding: .625rem 1rem; border: none; border-radius: 6px; cursor: pointer; font-size: .875rem; font-weight: 600; }
    .btn-primary { background: #2b6cb0; color: #fff; }
    .btn-primary:hover { background: #2c5282; }
    .btn-secondary { background: #edf2f7; color: #2d3748; margin-top: .5rem; }
    .btn-secondary:hover { background: #e2e8f0; }
    .error { background: #fff5f5; color: #c53030; border: 1px solid #feb2b2; padding: .5rem; border-radius: 6px; margin-bottom: 1rem; font-size: .8125rem; text-align: center; }
    .results { background: #ebf8ff; border: 1px solid #bee3f8; border-radius: 8px; padding: 1.25rem; margin-top: 1.25rem; }
    .results h2 { color: #2b6cb0; margin-bottom: .75rem; }
    .result-row { display: flex; justify-content: space-between; padding: .375rem 0; border-bottom: 1px solid #e2e8f0; font-size: .875rem; }
    .result-row:last-child { border-bottom: none; }
    .result-label { color: #4a5568; }
    .result-value { font-weight: 700; color: #1a365d; }
    .monthly { font-size: 1.75rem; text-align: center; color: #2b6cb0; font-weight: 800; margin: .5rem 0; }
    .input-group { position: relative; }
    .input-prefix { position: absolute; left: .75rem; top: 50%; transform: translateY(-70%); color: #718096; font-size: .875rem; pointer-events: none; }
    .input-suffix { position: absolute; right: .75rem; top: 50%; transform: translateY(-70%); color: #718096; font-size: .875rem; pointer-events: none; }
    .input-group input { padding-left: 1.5rem; }
    .validation-error { color: #c53030; font-size: .75rem; margin-top: -.625rem; margin-bottom: .625rem; display: none; }
    .validation-error.visible { display: block; }
    table { width: 100%; border-collapse: collapse; font-size: .8125rem; margin-top: 1rem; }
    th { text-align: left; padding: .5rem; color: #4a5568; font-weight: 600; border-bottom: 2px solid #e2e8f0; }
    td { padding: .5rem; border-bottom: 1px solid #edf2f7; }
    .empty { text-align: center; color: #a0aec0; padding: 2rem; }
  </style>
</head>
<body>
  ${nav}
  <div class="center">${body}</div>
</body>
</html>`;
}

// --- Login ---

app.get("/login", (_req, res) => {
  res.send(
    layout(
      "Login",
      `<div class="card">
        <h1>Mortgage Calculator</h1>
        <p style="text-align:center;color:#718096;margin-bottom:1.5rem;font-size:.875rem">Sign in to access the calculator</p>
        <form method="POST" action="/login" id="login-form">
          <label for="username">Username</label>
          <input type="text" id="username" name="username" required>
          <label for="password">Password</label>
          <input type="password" id="password" name="password" required>
          <button type="submit" class="btn-primary" id="login-btn">Log In</button>
        </form>
      </div>`
    )
  );
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username !== VALID_USER.username || password !== VALID_USER.password) {
    return res.send(
      layout(
        "Login",
        `<div class="card">
          <h1>Mortgage Calculator</h1>
          <div class="error" id="login-error">Invalid username or password</div>
          <form method="POST" action="/login" id="login-form">
            <label for="username">Username</label>
            <input type="text" id="username" name="username" value="${username || ""}" required>
            <label for="password">Password</label>
            <input type="password" id="password" name="password" required>
            <button type="submit" class="btn-primary" id="login-btn">Log In</button>
          </form>
        </div>`
      )
    );
  }
  res.cookie("user", username, { httpOnly: true });
  res.redirect("/calculator");
});

app.post("/logout", (_req, res) => {
  res.clearCookie("user");
  res.redirect("/login");
});

// --- Calculator ---

const calculations = [];

function calculate(principal, rate, years) {
  const monthlyRate = rate / 100 / 12;
  const numPayments = years * 12;
  if (monthlyRate === 0) {
    const monthly = principal / numPayments;
    return { monthly, totalPayment: principal, totalInterest: 0, numPayments };
  }
  const monthly =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);
  const totalPayment = monthly * numPayments;
  const totalInterest = totalPayment - principal;
  return { monthly, totalPayment, totalInterest, numPayments };
}

function fmt(n) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

app.get("/calculator", auth, (_req, res) => {
  res.send(
    layout(
      "Calculator",
      `<div class="card">
        <h1>Mortgage Calculator</h1>
        <form method="POST" action="/calculator" id="calc-form">
          <label for="principal">Home Price ($)</label>
          <div class="input-group">
            <span class="input-prefix">$</span>
            <input type="number" id="principal" name="principal" min="1000" max="10000000" step="1000" placeholder="300000" required>
          </div>

          <label for="downPayment">Down Payment ($)</label>
          <div class="input-group">
            <span class="input-prefix">$</span>
            <input type="number" id="downPayment" name="downPayment" min="0" step="500" placeholder="60000" value="0" required>
          </div>

          <label for="rate">Interest Rate (%)</label>
          <div class="input-group">
            <input type="number" id="rate" name="rate" min="0" max="25" step="0.01" placeholder="6.5" required>
            <span class="input-suffix">%</span>
          </div>

          <label for="years">Loan Term</label>
          <select id="years" name="years" required>
            <option value="30">30 years</option>
            <option value="20">20 years</option>
            <option value="15">15 years</option>
            <option value="10">10 years</option>
          </select>

          <button type="submit" class="btn-primary" id="calculate-btn">Calculate</button>
          <button type="reset" class="btn-secondary" id="reset-btn">Reset</button>
        </form>
      </div>`,
      true
    )
  );
});

app.post("/calculator", auth, (req, res) => {
  const principal = parseFloat(req.body.principal) || 0;
  const downPayment = parseFloat(req.body.downPayment) || 0;
  const rate = parseFloat(req.body.rate);
  const years = parseInt(req.body.years) || 30;

  const errors = [];
  if (principal <= 0) errors.push("Home price must be greater than zero.");
  if (downPayment < 0) errors.push("Down payment cannot be negative.");
  if (downPayment >= principal) errors.push("Down payment must be less than home price.");
  if (isNaN(rate) || rate < 0) errors.push("Interest rate must be zero or positive.");
  if (rate > 25) errors.push("Interest rate cannot exceed 25%.");

  if (errors.length > 0) {
    return res.send(
      layout(
        "Calculator",
        `<div class="card">
          <h1>Mortgage Calculator</h1>
          <div class="error" id="calc-error">${errors.join(" ")}</div>
          <form method="POST" action="/calculator" id="calc-form">
            <label for="principal">Home Price ($)</label>
            <div class="input-group"><span class="input-prefix">$</span>
              <input type="number" id="principal" name="principal" value="${principal}" min="1000" max="10000000" step="1000" required>
            </div>
            <label for="downPayment">Down Payment ($)</label>
            <div class="input-group"><span class="input-prefix">$</span>
              <input type="number" id="downPayment" name="downPayment" value="${downPayment}" min="0" step="500" required>
            </div>
            <label for="rate">Interest Rate (%)</label>
            <div class="input-group">
              <input type="number" id="rate" name="rate" value="${rate}" min="0" max="25" step="0.01" required>
              <span class="input-suffix">%</span>
            </div>
            <label for="years">Loan Term</label>
            <select id="years" name="years" required>
              <option value="30" ${years === 30 ? "selected" : ""}>30 years</option>
              <option value="20" ${years === 20 ? "selected" : ""}>20 years</option>
              <option value="15" ${years === 15 ? "selected" : ""}>15 years</option>
              <option value="10" ${years === 10 ? "selected" : ""}>10 years</option>
            </select>
            <button type="submit" class="btn-primary" id="calculate-btn">Calculate</button>
            <button type="reset" class="btn-secondary" id="reset-btn">Reset</button>
          </form>
        </div>`,
        true
      )
    );
  }

  const loanAmount = principal - downPayment;
  const result = calculate(loanAmount, rate, years);

  calculations.unshift({
    id: calculations.length + 1,
    date: new Date().toLocaleDateString("en-US"),
    principal,
    downPayment,
    loanAmount,
    rate,
    years,
    monthly: result.monthly,
  });

  res.send(
    layout(
      "Results",
      `<div class="card">
        <h1>Mortgage Calculator</h1>
        <form method="POST" action="/calculator" id="calc-form">
          <label for="principal">Home Price ($)</label>
          <div class="input-group"><span class="input-prefix">$</span>
            <input type="number" id="principal" name="principal" value="${principal}" min="1000" max="10000000" step="1000" required>
          </div>
          <label for="downPayment">Down Payment ($)</label>
          <div class="input-group"><span class="input-prefix">$</span>
            <input type="number" id="downPayment" name="downPayment" value="${downPayment}" min="0" step="500" required>
          </div>
          <label for="rate">Interest Rate (%)</label>
          <div class="input-group">
            <input type="number" id="rate" name="rate" value="${rate}" min="0" max="25" step="0.01" required>
            <span class="input-suffix">%</span>
          </div>
          <label for="years">Loan Term</label>
          <select id="years" name="years" required>
            <option value="30" ${years === 30 ? "selected" : ""}>30 years</option>
            <option value="20" ${years === 20 ? "selected" : ""}>20 years</option>
            <option value="15" ${years === 15 ? "selected" : ""}>15 years</option>
            <option value="10" ${years === 10 ? "selected" : ""}>10 years</option>
          </select>
          <button type="submit" class="btn-primary" id="calculate-btn">Calculate</button>
          <button type="reset" class="btn-secondary" id="reset-btn">Reset</button>
        </form>

        <div class="results" id="results">
          <h2>Your Monthly Payment</h2>
          <div class="monthly" id="monthly-payment">$${fmt(result.monthly)}</div>
          <div class="result-row">
            <span class="result-label">Loan Amount</span>
            <span class="result-value" id="loan-amount">$${fmt(loanAmount)}</span>
          </div>
          <div class="result-row">
            <span class="result-label">Down Payment</span>
            <span class="result-value" id="down-payment-display">$${fmt(downPayment)}</span>
          </div>
          <div class="result-row">
            <span class="result-label">Total of ${result.numPayments} Payments</span>
            <span class="result-value" id="total-payment">$${fmt(result.totalPayment)}</span>
          </div>
          <div class="result-row">
            <span class="result-label">Total Interest</span>
            <span class="result-value" id="total-interest">$${fmt(result.totalInterest)}</span>
          </div>
          <div class="result-row">
            <span class="result-label">Interest Rate</span>
            <span class="result-value" id="interest-rate">${rate}%</span>
          </div>
          <div class="result-row">
            <span class="result-label">Loan Term</span>
            <span class="result-value" id="loan-term">${years} years</span>
          </div>
        </div>
      </div>`,
      true
    )
  );
});

// --- History ---

app.get("/history", auth, (_req, res) => {
  const rows = calculations.length === 0
    ? `<tr><td colspan="5" class="empty" id="no-history">No calculations yet. Use the calculator to get started.</td></tr>`
    : calculations.map(c =>
        `<tr>
          <td>${c.date}</td>
          <td>$${fmt(c.principal)}</td>
          <td>${c.rate}%</td>
          <td>${c.years} yrs</td>
          <td><strong>$${fmt(c.monthly)}</strong>/mo</td>
        </tr>`
      ).join("");

  res.send(
    layout(
      "History",
      `<div class="card" style="max-width:640px">
        <h1>Calculation History</h1>
        <p style="text-align:center;color:#718096;margin-bottom:1rem;font-size:.875rem" id="history-count">${calculations.length} calculation(s)</p>
        <table id="history-table">
          <thead>
            <tr><th>Date</th><th>Home Price</th><th>Rate</th><th>Term</th><th>Monthly</th></tr>
          </thead>
          <tbody id="history-body">
            ${rows}
          </tbody>
        </table>
      </div>`,
      true
    )
  );
});

// --- Routing ---

app.get("/", (req, res) => {
  if (req.cookies.user) return res.redirect("/calculator");
  res.redirect("/login");
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`Mortgage Calculator running at http://localhost:${PORT}`);
});
