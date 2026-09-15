const INK = "#1f1e1b";
const MUTED = "#57534b";
const ACCENT = "#d0161f";
const FONT = "Inter, ui-sans-serif, system-ui, sans-serif";

const text = { stroke: "none", fill: MUTED, fontFamily: FONT, fontSize: 13 } as const;
const strong = { ...text, fill: INK, fontSize: 14, fontWeight: 600 } as const;

/** The cell stack's wire, and where each cell and sense wire sits on it. */
const STACK_X = 120;
const CELLS = [
  { name: "Cell 3", y: 195 },
  { name: "Cell 2", y: 285 },
  { name: "Cell 1", y: 375 },
];
const SENSE_TAPS = [
  { pin: "VC3", y: 150 },
  { pin: "VC2", y: 240 },
  { pin: "VC1", y: 330 },
  { pin: "VC0", y: 420 },
];
const TOP = 110;
const BOTTOM = 460;
const CHIP = { left: 300, right: 500, top: 130, bottom: 440 };
const CHG_X = 540;
const DSG_X = 680;
const PACK_EDGE = 790;
const RAIL_X = 900;
const GROUND_X = 930;

/**
 * An N-channel MOSFET with its body diode: drain at (0,-30), source at (0,30), gate at (-36,0).
 * The diode points from source to drain, the one direction the MOSFET can't block.
 */
function Mosfet({ transform }: { transform: string }) {
  return (
    <g transform={transform}>
      <line x1={-36} y1={0} x2={-20} y2={0} />
      <line x1={-20} y1={-14} x2={-20} y2={14} />
      <line x1={-13} y1={-17} x2={-13} y2={-7} />
      <line x1={-13} y1={-5} x2={-13} y2={5} />
      <line x1={-13} y1={7} x2={-13} y2={17} />
      <polyline points="-13,-12 0,-12 0,-30" />
      <polyline points="-13,12 0,12 0,30" />
      <line x1={-13} y1={0} x2={0} y2={0} />
      <line x1={0} y1={0} x2={0} y2={12} />
      <polygon points="-13,0 -6,-4 -6,4" fill={INK} />
      <polyline points="0,22 16,22 16,6" />
      <polyline points="16,-5 16,-22 0,-22" />
      <polygon points="9,6 23,6 16,-5" fill={INK} />
      <line x1={9} y1={-5} x2={23} y2={-5} />
    </g>
  );
}

function Dot({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={4} fill={INK} stroke="none" />;
}

function Terminal({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={5} fill="#ffffff" />;
}

function ArrowDown({ x, y }: { x: number; y: number }) {
  return (
    <polygon
      points={`${x - 5},${y - 4} ${x + 5},${y - 4} ${x},${y + 4}`}
      fill={INK}
      stroke="none"
    />
  );
}

/**
 * A laptop battery pack: three cells in series, a sense wire at every cell junction, a
 * low-side sense resistor, back-to-back charge and discharge MOSFETs in the positive line,
 * and PACK+ meeting the charger and the laptop at the system power rail.
 */
export function BatteryPackSchematic() {
  return (
    <svg
      viewBox="0 0 1000 520"
      role="img"
      aria-label="Circuit diagram of a laptop battery pack"
      data-schematic="laptop-battery-pack"
      className="mx-auto h-auto w-full"
      style={{ maxWidth: 1150 }}
    >
      <rect
        x={40}
        y={56}
        width={PACK_EDGE - 40}
        height={450}
        rx={14}
        fill="none"
        stroke="#b8b2a6"
        strokeWidth={1.5}
        strokeDasharray="6 6"
      />
      <text {...strong} x={56} y={44}>
        Battery pack
      </text>

      <g stroke={INK} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Cells in series */}
        <line x1={STACK_X} y1={TOP} x2={STACK_X} y2={CELLS[0].y - 7} />
        {CELLS.map((cell, index) => (
          <g key={cell.name}>
            <line x1={STACK_X - 18} y1={cell.y - 7} x2={STACK_X + 18} y2={cell.y - 7} />
            <line
              x1={STACK_X - 10}
              y1={cell.y + 7}
              x2={STACK_X + 10}
              y2={cell.y + 7}
              strokeWidth={4}
            />
            <line
              x1={STACK_X}
              y1={cell.y + 7}
              x2={STACK_X}
              y2={index < CELLS.length - 1 ? CELLS[index + 1].y - 7 : BOTTOM}
            />
          </g>
        ))}

        {/* Sense wires from every cell junction to the BMS */}
        {SENSE_TAPS.map((tap) => (
          <g key={tap.pin}>
            <line x1={STACK_X} y1={tap.y} x2={CHIP.left} y2={tap.y} />
            <Dot x={STACK_X} y={tap.y} />
          </g>
        ))}

        {/* BMS chip */}
        <rect
          x={CHIP.left}
          y={CHIP.top}
          width={CHIP.right - CHIP.left}
          height={CHIP.bottom - CHIP.top}
          rx={8}
          fill="#fdf1f0"
          stroke={ACCENT}
        />

        {/* Positive line: back-to-back MOSFETs, drains joined */}
        <line x1={STACK_X} y1={TOP} x2={CHG_X - 30} y2={TOP} />
        <Mosfet transform={`translate(${CHG_X} ${TOP}) scale(1 -1) rotate(90)`} />
        <line x1={CHG_X + 30} y1={TOP} x2={DSG_X - 30} y2={TOP} />
        <Mosfet transform={`translate(${DSG_X} ${TOP}) rotate(-90)`} />
        <line x1={DSG_X + 30} y1={TOP} x2={RAIL_X} y2={TOP} />

        {/* Gate drive */}
        <polyline points={`${CHIP.right},180 ${CHG_X},180 ${CHG_X},${TOP + 36}`} />
        <polyline points={`${CHIP.right},210 ${DSG_X},210 ${DSG_X},${TOP + 36}`} />

        {/* Negative line with the current-sense resistor */}
        <line x1={STACK_X} y1={BOTTOM} x2={360} y2={BOTTOM} />
        <polyline
          points={[-40, -33, -20, -7, 7, 20, 33, 40]
            .map((dx, index) => `${400 + dx},${BOTTOM + [0, -9, 9, -9, 9, -9, 9, 0][index]}`)
            .join(" ")}
        />
        <line x1={440} y1={BOTTOM} x2={GROUND_X} y2={BOTTOM} />
        <line x1={350} y1={CHIP.bottom} x2={350} y2={BOTTOM} />
        <line x1={450} y1={CHIP.bottom} x2={450} y2={BOTTOM} />
        <Dot x={350} y={BOTTOM} />
        <Dot x={450} y={BOTTOM} />

        {/* SMBus to the laptop */}
        <polyline
          points={`${CHIP.right},390 870,390 870,240`}
          strokeDasharray="7 5"
          strokeWidth={1.6}
        />

        {/* Outside the pack: charger and laptop on the system power rail */}
        <rect x={845} y={6} width={110} height={48} rx={8} fill="#f6f3ec" stroke="#d6cfbf" />
        <line x1={RAIL_X} y1={54} x2={RAIL_X} y2={TOP} />
        <ArrowDown x={RAIL_X} y={84} />
        <line x1={RAIL_X} y1={TOP} x2={RAIL_X} y2={180} />
        <ArrowDown x={RAIL_X} y={148} />
        <Dot x={RAIL_X} y={TOP} />
        <rect x={840} y={180} width={120} height={60} rx={8} fill="#f6f3ec" stroke="#d6cfbf" />
        <line x1={GROUND_X} y1={240} x2={GROUND_X} y2={BOTTOM} />
        <line x1={GROUND_X} y1={BOTTOM} x2={GROUND_X} y2={475} />
        <line x1={GROUND_X - 14} y1={475} x2={GROUND_X + 14} y2={475} />
        <line x1={GROUND_X - 9} y1={481} x2={GROUND_X + 9} y2={481} />
        <line x1={GROUND_X - 4} y1={487} x2={GROUND_X + 4} y2={487} />

        <Terminal x={PACK_EDGE} y={TOP} />
        <Terminal x={PACK_EDGE} y={390} />
        <Terminal x={PACK_EDGE} y={BOTTOM} />
      </g>

      {CELLS.map((cell) => (
        <g key={cell.name}>
          <text {...text} x={98} y={cell.y - 2} textAnchor="end" fill={INK}>
            {cell.name}
          </text>
          <text {...text} x={98} y={cell.y + 14} textAnchor="end">
            3.7 V
          </text>
          <text {...text} x={STACK_X + 24} y={cell.y - 8}>
            +
          </text>
        </g>
      ))}

      {SENSE_TAPS.map((tap) => (
        <text key={tap.pin} {...text} fontSize={12} x={CHIP.left + 8} y={tap.y + 4}>
          {tap.pin}
        </text>
      ))}
      <text {...text} fontSize={12} x={CHIP.right - 8} y={184} textAnchor="end">
        CHG
      </text>
      <text {...text} fontSize={12} x={CHIP.right - 8} y={214} textAnchor="end">
        DSG
      </text>
      <text {...text} fontSize={12} x={CHIP.right - 8} y={394} textAnchor="end">
        SMBus
      </text>
      <text {...text} fontSize={12} x={400} y={430} textAnchor="middle">
        current sense
      </text>
      <text {...strong} fontSize={16} fill={ACCENT} x={400} y={236} textAnchor="middle">
        BMS chip
      </text>
      {["checks every cell", "measures current", "drives the MOSFETs", "talks to the laptop"].map(
        (line, index) => (
          <text key={line} {...text} x={400} y={260 + index * 18} textAnchor="middle">
            {line}
          </text>
        ),
      )}

      <text {...text} x={CHG_X} y={76} textAnchor="middle" fill={INK}>
        Charge MOSFET
      </text>
      <text {...text} x={DSG_X} y={76} textAnchor="middle" fill={INK}>
        Discharge MOSFET
      </text>
      <text {...text} x={400} y={490} textAnchor="middle">
        Sense resistor, a few mΩ
      </text>

      <text {...text} fontSize={12} x={PACK_EDGE + 8} y={TOP + 20}>
        PACK+
      </text>
      <text {...text} fontSize={12} x={PACK_EDGE + 8} y={BOTTOM + 18}>
        PACK−
      </text>
      <text {...text} fontSize={12} x={PACK_EDGE + 10} y={382}>
        SMBus data
      </text>
      <text {...text} fontSize={12} x={RAIL_X + 10} y={TOP - 5} fill={INK}>
        System power
      </text>
      <text {...text} fontSize={12} x={RAIL_X + 10} y={TOP + 11} fill={INK}>
        rail
      </text>
      <text {...strong} x={RAIL_X} y={28} textAnchor="middle">
        Charger
      </text>
      <text {...text} fontSize={12} x={RAIL_X} y={44} textAnchor="middle">
        from the adapter
      </text>
      <text {...strong} x={RAIL_X} y={206} textAnchor="middle">
        Laptop circuits
      </text>
      <text {...text} fontSize={12} x={RAIL_X} y={224} textAnchor="middle">
        CPU, display, SSD
      </text>
      <text {...text} fontSize={12} x={GROUND_X + 20} y={484}>
        Ground
      </text>
    </svg>
  );
}
