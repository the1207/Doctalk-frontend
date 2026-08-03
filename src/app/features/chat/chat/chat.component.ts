import { Component, OnInit, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ChatService } from '../../../core/services/chat.service';
import { Message, Conversation, ConversationSummary, ChatRequest, Source } from '../../../shared/models/chat.model';
import { ReplaceNewlinePipe } from '../../../shared/pipes/replace-newline.pipe';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ReplaceNewlinePipe],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, AfterViewChecked {
  @ViewChild('messageContainer') messageContainer!: ElementRef;

  conversations: ConversationSummary[] = [];
  currentConversation: Conversation | null = null;
  messages: Message[] = [];
  question: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';
  isNewConversation: boolean = true;

  // Gestion des sources
  expandedSources: number | null = null;

  constructor(private chatService: ChatService) { }

  ngOnInit(): void {
    this.loadConversations();
    // Démarrer une nouvelle conversation par défaut
    this.startNewConversation();
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  // ============================================
  // GESTION DES CONVERSATIONS
  // ============================================

  loadConversations(): void {
    this.chatService.getConversations().subscribe({
      next: (data) => {
        this.conversations = data;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des conversations:', error);
      }
    });
  }

  startNewConversation(): void {
    this.currentConversation = null;
    this.messages = [];
    this.isNewConversation = true;
    this.question = '';
  }

  loadConversation(id: number): void {
    this.isLoading = true;
    this.chatService.getConversationById(id).subscribe({
      next: (conversation) => {
        this.currentConversation = conversation;
        this.messages = conversation.messages || [];
        this.isNewConversation = false;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Erreur lors du chargement de la conversation.';
        this.isLoading = false;
        console.error(error);
      }
    });
  }

  deleteConversation(id: number, event: Event): void {
    event.stopPropagation();
    if (confirm('Voulez-vous vraiment supprimer cette conversation ?')) {
      this.chatService.deleteConversation(id).subscribe({
        next: () => {
          this.loadConversations();
          if (this.currentConversation?.id === id) {
            this.startNewConversation();
          }
        },
        error: (error) => {
          console.error('Erreur lors de la suppression:', error);
        }
      });
    }
  }

  // ============================================
  // ENVOI DE MESSAGES
  // ============================================

  sendMessage(): void {
    if (!this.question.trim() || this.isLoading) return;

    const userMessage: Message = {
      id: Date.now(),
      conversationId: this.currentConversation?.id || 0,
      role: 'USER',
      content: this.question,
      createdAt: new Date().toISOString()
    };

    this.messages.push(userMessage);
    this.isLoading = true;
    this.errorMessage = '';

    const request: ChatRequest = {
      question: this.question,
      conversationId: this.currentConversation?.id || null
    };

    this.chatService.askQuestion(request).subscribe({
      next: (response) => {
        const assistantMessage: Message = {
          id: Date.now() + 1,
          conversationId: response.conversationId,
          role: 'ASSISTANT',
          content: response.answer,
          sources: response.sources,
          createdAt: response.timestamp
        };

        this.messages.push(assistantMessage);

        // Mettre à jour la conversation courante
        if (this.isNewConversation) {
          this.isNewConversation = false;
          this.loadConversations();
        }

        // Mettre à jour l'ID de la conversation si c'était une nouvelle
        if (this.currentConversation?.id !== response.conversationId) {
          this.loadConversation(response.conversationId);
        }

        this.isLoading = false;
        this.question = '';
      },
      error: (error) => {
        this.errorMessage = 'Erreur lors de l\'envoi de la question.';
        this.isLoading = false;
        console.error(error);
      }
    });
  }

  // ============================================
  // SOURCES
  // ============================================

  toggleSources(messageId: number): void {
    this.expandedSources = this.expandedSources === messageId ? null : messageId;
  }

  isSourcesExpanded(messageId: number): boolean {
    return this.expandedSources === messageId;
  }

  getSourcePreview(content: string): string {
    if (content.length > 150) {
      return content.substring(0, 150) + '...';
    }
    return content;
  }

  // ============================================
  // UTILITAIRES
  // ============================================

  scrollToBottom(): void {
    if (this.messageContainer) {
      this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
    }
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getConversationTitle(): string {
    if (this.currentConversation) {
      return this.currentConversation.title || 'Sans titre';
    }
    return 'Nouvelle conversation';
  }
}
