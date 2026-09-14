const TOPIC_COMMENT = /<!--\s*topic:\s*(.+?)\s*-->/i;
/** Complete comments, plus a half-streamed one at the end of the text. */
const HTML_COMMENTS = /<!--[\s\S]*?(?:-->|$)/g;
const CODE_FENCES = /(```[\s\S]*?(?:```|$))/g;
/** A `$$…$$` equation alone on one line; Markdown only renders it as display maths on its own lines. */
const ONE_LINE_DISPLAY_MATH = /^([ \t]*)\$\$([^\n]+?)\$\$[ \t]*$/gm;

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

function normalizeMath(segment: string): string {
  return segment
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, math: string) => `$$${math}$$`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, math: string) => `$${math}$`)
    .replace(
      ONE_LINE_DISPLAY_MATH,
      (_, indent: string, math: string) => `${indent}$$\n${indent}${math.trim()}\n${indent}$$`,
    );
}

/**
 * Converts \( \) and \[ \] delimiters to $ and $$, and puts one-line display equations on
 * their own lines, leaving code blocks untouched.
 */
function normalizeMathDelimiters(text: string): string {
  return text
    .split(CODE_FENCES)
    .map((segment, index) => (index % 2 === 1 ? segment : normalizeMath(segment)))
    .join("");
}

export function toRenderableMarkdown(text: string): string {
  return normalizeMathDelimiters(stripComments(text));
}
