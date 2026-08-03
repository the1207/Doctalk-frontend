import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Document, DocumentRequest } from '../../shared/models/document.model';

@Injectable({
  providedIn: 'root'
})
export class DocumentService extends ApiService {

  // Récupérer tous les documents
  getDocuments(): Observable<Document[]> {
    return this.http.get<Document[]>(`${this.baseUrl}/documents`);
  }

  // Récupérer un document par son ID
  getDocumentById(id: number): Observable<Document> {
    return this.http.get<Document>(`${this.baseUrl}/documents/${id}`);
  }

  // Uploader un document
  uploadDocument(file: File, title: string): Observable<Document> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('status', 'PENDING');

    return this.http.post<Document>(`${this.baseUrl}/documents/upload`, formData);
  }

  // Mettre à jour un document
  updateDocument(id: number, data: Partial<DocumentRequest>): Observable<Document> {
    return this.http.put<Document>(`${this.baseUrl}/documents/${id}`, data);
  }

  // Supprimer un document
  deleteDocument(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/documents/${id}`);
  }

  // Recherche textuelle (mot-clé)
  searchDocuments(keyword: string): Observable<Document[]> {
    return this.http.get<Document[]>(`${this.baseUrl}/documents/search?q=${keyword}`);
  }

  // Recherche sémantique (IA)
  searchSemantic(query: string): Observable<Document[]> {
    return this.http.get<Document[]>(`${this.baseUrl}/documents/search/semantic?q=${query}`);
  }
}
