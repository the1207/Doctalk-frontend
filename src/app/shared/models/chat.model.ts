// Structure d'un message
export interface Message {
  id: number;
  conversationId: number;
  role: 'USER' | 'ASSISTANT';
  content: string;
  sources?: Source[];
  createdAt: string;
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
}

// Ce qu'on reçoit du backend
export interface ChatResponse {
  conversationId: number;
  answer: string;
  sources: Source[];
  timestamp: string;
}

// Pour la liste des conversations
export interface ConversationSummary {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}
