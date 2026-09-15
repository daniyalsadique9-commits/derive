import { isMermaidLine, startsMermaid } from "@/lib/utils/mermaid-lines";
import type { StreamEvent } from "./events";
import type { ChatTurn } from "./schema";

/** A checked diagram of a device, drawn by the app so the model never has to write one. */
export interface DeviceDiagram {
  /** What the diagram shows, as the model is told. */
  subject: string;
  /** How the drawn circuit is connected, so the explanation matches the drawing. */
  description: string;
  /** Markdown that draws it: a named schematic or a Mermaid block diagram. */
  markdown: string;
}

/**
 * How diagrams are drawn for a question: simple circuits from the model's description, a
 * block diagram the model writes for a device, or a checked diagram the app adds itself.
 */
export type DiagramMode =
  { kind: "circuit" } | { kind: "device" } | { kind: "checked"; diagram: DeviceDiagram };

const mermaid = (lines: string[]) => ["```mermaid", ...lines, "```"].join("\n");

const BATTERY_PACK: DeviceDiagram = {
  subject: "a laptop battery pack",
  description:
    "Three Li-ion cells in series (3S, about 11.1 V nominal). The BMS chip reads every cell's voltage through sense wires at each end of every cell (four wires for three cells), and the pack current through a sense resistor of a few milliohms in the negative line. In the positive line, a charge MOSFET and a discharge MOSFET sit back to back with their drains joined, so their body diodes point in opposite directions: the charge MOSFET blocks charging when it is off, and the discharge MOSFET blocks discharging when it is off. The BMS drives both gates. PACK+ joins the laptop's system power rail at a T-junction: the charger, fed by the adapter, also feeds this rail, and the laptop's circuits draw from it. When plugged in, the charger powers the laptop and charges the cells back through the MOSFETs; on battery, the cells supply the rail. PACK- returns to the laptop's ground, and the BMS reports charge level and faults to the laptop over SMBus.",
  markdown: "```schematic\nlaptop-battery-pack\n```",
};

const LAPTOP: DeviceDiagram = {
  subject: "a laptop's main circuits",
  description:
    "The power adapter (about 19 V DC) feeds the charger IC, which supplies the system power rail. The battery pack, with its BMS, also connects to this rail: it is charged from it when plugged in and supplies it on battery. Voltage regulators turn the rail into the low voltages the processor and other chips need. The processor connects to RAM over the memory bus, to the SSD over PCIe, to the display for video, and to the chipset, which handles USB ports, audio and Wi-Fi. The embedded controller reads the battery over SMBus and handles power-on, the keyboard and the fan through the chipset.",
  markdown: mermaid([
    "flowchart TB",
    '  Adapter["Power adapter, 19 V DC"] -->|power| Charger["Charger IC"]',
    '  Charger -->|power| Rail["System power rail"]',
    '  Battery["Battery pack with BMS"] <-->|charge and discharge| Rail',
    '  Rail -->|power| VRM["Voltage regulators"]',
    '  VRM -->|core voltages| CPU["Processor"]:::core',
    '  CPU <-->|memory bus| RAM["RAM"]',
    '  CPU <-->|PCIe| SSD["SSD"]',
    '  CPU -->|video| Display["Display"]',
    '  CPU <-->|chipset link| PCH["Chipset"]',
    '  PCH <-->|USB, audio, Wi-Fi| IO["Ports and wireless"]',
    '  EC["Embedded controller"] <-->|SMBus| Battery',
    "  EC <-->|power, keyboard, fan| PCH",
  ]),
};

const UPS: DeviceDiagram = {
  subject: "a UPS or home inverter",
  description:
    "When mains is on, the changeover relay passes mains to the load and the charger charges the 12 V battery. The microcontroller senses the mains; when it fails, it drives the MOSFET H-bridge with PWM to turn battery DC into low-voltage AC, the step-up transformer raises it to 230 V AC, and the relay switches the load over to the inverter output. The microcontroller also watches the battery voltage.",
  markdown: mermaid([
    "flowchart TB",
    '  Mains["AC mains, 230 V"] -->|power| Charger["Battery charger"]',
    '  Charger -->|charge current| Battery["Battery, 12 V"]',
    '  Battery -->|DC| Bridge["MOSFET H-bridge"]',
    '  Bridge -->|low-voltage AC| Transformer["Step-up transformer"]',
    '  Transformer -->|230 V AC| Relay["Changeover relay"]',
    "  Mains -->|power while mains is on| Relay",
    '  Relay -->|power| Load["Load"]',
    '  Controller["Microcontroller"]:::core -->|PWM gate drive| Bridge',
    "  Controller -->|switch over| Relay",
    "  Mains -->|mains sense| Controller",
    "  Battery -->|battery voltage| Controller",
  ]),
};

const SMPS: DeviceDiagram = {
  subject: "a switched-mode power supply, such as a phone or laptop charger (flyback type)",
  description:
    "AC mains passes through a fuse and EMI filter to a bridge rectifier, and a bulk capacitor smooths it to about 325 V DC. A switching MOSFET, driven by a PWM controller at tens of kilohertz, switches this voltage across the transformer primary. The transformer secondary gives low-voltage high-frequency AC, which an output diode rectifies and an output capacitor smooths into steady DC. A TL431 and an optocoupler send the output voltage back to the PWM controller across the isolation barrier, so it adjusts the switching to hold the output steady.",
  markdown: mermaid([
    "flowchart TB",
    '  AC["AC mains, 230 V"] -->|AC| Filter["Fuse and EMI filter"]',
    '  Filter -->|AC| Bridge["Bridge rectifier"]',
    '  Bridge -->|pulsating DC| Bulk["Bulk capacitor, about 325 V DC"]',
    '  Bulk -->|high-voltage DC| Primary["Transformer primary"]',
    '  Primary -->|switched current| Switch["Switching MOSFET"]',
    '  PWM["PWM controller"]:::core -->|gate drive| Switch',
    '  Primary -->|magnetic coupling| Secondary["Transformer secondary"]',
    '  Secondary -->|high-frequency AC| Diode["Output rectifier diode"]',
    '  Diode -->|DC| OutCap["Output capacitor"]',
    '  OutCap -->|steady DC| Out["DC output, for example 5 V"]',
    '  Out -->|output voltage| Feedback["TL431 and optocoupler"]',
    "  Feedback -->|isolated feedback| PWM",
  ]),
};

const REGULATED_SUPPLY: DeviceDiagram = {
  subject: "a regulated DC power supply",
  description:
    "A step-down transformer lowers 230 V AC mains to a low AC voltage. A bridge rectifier turns it into pulsating DC, a capacitor filter smooths it into DC with a small ripple, and a voltage regulator such as a 7805 holds the output steady for the load.",
  markdown: mermaid([
    "flowchart TB",
    '  AC["AC mains, 230 V"] -->|AC| T["Step-down transformer"]',
    '  T -->|low-voltage AC| R["Bridge rectifier"]',
    '  R -->|pulsating DC| F["Capacitor filter"]',
    '  F -->|DC with ripple| Reg["Voltage regulator, for example 7805"]:::core',
    '  Reg -->|steady DC| Load["Load"]',
  ]),
};

/** Most specific first: "laptop battery pack" is a battery pack, "laptop charger" an SMPS. */
const CHECKED_DIAGRAMS: { pattern: RegExp; diagram: DeviceDiagram }[] = [
  {
    pattern: /\b(battery pack|laptop batter(y|ies)|battery management system|bms)\b/i,
    diagram: BATTERY_PACK,
  },
  { pattern: /\b(inverter|uninterruptible power supply)\b|\bUPS\b/, diagram: UPS },
  { pattern: /\bups\b(?=.*\b(circuit|diagram)\b)/i, diagram: UPS },
  {
    pattern: /\b(smps|switch(ed|ing)[- ]mode power supply|chargers?|power adapter|ac adapter)\b/i,
    diagram: SMPS,
  },
  { pattern: /\b(regulated|linear|dc)? ?power supply\b/i, diagram: REGULATED_SUPPLY },
  { pattern: /\blaptops?\b/i, diagram: LAPTOP },
];

/** Other whole devices, drawn as a block diagram by the model. */
const OTHER_DEVICE = /\b(motherboard|mobile phone|smartphone)\b/i;
const DIAGRAM_REQUEST = /\b(circuit|diagram|schematic)s?\b/i;

/** How to draw the diagram asked for, including a follow-up such as "can I get a diagram". */
export function diagramModeFor(turns: ChatTurn[]): DiagramMode {
  const latest = turns.at(-1);
  if (latest?.role !== "user" || !DIAGRAM_REQUEST.test(latest.content)) return { kind: "circuit" };
  const asked = turns
    .filter((turn) => turn.role === "user")
    .map((turn) => turn.content)
    .reverse();
  for (const text of asked) {
    const checked = CHECKED_DIAGRAMS.find(({ pattern }) => pattern.test(text));
    if (checked) return { kind: "checked", diagram: checked.diagram };
    if (OTHER_DEVICE.test(text)) return { kind: "device" };
  }
  return { kind: "circuit" };
}

const FENCE = /^\s*(```|~~~)/;
const HEADING = /^#{1,4}\s/;
/** Sections of the model's own that the checked diagram replaces. */
const REPLACED_SECTION = /^#{1,4}\s*(concept map|(block |circuit )?diagram)\b/i;
/** The diagram goes just before the first of these. */
const DIAGRAM_GOES_BEFORE =
  /^#{1,4}\s*(solution|final answer|verification|common mistakes|related concepts)\b|^<!--\s*topic:/i;
/** Line starts that must be seen whole before deciding what to do with the line. */
const HELD_STARTS = ["```", "~~~", "#", "<!--", "%%", "flowchart", "graph"];

function mightBeSpecial(partial: string): boolean {
  const start = partial.trimStart();
  return !start || HELD_STARTS.some((held) => held.startsWith(start) || start.startsWith(held));
}

/**
 * Rewrites a device answer as it streams: drops any diagram, code or concept map the model
 * writes, and adds the checked diagram just before the Solution section. Plain lines stream
 * through at once; only lines that might start a block or heading wait to be seen whole.
 */
export class CheckedDiagramWriter {
  private pending = "";
  private passing = false;
  private skipping: "fence" | "mermaid" | "section" | null = null;
  private placed = false;

  constructor(private readonly markdown: string) {}

  write(text: string): string {
    let out = "";
    let rest = text;
    while (rest) {
      if (this.passing) {
        const end = rest.indexOf("\n");
        if (end === -1) return out + rest;
        out += rest.slice(0, end + 1);
        rest = rest.slice(end + 1);
        this.passing = false;
        continue;
      }
      this.pending += rest;
      rest = "";
      for (let end = this.pending.indexOf("\n"); end !== -1; end = this.pending.indexOf("\n")) {
        out += this.line(this.pending.slice(0, end));
        this.pending = this.pending.slice(end + 1);
      }
      if (this.pending && !this.skipping && !mightBeSpecial(this.pending)) {
        out += this.pending;
        this.pending = "";
        this.passing = true;
      }
    }
    return out;
  }

  /** The rest of the answer, with the diagram at the end if no later section came. */
  end(): string {
    const out = this.pending ? this.line(this.pending) : "";
    this.pending = "";
    return this.placed ? out : `${out}\n${this.diagram()}`;
  }

  private diagram(): string {
    return `\n## Diagram\n\n${this.markdown}\n\n`;
  }

  private line(line: string): string {
    const trimmed = line.trim();
    if (this.skipping === "fence") {
      if (FENCE.test(line)) this.skipping = null;
      return "";
    }
    let before = "";
    if (this.skipping === "mermaid") {
      if (isMermaidLine(line)) return "";
      this.skipping = null;
      before = "\n";
    }
    if (this.skipping === "section") {
      if (!HEADING.test(trimmed) && !trimmed.startsWith("<!--")) return "";
      this.skipping = null;
    }
    if (FENCE.test(line)) {
      this.skipping = "fence";
      return before;
    }
    if (startsMermaid(line)) {
      this.skipping = "mermaid";
      return before;
    }
    if (trimmed.startsWith("%%")) return before;
    if (REPLACED_SECTION.test(trimmed)) {
      this.skipping = "section";
      return before;
    }
    if (!this.placed && DIAGRAM_GOES_BEFORE.test(trimmed)) {
      this.placed = true;
      return `${before}${this.diagram()}${line}\n`;
    }
    return `${before}${line}\n`;
  }
}

/** Streams an answer with the checked diagram in place of anything the model drew. */
export async function* withCheckedDiagram(
  events: AsyncGenerator<StreamEvent, string | null>,
  diagram: DeviceDiagram,
): AsyncGenerator<StreamEvent, string | null> {
  let writer = new CheckedDiagramWriter(diagram.markdown);
  try {
    for (let result = await events.next(); ; result = await events.next()) {
      if (result.done) {
        const tail = result.value === null ? "" : writer.end();
        if (tail) yield { type: "text", text: tail };
        return result.value;
      }
      const event = result.value;
      if (event.type === "text") {
        const text = writer.write(event.text);
        if (text) yield { type: "text", text };
        continue;
      }
      // A model that wrote nothing is replaced by the next one, which starts afresh.
      if (event.type === "reset") writer = new CheckedDiagramWriter(diagram.markdown);
      yield event;
    }
  } finally {
    await events.return(null);
  }
}
