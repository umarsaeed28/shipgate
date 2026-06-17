export interface JUnitCase {
  name: string;
  classname: string;
  timeSec: number;
  failure?: { type: string; message: string };
}

function decode(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function attr(tag: string, name: string): string {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`));
  return m && m[1] !== undefined ? decode(m[1]) : "";
}

/**
 * Minimal JUnit XML parser (dependency-free). Extracts test cases and their
 * failures/errors. Sufficient for ingesting Jenkins JUnit reports.
 */
export function parseJUnit(xml: string): JUnitCase[] {
  const cases: JUnitCase[] = [];
  const caseRe = /<testcase\b([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g;
  let m: RegExpExecArray | null;
  while ((m = caseRe.exec(xml)) !== null) {
    const attrs = m[1] ?? "";
    const body = m[3] ?? "";
    const failMatch = body.match(/<(failure|error)\b([^>]*?)(\/>|>([\s\S]*?)<\/\1>)/);
    let failure: JUnitCase["failure"] | undefined;
    if (failMatch) {
      const fAttrs = failMatch[2] ?? "";
      failure = {
        type: attr(fAttrs, "type") || (failMatch[1] ?? "failure"),
        message: attr(fAttrs, "message") || decode(failMatch[4] ?? "").trim(),
      };
    }
    cases.push({
      name: attr(attrs, "name"),
      classname: attr(attrs, "classname"),
      timeSec: Number(attr(attrs, "time") || "0"),
      failure,
    });
  }
  return cases;
}
