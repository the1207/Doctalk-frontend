# DocTalk — Hybrid AI Study Assistant

> **#BuildHybridAI Hackathon 2026** — Built with Firebase AI Logic Hybrid Inference SDK

DocTalk is a school-focused AI application that lets students **chat with their documents** and **study through quizzes, flashcards, and summaries** — all powered by Firebase AI Logic hybrid inference (on-device + cloud).

---

## What DocTalk Does

- **Chat with any document** — Upload a PDF or Word file, ask questions, get answers grounded in the document content via RAG (Retrieval-Augmented Generation)
- **Quiz mode** — Generate multiple-choice questions from a document, answer them, get scored
- **Flashcards** — Generate question/answer cards from a document, flip through them, mark mastered
- **Study summaries** — Generate key points, definitions, exam tips from a document
- **Hybrid inference** — Firebase AI Logic runs prompts on-device (Gemini Nano in Chrome) when available, falls back to cloud (Gemini Flash) automatically

---

## Firebase AI Logic Integration

Firebase AI Logic is used directly in [`src/app/core/services/firebase-ai.service.ts`](src/app/core/services/firebase-ai.service.ts):

```typescript
import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode } from 'firebase/ai';

// Hybrid inference — on-device first, cloud fallback
const ai = getAI(app, { backend: new GoogleAIBackend() });
const model = getGenerativeModel(ai, {
  model: 'gemini-2.0-flash',
  inferenceMode: InferenceMode.PREFER_ON_DEVICE
});
```

**Firebase products used:**
- **Firebase AI Logic** — Hybrid inference (Gemini Nano on-device + Gemini Flash cloud)
- **App Check** — All AI Logic requests are protected via App Check
- **Firestore** — Quiz results and study summaries are saved and synced
- **Remote Config** — Inference mode can be toggled remotely without a new deploy
- **Firebase Auth** — Anonymous auth for Firestore access

---

## Platform

**Web (Chrome)** — Built as an Angular web application.

On Chrome with Gemini Nano available (`chrome://flags/#prompt-api-for-gemini-nano`), inference runs on-device. On other browsers or when the model is unavailable, Firebase AI Logic automatically falls back to Gemini Flash in the cloud.

---

## Architecture

```
┌─────────────────────────────────────────┐
│           Angular Frontend              │
│  ┌─────────────┐   ┌─────────────────┐  │
│  │  Chat       │   │  Student Hub    │  │
│  │  (RAG +     │   │  (Quiz,         │  │
│  │  Firebase   │   │  Flashcards,    │  │
│  │  AI Logic)  │   │  Summaries)     │  │
│  └──────┬──────┘   └────────┬────────┘  │
│         │                   │           │
│  ┌──────▼───────────────────▼────────┐  │
│  │       FirebaseAiService           │  │
│  │  Firebase AI Logic Hybrid SDK     │  │
│  │  (on-device → cloud fallback)     │  │
│  └───────────────────────────────────┘  │
└─────────────────┬───────────────────────┘
                  │ HTTP (for real docs)
┌─────────────────▼───────────────────────┐
│         Spring Boot Backend             │
│  RAG pipeline: pgvector + Gemini        │
│  Embeddings for document chunking       │
└─────────────────────────────────────────┘
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- Angular CLI 19+
- Chrome browser (for best on-device inference experience)

### Install & Run

```bash
# Clone
git clone https://github.com/the1207/Doctalk-frontend
cd Doctalk-frontend

# Install dependencies
npm install

# Start development server
ng serve
```

Open `http://localhost:4200`

> The backend is optional for demo mode — the app includes built-in sample courses that work fully on-device with Firebase AI Logic.

### For full RAG features (real document upload)

Start the [DocTalk Backend](https://github.com/the1207/Doctalk-backend) and set your API URL in `src/environments/environment.ts`.

---

## Demo — No Backend Required

The app includes built-in sample courses covering:
- Firebase AI Logic & Hybrid Inference
- Machine Learning fundamentals
- Web development basics

Select any sample course and use Quiz, Flashcards, or Chat — all running through Firebase AI Logic.

---

## License

Apache 2.0 — see [LICENSE](LICENSE)
