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

type SiteConfig = {
  name: string;
  title: string;
  description: string;
  location: string;
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
  name: "Viken Shaumitra Parikh",
  title: "Software Engineer | Backend, ML, and AI",
  description:
    "I build backend platforms and intelligent products with practical machine learning and applied AI.",
  location: "Vancouver, Canada",
  profileImage: "/images/myphoto.jpg",
  resumeUrl: "/resume/resume.pdf",
  accentColor: "#2563eb",
  social: {
    email: "vsparikh1996@gmail.com",
    linkedin: "https://linkedin.com/in/vikenparikh96/",
    github: "https://github.com/vikenparikh",
    twitter: "",
  },
  aboutMe:
    "I am a software engineer based in Vancouver, Canada, focused on backend systems, machine learning, and applied AI. I build practical, production-ready products that combine reliable engineering with intelligent capabilities.",
  workAreas: ["Backend", "Frontend", "AI", "DevOps", "Full Stack"],
  aiSpecialties: ["Computer Vision", "LLMs", "RAG", "NLP", "MLOps"],
  skills: [
    "Python",
    "Machine Learning",
    "Deep Learning",
    "Data Engineering",
    "Backend Development",
    "Cloud",
  ],
  projects: projectList,
  topProjects: projectList.slice(0, 6),
  otherProjects: projectList.slice(6),
  experience: [],
  education: [],
};
