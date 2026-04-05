import express from "express";
import cookieParser from "cookie-parser";

const app = express();
const PORT = process.env.DUMMY_PORT || 3099;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

const VALID_USER = { username: "admin", password: "admin" };

function html(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #f4f5f7; color: #1a1a2e; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #fff; border-radius: 12px; padding: 2.5rem; box-shadow: 0 4px 24px rgba(0,0,0,.08); width: 100%; max-width: 400px; }
    h1 { margin-bottom: 1.5rem; font-size: 1.5rem; text-align: center; }
    label { display: block; font-size: .875rem; font-weight: 600; margin-bottom: .25rem; color: #4a5568; }
    input { width: 100%; padding: .625rem .75rem; border: 1px solid #cbd5e0; border-radius: 6px; margin-bottom: 1rem; font-size: .875rem; }
    input:focus { outline: none; border-color: #3182ce; box-shadow: 0 0 0 3px rgba(49,130,206,.15); }
    button { width: 100%; padding: .625rem 1rem; border: none; border-radius: 6px; cursor: pointer; font-size: .875rem; font-weight: 600; }
    .btn-primary { background: #3182ce; color: #fff; }
    .btn-primary:hover { background: #2b6cb0; }
    .btn-logout { background: #e53e3e; color: #fff; margin-top: 1.5rem; }
    .btn-logout:hover { background: #c53030; }
    .error { background: #fff5f5; color: #c53030; border: 1px solid #feb2b2; padding: .625rem; border-radius: 6px; margin-bottom: 1rem; font-size: .875rem; text-align: center; }
    .welcome { text-align: center; }
    .welcome h1 { font-size: 2rem; color: #2d3748; margin-bottom: .5rem; }
    .welcome p { color: #718096; font-size: 1rem; }
  </style>
</head>
<body>
  ${body}
</body>
</html>`;
}

app.get("/login", (_req, res) => {
  res.send(
    html(
      "Login",
      `<div class="card">
        <h1>Sign In</h1>
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
      html(
        "Login",
        `<div class="card">
          <h1>Sign In</h1>
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
  res.redirect("/welcome");
});

app.get("/welcome", (req, res) => {
  if (!req.cookies.user) return res.redirect("/login");
  res.send(
    html(
      "Welcome",
      `<div class="card welcome">
        <h1 id="welcome-heading">Welcome to Shipgate</h1>
        <p id="welcome-message">You have successfully logged in.</p>
        <form method="POST" action="/logout">
          <button type="submit" class="btn-logout" id="logout-btn">Log Out</button>
        </form>
      </div>`
    )
  );
});

app.post("/logout", (_req, res) => {
  res.clearCookie("user");
  res.redirect("/login");
});

app.get("/", (req, res) => {
  if (req.cookies.user) return res.redirect("/welcome");
  res.redirect("/login");
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`Dummy app running at http://localhost:${PORT}`);
});
