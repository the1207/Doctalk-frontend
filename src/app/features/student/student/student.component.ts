import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FirebaseAiService } from '../../../core/services/firebase-ai.service';
import { DocumentService } from '../../../core/services/document.service';
import { Document } from '../../../shared/models/document.model';
import {
  QuizQuestion,
  QuizResult,
  Flashcard,
  StudySummary,
  StudyExplanation,
  HybridAiDiagnostics
} from '../../../shared/models/student.model';
import { SAMPLE_COURSES, SampleCourse } from '../../../shared/data/sample-courses';

@Component({
  selector: 'app-student',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './student.component.html',
  styleUrls: ['./student.component.css']
})
export class StudentComponent implements OnInit {
  // Navigation entre les sous-onglets
  activeTab: 'quiz' | 'flashcards' | 'summaries' | 'saved' = 'quiz';

  // Documents disponibles (backend + cours démo pré-intégrés)
  documents: Document[] = [];
  sampleCourses: SampleCourse[] = SAMPLE_COURSES;
  selectedDocId: string | number = -1; // Par défaut le premier cours de démonstration

  // Contenu actif du document sélectionné
  currentDocTitle: string = '';
  currentDocContent: string = '';

  // État de chargement & diagnostics IA
  isLoading: boolean = false;
  loadingMessage: string = '';
  errorMessage: string = '';
  successMessage: string = '';

  // Source de l'inférence et latence
  lastInferenceSource: 'on_device' | 'in_cloud' | 'local_engine' | null = null;
  lastLatencyMs: number | null = null;
  activeInferenceMode: 'prefer_on_device' | 'only_on_device' | 'only_in_cloud' = 'prefer_on_device';

  // Diagnostics modal
  showDiagnosticsModal: boolean = false;
  diagnostics: HybridAiDiagnostics | null = null;

  // Import de document personnalisé
  showCustomDocModal: boolean = false;
  customDocTitle: string = '';
  customDocContent: string = '';

  // ============================================
  // ÉTAT DU QUIZ / QCM
  // ============================================
  quizQuestions: QuizQuestion[] = [];
  quizCount: number = 5;
  quizDifficulty: string = 'Moyen';
  quizSubmitted: boolean = false;
  quizScore: number = 0;
  quizSavedId: string | null = null;

  // ============================================
  // ÉTAT DES FLASHCARDS & QUESTIONS DE COURS
  // ============================================
  flashcards: Flashcard[] = [];
  currentCardIndex: number = 0;
  isCardFlipped: boolean = false;
  flashcardCount: number = 6;
  masteredCount: number = 0;

  studentQuestionInput: string = '';
  studyExplanation: StudyExplanation | null = null;
  isAskingQuestion: boolean = false;

  // ============================================
  // ÉTAT DES FICHES DE RÉVISION & RÉSUMÉS
  // ============================================
  studySummary: StudySummary | null = null;
  summaryType: 'essential' | 'cheat_sheet' | 'glossary' = 'essential';
  summarySavedId: string | null = null;

  // ============================================
  // ÉTAT DE L'HISTORIQUE FIRESTORE
  // ============================================
  savedQuizzes: QuizResult[] = [];
  savedSummaries: StudySummary[] = [];

  constructor(
    private firebaseAi: FirebaseAiService,
    private documentService: DocumentService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadDocuments();
    this.updateCurrentDocContent();
    this.refreshDiagnostics();

    // Vérifier si un documentId est passé dans l'URL
    this.route.queryParams.subscribe(params => {
      if (params['documentId']) {
        const docId = Number(params['documentId']);
        if (!isNaN(docId)) {
          this.selectedDocId = docId;
          this.updateCurrentDocContent();
        }
      }
      if (params['tab']) {
        const tab = params['tab'];
        if (['quiz', 'flashcards', 'summaries', 'saved'].includes(tab)) {
          this.activeTab = tab;
        }
      }
    });
  }

  // ============================================
  // CHARGEMENT DES DOCUMENTS
  // ============================================
  loadDocuments(): void {
    this.documentService.getDocuments().subscribe({
      next: (docs) => {
        this.documents = docs;
        // Si l'utilisateur avait sélectionné un document du backend
        this.updateCurrentDocContent();
      },
      error: () => {
        // En cas d'indisponibilité du backend PostgreSQL, les cours de démo restent 100% utilisables
        console.log('[Student] Utilisation des cours intégrés optimisés pour le hackathon.');
      }
    });
  }

  onDocumentChange(): void {
    this.updateCurrentDocContent();
    // Réinitialiser les états
    this.quizQuestions = [];
    this.quizSubmitted = false;
    this.flashcards = [];
    this.studySummary = null;
    this.studyExplanation = null;
  }

  updateCurrentDocContent(): void {
    const id = Number(this.selectedDocId);
    if (id < 0) {
      const sample = this.sampleCourses.find(c => c.id === id);
      if (sample) {
        this.currentDocTitle = sample.title;
        this.currentDocContent = sample.content;
      }
    } else {
      const doc = this.documents.find(d => d.id === id);
      if (doc) {
        this.currentDocTitle = doc.title;
        this.currentDocContent = doc.content || `Contenu du document : ${doc.title}`;
      }
    }
  }

  // ============================================
  // MODE D'INFÉRENCE & DIAGNOSTICS HYBRIDES
  // ============================================
  onInferenceModeChange(): void {
    this.firebaseAi.setInferenceMode(this.activeInferenceMode);
    this.refreshDiagnostics();
  }

  async refreshDiagnostics(): Promise<void> {
    this.diagnostics = await this.firebaseAi.getDiagnostics();
  }

  toggleDiagnosticsModal(): void {
    this.showDiagnosticsModal = !this.showDiagnosticsModal;
    if (this.showDiagnosticsModal) {
      this.refreshDiagnostics();
    }
  }

  toggleCustomDocModal(): void {
    this.showCustomDocModal = !this.showCustomDocModal;
    if (this.showCustomDocModal) {
      this.customDocTitle = '';
      this.customDocContent = '';
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      if (!this.customDocTitle) {
        this.customDocTitle = file.name.replace(/\.[^/.]+$/, '');
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        this.customDocContent = (e.target?.result as string) || '';
      };
      reader.readAsText(file);
    }
  }

  importCustomDoc(): void {
    if (!this.customDocTitle.trim() || !this.customDocContent.trim()) return;

    const newDocId = -(Date.now());
    const newCourse: SampleCourse = {
      id: newDocId,
      title: this.customDocTitle.trim(),
      category: 'Document importé',
      content: this.customDocContent.trim()
    };

    this.sampleCourses.unshift(newCourse);
    this.selectedDocId = newDocId;
    this.onDocumentChange();
    this.toggleCustomDocModal();
    this.successMessage = `Document "${newCourse.title}" importé avec succès !`;
    setTimeout(() => this.successMessage = '', 4000);
  }

  // ============================================
  // GESTION DU QUIZ / QCM
  // ============================================
  async generateQuiz(): Promise<void> {
    if (!this.currentDocContent) return;

    this.isLoading = true;
    this.loadingMessage = `Génération du QCM interactif (${this.quizCount} questions) via Firebase AI Logic...`;
    this.errorMessage = '';
    this.successMessage = '';
    this.quizSubmitted = false;
    this.quizScore = 0;
    this.quizSavedId = null;

    try {
      const result = await this.firebaseAi.generateQuiz(
        this.currentDocTitle,
        this.currentDocContent,
        this.quizCount,
        this.quizDifficulty
      );
      this.quizQuestions = result.questions;
      this.lastInferenceSource = result.source;
      this.lastLatencyMs = result.latencyMs;
    } catch (err: any) {
      this.errorMessage = 'Erreur lors de la génération du quiz : ' + (err.message || err);
    } finally {
      this.isLoading = false;
    }
  }

  selectOption(question: QuizQuestion, optionIndex: number): void {
    if (question.isAnswered) return;
    question.userSelectedOptionIndex = optionIndex;
    question.isAnswered = true;

    // Recalculer le score dynamique
    this.calculateCurrentScore();
  }

  calculateCurrentScore(): void {
    let score = 0;
    for (const q of this.quizQuestions) {
      if (q.isAnswered && q.userSelectedOptionIndex === q.correctOptionIndex) {
        score++;
      }
    }
    this.quizScore = score;
    // Si toutes les questions sont répondues
    if (this.quizQuestions.length > 0 && this.quizQuestions.every(q => q.isAnswered)) {
      this.quizSubmitted = true;
    }
  }

  async saveQuizToFirestore(): Promise<void> {
    if (!this.quizQuestions.length) return;

    const percentage = Math.round((this.quizScore / this.quizQuestions.length) * 100);
    const result: QuizResult = {
      totalQuestions: this.quizQuestions.length,
      correctCount: this.quizScore,
      scorePercentage: percentage,
      difficulty: this.quizDifficulty,
      documentTitle: this.currentDocTitle,
      timestamp: new Date().toISOString(),
      inferenceSource: this.lastInferenceSource || 'on_device',
      latencyMs: this.lastLatencyMs || 0
    };

    const docId = await this.firebaseAi.saveQuizResult(result);
    this.quizSavedId = docId;
    this.successMessage = 'Résultat du Quiz sauvegardé avec succès dans Firestore !';
    setTimeout(() => this.successMessage = '', 4000);
  }

  resetQuiz(): void {
    for (const q of this.quizQuestions) {
      q.userSelectedOptionIndex = undefined;
      q.isAnswered = false;
    }
    this.quizSubmitted = false;
    this.quizScore = 0;
  }

  // ============================================
  // GESTION DES FLASHCARDS & QUESTIONS DE COURS
  // ============================================
  async generateFlashcards(): Promise<void> {
    if (!this.currentDocContent) return;

    this.isLoading = true;
    this.loadingMessage = `Création des fiches mémo interactives (${this.flashcardCount} fiches) via Firebase AI Logic...`;
    this.errorMessage = '';
    this.currentCardIndex = 0;
    this.isCardFlipped = false;
    this.masteredCount = 0;

    try {
      const result = await this.firebaseAi.generateFlashcards(
        this.currentDocTitle,
        this.currentDocContent,
        this.flashcardCount
      );
      this.flashcards = result.flashcards;
      this.lastInferenceSource = result.source;
      this.lastLatencyMs = result.latencyMs;
    } catch (err: any) {
      this.errorMessage = 'Erreur lors de la génération des flashcards : ' + (err.message || err);
    } finally {
      this.isLoading = false;
    }
  }

  flipCard(): void {
    this.isCardFlipped = !this.isCardFlipped;
  }

  nextCard(): void {
    if (this.currentCardIndex < this.flashcards.length - 1) {
      this.currentCardIndex++;
      this.isCardFlipped = false;
    }
  }

  prevCard(): void {
    if (this.currentCardIndex > 0) {
      this.currentCardIndex--;
      this.isCardFlipped = false;
    }
  }

  markCardMastered(isMastered: boolean): void {
    if (!this.flashcards.length) return;
    this.flashcards[this.currentCardIndex].mastered = isMastered;
    this.masteredCount = this.flashcards.filter(c => c.mastered).length;
    this.nextCard();
  }

  async askStudentQuestion(): Promise<void> {
    if (!this.studentQuestionInput.trim()) return;

    this.isAskingQuestion = true;
    this.errorMessage = '';

    try {
      const result = await this.firebaseAi.askStudyQuestion(
        this.studentQuestionInput,
        this.currentDocTitle,
        this.currentDocContent
      );
      this.studyExplanation = result;
      this.lastInferenceSource = result.inferenceSource;
      this.lastLatencyMs = result.latencyMs || 0;
    } catch (err: any) {
      this.errorMessage = 'Erreur lors de l’explication du cours : ' + (err.message || err);
    } finally {
      this.isAskingQuestion = false;
    }
  }

  // ============================================
  // GESTION DES FICHES DE RÉVISION & RÉSUMÉS
  // ============================================
  async generateSummary(): Promise<void> {
    if (!this.currentDocContent) return;

    this.isLoading = true;
    this.loadingMessage = `Synthèse des points clés et fiches mémo via Firebase AI Logic...`;
    this.errorMessage = '';
    this.summarySavedId = null;

    try {
      const result = await this.firebaseAi.generateStudySummary(
        this.currentDocTitle,
        this.currentDocContent,
        this.summaryType
      );
      this.studySummary = result;
      this.lastInferenceSource = result.inferenceSource;
      this.lastLatencyMs = result.latencyMs || 0;
    } catch (err: any) {
      this.errorMessage = 'Erreur lors de la génération de la fiche : ' + (err.message || err);
    } finally {
      this.isLoading = false;
    }
  }

  async saveSummaryToFirestore(): Promise<void> {
    if (!this.studySummary) return;

    const id = await this.firebaseAi.saveStudySummary(this.studySummary);
    this.summarySavedId = id;
    this.successMessage = 'Fiche mémo sauvegardée avec succès dans Firestore !';
    setTimeout(() => this.successMessage = '', 4000);
  }

  copySummaryToClipboard(): void {
    if (!this.studySummary) return;
    const text = `=== ${this.studySummary.title} ===\n\n` +
      `📌 POINTS CLÉS :\n${this.studySummary.keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n\n` +
      `📖 DÉFINITIONS :\n${this.studySummary.definitions.map(d => `• ${d.term} : ${d.definition}`).join('\n')}\n\n` +
      `⚠️ PIÈGES FRÉQUENTS :\n${this.studySummary.pitfalls.map(p => `• ${p}`).join('\n')}\n\n` +
      `💡 CONSEILS EXAMEN :\n${this.studySummary.examTips.map(t => `• ${t}`).join('\n')}`;

    navigator.clipboard.writeText(text).then(() => {
      this.successMessage = 'Fiche copiée dans le presse-papier !';
      setTimeout(() => this.successMessage = '', 3000);
    });
  }

  // ============================================
  // HISTORIQUE FIRESTORE
  // ============================================
  async loadSavedData(): Promise<void> {
    this.isLoading = true;
    this.loadingMessage = 'Chargement des données synchronisées avec Firestore...';
    try {
      this.savedQuizzes = await this.firebaseAi.getSavedQuizResults();
      this.savedSummaries = await this.firebaseAi.getSavedStudySummaries();
    } catch (err: any) {
      console.warn('[Firestore] Erreur récupération:', err);
    } finally {
      this.isLoading = false;
    }
  }

  switchTab(tab: 'quiz' | 'flashcards' | 'summaries' | 'saved'): void {
    this.activeTab = tab;
    if (tab === 'saved') {
      this.loadSavedData();
    }
  }
}
