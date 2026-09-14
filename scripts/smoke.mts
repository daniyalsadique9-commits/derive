/**
 * End-to-end check of the AI pipeline with real API keys (uses a little quota).
 * Run before a demo:  npm run smoke
 */
import { capacityReport } from "@/lib/ai/capacity";
import type { SolveRequest } from "@/lib/ai/schema";
import { solve } from "@/lib/ai/solve";

const CASES: { label: string; request: SolveRequest }[] = [
  {
    label: "Text question → Groq solver + Python + second-model check",
    request: {
      style: "intuitive",
      language: "english",
      messages: [
        {
          role: "user",
          intent: "ask",
          content:
            "A ball is thrown vertically upward at 20 m/s from the top of a 25 m tall building. " +
            "Taking g = 10 m/s², how long does it take to hit the ground?",
        },
      ],
    },
  },
  {
    label: "Graph request → Gemini with matplotlib",
    request: {
      style: "intuitive",
      language: "english",
      messages: [
        {
          role: "user",
          intent: "ask",
          content: "Plot the charging curve of an RC circuit with R = 1 kΩ and C = 100 µF.",
        },
      ],
    },
  },
];

async function runCase({ label, request }: (typeof CASES)[number]) {
  console.log(`\n━━ ${label}`);
  const startedAt = Date.now();
  const elapsed = () => `${((Date.now() - startedAt) / 1000).toFixed(1)}s`;
  let answer = "";

  for await (const event of solve(request, new AbortController().signal, { verify: true })) {
    switch (event.type) {
      case "start":
        console.log(`  ${elapsed()}  answering with ${event.model} (${event.provider})`);
        break;
      case "code":
        console.log(`  ${elapsed()}  ran Python: ${event.code.split("\n")[0].slice(0, 70)}`);
        break;
      case "codeResult":
        console.log(`  ${elapsed()}  output: ${event.output.trim().split("\n")[0].slice(0, 70)}`);
        break;
      case "image":
        console.log(`  ${elapsed()}  graph: ${event.mimeType}, ${event.data.length} base64 chars`);
        break;
      case "text":
        answer += event.text;
        break;
      case "verification":
        console.log(`  ${elapsed()}  verification: ${JSON.stringify(event.result)}`);
        break;
      case "error":
        console.log(`  ${elapsed()}  ERROR: ${event.message}`);
        break;
    }
  }

  const sections = [...answer.matchAll(/^##\s+(.+)$/gm)].map((match) => match[1]);
  console.log(`  ${elapsed()}  done · ${answer.length} chars · sections: ${sections.join(" | ")}`);
}

for (const testCase of CASES) {
  await runCase(testCase);
}

console.log("\n━━ Capacity");
for (const provider of capacityReport().providers) {
  console.log(
    `  ${provider.role.padEnd(16)} ${provider.status.padEnd(12)} left: ${provider.requestsLeft ?? "?"}`,
  );
}
