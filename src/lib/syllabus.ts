export type SyllabusSeed = { section: string; topics: string[] };

export const GATE_CS_SYLLABUS: SyllabusSeed[] = [
  {
    section: "Discrete Maths",
    topics: ["Mathematical Logic", "Set Theory and Algebra", "Combinatorics", "Graph Theory"],
  },
  {
    section: "Engineering Mathematics",
    topics: ["Linear Algebra", "Calculus", "Probability and Statistics"],
  },
  {
    section: "Digital Logic",
    topics: [
      "Logic Functions and Minimizations",
      "Combinational Circuits",
      "Sequential Circuits",
      "Number Systems",
    ],
  },
  {
    section: "Computer Organization & Architecture",
    topics: [
      "CPU Arch. and Address Modes",
      "Control Unit Design",
      "Instructions Pipeline",
      "Memory Organization",
      "IO Organisation",
    ],
  },
  {
    section: "C Programming",
    topics: ["Programming Basics", "Arrays & Strings", "Recursion", "Pointers"],
  },
  {
    section: "Data Structures",
    topics: ["Stacks and Queues", "Linked Lists", "Trees", "Binary Heaps", "Graphs", "Hashing"],
  },
  {
    section: "Algorithms",
    topics: [
      "Algo. Analysis and Asymptotic Notations",
      "Divide and Conquer",
      "Greedy Method",
      "Dynamic Programming",
      "P and NP Concepts",
      "Miscellaneous Topics",
    ],
  },
  {
    section: "Theory of Computation",
    topics: [
      "Finite Automata and Regular Languages",
      "PDA, CFL and DCFL",
      "Turing Machine, RE, REC, Undecidability",
    ],
  },
  {
    section: "Compiler Design",
    topics: [
      "Lexical Analysis",
      "Parsing Techniques",
      "Syntax Directed Translations",
      "Code Generations and Optimizations",
    ],
  },
  {
    section: "Operating System",
    topics: [
      "Processes and Scheduling",
      "Synchronization and Deadlocks",
      "Memory Management and Virtual Memory",
      "File Systems and Disk Scheduling",
    ],
  },
  {
    section: "Databases",
    topics: [
      "ER Model and Relational Model",
      "SQL and Relational Algebra",
      "Functional Dependencies & Normalization",
      "Transactions and Concurrency Control",
      "File Organization and Indexing",
    ],
  },
  {
    section: "Computer Networks",
    topics: ["ISO-OSI Stack and SWP", "LAN", "TCP, UDP and IP", "Routing and Application Layer"],
  },
];

export const GATE_DA_SYLLABUS: SyllabusSeed[] = [
  { section: "Probability and Statistics", topics: ["Probability", "Distributions", "Inference"] },
  { section: "Linear Algebra", topics: ["Vector Spaces", "Eigenvalues and Eigenvectors", "SVD"] },
  { section: "Calculus and Optimization", topics: ["Single Variable Calculus", "Optimization"] },
  {
    section: "Programming, DS & Algorithms",
    topics: ["Python Programming", "Data Structures", "Search and Sort", "Graph Algorithms"],
  },
  {
    section: "Database Management and Warehousing",
    topics: ["ER Model", "Normalization", "SQL", "Data Warehousing"],
  },
  {
    section: "Machine Learning",
    topics: ["Supervised Learning", "Unsupervised Learning", "Model Evaluation"],
  },
  { section: "AI", topics: ["Search", "Logic", "Reasoning under Uncertainty"] },
];

export const TEST_TYPES = [
  "Topic Test",
  "Subject Test",
  "Full Mock",
  "Weekly Test",
  "PYQ Test",
] as const;

export const TEST_ORGS = [
  "GO Classes (Gate CS 2027)",
  "Made Easy",
  "ACE Academy",
  "Unacademy",
  "Self / Other",
] as const;
