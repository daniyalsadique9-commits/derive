export interface SyllabusUnit {
  title: string;
  hours: number;
  topics: string[];
}

export interface SyllabusCourse {
  code: string;
  title: string;
  kind: "theory" | "lab";
  /** Lecture, tutorial and practical hours per week. */
  ltp: [number, number, number];
  credits: number;
  /** Page of the syllabus PDF where the course starts. */
  page: number;
  units: SyllabusUnit[];
  books: string[];
}

export interface Syllabus {
  program: string;
  group: string;
  semester: number;
  batch: string;
  branches: string[];
  /** Path under /public. */
  file: string;
  courses: SyllabusCourse[];
}

/** B.Tech Semester I, Group A (Batch 2026–2030), transcribed from the official syllabus PDF. */
export const SYLLABUS: Syllabus = {
  program: "B.Tech",
  group: "Group A",
  semester: 1,
  batch: "2026–2030",
  branches: [
    "Computer Science & Engineering",
    "Computer Science & Engineering (AI)",
    "Computer Science & Engineering (Cyber Security)",
    "Computer Science & Engineering (Data Science)",
    "Computer Science & Engineering (AI & ML)",
    "Computer Science & Engineering (IoT)",
    "Computer Science & Engineering (IoT & Cyber Security including Block Chain Technology)",
    "Computer Science & Engineering (Networks)",
    "Information Technology",
    "3-D Animation & Graphics",
    "Mathematics & Computing",
  ],
  file: "/syllabus/group-a-semester-1.pdf",
  courses: [
    {
      code: "100102",
      title: "Engineering Mathematics – I",
      kind: "theory",
      ltp: [3, 0, 0],
      credits: 3,
      page: 2,
      units: [
        {
          title: "Basic Linear Algebra",
          hours: 8,
          topics: [
            "Elementary transformations and rank of a matrix (echelon and normal form)",
            "Linear dependence and independence of vectors in Rⁿ",
            "Consistency of systems of linear equations",
            "Eigenvalues, eigenvectors and the Cayley–Hamilton theorem",
            "Similarity of matrices, diagonalisation, quadratic and canonical forms",
          ],
        },
        {
          title: "Differential Calculus: Single Variable",
          hours: 8,
          topics: [
            "Higher-order derivatives, successive differentiation and Leibnitz's theorem",
            "Mean value theorems (Rolle's, Lagrange's, Cauchy's)",
            "Indeterminate forms and L'Hôpital's rule",
            "Tangents and normals of algebraic and polar curves, curvature",
          ],
        },
        {
          title: "Differential Calculus: Several Variables",
          hours: 9,
          topics: [
            "Partial differentiation and Euler's theorem",
            "Limit, continuity and differentiability of functions of several variables",
            "Taylor's and Maclaurin's theorems",
            "Maxima and minima, Lagrange's multiplier method",
          ],
        },
        {
          title: "Integral Calculus",
          hours: 9,
          topics: [
            "Differentiation under the integral sign (Leibnitz's rule)",
            "Double integrals, change of order, polar coordinates",
            "Triple integrals in spherical and cylindrical coordinates",
            "Beta, Gamma and elliptic integrals",
          ],
        },
        {
          title: "Vector Calculus",
          hours: 8,
          topics: [
            "Gradient, divergence and curl, directional derivative, tangent plane",
            "Line, surface and volume integrals",
            "Green's, Stokes' and Gauss divergence theorems",
          ],
        },
      ],
      books: [
        "Higher Engineering Mathematics, B. S. Grewal",
        "Higher Engineering Mathematics, B. V. Ramana",
        "Advanced Engineering Mathematics, Erwin Kreyszig",
        "A Textbook of Engineering Mathematics, N. P. Bali and Manish Goyal",
      ],
    },
    {
      code: "100104",
      title: "Engineering Physics",
      kind: "theory",
      ltp: [3, 0, 0],
      credits: 3,
      page: 5,
      units: [
        {
          title: "Wave Optics",
          hours: 8,
          topics: [
            "Interference by division of amplitude, Newton's rings, Michelson interferometer",
            "Fraunhofer diffraction: single slit, double slit, circular aperture",
            "Diffraction grating",
            "Rayleigh criterion and resolving power of a telescope",
            "Polarisation, double refraction, Nicol prism",
          ],
        },
        {
          title: "Lasers and Optical Fibre",
          hours: 8,
          topics: [
            "Laser characteristics, Einstein's A and B coefficients, population inversion, pumping, optical resonator",
            "Ruby, He-Ne and semiconductor lasers",
            "Optical fibre structure, total internal reflection, acceptance angle, numerical aperture, types",
            "Propagation and attenuation in optical fibres",
            "Applications of optical fibres and fibre optic sensors",
          ],
        },
        {
          title: "Electromagnetism and Propagation of Waves",
          hours: 8,
          topics: [
            "Electric fields, Gauss's law, dielectrics and capacitors",
            "Magnetic fields and magnetic materials",
            "Maxwell's equations",
            "Electromagnetic waves and the Poynting theorem",
          ],
        },
        {
          title: "Quantum Mechanics",
          hours: 8,
          topics: [
            "Need for quantum mechanics",
            "de Broglie hypothesis and Heisenberg uncertainty principle",
            "Wave function and its characteristics",
            "Schrödinger's equation (time-dependent and time-independent)",
            "Particle in a box: energy eigenvalues and eigenfunctions",
            "Potential barrier and tunnelling",
          ],
        },
        {
          title: "Semiconductors and Nanomaterials",
          hours: 10,
          topics: [
            "Metals, semiconductors and insulators",
            "Intrinsic and extrinsic semiconductors, drift, diffusion and Fermi level",
            "Photodiode, p-n junction transistor, LED",
            "Hall effect",
            "Solar cell and its characteristics",
            "Nanoscience, properties and classification of nanomaterials (0D, 1D)",
          ],
        },
      ],
      books: [
        "Optics, Ajay Ghatak",
        "Introduction to Electrodynamics, David J. Griffiths",
        "Introduction to Quantum Mechanics, David J. Griffiths",
        "Concepts of Engineering Physics, S. K. Roy",
      ],
    },
    {
      code: "100105",
      title: "Introduction to AI",
      kind: "theory",
      ltp: [3, 0, 0],
      credits: 3,
      page: 13,
      units: [
        {
          title: "Introduction to Artificial Intelligence",
          hours: 8,
          topics: [
            "History, evolution and foundations of AI",
            "Intelligent agents and the PEAS description",
            "Types of task environments",
            "Types of agents: simple reflex, model-based, goal-based, utility-based, learning",
            "AI application domains in engineering",
          ],
        },
        {
          title: "Problem Solving by Search",
          hours: 9,
          topics: [
            "Problem formulation and state-space representation",
            "Uninformed search: BFS, DFS, uniform cost, depth-limited, iterative deepening",
            "Informed search: greedy best-first, A*",
            "Heuristic design, admissibility and consistency",
            "Local search: hill climbing, simulated annealing",
            "Adversarial search: minimax and alpha-beta pruning",
            "Constraint satisfaction problems",
          ],
        },
        {
          title: "Knowledge Representation and Reasoning",
          hours: 8,
          topics: [
            "Propositional logic: syntax, semantics and resolution",
            "First-order predicate logic and quantifiers",
            "Forward and backward chaining",
            "Semantic networks and frames",
            "Rule-based (production) systems",
          ],
        },
        {
          title: "Reasoning Under Uncertainty",
          hours: 7,
          topics: [
            "Sources of uncertainty and basic probability",
            "Bayes' theorem",
            "Bayesian networks",
            "Fuzzy logic and fuzzy sets",
            "Certainty factors",
          ],
        },
        {
          title: "Introduction to Machine Learning and AI Applications",
          hours: 10,
          topics: [
            "Supervised, unsupervised and reinforcement learning",
            "Linear regression, k-NN and decision trees",
            "k-means clustering",
            "Perceptron and artificial neural networks",
            "NLP, computer vision, expert systems and robotics",
            "Ethics, bias, responsible AI and the SDGs",
          ],
        },
      ],
      books: [
        "Artificial Intelligence: A Modern Approach, Stuart Russell and Peter Norvig",
        "AI for Everyone, Saptarsi Goswami, Amit Kumar Das and Amlan Chakrabarti",
        "Artificial Intelligence, Elaine Rich, Kevin Knight and Shivashankar B. Nair",
      ],
    },
    {
      code: "100108",
      title: "Computer Fundamentals & Emerging Technologies",
      kind: "theory",
      ltp: [3, 0, 0],
      credits: 3,
      page: 17,
      units: [
        {
          title: "Fundamentals of Computer Systems",
          hours: 8,
          topics: [
            "Classification of computers and functional units",
            "CPU organisation, registers and cache memory",
            "Memory architecture and hierarchy",
            "Motherboard components and the Von Neumann architecture",
            "Machine, assembly and high-level languages; compiler and interpreter",
          ],
        },
        {
          title: "Data Representation",
          hours: 8,
          topics: [
            "Number systems and conversions (binary, octal, decimal, hexadecimal)",
            "Binary addition and subtraction",
            "Signed numbers: 1's and 2's complement",
            "ASCII, Unicode and data representation in memory",
          ],
        },
        {
          title: "Computer Software and Operating Systems",
          hours: 9,
          topics: [
            "System and application software",
            "Objectives and types of operating systems",
            "Process and memory management",
            "Command-line and graphical user interfaces",
            "File systems in Windows, Linux and macOS",
          ],
        },
        {
          title: "Computer Networks and Internet Basics",
          hours: 9,
          topics: [
            "Importance of networking and transmission media",
            "LAN, MAN and WAN; star, bus, ring and mesh topologies",
            "Network devices: hub, switch, router, modem, gateway",
            "IP addresses, TCP, UDP, HTTP, FTP, DNS and URLs",
            "Client–server architecture",
          ],
        },
        {
          title: "Emerging Technologies",
          hours: 8,
          topics: [
            "Internet of Things: architecture and applications",
            "Cyber security: CIA triad, threats and countermeasures",
            "AI and machine learning paradigms",
            "Blockchain: distributed ledger, hashing, decentralisation",
            "Data science lifecycle and data-driven decisions",
          ],
        },
      ],
      books: [
        "Computer Fundamentals, P. K. Sinha and Priti Sinha",
        "Introduction to Computers, Peter Norton",
        "Data Communications and Networking, Behrouz A. Forouzan",
        "Operating System Concepts, Silberschatz, Galvin and Gagne",
      ],
    },
    {
      code: "100109",
      title: "Universal Human Values",
      kind: "theory",
      ltp: [2, 0, 0],
      credits: 2,
      page: 23,
      units: [
        {
          title: "Self-Exploration, Happiness and Prosperity",
          hours: 5,
          topics: [
            "Self-exploration",
            "Continuous happiness and prosperity",
            "Right understanding",
          ],
        },
        {
          title: "Relationship, Physical Facility and Human Being",
          hours: 5,
          topics: [
            "Right understanding, relationship and physical facility",
            "Human being as the co-existence of self and body",
          ],
        },
        {
          title: "Values in Human Relationships and Harmony in Society",
          hours: 5,
          topics: ["Values in human relationships", "Harmony in society"],
        },
        {
          title: "Harmony in Nature and Existence",
          hours: 6,
          topics: [
            "Harmony in nature and the four orders",
            "Existence as co-existence",
            "Holistic perception of harmony",
          ],
        },
        {
          title: "Implications of Holistic Understanding on Professional Ethics",
          hours: 7,
          topics: [
            "Natural acceptance of human values and ethical conduct",
            "Humanistic education, constitution and universal order",
            "Competence in professional ethics",
          ],
        },
      ],
      books: [],
    },
    {
      code: "100110",
      title: "Essence of Indian Constitution",
      kind: "theory",
      ltp: [3, 0, 0],
      credits: 0,
      page: 21,
      units: [
        {
          title: "Constitution and Preamble",
          hours: 8,
          topics: [
            "Meaning and history of the Constitution of India",
            "Salient features and characteristics",
            "The Preamble",
          ],
        },
        {
          title: "Fundamental Rights and Duties",
          hours: 8,
          topics: [
            "Fundamental rights under Part III",
            "Fundamental duties and their significance",
          ],
        },
        {
          title: "Directive Principles",
          hours: 8,
          topics: ["Relevance of Directive Principles under Part IV", "Articles of state policy"],
        },
        {
          title: "Governance",
          hours: 9,
          topics: [
            "Governance under Part VI",
            "State legislature: Legislative Assembly and Council",
          ],
        },
        {
          title: "Amendments of the Constitution",
          hours: 9,
          topics: [
            "Amendment powers and procedure",
            "42nd, 44th, 74th, 76th, 86th and 91st amendments",
          ],
        },
      ],
      books: [],
    },
    {
      code: "100111",
      title: "Basics of Electrical & Electronics Engineering",
      kind: "theory",
      ltp: [3, 0, 0],
      credits: 3,
      page: 9,
      units: [
        {
          title: "Basic Electrical Circuits",
          hours: 8,
          topics: [
            "Circuit elements R, L and C; active, passive, linear and non-linear elements",
            "Ohm's law and Kirchhoff's laws",
            "Series and parallel circuits, sources and source transformation",
            "Mesh and nodal analysis",
            "Voltage and current divider rules, star–delta transformation",
          ],
        },
        {
          title: "AC Circuits",
          hours: 8,
          topics: [
            "Signals, waveforms and instantaneous, peak, average and RMS values",
            "Peak factor and form factor",
            "Phase, phasors and their representation",
            "Impedance, admittance, power factor and power triangle",
            "Three-phase balanced and unbalanced systems",
          ],
        },
        {
          title: "Basic Electrical Machines",
          hours: 8,
          topics: [
            "Electromagnetic laws, self and mutual inductance",
            "DC machines: principle, construction and applications",
            "Single-phase transformers, EMF equation and voltage regulation",
            "Induction motors and fractional horsepower motors",
          ],
        },
        {
          title: "Semiconductor Devices",
          hours: 8,
          topics: [
            "Intrinsic and extrinsic semiconductors",
            "p-n junction diode: characteristics, temperature effects and breakdown",
            "Rectifiers, filters and the Zener diode regulator",
            "BJT: construction, CE amplifier and transistor as a switch",
          ],
        },
        {
          title: "Digital and Analog Electronics, Measurement and Electrical Safety",
          hours: 10,
          topics: [
            "Number systems and binary addition",
            "Logic gates, universal gates and Boolean algebra",
            "LEDs, seven-segment displays, IC 7805 and IC 7912",
            "Multimeter and CRO; sensors and transducers",
            "Power generation, transmission and distribution",
            "Fuse, MCB, MCCB and earthing",
          ],
        },
      ],
      books: [
        "Basic Electrical Engineering, D. P. Kothari and I. J. Nagrath",
        "Electronic Devices and Circuit Theory, Boylestad and Nashelsky",
        "Digital Logic and Computer Design, M. Morris Mano",
        "Fundamentals of Electric Circuits, Alexander and Sadiku",
      ],
    },
    {
      code: "100104P",
      title: "Engineering Physics Lab",
      kind: "lab",
      ltp: [0, 0, 2],
      credits: 1,
      page: 25,
      units: [
        {
          title: "Optics experiments",
          hours: 10,
          topics: [
            "Diffraction grating",
            "Newton's rings",
            "Resolving power of a telescope",
            "Polarimeter",
            "Numerical aperture of an optical fibre",
          ],
        },
        {
          title: "Electricity, quantum and semiconductor experiments",
          hours: 14,
          topics: [
            "Dielectric constant",
            "Planck's constant with a photocell",
            "Stern–Gerlach experiment (virtual lab)",
            "p-n junction characteristics",
            "Hall effect",
            "Energy band gap by the four-probe method",
            "Nanoparticle size and light absorption",
          ],
        },
      ],
      books: [],
    },
    {
      code: "100111P",
      title: "Basics of Electrical & Electronics Engineering Lab",
      kind: "lab",
      ltp: [0, 0, 2],
      credits: 1,
      page: 26,
      units: [
        {
          title: "Circuits and machines",
          hours: 10,
          topics: [
            "Active and passive components, Ohm's law",
            "Kirchhoff's laws",
            "Power factor improvement",
            "Transformer voltage and turns ratio",
            "Parts of a DC machine",
          ],
        },
        {
          title: "Devices, digital circuits and safety",
          hours: 14,
          topics: [
            "Diode V–I characteristics, rectifiers and voltage regulators",
            "Transistor input and output characteristics",
            "Logic gates",
            "Signal measurement with a CRO",
            "Protection devices, earthing and house wiring",
          ],
        },
      ],
      books: [],
    },
    {
      code: "100112P",
      title: "Programming for Problem Solving Lab",
      kind: "lab",
      ltp: [0, 0, 2],
      credits: 1,
      page: 28,
      units: [
        {
          title: "C fundamentals",
          hours: 6,
          topics: ["Algorithmic logic and basic I/O", "Decision making", "Loops and iteration"],
        },
        {
          title: "Arrays, pointers and functions",
          hours: 10,
          topics: [
            "1-D arrays and matrices (2-D arrays)",
            "Pointer arithmetic and strings",
            "Recursion versus iteration",
            "Parameter passing",
            "Structures and user-defined types",
            "File handling",
          ],
        },
        {
          title: "Object-oriented programming in C++",
          hours: 10,
          topics: [
            "Classes, objects and encapsulation",
            "Constructors and memory management",
            "Static members and friend functions",
            "Inheritance",
            "Polymorphism and abstract classes",
            "Exception handling and templates",
          ],
        },
      ],
      books: [],
    },
  ],
};

export function findCourse(code: string): SyllabusCourse | undefined {
  return SYLLABUS.courses.find((course) => course.code === code);
}
