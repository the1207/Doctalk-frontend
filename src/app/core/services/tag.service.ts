import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Tag, TagRequest } from '../../shared/models/tag.model';

@Injectable({
  providedIn: 'root'
})
export class TagService extends ApiService {

  // Récupérer tous les tags
  getTags(): Observable<Tag[]> {
    return this.http.get<Tag[]>(`${this.baseUrl}/tags`);
  }

  // Récupérer un tag par son ID
  getTagById(id: number): Observable<Tag> {
    return this.http.get<Tag>(`${this.baseUrl}/tags/${id}`);
  }

  // Créer un tag
  createTag(data: TagRequest): Observable<Tag> {
    return this.http.post<Tag>(`${this.baseUrl}/tags`, data);
  }

  // Modifier un tag
  updateTag(id: number, data: TagRequest): Observable<Tag> {
    return this.http.put<Tag>(`${this.baseUrl}/tags/${id}`, data);
  }

  // Supprimer un tag
  deleteTag(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/tags/${id}`);
  }

  // Associer un tag à un document
  addTagToDocument(documentId: number, tagId: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/documents/${documentId}/tags/${tagId}`, {});
  }

  // Dissocier un tag d'un document
  removeTagFromDocument(documentId: number, tagId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/documents/${documentId}/tags/${tagId}`);
  }
}
