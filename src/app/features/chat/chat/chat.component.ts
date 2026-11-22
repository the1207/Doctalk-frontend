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
    // Ne scroll que si l'utilisateur est déjà en bas du chat
    if (this.shouldScrollToBottom()) {
      this.scrollToBottom();
    }
  }

  private shouldScrollToBottom(): boolean {
    if (!this.messageContainer) return false;
    const el = this.messageContainer.nativeElement;
    const threshold = 100; // pixels depuis le bas
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
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

  /**
   * Remplit le champ de saisie avec la suggestion sans l'envoyer.
   * L'utilisateur peut modifier ou valider librement.
   */
  fillSuggestedPrompt(promptText: string): void {
    this.question = promptText;
    // Mettre le focus sur l'input pour que l'utilisateur puisse modifier
    setTimeout(() => {
      const input = document.querySelector('.chat-input-wrapper input, .chat-input-wrapper textarea') as HTMLElement;
      if (input) input.focus();
    }, 50);
  }

  // ============================================
  // ENVOI DE MESSAGES — LOGIQUE HYBRIDE
  // ============================================
  // Vrai document backend → RAG vectoriel (Spring/pgvector) + Firebase AI Logic cloud
  // Cours démo (id < 0) ou aucun doc → contenu local + Firebase AI Logic on-device/cloud
  async sendMessage(): Promise<void> {
    if (!this.question.trim() || this.isLoading) return;

    const userQuestion = this.question.trim();
    const convId = this.currentConversation?.id || Date.now();

    this.messages.push({
      id: Date.now(),
      conversationId: convId,
      role: 'USER',
      content: userQuestion,
      createdAt: new Date().toISOString()
    });
    this.question = '';
    this.isLoading = true;
    this.errorMessage = '';

    const isRealDocument = this.selectedDocumentId !== null && this.selectedDocumentId > 0;

    if (isRealDocument) {
      // --- Chemin hybride : RAG backend (chunks) + Firebase AI Logic (inférence) ---
      const request: ChatRequest = {
        question: userQuestion,
        conversationId: this.currentConversation?.id || null,
        documentId: this.selectedDocumentId
      };
      this.chatService.askQuestion(request).subscribe({
        next: async (response) => {
          // Le backend a fait le RAG et retourné les chunks pertinents dans answer
          // On utilise Firebase AI Logic pour générer une vraie réponse depuis ces chunks
          const contextText = response.answer;
          const sources = response.sources || [];

          const prompt = `Tu es DocTalk, un assistant pédagogique. L'étudiant t'a posé une question.
Réponds de façon naturelle et conversationnelle en t'appuyant sur le contenu ci-dessous.

Règles :
- Réponds à la question en utilisant le contenu fourni.
- Sois clair, concis et structuré. Utilise des listes si pertinent.
- Si la réponse n'est pas dans le contenu, dis-le simplement.
- Ne recopie pas le contenu tel quel : reformule avec tes propres mots.

### CONTENU DU DOCUMENT :
"""
${contextText}
"""

### QUESTION DE L'ÉTUDIANT :
${userQuestion}

### TA RÉPONSE :`;

          try {
            const result = await this.firebaseAi.generateContentHybrid(prompt, {
              systemInstruction: 'Tu es DocTalk, un assistant pédagogique qui aide les étudiants.',
              customMode: this.inferenceMode as any
            });
            this.lastInferenceSource = result.source;
            this.lastLatencyMs = result.latencyMs;

            this.messages.push({
              id: Date.now() + 1,
              conversationId: response.conversationId,
              role: 'ASSISTANT',
              content: result.text,
              sources: sources,
              inferenceSource: result.source,
              latencyMs: result.latencyMs,
              createdAt: response.timestamp
            });
          } catch (err: any) {
            // Si Firebase AI Logic échoue, afficher le contexte brut du backend
            this.messages.push({
              id: Date.now() + 1,
              conversationId: response.conversationId,
              role: 'ASSISTANT',
              content: contextText,
              sources: sources,
              inferenceSource: 'in_cloud',
              latencyMs: undefined,
              createdAt: response.timestamp
            });
          }

          if (this.isNewConversation) {
            this.isNewConversation = false;
            this.loadConversations();
          }
          if (!this.currentConversation || this.currentConversation.id !== response.conversationId) {
            this.currentConversation = {
              id: response.conversationId,
              title: userQuestion.substring(0, 40) + '...',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              messages: this.messages
            };
          }
          this.isLoading = false;
        },
        error: () => {
          this.errorMessage = 'Erreur de réponse. Vérifiez que le backend est démarré.';
          this.isLoading = false;
        }
      });

    } else {
      // --- Chemin Firebase AI Logic pur (cours démo / aucun doc sélectionné) ---
      const { contextText, sources } = this.resolveLocalContext();

      const prompt = `Extraits du document :
"""
${contextText}
"""

Question : "${userQuestion}"

Réponds en t'appuyant uniquement sur les extraits ci-dessus. Si la réponse n'y figure pas, dis-le clairement. Sois précis et structuré.`;

      const systemInstruction = 'Tu es DocTalk, un assistant pédagogique. Tu réponds uniquement à partir des extraits fournis, sans inventer.';

      try {
        const result = await this.firebaseAi.generateContentHybrid(prompt, {
          systemInstruction,
          customMode: this.inferenceMode as any
        });
        this.lastInferenceSource = result.source;
        this.lastLatencyMs = result.latencyMs;

        this.messages.push({
          id: Date.now() + 1,
          conversationId: convId,
          role: 'ASSISTANT',
          content: result.text,
          sources: sources,
          inferenceSource: result.source,
          latencyMs: result.latencyMs,
          createdAt: new Date().toISOString()
        });

        const conv: Conversation = {
          id: convId,
          title: this.currentConversation?.title || userQuestion.substring(0, 40) + '...',
          createdAt: this.currentConversation?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: this.messages
        };
        this.currentConversation = conv;
        this.isNewConversation = false;
        this.saveLocalConversation(conv);
      } catch (err: any) {
        this.errorMessage = 'Erreur IA : ' + (err.message || err);
      } finally {
        this.isLoading = false;
      }
    }
  }

  // ============================================
  // CONTEXTE LOCAL (cours de démonstration)
  // ============================================
  private resolveLocalContext(): { contextText: string; sources: Source[] } {
    if (this.selectedDocumentId !== null && this.selectedDocumentId < 0) {
      const sample = this.sampleCourses.find(c => c.id === this.selectedDocumentId);
      if (sample) {
        return {
          contextText: sample.content,
          sources: [{
            chunkId: 1,
            content: sample.content.substring(0, 300) + '...',
            documentTitle: sample.title,
            similarity: 0.96
          }]
        };
      }
    }
    // Fallback : premier cours démo
    const first = this.sampleCourses[0];
    if (first) {
      return {
        contextText: first.content,
        sources: [{
          chunkId: 1,
          content: first.content.substring(0, 300) + '...',
          documentTitle: first.title + ' (démo)',
          similarity: 0.85
        }]
      };
    }
    return { contextText: 'Aucun document disponible. Veuillez en sélectionner un.', sources: [] };
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
    return content.length > 150 ? content.substring(0, 150) + '...' : content;
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
      return this.currentConversation.title || 'Conversation active';
    }
    return 'Nouvelle session d\'analyse';
  }
}
