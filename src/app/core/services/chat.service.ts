import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ChatRequest, ChatResponse, Conversation, ConversationSummary } from '../../shared/models/chat.model';

@Injectable({
  providedIn: 'root'
})
export class ChatService extends ApiService {

  // Poser une question (créer ou continuer une conversation)
  askQuestion(request: ChatRequest): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.baseUrl}/chat`, request);
  }

  // Récupérer toutes les conversations de l'utilisateur
  getConversations(): Observable<ConversationSummary[]> {
    return this.http.get<ConversationSummary[]>(`${this.baseUrl}/chat/conversations`);
  }

  // Récupérer une conversation avec tous ses messages
  getConversationById(id: number): Observable<Conversation> {
    return this.http.get<Conversation>(`${this.baseUrl}/chat/conversations/${id}`);
  }

  // Supprimer une conversation
  deleteConversation(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/chat/conversations/${id}`);
  }

  // Renommer une conversation
  renameConversation(id: number, title: string): Observable<Conversation> {
    return this.http.put<Conversation>(`${this.baseUrl}/chat/conversations/${id}`, { title });
  }
}
