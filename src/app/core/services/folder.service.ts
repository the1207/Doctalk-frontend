import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Folder, FolderRequest } from '../../shared/models/folder.model';

@Injectable({
  providedIn: 'root'
})
export class FolderService extends ApiService {

  // Récupérer tous les dossiers
  getFolders(): Observable<Folder[]> {
    return this.http.get<Folder[]>(`${this.baseUrl}/folders`);
  }

  // Récupérer un dossier par son ID
  getFolderById(id: number): Observable<Folder> {
    return this.http.get<Folder>(`${this.baseUrl}/folders/${id}`);
  }

  // Créer un dossier
  createFolder(data: FolderRequest): Observable<Folder> {
    return this.http.post<Folder>(`${this.baseUrl}/folders`, data);
  }

  // Modifier un dossier
  updateFolder(id: number, data: FolderRequest): Observable<Folder> {
    return this.http.put<Folder>(`${this.baseUrl}/folders/${id}`, data);
  }

  // Supprimer un dossier
  deleteFolder(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/folders/${id}`);
  }

  // Associer un dossier à un document
  addFolderToDocument(documentId: number, folderId: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/documents/${documentId}/folders/${folderId}`, {});
  }

  // Dissocier un dossier d'un document
  removeFolderFromDocument(documentId: number, folderId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/documents/${documentId}/folders/${folderId}`);
  }
}
