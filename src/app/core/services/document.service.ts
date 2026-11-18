import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Document, DocumentRequest } from '../../shared/models/document.model';

@Injectable({
  providedIn: 'root'
})
export class DocumentService extends ApiService {

  getDocuments(): Observable<Document[]> {
    return this.http.get<Document[]>(`${this.baseUrl}/documents`);
  }

  getDocumentById(id: number): Observable<Document> {
    return this.http.get<Document>(`${this.baseUrl}/documents/${id}`);
  }

  uploadDocument(file: File, title: string): Observable<Document> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('status', 'PENDING');

    return this.http.post<Document>(`${this.baseUrl}/documents/upload`, formData);
  }

  updateDocument(id: number, data: Partial<DocumentRequest>): Observable<Document> {
    return this.http.put<Document>(`${this.baseUrl}/documents/${id}`, data);
  }

  deleteDocument(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/documents/${id}`);
  }

  // Recherche textuelle (mot-clé) — paramètres correctement encodés
  searchDocuments(keyword: string): Observable<Document[]> {
    const params = new HttpParams().set('q', keyword);
    return this.http.get<Document[]>(`${this.baseUrl}/documents/search`, { params });
  }

  // Recherche sémantique (IA) — paramètres correctement encodés
  searchSemantic(query: string): Observable<Document[]> {
    const params = new HttpParams().set('q', query);
    return this.http.get<Document[]>(`${this.baseUrl}/documents/search/semantic`, { params });
  }
}
