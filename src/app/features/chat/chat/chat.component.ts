import { Component, OnInit, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ChatService } from '../../../core/services/chat.service';
import { DocumentService } from '../../../core/services/document.service';
import { FirebaseAiService } from '../../../core/services/firebase-ai.service';
import { Message, Conversation, ConversationSummary, ChatRequest, Source } from '../../../shared/models/chat.model';
import { Document } from '../../../shared/models/document.model';
import { ReplaceNewlinePipe } from '../../../shared/pipes/replace-newline.pipe';
import { SAMPLE_COURSES, SampleCourse } from '../../../shared/data/sample-courses';

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
  documents: Document[] = [];
  sampleCourses: SampleCourse[] = SAMPLE_COURSES;
  selectedDocumentId: number | null = -1; // Par défaut cours démo
  currentConversation: Conversation | null = null;
  messages: Message[] = [];
  question: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';
  isNewConversation: boolean = true;

  // Inférence Hybride Firebase AI Logic
  inferenceMode: 'prefer_on_device' | 'only_on_device' | 'only_in_cloud' = 'prefer_on_device';
  lastInferenceSource: 'on_device' | 'in_cloud' | 'local_engine' | null = null;
  lastLatencyMs: number | null = null;

  // Gestion des sources
  expandedSources: number | null = null;

  // Modal d'upload rapide direct dans le chat
  showUploadModal: boolean = false;
  quickUploadFile: File | null = null;
  quickUploadTitle: string = '';
  isQuickUploading: boolean = false;
  quickUploadError: string = '';

  constructor(
    private chatService: ChatService,
    private documentService: DocumentService,
    private firebaseAi: FirebaseAiService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.loadConversations();
    this.loadDocuments();
    this.loadSelectedDocumentFromQuery();
    this.startNewConversation();
  }

  private loadSelectedDocumentFromQuery(): void {
    this.route.queryParamMap.subscribe(params => {
      const idParam = params.get('documentId');
      if (idParam) {
        const id = Number(idParam);
        if (!Number.isNaN(id)) {
          this.selectedDocumentId = id;
        }
      }
    });
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  // ============================================
  // GESTION DES DOCUMENTS ACTIFS DANS LE CHAT
  // ============================================

  getActiveDocumentName(): string {
    if (this.selectedDocumentId === null) {
      return 'Tous les documents disponibles (Multi-RAG)';
    }
    if (this.selectedDocumentId < 0) {
      const sample = this.sampleCourses.find(c => c.id === this.selectedDocumentId);
      return sample ? `${sample.title} (Démo)` : 'Cours de démonstration';
    }
    const doc = this.documents.find(d => d.id === this.selectedDocumentId);
    return doc ? doc.title : 'Document sélectionné';
  }

  toggleUploadModal(): void {
    this.showUploadModal = !this.showUploadModal;
    this.quickUploadError = '';
    if (!this.showUploadModal) {
      this.quickUploadFile = null;
      this.quickUploadTitle = '';
    }
  }

  onQuickFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.quickUploadFile = input.files[0];
      const nameWithoutExt = this.quickUploadFile.name.replace(/\.[^/.]+$/, "");
      this.quickUploadTitle = nameWithoutExt.charAt(0).toUpperCase() + nameWithoutExt.slice(1);
    }
  }

  submitQuickUpload(): void {
    if (!this.quickUploadFile) {
      this.quickUploadError = 'Veuillez sélectionner un fichier.';
      return;
    }
    if (!this.quickUploadTitle.trim()) {
      this.quickUploadError = 'Veuillez saisir un titre.';
      return;
    }

    this.isQuickUploading = true;
    this.quickUploadError = '';

    this.documentService.uploadDocument(this.quickUploadFile, this.quickUploadTitle).subscribe({
      next: (newDoc) => {
        this.isQuickUploading = false;
        this.documents.unshift(newDoc);
        this.selectedDocumentId = newDoc.id;
        this.showUploadModal = false;
        this.quickUploadFile = null;
        this.quickUploadTitle = '';
        // Envoyer une salutation ou commencer un nouveau chat
        this.startNewConversation();
      },
      error: (err) => {
        this.isQuickUploading = false;
        this.quickUploadError = 'Erreur lors du téléversement du document.';
        console.error(err);
      }
    });
  }

  // ============================================
  // GESTION DES CONVERSATIONS
  // ============================================

  loadConversations(): void {
    this.chatService.getConversations().subscribe({
      next: (data) => {
        this.conversations = data;
      },
      error: () => {
        this.loadLocalConversations();
      }
    });
  }

  loadLocalConversations(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const saved = JSON.parse(localStorage.getItem('doctalk_conversations') || '[]');
      this.conversations = saved.map((c: Conversation) => ({
        id: c.id,
        title: c.title,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        messageCount: c.messages?.length || 0
      }));
    } catch {}
  }

  saveLocalConversation(conv: Conversation): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const saved: Conversation[] = JSON.parse(localStorage.getItem('doctalk_conversations') || '[]');
      const idx = saved.findIndex(c => c.id === conv.id);
      if (idx >= 0) {
        saved[idx] = conv;
      } else {
        saved.unshift(conv);
      }
      localStorage.setItem('doctalk_conversations', JSON.stringify(saved.slice(0, 20)));
      this.loadLocalConversations();
    } catch {}
  }

  loadDocuments(): void {
    this.documentService.getDocuments().subscribe({
      next: (data) => {
        this.documents = data;
      },
      error: () => {
        console.log('[DocTalk Chat] Backend local hors ligne, utilisation du mode démo & Firebase.');
      }
    });
  }

  selectDocument(documentId: number | null): void {
    this.selectedDocumentId = documentId;
  }

  onInferenceModeChange(): void {
    this.firebaseAi.setInferenceMode(this.inferenceMode);
  }

  startNewConversation(): void {
    this.currentConversation = null;
    this.messages = [];
    this.isNewConversation = true;
    this.question = '';
    this.errorMessage = '';
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
      error: () => {
        if (typeof localStorage !== 'undefined') {
          const saved: Conversation[] = JSON.parse(localStorage.getItem('doctalk_conversations') || '[]');
          const found = saved.find(c => c.id === id);
          if (found) {
            this.currentConversation = found;
            this.messages = found.messages || [];
            this.isNewConversation = false;
          }
        }
        this.isLoading = false;
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
        error: () => {
          if (typeof localStorage !== 'undefined') {
            let saved: Conversation[] = JSON.parse(localStorage.getItem('doctalk_conversations') || '[]');
            saved = saved.filter(c => c.id !== id);
            localStorage.setItem('doctalk_conversations', JSON.stringify(saved));
            this.loadLocalConversations();
            if (this.currentConversation?.id === id) {
              this.startNewConversation();
            }
          }
        }
      });
    }
  }

  sendSuggestedPrompt(promptText: string): void {
    this.question = promptText;
    this.sendMessage();
  }

  // ============================================
  // ENVOI DE MESSAGES AVEC FIREBASE AI LOGIC HYBRIDE
  // ============================================

  async sendMessage(): Promise<void> {
    if (!this.question.trim() || this.isLoading) return;

    const userQuestion = this.question.trim();
    const convId = this.currentConversation?.id || Date.now();

    const userMessage: Message = {
      id: Date.now(),
      conversationId: convId,
      role: 'USER',
      content: userQuestion,
      createdAt: new Date().toISOString()
    };

    this.messages.push(userMessage);
    this.question = '';
    this.isLoading = true;
    this.errorMessage = '';

    const { contextText, sources } = this.resolveDocumentContext(userQuestion);

    const prompt = `Extraits de documents disponibles :
"""
${contextText}
"""

Question de l'utilisateur : "${userQuestion}"

Instructions :
1. Réponds en priorité en t'appuyant rigoureusement sur les extraits fournis.
2. Si la réponse n'y figure pas, indique-le honnêtement.
3. Formate la réponse de façon claire et aérée avec des listes à puces si pertinent.`;

    const systemInstruction = "Tu es DocTalk, un assistant IA de pointe propulsé par le SDK Firebase AI Logic. Tu effectues l'inférence en mode hybride (Gemini Nano on-device dans Chrome avec basculement Cloud transparent).";

    try {
      const result = await this.firebaseAi.generateContentHybrid(prompt, {
        systemInstruction,
        customMode: this.inferenceMode as any
      });

      this.lastInferenceSource = result.source;
      this.lastLatencyMs = result.latencyMs;

      const assistantMessage: Message = {
        id: Date.now() + 1,
        conversationId: convId,
        role: 'ASSISTANT',
        content: result.text,
        sources: sources,
        inferenceSource: result.source,
        latencyMs: result.latencyMs,
        createdAt: new Date().toISOString()
      };

      this.messages.push(assistantMessage);

      const conv: Conversation = {
        id: convId,
        title: this.currentConversation?.title || userQuestion.substring(0, 35) + '...',
        createdAt: this.currentConversation?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: this.messages
      };
      this.currentConversation = conv;
      this.isNewConversation = false;

      this.saveLocalConversation(conv);

      const request: ChatRequest = {
        question: userQuestion,
        conversationId: convId,
        documentId: this.selectedDocumentId && this.selectedDocumentId > 0 ? this.selectedDocumentId : null
      };
      this.chatService.askQuestion(request).subscribe({
        error: () => {}
      });

    } catch (err: any) {
      console.error('[DocTalk Chat] Erreur d’inférence hybride:', err);
      this.errorMessage = 'Erreur lors de la génération de la réponse : ' + (err.message || err);
    } finally {
      this.isLoading = false;
    }
  }

  // ============================================
  // RÉSOLUTION DU CONTEXTE DOCUMENTAIRE
  // ============================================

  private resolveDocumentContext(question: string): { contextText: string; sources: Source[] } {
    let context = '';
    const sources: Source[] = [];

    if (this.selectedDocumentId !== null) {
      if (this.selectedDocumentId < 0) {
        const sample = this.sampleCourses.find(c => c.id === this.selectedDocumentId);
        if (sample) {
          context = sample.content;
          sources.push({
            chunkId: 1,
            content: sample.content.substring(0, 300) + '...',
            documentTitle: sample.title,
            similarity: 0.96
          });
        }
      } else {
        const doc = this.documents.find(d => d.id === this.selectedDocumentId);
        if (doc && doc.content) {
          context = doc.content;
          sources.push({
            chunkId: doc.id,
            content: doc.content.substring(0, 300) + '...',
            documentTitle: doc.title,
            similarity: 0.92
          });
        }
      }
    }

    if (!context) {
      const sample = this.sampleCourses[0];
      context = sample ? sample.content : 'Aucun extrait disponible.';
      sources.push({
        chunkId: 1,
        content: context.substring(0, 300) + '...',
        documentTitle: sample ? sample.title : 'Base de connaissances',
        similarity: 0.85
      });
    }

    return { contextText: context, sources };
  }

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
      return this.currentConversation.title || 'Conversation active';
    }
    return 'Nouvelle session d\'analyse';
  }
}
