const TOPIC_COMMENT = /<!--\s*topic:\s*(.+?)\s*-->/i;
/** Complete comments, plus a half-streamed one at the end of the text. */
const HTML_COMMENTS = /<!--[\s\S]*?(?:-->|$)/g;
const CODE_FENCES = /(```[\s\S]*?(?:```|$))/g;

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

/** Converts \( \) and \[ \] math delimiters to $ and $$, leaving code blocks untouched. */
function normalizeMathDelimiters(text: string): string {
  return text
    .split(CODE_FENCES)
    .map((segment, index) =>
      index % 2 === 1
        ? segment
        : segment
            .replace(/\\\[([\s\S]+?)\\\]/g, (_, math: string) => `$$${math}$$`)
            .replace(/\\\(([\s\S]+?)\\\)/g, (_, math: string) => `$${math}$`),
    )
    .join("");
}

export function toRenderableMarkdown(text: string): string {
  return normalizeMathDelimiters(stripComments(text));
}
