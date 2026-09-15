/** The first line of a Mermaid flowchart, such as `flowchart LR` or `graph TD`. */
const MERMAID_START = /^\s*(flowchart|graph)\s+(TD|TB|LR|RL|BT)\b/;

/**
 * A line that can belong to a Mermaid flowchart: blank, indented, a keyword, a comment,
 * or a node or link such as `A["Cell"] --> B`.
 */
const MERMAID_LINE =
  /^\s*$|^\s+\S|^\s*(%%|subgraph\b|end\s*$|direction\s|classDef\s|class\s|style\s|linkStyle\s|click\s)|^\s*[\w-]+\s*(\[|\(|\{|>|:::|&|-->|---|-\.|==>|<-->|--)/;

export function startsMermaid(line: string): boolean {
  return MERMAID_START.test(line);
}

export function isMermaidLine(line: string): boolean {
  return MERMAID_LINE.test(line);
}
