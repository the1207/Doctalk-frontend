// Structure d'un message
export interface Message {
  id: number;
  conversationId: number;
  role: 'USER' | 'ASSISTANT';
  content: string;
  sources?: Source[];
  createdAt: string;
  inferenceSource?: 'on_device' | 'in_cloud' | 'local_engine';
  latencyMs?: number;
}

// Structure d'une source (chunk utilisé par l'IA)
export interface Source {
  chunkId: number;
  content: string;
  documentTitle: string;
  similarity: number;
}

// Structure d'une conversation
export interface Conversation {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

// Ce qu'on envoie pour poser une question
export interface ChatRequest {
  question: string;
  conversationId?: number | null;  // null = nouvelle conversation
  documentId?: number | null;      // null = rechercher dans tous les documents
  inferenceMode?: 'prefer_on_device' | 'only_on_device' | 'only_in_cloud';
}

// Ce qu'on reçoit
export interface ChatResponse {
  conversationId: number;
  answer: string;
  sources: Source[];
  timestamp: string;
  inferenceSource?: 'on_device' | 'in_cloud' | 'local_engine';
  latencyMs?: number;
}

// Pour la liste des conversations
export interface ConversationSummary {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}
