import { generatedProjects } from "./generated/projects";

type Project = {
  name: string;
  description: string;
  link?: string;
  skills?: string[];
};

type ExperienceItem = {
  title: string;
  company: string;
  dateRange: string;
  bullets: string[];
};

type EducationItem = {
  degree: string;
  school: string;
  dateRange: string;
  achievements: string[];
};

type SkillArea = {
  title: string;
  items: string[];
};

type SiteConfig = {
  name: string;
  title: string;
  description: string;
  location: string;
  // phone?: string; // CHANGED: Removed phone number for privacy
  profileImage: string;
  resumeUrl: string;
  accentColor: string;
  social: {
    email: string;
    linkedin: string;
    github: string;
    twitter?: string;
  };
  aboutMe: string;
  workAreas: string[];
  aiSpecialties: string[];
  skills: string[];
  skillAreas: SkillArea[];
  highlights?: string[];
  projects: Project[];
  topProjects: Project[];
  otherProjects: Project[];
  experience: ExperienceItem[];
  education: EducationItem[];
};

const fallbackProjects: Project[] = [
  {
    name: "edumind-ai",
    description:
      "AI-powered educational intelligence platform with adaptive learning and analytics.",
    link: "https://github.com/vikenparikh/edumind-ai",
    skills: ["Python", "AI", "Backend"],
  },
  {
    name: "investiq-ai",
    description:
      "AI-driven financial intelligence platform with portfolio optimization and risk analysis.",
    link: "https://github.com/vikenparikh/investiq-ai",
    skills: ["Python", "AI", "Finance"],
  },
  {
    name: "Machine-Learning-Implementation",
    description:
      "Machine learning algorithm implementations and practical experimentation notebooks.",
    link: "https://github.com/vikenparikh/Machine-Learning-Implementation",
    skills: ["Machine Learning", "Python", "Jupyter"],
  },
  {
    name: "AWS-AutoScaling-Object-Detection",
    description:
      "Cloud platform on AWS to process video URLs and return detected objects at scale.",
    link: "https://github.com/vikenparikh/AWS-AutoScaling-Object-Detection",
    skills: ["AWS", "Java", "Computer Vision"],
  },
  {
    name: "Mutext",
    description: "Music and text generation project using machine learning approaches.",
    link: "https://github.com/vikenparikh/Mutext",
    skills: ["Python", "Generative AI"],
  },
  {
    name: "PhoCaptionator",
    description:
      "Photo captioning application focused on generating meaningful image descriptions.",
    link: "https://github.com/vikenparikh/PhoCaptionator",
    skills: ["Python", "Computer Vision", "NLP"],
  },
];

const projectList: Project[] =
  generatedProjects.length > 0
    ? (generatedProjects as unknown as Project[])
    : fallbackProjects;

export const siteConfig: SiteConfig = {
  name: "Viken Parikh",
  title: "Software Engineer | Distributed Systems, AI/ML, Cloud, and Product Prototyping",
  description:
    "Software Engineer with 5+ years at Microsoft and PayPal designing and operating high-scale distributed systems, intelligent security tools, and data-driven payment infrastructure with strong ML/AI expertise.",
  location: "Vancouver, BC, Canada",
  profileImage: "/images/viken-profile-photo.jpeg",
  resumeUrl: "/resume/resume.pdf",
  accentColor: "#2563eb",
  social: {
    email: "vsparikh1996@gmail.com",
    linkedin: "https://linkedin.com/in/vikenparikh96/",
    github: "https://github.com/vikenparikh",
    twitter: "",
  },
  aboutMe:
    "Software Engineer with 5+ years at Microsoft and PayPal designing and operating high-scale distributed systems, intelligent security tools, and data-driven payment infrastructure with strong ML/AI expertise. Delivered production systems serving 25K+ developers and processing $2B+ daily volume, owning architecture, implementation, and experimentation to drive reliability and growth.",
  workAreas: [
    "Backend Engineering",
    "Distributed Systems",
    "Cloud Security",
    "Payments Infrastructure",
    "AI/ML Systems",
    "API Design & Development",
    "DevOps & Automation",
    "Data Engineering",
    "Product Prototyping",
    "Technical Leadership"
  ],
  aiSpecialties: [
    "Feature Engineering",
    "A/B Testing",
    "LLM Agents",
    "RAG (Retrieval-Augmented Generation)",
    "NLP (Natural Language Processing)",
    "Reinforcement Learning",
    "Prompt Engineering",
    "Model Evaluation & Tuning",
    "Agentic Workflows",
    "AI Product Strategy"
  ],
  skills: [
    "Python",
    "Java",
    "C#",
    "SQL",
    "JavaScript/TypeScript",
    "Machine Learning",
    "LLMs",
    "Distributed Systems",
    "Cloud",
    "Microservices",
  ],
  skillAreas: [
    {
      title: "Languages",
      items: [
        "Python",
        "Java",
        "C#",
        "Ruby",
        "SQL",
        "JavaScript/TypeScript",
        "Go",
        "Bash",
      ],
    },
    {
      title: "Frameworks & Libraries",
      items: [
        "React",
        "Node.js",
        "Django",
        "Spring Boot",
        "Hugging Face (BERT, GPT, T5)",
        "LangChain",
      ],
    },
    {
      title: "Cloud & Infrastructure",
      items: [
        "AWS",
        "Azure",
        "GCP",
        "Kubernetes",
        "Docker",
        "Terraform",
      ],
    },
    {
      title: "AI/ML",
      items: [
        "RAG",
        "LLM Agents",
        "Reinforcement Learning",
        "NLP",
        "Computer Vision",
      ],
    },
    {
      title: "Databases",
      items: [
        "PostgreSQL",
        "MySQL",
        "Redis",
        "MongoDB",
        "Cassandra",
      ],
    },
    {
      title: "Tools",
      items: [
        "Git",
        "CI/CD",
        "Kafka",
        "Spark",
        "Elasticsearch",
      ],
    },
  ], // CHANGED: Refactored skill groups for pill rendering and grouping
  highlights: [
    "5+ years of experience at Microsoft and PayPal, leading and contributing to high-impact engineering teams.",
    "Served 25,000+ developers through platform and API initiatives.",
    "Enabled $2B+ in daily payment volume with robust, scalable systems.",
    "Scanned 50,000+ repositories for security and compliance.",
    "Maintained 99.99% uptime at scale for mission-critical services.",
    "Achieved ~2–3% authorization success improvement on global card traffic.",
    "Reduced onboarding time by ~50% through process and tooling improvements.",
    "Drove 92% user satisfaction for Travigate platform.",
    "Published IEEE research cited 100+ times.",
    "Deployed YOLO pipeline processing 10,000+ images/day at ~95% accuracy.",
  ],
  projects: projectList,
  topProjects: projectList.slice(0, 6),
  otherProjects: projectList.slice(6),
  experience: [
    {
      title: "Independent AI/ML Developer",
      company: "Self-Directed Projects & Research",
      dateRange: "Oct 2025 – Present",
      bullets: [
        "Building and shipping AI products — edumind-ai, neuralverse-ai, medmind-ai — focused on LLM agents, RAG pipelines, and agentic systems from prototype to deployment.",
        "Exploring full-stack AI product development: problem discovery, UX, evaluation, and operating these systems in realistic settings."
      ],
    },
    {
      title: "Software Engineer 2",
      company: "Microsoft, Seattle & Vancouver",
      dateRange: "June 2022 – Sep 2025",
      bullets: [
        "Built ML-driven security analysis tooling for Defender for DevOps, scanning 50K+ Azure DevOps/GitHub repositories to detect code, secret, dependency, and IaC vulnerabilities using intelligent pattern matching, reducing detection time by ~40% and increasing remediation throughput by ~60%.",
        "Designed and shipped predictive security dashboards using React and Knockout with ML-backed insights, delivering unified code-to-cloud visibility and driving ~30% higher feature adoption among 25K+ developers.",
        "Developed feature engineering pipelines and A/B testing frameworks for Azure Cloud Security, leveraging data-driven recommendations to streamline onboarding and cut setup time by ~50%.",
      ],
    },
    {
      title: "Software Engineer 2",
      company: "PayPal, San Jose",
      dateRange: "June 2020 – May 2022",
      bullets: [
        "Architected and implemented an intelligent payment authorization system using feature engineering, controlled experiments, and ML-guided policies to optimize routing and retry logic, improving transaction efficiency and increasing authorization success by ~2–3% on high-volume global card traffic.",
        "Built high-throughput tokenization SDKs and APIs using Java (Spring Boot), Couchbase, Docker, and Kafka, supporting 50,000+ QPS and ~$2B daily volume with 99.99% uptime while integrating ML-based fraud detection and experimentation.",
        "Engineered a secure tokenization platform with intelligent lifecycle management, improving reliability and flexibility for stored payment instruments across multiple PayPal flows while maintaining PCI-compliant practices.",
        "Mentored four junior engineers on microservices, observability, and experimentation-driven development, establishing best practices for production systems and data-driven architecture.",
      ],
    },
    {
      title: "Software Engineer",
      company: "Decision Theater Network, Arizona",
      dateRange: "Dec 2018 – May 2020",
      bullets: [
        "Developed an ML-assisted visualization and simulation platform (Python, JavaScript) for over 50 research projects, reducing analysis cycles by ~45% and enabling faster insight generation.",
      ],
    },
  ],
  education: [
    {
      degree: "Master of Computer Science (Data Science and AI)",
      school: "Arizona State University, Tempe, AZ",
      dateRange: "Aug 2018 – May 2020",
      achievements: [
        "Coursework: Statistical Machine Learning, Artificial Intelligence, Multi-Robot Systems, Semantic Web Mining, and Cloud Computing.",
      ],
    },
    {
      degree: "Bachelor of Technology, Computer Engineering",
      school: "Mumbai University, India",
      dateRange: "Aug 2014 – May 2018",
      achievements: [
        "Coursework: Machine Learning, Neural Networks, Fuzzy Logic, AI, Data Mining, and Computer Simulation Modeling.",
      ],
    },
  ],
};
