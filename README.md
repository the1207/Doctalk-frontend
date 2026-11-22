# DocTalk — Hybrid AI Study Assistant

> **#BuildHybridAI Hackathon 2026** — Built with Firebase AI Logic Hybrid Inference SDK

**Live demo : https://doctalk-6863b.web.app**

DocTalk is a school-focused AI application that transforms any document into an interactive study experience. Upload a PDF or Word file, then chat with it, generate quizzes, create flashcards, and get study summaries — all powered by Firebase AI Logic hybrid inference (on-device + cloud).

---

## The Problem DocTalk Solves

Students spend hours reading documents passively. DocTalk makes studying active :

- Instead of re-reading a 50-page PDF, **ask it questions** and get precise answers with source references
- Instead of making flashcards by hand, **generate them in seconds** from any document
- Instead of guessing what might be on the exam, **get a quiz** built from the actual content
- Instead of highlighting randomly, **get a structured summary** with key points, definitions, and exam tips

---

## Features

### 💬 Chat with your documents
Ask any question about an uploaded document. DocTalk uses RAG (Retrieval-Augmented Generation) to find the most relevant passages and answer precisely from them. The answer always comes with source references so you know exactly where it came from.

### 📝 Quiz & QCM
Generate multiple-choice questions from any document. Choose the number of questions and difficulty level. Answer them one by one, get scored in real time, and save your results to Firestore.

### 🃏 Flashcards
Generate question/answer flashcards from any document. Flip through them, mark cards as mastered, and track your progress. Great for memorization before an exam.

### 📋 Study Summaries
Generate three types of summaries from any document :
- **Essential points** — the key concepts to remember
- **Cheat sheet** — a compact reference for the exam
- **Glossary** — all key definitions in one place

### ⚡ Hybrid AI Inference
DocTalk uses Firebase AI Logic to run inference in hybrid mode :
- When Gemini Nano is available on-device (Chrome with the flag enabled), inference runs locally — fast, private, free
- When it's not available, Firebase AI Logic automatically falls back to Gemini Flash in the cloud
- The user always gets an answer, regardless of device capabilities

### 📂 Document Management
Upload PDF and DOCX files. Organize them with tags and folders. Each document is processed, chunked, and vectorized so the AI can search it semantically.

---

## Firebase AI Logic Integration

Firebase AI Logic is called directly in [`src/app/core/services/firebase-ai.service.ts`](src/app/core/services/firebase-ai.service.ts) :

```typescript
import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode } from 'firebase/ai';

// Hybrid inference — on-device first, cloud fallback
const ai = getAI(app, { backend: new GoogleAIBackend() });
const model = getGenerativeModel(ai, {
  model: 'gemini-2.0-flash',
  inferenceMode: InferenceMode.PREFER_ON_DEVICE
});

const result = await model.generateContent(prompt);
```

**Firebase products used :**
- **Firebase AI Logic** — Hybrid inference (Gemini Nano on-device + Gemini Flash cloud)
- **App Check** — All AI Logic requests are protected
- **Firestore** — Quiz results and study summaries saved and synced
- **Remote Config** — Inference mode can be toggled remotely
- **Firebase Auth** — Anonymous auth for Firestore access
- **Firebase Hosting** — Frontend deployed at https://doctalk-6863b.web.app

---

## Platform

**Web (Chrome)** — Built as an Angular 19 web application.

On Chrome with Gemini Nano available, inference runs on-device. On other browsers, Firebase AI Logic automatically uses Gemini Flash in the cloud.

---

## Architecture

```
┌─────────────────────────────────────────────┐
│              Angular Frontend               │
│                                             │
│  ┌──────────────┐   ┌─────────────────────┐ │
│  │  Chat        │   │   Student Hub       │ │
│  │              │   │                     │ │
│  │  • Ask docs  │   │  • Quiz / QCM       │ │
│  │  • Sources   │   │  • Flashcards       │ │
│  │  • History   │   │  • Summaries        │ │
│  └──────┬───────┘   └──────────┬──────────┘ │
│         │                      │            │
│  ┌──────▼──────────────────────▼──────────┐ │
│  │         FirebaseAiService              │ │
│  │   Firebase AI Logic Hybrid SDK         │ │
│  │   on-device (Gemini Nano) →            │ │
│  │   cloud fallback (Gemini Flash)        │ │
│  └────────────────────────────────────────┘ │
└──────────────────┬──────────────────────────┘
                   │ HTTP (real documents)
┌──────────────────▼──────────────────────────┐
│           Spring Boot Backend               │
│                                             │
│  • PDF / DOCX parsing                       │
│  • Text chunking                            │
│  • Gemini Embeddings (text-embedding-004)   │
│  • pgvector semantic search                 │
│  • RAG endpoint                             │
│  • JWT authentication                       │
└─────────────────────────────────────────────┘
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- Angular CLI 19+
- Chrome (for best on-device experience)

### Install & Run

```bash
git clone https://github.com/the1207/Doctalk-frontend
cd Doctalk-frontend
npm install
ng serve
```

Open `http://localhost:4200`

> The backend is optional — the app includes built-in sample courses that work fully with Firebase AI Logic without any backend.

### Deploy to Firebase Hosting

```bash
npm run build
npx firebase deploy --only hosting
```

---

## Demo — No Backend Required

The app includes built-in sample courses :
- Firebase AI Logic & Hybrid Inference
- Machine Learning fundamentals
- Web development basics

Select any sample course in the Student Hub or Chat and use all features immediately — no account, no backend needed.

---

## Backend

The backend handles real document uploads and RAG. See [DocTalk Backend](https://github.com/the1207/Doctalk-backend) for setup instructions.

---

## License

Apache 2.0 — see [LICENSE](LICENSE)
