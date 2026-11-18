export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  concept: string;
  userSelectedOptionIndex?: number;
  isAnswered?: boolean;
}

export interface QuizResult {
  id?: string;
  totalQuestions: number;
  correctCount: number;
  scorePercentage: number;
  difficulty: string;
  documentTitle: string;
  timestamp: string;
  inferenceSource: 'on_device' | 'in_cloud' | 'local_engine';
  latencyMs?: number;
}

export interface Flashcard {
  id: number;
  front: string;          // Question ou concept
  back: string;           // Réponse synthétique
  explanation: string;    // Explication approfondie & astuce
  category: string;
  mastered?: boolean;
}

export interface StudySummary {
  id?: string;
  title: string;
  documentTitle: string;
  keyPoints: string[];
  definitions: { term: string; definition: string }[];
  pitfalls: string[];     // Pièges et erreurs fréquentes
  examTips: string[];     // Conseils pour les devoirs / examens
  createdAt: string;
  inferenceSource: 'on_device' | 'in_cloud' | 'local_engine';
  latencyMs?: number;
}

export interface StudyExplanation {
  question: string;
  mainConcept: string;
  stepByStepExplanation: string[];
  concreteExample: string;
  keyTakeaway: string;
  inferenceSource: 'on_device' | 'in_cloud' | 'local_engine';
  latencyMs?: number;
}

export interface HybridAiDiagnostics {
  isChromePromptApiPresent: boolean;
  geminiNanoStatus: 'readily' | 'after-download' | 'no' | 'unsupported';
  activeMode: string;
  backendName: string;
  appCheckEnabled: boolean;
  remoteConfigActive: boolean;
  lastInferenceSource: 'on_device' | 'in_cloud' | 'local_engine' | null;
  lastLatencyMs: number | null;
}
