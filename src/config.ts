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
        "TypeScript / JavaScript",
        "Java",
        "C#",
        "Go",
        "Rust (learning)",
        "SQL",
        "Bash",
        "CUDA / Triton kernels (basics)",
      ],
    },
    {
      title: "Foundation Models & Generative AI",
      items: [
        "Frontier LLMs — Claude (Opus, Sonnet, Haiku), GPT-4/4o/5, Gemini, Llama 3, Mistral, Mixtral, DeepSeek, Qwen",
        "Open-weight multimodal — Llava, Idefics, Florence-2, SAM, Whisper",
        "Image / video / audio gen — Stable Diffusion / SDXL, ControlNet, Flux, Suno, ElevenLabs, Sora-class",
        "Code models — Claude Code, GPT-4-code, CodeLlama, StarCoder",
        "Prompt engineering — structured outputs, JSON mode, function/tool calling, constrained decoding (Outlines, Guidance)",
        "Context engineering — long-context, prompt caching, prefix sharing, cost-vs-latency tradeoffs",
        "Distillation + small-model strategy (TinyLlama, Phi, distilled fine-tunes for edge / on-device)",
      ],
    },
    {
      title: "LLM Agents & RAG",
      items: [
        "Agent frameworks — LangGraph, LangChain, CrewAI, AutoGen, Anthropic MCP, OpenAI Assistants, Google Agent Builder / Vertex AI Agents, Smol Agents",
        "Tool use + ReAct + plan-and-execute + tree-of-thought + reflection patterns",
        "Multi-agent orchestration — supervisor + worker, debate, swarm, hierarchical",
        "Retrieval-augmented generation — hybrid (BM25 + dense), rerankers (Cohere, bge-reranker), query rewriting, HyDE",
        "Vector databases — pgvector, Pinecone, Weaviate, Qdrant, Milvus, FAISS, Chroma, LanceDB",
        "Embeddings — OpenAI, Cohere, Voyage, BGE, Nomic, Jina",
        "Memory systems — episodic / semantic / scratchpad, vector + graph hybrids",
        "Knowledge graphs — Neo4j, GraphRAG, entity + relation extraction",
        "Function calling, structured I/O, schema-guided generation",
        "Browser / OS agents (Anthropic Computer Use, Operator)",
      ],
    },
    {
      title: "Machine Learning & Deep Learning",
      items: [
        "Core ML — supervised, unsupervised, semi-supervised, self-supervised, contrastive learning",
        "Deep learning architectures — Transformers, CNNs, RNN/LSTM/GRU, GNNs, Diffusion, VAEs, GANs, Mixture-of-Experts",
        "PyTorch, TensorFlow, JAX, Hugging Face Transformers + TRL + PEFT + Accelerate",
        "Supervised fine-tuning (SFT), instruction tuning",
        "Parameter-efficient — LoRA, QLoRA, DoRA, prefix tuning, adapters",
        "Preference / RL — RLHF, DPO, IPO, KTO, RLAIF, PPO",
        "Distributed training — DeepSpeed, FSDP, ZeRO, Megatron-LM, tensor + pipeline parallel",
        "Quantization — GPTQ, AWQ, GGUF, bitsandbytes, FP8 / INT8 / INT4",
        "Classical ML — scikit-learn, XGBoost, LightGBM, CatBoost",
        "Deep learning — CNNs, Transformers, GNNs, diffusion, VAEs, recommenders (Two-Tower, DLRM)",
        "Reinforcement learning — PPO, A2C/A3C, SAC, DQN, multi-agent RL, MARL for game AI",
        "Time-series — Prophet, NeuralProphet, TimesFM, classical ARIMA",
      ],
    },
    {
      title: "MLOps & ML Platform",
      items: [
        "Experiment tracking + model registry — MLflow, Weights & Biases, Comet, Neptune",
        "Training orchestration — Ray + Ray Train, Kubeflow, Airflow, Prefect, Dagster, SageMaker Pipelines, dstack",
        "Workflow automation — n8n, Zapier (low-code), Temporal (durable workflows)",
        "Feature stores — Feast, Tecton, SageMaker Feature Store",
        "Inference serving — vLLM, TGI, Triton, BentoML, TorchServe, Ray Serve, SageMaker, Bedrock",
        "AI observability + tracing — LangSmith, Langfuse, OpenTelemetry, Arize, Helicone, WhyLabs",
        "LLM evals — Promptfoo, OpenAI Evals, Inspect, HELM, lm-eval-harness, LLM-as-judge",
        "Online experimentation — A/B, multi-armed bandits, interleaving, CUPED, regression-discontinuity",
        "Model + data versioning — DVC, LakeFS, Hugging Face Hub",
        "Drift, fairness, calibration monitoring; canary + shadow + rollback strategies",
        "GPU + accelerator economics — autoscaling, spot, multi-instance GPU, request batching",
      ],
    },
    {
      title: "Data Engineering",
      items: [
        "Streaming — Kafka, Kinesis, Pulsar, Flink",
        "Batch — Spark, Databricks, Beam",
        "DataFrames — Pandas, Polars, DuckDB, Dask",
        "Warehouses + lakes — Snowflake, BigQuery, Redshift, Iceberg, Delta Lake, Parquet",
        "Transformation — dbt, SQLMesh",
        "Synthetic data + augmentation, deduplication, dataset curation",
        "ETL/ELT, CDC (Debezium), schema evolution",
      ],
    },
    {
      title: "Cloud & Infrastructure",
      items: [
        "AWS — SageMaker, Bedrock, Inferentia/Trainium, ECS, EKS, Lambda, S3, DynamoDB, Step Functions, Kinesis, MSK, OpenSearch",
        "Azure — Azure ML, OpenAI Service, AKS, Functions",
        "GCP — Vertex AI, GKE, Cloud Run, BigQuery",
        "Kubernetes, Helm, Argo, KEDA",
        "Docker, Containerd",
        "IaC — Terraform, Pulumi, CDK",
        "Edge + reverse proxy — Caddy, Nginx, Envoy",
        "Cloudflare — Workers, Tunnel, Access, R2, KV, AI Gateway",
        "Observability — Prometheus, Grafana, Datadog, OpenTelemetry, ELK",
      ],
    },
    {
      title: "Backend & Frameworks",
      items: [
        "FastAPI, Flask, Django, Litestar",
        "Node.js, Express, Hono, Next.js (App Router), React, React Native + Expo, SvelteKit",
        "Spring Boot, ASP.NET Core",
        "gRPC, GraphQL, REST + OpenAPI",
        "Pydantic, Zod, Protobuf schemas",
        "WebSockets, Server-Sent Events, real-time streaming for LLM token streams",
      ],
    },
    {
      title: "Databases",
      items: [
        "PostgreSQL (+ pgvector, TimescaleDB, PostGIS)",
        "MySQL",
        "Redis, Valkey",
        "MongoDB, DynamoDB, Cassandra",
        "ClickHouse, DuckDB",
        "Elasticsearch, OpenSearch, Meilisearch",
        "Vector — Pinecone, Weaviate, Qdrant, Milvus, FAISS, Chroma",
      ],
    },
    {
      title: "Safety, Evals & Responsible AI",
      items: [
        "Red-teaming, jailbreak + prompt-injection defense",
        "Content safety filters, PII redaction, toxicity + bias detection",
        "Hallucination grounding + citation enforcement",
        "Differential privacy, federated learning (basics)",
        "Model + data cards, provenance, audit trails",
        "Eval pipelines — golden sets, LLM-as-judge calibration, human-in-the-loop review",
      ],
    },
    {
      title: "Tools & Practices",
      items: [
        "Git, GitHub Actions, GitLab CI, ArgoCD",
        "TDD, integration tests, eval-gated promotion, regression CI for ML",
        "Linters + formatters — ruff, mypy, eslint, prettier",
        "Profiling — py-spy, scalene, NVIDIA Nsight, PyTorch profiler",
        "Notebooks — Jupyter, Marimo, Colab",
        "Design — Figma; Diagramming — Mermaid, Excalidraw",
        "Agile, OKRs, system-design reviews, on-call + incident-response",
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
      title: "AI/ML Software Engineer 2",
      company: "Electronic Arts (EA)",
      dateRange: "Apr 2026 – Present",
      bullets: [
        "Building EA's central AI platform: shipping reusable machine-learning, deep-learning, and generative-AI services, agent frameworks, and a composable skills / tools layer that game studios and live-service teams (EA Sports FC, Madden, Apex Legends, The Sims, Battlefield, F1) plug into for personalization, content generation, NPC behavior, and player-experience features.",
        "Owning ML lifecycle infrastructure end-to-end — Python (PyTorch + Hugging Face) training stacks, distributed fine-tuning (LoRA/QLoRA/SFT/DPO), feature pipelines, experiment tracking (MLflow / W&B), model registry, low-latency inference serving (vLLM / TGI / Triton / SageMaker), drift + cost + quality observability — with hard SLOs on latency, reliability, and per-request economics.",
        "Designing agentic systems on top of LLMs (GPT-class, Claude, Llama, Mistral, in-house fine-tunes): retrieval-augmented generation over EA knowledge corpora, structured tool use, multi-agent orchestration (LangGraph / MCP), eval harnesses (LLM-as-judge + golden-set regressions), and guardrails (prompt-injection defense, PII handling, content safety) so AI features ship measurably and safely at game-scale traffic.",
        "Architecting platform services on AWS (SageMaker, Bedrock, ECS/EKS, Lambda, S3, DynamoDB, Step Functions) + IaC (Terraform) — multi-tenant inference gateways, prompt + model routing, caching, rate limits, audit logging — that other EA teams consume via golden-path SDKs and APIs.",
        "Driving AI adoption across EA: partner with studios — including EA Sports FC — on use-case discovery (player matchmaking, recommendations, generative content, anti-cheat, live-ops personalization, NPC behavior, in-game support, dynamic difficulty), publish reference patterns + internal docs, run enablement and design reviews, and measure adoption + impact (active integrations, eval-gated launches, incident rate, dollar value of compute saved).",
        "Stack: Python, PyTorch / TensorFlow (deep learning + classic ML), Hugging Face, LangChain, LangGraph, MCP, Google Agent Builder / Vertex AI, n8n + Airflow + dstack for orchestration, FastAPI, Ray, Kubernetes, Docker, Terraform, AWS (SageMaker / Bedrock), Postgres + pgvector, Redis, Kafka."
      ],
    },
    {
      title: "Independent AI/ML Engineer & Builder",
      company: "Self-Directed AI Products",
      dateRange: "Oct 2025 – Mar 2026",
      bullets: [
        "Shipped three production-grade AI products end-to-end — edumind-ai (adaptive learning + analytics), neuralverse-ai (multi-agent platform + knowledge graphs), medmind-ai (clinical-decision support) — from problem framing and UX through deployment, observability, and real-user feedback.",
        "Architected and operated a self-hosted, multi-service AI platform powering all of the above — Postgres + pgvector, FastAPI + Next.js services, Docker / Caddy / Cloudflare edge, on-VPS CI/CD, alerting, backups — owning the full MLOps and platform-engineering stack hands-on.",
        "Built agentic systems on top of Claude / GPT / Llama using LangGraph + MCP — a 15-session orchestrator fleet with deterministic guardrails, retrieval-grounded reasoning, eval harnesses, prompt-injection defenses, and structured tool use.",
        "Deepened frontier AI/ML skills by building, not consuming — LLM agents, RAG with hybrid retrieval + rerankers, fine-tuning (LoRA / DPO), prompt + structured-output design, LLM-as-judge evaluation, AI observability (LangSmith / OpenTelemetry).",
        "Outcome: joined Electronic Arts as AI/ML Software Engineer 2 applying this work directly to game and live-service AI platforms.",
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
