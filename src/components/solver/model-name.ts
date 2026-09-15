/** "openai/gpt-oss-120b" → "gpt-oss-120b" */
export function shortModelName(model: string): string {
  return model.split("/").pop() ?? model;
}
