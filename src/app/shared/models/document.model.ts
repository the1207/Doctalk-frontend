// Document (ce qu'on reçoit du backend)
export interface Document {
  id: number;
  title: string;
  filename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  content: string;
  status: string;  // PENDING, PARSING, PARSED, VECTORIZED, ERROR
  createdAt: string;
  updatedAt: string;
  tagNames?: string[];    // Optionnel, vient du mapper
  folderNames?: string[]; // Optionnel, vient du mapper
}

// Ce qu'on envoie pour créer un document (upload)
export interface DocumentRequest {
  title: string;
  filename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  content: string;
  status: string;
}
