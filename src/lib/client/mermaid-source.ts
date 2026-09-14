/**
 * Wraps plain square-bracket node labels in quotes: `A[Root (positive)]` → `A["Root (positive)"]`.
 * Models often put parentheses, "=" or "+" in labels, which Mermaid can't parse unquoted.
 * Other node shapes (`[[..]]`, `[(..)]`, `[/../]`) and already-quoted labels are left alone.
 */
export function quoteMermaidLabels(source: string): string {
  return source.replace(
    /\b([A-Za-z0-9_]+)\[(?!["[(/\\])([^\]\n]*)\]/g,
    (_, id: string, label: string) => `${id}["${label.replace(/"/g, "#quot;")}"]`,
  );
}
