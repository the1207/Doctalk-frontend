export interface Folder {
  id: number;
  name: string;
  parentId: number | null;  // null = dossier racine
  createdAt: string;
  updatedAt: string;
}

export interface FolderRequest {
  name: string;
  parentId: number | null;
}
