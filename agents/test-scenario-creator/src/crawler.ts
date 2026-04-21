import { chromium, type Page } from "playwright";

export interface PageInfo {
  url: string;
  path: string;
  title: string;
  forms: FormInfo[];
  links: LinkInfo[];
  buttons: ButtonInfo[];
  headings: string[];
}

export interface FormInfo {
  id: string | null;
  inputs: InputInfo[];
  selects: SelectInfo[];
  submitButton: { id: string | null; text: string } | null;
}

export interface InputInfo {
  id: string | null;
  name: string;
  type: string;
  label: string | null;
  placeholder: string | null;
  required: boolean;
  min: string | null;
  max: string | null;
}

export interface SelectInfo {
  id: string | null;
  name: string;
  options: string[];
  label: string | null;
}

export interface LinkInfo {
  href: string;
  text: string;
}

export interface ButtonInfo {
  id: string | null;
  text: string;
  type: string;
}

async function analyzePage(page: Page): Promise<PageInfo> {
  const url = page.url();
  const path = new URL(url).pathname;
  const title = await page.title();

  const forms: FormInfo[] = await page.$$eval("form", (formEls) => {
    return formEls.map((form) => {
      const inputs = Array.from(
        form.querySelectorAll<HTMLInputElement>("input, textarea")
      ).map((input) => {
        const lbl = input.id
          ? document.querySelector(`label[for="${input.id}"]`)?.textContent?.trim() ?? null
          : null;
        return {
          id: input.id || null,
          name: input.name || "",
          type: input.type || "text",
          label: lbl,
          placeholder: input.placeholder || null,
          required: input.required,
          min: input.getAttribute("min"),
          max: input.getAttribute("max"),
        };
      });

      const selects = Array.from(
        form.querySelectorAll<HTMLSelectElement>("select")
      ).map((sel) => {
        const lbl = sel.id
          ? document.querySelector(`label[for="${sel.id}"]`)?.textContent?.trim() ?? null
          : null;
        return {
          id: sel.id || null,
          name: sel.name || "",
          options: Array.from(sel.options).map((o) => o.textContent?.trim() || o.value),
          label: lbl,
        };
      });

      const submitBtn = form.querySelector(
        'button[type="submit"], input[type="submit"], button:not([type])'
      ) as HTMLElement | null;

      return {
        id: form.id || null,
        inputs,
        selects,
        submitButton: submitBtn
          ? { id: (submitBtn as any).id || null, text: submitBtn.textContent?.trim() || "" }
          : null,
      };
    });
  });

  const links: LinkInfo[] = await page.$$eval("a[href]", (els) =>
    els.map((a) => ({
      href: a.getAttribute("href") || "",
      text: a.textContent?.trim() || "",
    }))
  );

  const buttons: ButtonInfo[] = await page.$$eval("button", (els) =>
    els.map((b) => ({
      id: b.id || null,
      text: b.textContent?.trim() || "",
      type: b.type || "button",
    }))
  );

  const headings: string[] = await page.$$eval("h1, h2, h3", (els) =>
    els.map((h) => h.textContent?.trim() || "")
  );

  return { url, path, title, forms, links, buttons, headings };
}

export async function crawlApp(baseUrl: string): Promise<PageInfo[]> {
  console.log(`\n🔍 Crawling ${baseUrl} …\n`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const pages: PageInfo[] = [];
  const visited = new Set<string>();

  // 1) Analyze login page (unauthenticated)
  console.log("  → /login");
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
  pages.push(await analyzePage(page));
  visited.add("/login");

  // 2) Log in
  await page.fill("#username", "admin");
  await page.fill("#password", "admin");
  await page.click("#login-btn");
  await page.waitForURL("**/calculator", { timeout: 5000 }).catch(() => {});

  // 3) Discover internal links after login
  const discoveredPaths = new Set<string>(["/calculator", "/history"]);
  const navLinks = await page.$$eval("a[href]", (els) =>
    els.map((a) => a.getAttribute("href")).filter(Boolean)
  );
  for (const href of navLinks) {
    try {
      const p = new URL(href!, baseUrl).pathname;
      if (p !== "/" && !p.startsWith("/login")) discoveredPaths.add(p);
    } catch { /* skip external */ }
  }

  // 4) Crawl each page
  for (const p of discoveredPaths) {
    if (visited.has(p)) continue;
    visited.add(p);
    console.log(`  → ${p}`);
    await page.goto(`${baseUrl}${p}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);
    pages.push(await analyzePage(page));
  }

  await browser.close();
  console.log(`\n✅ Crawled ${pages.length} pages\n`);
  return pages;
}
