# Welcome to 03 Ai Integration
***

## Task
An enterprise-scale, production-ready educational AI system built on top of **Next.js 14+ App Router**, **TypeScript**, and **Zod**. This system enhances a type-safe classroom chat application by integrating advanced LLM capabilities like streaming responses, structural prompt engineering, automated AI moderation, and real-time tutoring.

To support cost-effective testing, this architecture is fully configured to work with completely **FREE AI Providers** like **Groq API (Llama 3)** and **Local Ollama instances** without breaking type-safe streaming structures.

---

## Tech Stack & Architecture

- **Framework:** Next.js 14+ (App Router, Server Components, and Edge-ready Server Actions)
- **Language & Safety:** TypeScript (Strict Mode) & Zod (Run-time Schema Validation)
- **AI Orchestration:** Vercel AI SDK (`@ai-sdk/provider`, `@ai-sdk/provider-utils`)
- **UI & Styling:** Tailwind CSS & Lucide Icons
- **Streaming Protocol:** Server-Sent Events (SSE) via native Web Streams

---

## Quick Start Guide

### 1. Clone and Install Dependencies
First, extract the project folder and navigate to the directory:
```bash
cd ai-integration-project
npm install


2. Configure Environment Variables
Create a .env.local file in the root directory by copying the example setup:
```
```bash

cp .env.example .env.local
```
```
Open .env.local and configure your chosen FREE provider:

Option A: Using Groq API (Recommended & Fastest)
Go to console.groq.com and create a free account.

Generate a free API key under the API Keys section.

Update your .env.local:
GROQ_API_KEY=gsk_your_free_groq_api_key_here
LLM_PRIMARY_PROVIDER=groq
Option B: Using Local Ollama (100% Offline & Free)
Download and install Ollama from ollama.com.

Run your local model in the terminal:
```
```bash
ollama run llama3:8b
```
Update your .env.local:
LLM_PRIMARY_PROVIDER=ollama
OLLAMA_HOST=http://localhost:11434

3. Run the Development Server
```bash
npm run dev
```
Open http://localhost:3001 in your browser to see the live classroom simulator!

### Core Milestones Implemented
Step 1: Type-Safe Provider Abstraction & SecurityAll sensitive API keys are restricted to the Server-Side Boundary preventing client-side leaks.Abstracted registry system allows hot-swapping between providers instantly via .env.local.Strict runtime schema enforcement using Zod to guarantee structural data mapping.
Step 2: Educational Prompt Engineering & ContextCustom Duolingo-style systemic prompt templates injected seamlessly into user prompts.Contextual Grammar Correction Assistant that provides native syntactic explanations instead of plain correct answers.Adaptive educational scaffolding aligned with CEFR difficulty levels ($A1$ to $C2$).
Step 3: Stream Orchestration Engine (SSE)High-efficiency Server-Sent Events (SSE) engine feeding partial content updates sequentially.UX safety mechanics integrated with AbortController to let users stop active stream responses instantly.Smooth typing indicators built using React Suspense structures preventing layout shifts.
Step 4: AI UX Guardrails & Content SafetyStrict content filtration system via src/lib/contentSafety.ts executing validation hooks on input text.Robust UI resilience backed by custom ErrorBoundary wrappers to gracefully handle network drops, rate limits ($429$), or invalid credentials.
# Project Blueprint
ai-integration-project/
├── src/
│   ├── app/
│   │   ├── api/chat/        # AI Streaming Route Handlers
│   │   └── page.tsx         # Classroom Chat View
│   ├── components/
│   │   ├── forms/
│   │   │   └── MessageForm.tsx  # Dynamic form with Abort & stream consumption
│   │   └── ui/
│   │       └── ErrorBoundary.tsx # UI Fault-tolerance layer
│   ├── lib/
│   │   ├── api.ts           # Unified API wrapper
│   │   ├── errors.ts        # Custom AI integration error models
│   │   └── contentSafety.ts # AI Moderation filter
│   ├── schemas/
│   │   └── message.schema.ts # Strict input validation schemas (Zod)
│   └── types/
│       └── chat.ts          # TypeScript domain type maps
├── DUOLINGO-INSIGHTS.md     # Architecture documentation & reflections
└── README.md                # System engineering guide~

Production Resiliency & Failover StrategyGraceful Fallbacks: If the primary LLM provider drops or throws an exception, the application safely triggers an internal error boundary context keeping the main chat instance alive without freezing or crashing the browser.Rate Limit Defenses: Built-in catch blocks inside src/lib/errors.ts gracefully catch quota or limit errors and inform the student with friendly warning cards rather than structural console traces.