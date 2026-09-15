import { isMermaidLine, startsMermaid } from "@/lib/utils/mermaid-lines";

const TOPIC_COMMENT = /<!--\s*topic:\s*(.+?)\s*-->/i;
/** Links to image files the model imagines, such as ![graph](plot.png); real graphs arrive separately. */
const LOCAL_IMAGE_LINK = /!\[[^\]]*\]\((?!https?:|data:)[^)]*\)/g;
/** Complete comments, plus a half-streamed one at the end of the text. */
const HTML_COMMENTS = /<!--[\s\S]*?(?:-->|$)/g;
const CODE_FENCES = /(```[\s\S]*?(?:```|$))/g;
/** A `$$…$$` equation alone on one line; Markdown only renders it as display maths on its own lines. */
const ONE_LINE_DISPLAY_MATH = /^([ \t]*)\$\$([^\n]+?)\$\$[ \t]*$/gm;
/** `V<sub>s</sub>` or `10<sup>-34</sup>`, with the word the script belongs to. */
const HTML_SCRIPT = /([\p{L}\p{N}]*)<(sub|sup)>([^<>]{1,40})<\/\2>/gu;
const HTML_FORMATTING: [RegExp, string][] = [
  [/<br\s*\/?>/gi, "  \n"],
  [/<\/?(?:b|strong)>/gi, "**"],
  [/<\/?(?:i|em)>/gi, "*"],
];

/** Reads the `<!-- topic: Subject | Topic -->` line the model appends to new answers. */
export function extractTopic(text: string): { subject: string; topic: string } | null {
  const match = TOPIC_COMMENT.exec(text);
  if (!match) return null;
  const [subject, topic = ""] = match[1].split("|").map((part) => part.trim());
  return subject ? { subject, topic } : null;
}

export function stripComments(text: string): string {
  return text.replace(HTML_COMMENTS, "").trimEnd();
}

/** Text for use inside LaTeX: numbers and single letters stay as maths, words become upright. */
function latexText(value: string): string {
  const safe = value.replace(/[\\{}$&#%_^~]/g, "").replace(/−/g, "-");
  return /^[\d.+-]*$/.test(safe) || [...safe].length <= 1 ? safe : `\\text{${safe}}`;
}

/**
 * Markdown shows raw HTML literally, and models sometimes write it anyway. Sub- and
 * superscripts become maths; bold, italic and line breaks become Markdown.
 */
function convertHtml(segment: string): string {
  const scripted = segment.replace(
    HTML_SCRIPT,
    (_, base: string, tag: string, script: string) =>
      `$${base ? latexText(base) : "{}"}${tag === "sub" ? "_" : "^"}{${latexText(script.trim())}}$`,
  );
  return HTML_FORMATTING.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    scripted,
  );
}

function normalizeMath(segment: string): string {
  return convertHtml(segment.replace(LOCAL_IMAGE_LINK, ""))
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, math: string) => `$$${math}$$`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, math: string) => `$${math}$`)
    .replace(
      ONE_LINE_DISPLAY_MATH,
      (_, indent: string, math: string) => `${indent}$$\n${indent}${math.trim()}\n${indent}$$`,
    );
}

/**
 * Converts \( \) and \[ \] delimiters to $ and $$, puts one-line display equations on their
 * own lines and replaces stray HTML, leaving code blocks untouched.
 */
function normalizeMathDelimiters(text: string): string {
  return text
    .split(CODE_FENCES)
    .map((segment, index) => (index % 2 === 1 ? segment : normalizeMath(segment)))
    .join("");
}

/** Wraps diagram source written outside a code block in one, so it is drawn rather than shown. */
function fenceBareMermaid(segment: string): string {
  const lines = segment.split("\n");
  const out: string[] = [];
  for (let index = 0; index < lines.length; index++) {
    if (!startsMermaid(lines[index])) {
      out.push(lines[index]);
      continue;
    }
    let end = index + 1;
    while (end < lines.length && isMermaidLine(lines[end])) end++;
    let last = end;
    while (last > index + 1 && !lines[last - 1].trim()) last--;
    out.push("```mermaid", ...lines.slice(index, last), "```", ...lines.slice(last, end));
    index = end - 1;
  }
  return out.join("\n");
}

function fenceBareDiagrams(text: string): string {
  return text
    .split(CODE_FENCES)
    .map((segment, index) => (index % 2 === 1 ? segment : fenceBareMermaid(segment)))
    .join("");
}

export function toRenderableMarkdown(text: string): string {
  return normalizeMathDelimiters(fenceBareDiagrams(stripComments(text)));
}
