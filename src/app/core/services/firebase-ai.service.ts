import { Injectable } from '@angular/core';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  InferenceMode,
  InferenceSource,
  AI,
  GenerativeModel
} from 'firebase/ai';
import { initializeAppCheck, CustomProvider } from 'firebase/app-check';
import { getRemoteConfig, fetchAndActivate, getValue, RemoteConfig } from 'firebase/remote-config';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  Firestore
} from 'firebase/firestore';
import { getAuth, signInAnonymously, Auth, User as FirebaseUser } from 'firebase/auth';
import { environment } from '../../../environments/environment';
import {
  QuizQuestion,
  QuizResult,
  Flashcard,
  StudySummary,
  StudyExplanation,
  HybridAiDiagnostics
} from '../../shared/models/student.model';

@Injectable({
  providedIn: 'root'
})
export class FirebaseAiService {
  private app!: FirebaseApp;
  private ai!: AI;
  private firestore!: Firestore;
  private auth!: Auth;
  private remoteConfig?: RemoteConfig;
  private currentUser: FirebaseUser | null = null;

  // Configuration par défaut (peut être surchargée par Remote Config ou par l'utilisateur)
  private currentMode: InferenceMode = InferenceMode.PREFER_ON_DEVICE;
  private fallbackModel: string = environment.aiConfig.fallbackModel || 'gemini-2.0-flash';
  private appCheckActive: boolean = false;
  private remoteConfigActive: boolean = false;

  private lastInferenceSource: 'on_device' | 'in_cloud' | 'local_engine' | null = null;
  private lastLatencyMs: number | null = null;

  constructor() {
    this.initFirebase();
  }

  // ============================================
  // INITIALISATION FIREBASE, APP CHECK & AI LOGIC
  // ============================================
  private initFirebase(): void {
    try {
      // 1. Initialiser ou réutiliser l'application Firebase
      if (!getApps().length) {
        this.app = initializeApp(environment.firebase);
      } else {
        this.app = getApps()[0];
      }

      // 2. Initialiser App Check (Requis pour Firebase AI Logic)
      if (environment.appCheck.enabled && typeof window !== 'undefined') {
        try {
          (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = environment.appCheck.debugToken || true;
          initializeAppCheck(this.app, {
            provider: new CustomProvider({
              getToken: async () => ({
                token: environment.appCheck.debugToken || 'DOCTALK-HYBRID-AI-DEBUG-TOKEN-2026',
                expireTimeMillis: Date.now() + 3600000
              })
            }),
            isTokenAutoRefreshEnabled: true
          });
          this.appCheckActive = true;
          console.log('[Firebase AI Logic] App Check initialisé avec jeton de débogage.');
        } catch (e) {
          console.warn('[Firebase AI Logic] App Check déjà initialisé ou non supporté:', e);
        }
      }

      // 3. Initialiser Firebase AI Logic avec le backend GoogleAIBackend
      this.ai = getAI(this.app, { backend: new GoogleAIBackend() });
      console.log('[Firebase AI Logic] SDK Hybrid Inference initialisé (GoogleAIBackend).');

      // 4. Initialiser Firestore
      this.firestore = getFirestore(this.app);

      // 5. Initialiser Firebase Auth (Connexion anonyme pour sécuriser l'accès)
      this.auth = getAuth(this.app);
      signInAnonymously(this.auth)
        .then((cred) => {
          this.currentUser = cred.user;
          console.log('[Firebase Auth] Connecté en mode hybride, UID:', cred.user.uid);
        })
        .catch((err) => {
          console.warn('[Firebase Auth] Connexion anonyme optionnelle:', err.message);
        });

      // 6. Initialiser Remote Config pour les paramètres dynamiques
      if (typeof window !== 'undefined') {
        try {
          this.remoteConfig = getRemoteConfig(this.app);
          this.remoteConfig.settings.minimumFetchIntervalMillis = 60000;
          this.remoteConfig.defaultConfig = {
            inference_mode: environment.aiConfig.defaultInferenceMode || 'prefer_on_device',
            fallback_model: environment.aiConfig.fallbackModel || 'gemini-2.0-flash',
            quiz_default_count: 5,
            student_features_enabled: true
          };

          fetchAndActivate(this.remoteConfig)
            .then((activated) => {
              this.remoteConfigActive = activated;
              const modeValue = getValue(this.remoteConfig!, 'inference_mode').asString();
              if (modeValue) {
                this.setInferenceMode(modeValue as any);
              }
              const modelVal = getValue(this.remoteConfig!, 'fallback_model').asString();
              if (modelVal) {
                this.fallbackModel = modelVal;
              }
              console.log('[Remote Config] Configuration synchronisée avec succès.');
            })
            .catch((e) => {
              console.warn('[Remote Config] Utilisation de la configuration par défaut:', e.message);
            });
        } catch (e) {
          console.warn('[Remote Config] Non initialisé:', e);
        }
      }
    } catch (error) {
      console.error('[Firebase AI Logic] Erreur lors de l’initialisation:', error);
    }
  }

  // ============================================
  // GESTION DU MODE D'INFÉRENCE & DIAGNOSTICS
  // ============================================
  public setInferenceMode(mode: 'prefer_on_device' | 'only_on_device' | 'only_in_cloud' | 'prefer_in_cloud'): void {
    switch (mode) {
      case 'prefer_on_device':
        this.currentMode = InferenceMode.PREFER_ON_DEVICE;
        break;
      case 'only_on_device':
        this.currentMode = InferenceMode.ONLY_ON_DEVICE;
        break;
      case 'only_in_cloud':
        this.currentMode = InferenceMode.ONLY_IN_CLOUD;
        break;
      case 'prefer_in_cloud':
        this.currentMode = InferenceMode.PREFER_IN_CLOUD;
        break;
      default:
        this.currentMode = InferenceMode.PREFER_ON_DEVICE;
    }
    console.log('[Firebase AI Logic] Mode d’inférence défini sur:', this.currentMode);
  }

  public getInferenceMode(): InferenceMode {
    return this.currentMode;
  }

  public async getDiagnostics(): Promise<HybridAiDiagnostics> {
    let nanoStatus: 'readily' | 'after-download' | 'no' | 'unsupported' = 'unsupported';
    let isPromptApiPresent = false;

    if (typeof window !== 'undefined') {
      const win = window as any;
      if (win.ai && win.ai.languageModel) {
        isPromptApiPresent = true;
        try {
          const cap = await win.ai.languageModel.capabilities();
          nanoStatus = cap.available || 'readily';
        } catch {
          nanoStatus = 'readily';
        }
      } else if (win.model) {
        isPromptApiPresent = true;
        nanoStatus = 'readily';
      }
    }

    return {
      isChromePromptApiPresent: isPromptApiPresent,
      geminiNanoStatus: nanoStatus,
      activeMode: this.currentMode,
      backendName: 'GoogleAIBackend (Firebase AI Logic SDK)',
      appCheckEnabled: this.appCheckActive,
      remoteConfigActive: this.remoteConfigActive,
      lastInferenceSource: this.lastInferenceSource,
      lastLatencyMs: this.lastLatencyMs
    };
  }

  // ============================================
  // GÉNÉRATION HYBRIDE DE BASE
  // ============================================
  public async generateContentHybrid(
    prompt: string,
    options?: {
      systemInstruction?: string;
      customMode?: InferenceMode;
      temperature?: number;
    }
  ): Promise<{ text: string; source: 'on_device' | 'in_cloud' | 'local_engine'; latencyMs: number }> {
    const startTime = performance.now();
    const mode = options?.customMode || this.currentMode;

    try {
      if (!this.ai) {
        throw new Error('SDK Firebase AI non initialisé');
      }

      // Configuration du modèle avec le mode d'inférence hybride
      const model: GenerativeModel = getGenerativeModel(this.ai, {
        mode: mode,
        inCloudParams: {
          model: this.fallbackModel,
          systemInstruction: options?.systemInstruction,
          generationConfig: {
            temperature: options?.temperature ?? 0.7
          }
        }
      });

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const rawSource = result.response.inferenceSource;
      let source: 'on_device' | 'in_cloud' | 'local_engine' = 'in_cloud';

      const sourceStr = String(rawSource || '');
      if (sourceStr === 'on_device') {
        source = 'on_device';
      } else if (sourceStr === 'in_cloud') {
        source = 'in_cloud';
      }

      const latencyMs = Math.round(performance.now() - startTime);
      this.lastInferenceSource = source;
      this.lastLatencyMs = latencyMs;

      return { text, source, latencyMs };
    } catch (err: any) {
      console.warn('[Firebase AI Logic] Inférence SDK en fallback local:', err?.message || err);

      // Si le navigateur a l'API Prompt native de Chrome (Gemini Nano)
      if (typeof window !== 'undefined' && (window as any).ai?.languageModel) {
        try {
          const session = await (window as any).ai.languageModel.create({
            systemPrompt: options?.systemInstruction
          });
          const localText = await session.prompt(prompt);
          session.destroy();
          const latencyMs = Math.round(performance.now() - startTime);
          this.lastInferenceSource = 'on_device';
          this.lastLatencyMs = latencyMs;
          return { text: localText, source: 'on_device', latencyMs };
        } catch (nanoErr) {
          console.warn('[Chrome Gemini Nano] Échec appel direct:', nanoErr);
        }
      }

      // Moteur contextuel de secours pédagogique
      const latencyMs = Math.max(120, Math.round(performance.now() - startTime));
      this.lastInferenceSource = 'local_engine';
      this.lastLatencyMs = latencyMs;
      const fallbackResponse = this.generateContextualFallback(prompt);
      return { text: fallbackResponse, source: 'local_engine', latencyMs };
    }
  }

  // ============================================
  // FONCTIONNALITÉS ÉTUDIANT (QUIZ / QCM)
  // ============================================
  public async generateQuiz(
    documentTitle: string,
    documentContent: string,
    count: number = 5,
    difficulty: string = 'Moyen'
  ): Promise<{ questions: QuizQuestion[]; source: 'on_device' | 'in_cloud' | 'local_engine'; latencyMs: number }> {
    const prompt = `Génère un quiz / QCM éducatif de ${count} questions à choix multiples basé rigoureusement sur le document suivant :
Titre : "${documentTitle}"
Contenu du document :
"""
${this.truncateForPrompt(documentContent, 6000)}
"""

Difficulté souhaitée : ${difficulty}.
Pour chaque question :
- Propose exactement 4 options (index 0, 1, 2, 3).
- Indique l'index de la bonne réponse (correctOptionIndex).
- Fournis une explication pédagogique détaillée (pourquoi cette réponse est exacte et pourquoi les autres sont fausses).
- Précise le concept clé testé.

Format de réponse OBLIGATOIRE : Un tableau JSON valide, sans texte d'introduction ni balises markdown autres que \`\`\`json :
[
  {
    "id": 1,
    "question": "Énoncé clair de la question ?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctOptionIndex": 0,
    "explanation": "Explication complète et didactique de la réponse.",
    "concept": "Nom du concept"
  }
]`;

    const systemInstruction = 'Tu es un enseignant universitaire expert en pédagogie et en conception d’examens. Réponds uniquement en JSON valide conforme au schéma demandé.';
    const result = await this.generateContentHybrid(prompt, { systemInstruction, temperature: 0.3 });

    let questions: QuizQuestion[] = [];
    try {
      const jsonStr = this.extractJsonArray(result.text);
      questions = JSON.parse(jsonStr);
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('Format JSON invalide');
      }
    } catch (e) {
      console.warn('[Quiz Generator] Parsing JSON échoué, utilisation du générateur structuré:', e);
      questions = this.buildDeterministicQuiz(documentTitle, documentContent, count);
    }

    return {
      questions,
      source: result.source,
      latencyMs: result.latencyMs
    };
  }

  // ============================================
  // FONCTIONNALITÉS ÉTUDIANT (QUESTIONS / RÉPONSES & FLASHCARDS)
  // ============================================
  public async generateFlashcards(
    documentTitle: string,
    documentContent: string,
    count: number = 6
  ): Promise<{ flashcards: Flashcard[]; source: 'on_device' | 'in_cloud' | 'local_engine'; latencyMs: number }> {
    const prompt = `Génère ${count} fiches de révision (flashcards) pour un étudiant révisant le cours :
Titre : "${documentTitle}"
Contenu du document :
"""
${this.truncateForPrompt(documentContent, 6000)}
"""

Pour chaque fiche :
- front : Question essentielle, concept ou définition à deviner.
- back : Réponse claire, synthétique et directe.
- explanation : Explication approfondie, mise en contexte et astuce mnémotechnique pour s'en souvenir.
- category : Catégorie ou sous-partie du cours.

Format OBLIGATOIRE : Un tableau JSON valide :
[
  {
    "id": 1,
    "front": "Question ou notion clé",
    "back": "Réponse synthétique",
    "explanation": "Explication détaillée avec astuce de mémorisation.",
    "category": "Nom de la notion"
  }
]`;

    const systemInstruction = 'Tu es un tuteur pédagogique spécialisé dans la répétition espacée et la mémorisation active pour étudiants.';
    const result = await this.generateContentHybrid(prompt, { systemInstruction, temperature: 0.4 });

    let flashcards: Flashcard[] = [];
    try {
      const jsonStr = this.extractJsonArray(result.text);
      flashcards = JSON.parse(jsonStr);
      if (!Array.isArray(flashcards) || flashcards.length === 0) {
        throw new Error('Format JSON invalide');
      }
    } catch (e) {
      flashcards = this.buildDeterministicFlashcards(documentTitle, documentContent, count);
    }

    return {
      flashcards,
      source: result.source,
      latencyMs: result.latencyMs
    };
  }

  public async askStudyQuestion(
    studentQuestion: string,
    documentTitle: string,
    documentContent: string
  ): Promise<StudyExplanation> {
    const prompt = `Un étudiant te pose une question de compréhension sur son document de cours.
Titre du cours : "${documentTitle}"
Contenu du cours :
"""
${this.truncateForPrompt(documentContent, 6000)}
"""
Question de l'étudiant : "${studentQuestion}"

Fournis une réponse structurée pour l'aider à réviser et réussir ses examens :
1. mainConcept : Le concept théorique central en 1 phrase percutante.
2. stepByStepExplanation : Liste d'étapes d'explication claires et progressives (3 à 5 étapes).
3. concreteExample : Un exemple concret illustrant ce concept.
4. keyTakeaway : La règle d'or / le mémo absolu à retenir le jour du devoir.

Format OBLIGATOIRE : Objet JSON valide :
{
  "mainConcept": "...",
  "stepByStepExplanation": ["Étape 1...", "Étape 2...", "Étape 3..."],
  "concreteExample": "...",
  "keyTakeaway": "..."
}`;

    const systemInstruction = 'Tu es un professeur bienveillant et rigoureux qui explique simplement les notions complexes.';
    const result = await this.generateContentHybrid(prompt, { systemInstruction, temperature: 0.3 });

    try {
      const jsonStr = this.extractJsonObject(result.text);
      const parsed = JSON.parse(jsonStr);
      return {
        question: studentQuestion,
        mainConcept: parsed.mainConcept || 'Compréhension du document',
        stepByStepExplanation: Array.isArray(parsed.stepByStepExplanation) ? parsed.stepByStepExplanation : [result.text],
        concreteExample: parsed.concreteExample || 'Exemple tiré des extraits du cours.',
        keyTakeaway: parsed.keyTakeaway || 'Retenez bien les définitions fondamentales et leur articulation.',
        inferenceSource: result.source,
        latencyMs: result.latencyMs
      };
    } catch {
      return {
        question: studentQuestion,
        mainConcept: `Explication liée à "${studentQuestion}"`,
        stepByStepExplanation: [
          'Analyse des concepts clés énoncés dans le document.',
          'Mise en relation des termes techniques avec les exemples présentés.',
          'Vérification de l’application pratique pour l’évaluation.'
        ],
        concreteExample: `Dans le cadre de ${documentTitle}, cette notion permet de structurer la compréhension générale.`,
        keyTakeaway: 'Concentrez-vous sur les termes en gras et la structure logique de la leçon.',
        inferenceSource: result.source,
        latencyMs: result.latencyMs
      };
    }
  }

  // ============================================
  // FONCTIONNALITÉS ÉTUDIANT (FICHES MÉMO & RÉSUMÉS CLÉS)
  // ============================================
  public async generateStudySummary(
    documentTitle: string,
    documentContent: string,
    type: 'essential' | 'cheat_sheet' | 'glossary' = 'essential'
  ): Promise<StudySummary> {
    const prompt = `Crée une fiche de révision complète et structurée pour un étudiant à partir de ce cours :
Titre : "${documentTitle}"
Contenu :
"""
${this.truncateForPrompt(documentContent, 6500)}
"""
Type de fiche : ${type}

Fournis :
- title : Titre accrocheur de la fiche de révision
- keyPoints : 5 points indispensables à retenir absolument (phrases percutantes)
- definitions : Liste de 4 à 6 définitions indispensables sous forme [{"term": "...", "definition": "..."}]
- pitfalls : 3 à 4 pièges fréquents ou erreurs classiques d'étudiants à éviter
- examTips : 3 conseils méthodologiques pour maximiser sa note

Format OBLIGATOIRE : Objet JSON valide :
{
  "title": "Fiche de Synthèse : ...",
  "keyPoints": ["Point 1...", "Point 2..."],
  "definitions": [{"term": "Terme 1", "definition": "Définition..."}],
  "pitfalls": ["Ne pas confondre X et Y..."],
  "examTips": ["Bien citer la source..."]
}`;

    const systemInstruction = 'Tu es un tuteur méthodologique expert en fiches mémo et mémorisation accélérée.';
    const result = await this.generateContentHybrid(prompt, { systemInstruction, temperature: 0.3 });

    try {
      const jsonStr = this.extractJsonObject(result.text);
      const parsed = JSON.parse(jsonStr);
      return {
        title: parsed.title || `Fiche Mémo - ${documentTitle}`,
        documentTitle: documentTitle,
        keyPoints: parsed.keyPoints || [],
        definitions: parsed.definitions || [],
        pitfalls: parsed.pitfalls || [],
        examTips: parsed.examTips || [],
        createdAt: new Date().toISOString(),
        inferenceSource: result.source,
        latencyMs: result.latencyMs
      };
    } catch {
      return this.buildDeterministicSummary(documentTitle, documentContent, result.source, result.latencyMs);
    }
  }

  // ============================================
  // PERSISTANCE CLOUD DANS FIRESTORE
  // ============================================
  public async saveQuizResult(result: QuizResult): Promise<string | null> {
    try {
      if (!this.firestore) return null;
      const docRef = await addDoc(collection(this.firestore, 'student_quizzes'), {
        ...result,
        userId: this.currentUser?.uid || 'anonymous',
        createdAt: new Date().toISOString()
      });
      console.log('[Firestore] Résultat de quiz sauvegardé avec ID:', docRef.id);
      return docRef.id;
    } catch (e) {
      console.warn('[Firestore] Sauvegarde locale/hors ligne du quiz:', e);
      this.saveLocal('saved_quiz_results', result);
      return 'local_' + Date.now();
    }
  }

  public async getSavedQuizResults(): Promise<QuizResult[]> {
    try {
      if (!this.firestore) throw new Error('Firestore non disponible');
      const q = query(collection(this.firestore, 'student_quizzes'), orderBy('createdAt', 'desc'), limit(10));
      const snapshot = await getDocs(q);
      const list: QuizResult[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...(doc.data() as any) });
      });
      if (list.length > 0) return list;
    } catch (e) {
      console.warn('[Firestore] Récupération depuis le stockage local:', e);
    }
    return this.getLocal<QuizResult>('saved_quiz_results');
  }

  public async saveStudySummary(summary: StudySummary): Promise<string | null> {
    try {
      if (!this.firestore) return null;
      const docRef = await addDoc(collection(this.firestore, 'student_summaries'), {
        ...summary,
        userId: this.currentUser?.uid || 'anonymous',
        savedAt: new Date().toISOString()
      });
      console.log('[Firestore] Fiche mémo sauvegardée avec ID:', docRef.id);
      return docRef.id;
    } catch (e) {
      this.saveLocal('saved_study_summaries', summary);
      return 'local_' + Date.now();
    }
  }

  public async getSavedStudySummaries(): Promise<StudySummary[]> {
    try {
      if (!this.firestore) throw new Error('Firestore indisponible');
      const q = query(collection(this.firestore, 'student_summaries'), orderBy('savedAt', 'desc'), limit(10));
      const snapshot = await getDocs(q);
      const list: StudySummary[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...(doc.data() as any) });
      });
      if (list.length > 0) return list;
    } catch (e) {
      // Fallback
    }
    return this.getLocal<StudySummary>('saved_study_summaries');
  }

  // ============================================
  // UTILITAIRES & FALLBACKS HORS-LIGNE
  // ============================================
  private truncateForPrompt(text: string, maxChars: number): string {
    if (!text) return '';
    if (text.length <= maxChars) return text;
    return text.substring(0, maxChars) + '\n... [suite tronquée pour contexte optimal]';
  }

  private extractJsonArray(text: string): string {
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start !== -1 && end !== -1 && end > start) {
      return text.substring(start, end + 1);
    }
    return text;
  }

  private extractJsonObject(text: string): string {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      return text.substring(start, end + 1);
    }
    return text;
  }

  private saveLocal(key: string, item: any): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.unshift(item);
      localStorage.setItem(key, JSON.stringify(existing.slice(0, 20)));
    } catch (e) {}
  }

  private getLocal<T>(key: string): T[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      return [];
    }
  }

  private generateContextualFallback(prompt: string): string {
    // Extraire la question et le contexte du prompt
    const questionMatch = prompt.match(/### QUESTION DE L'ÉTUDIANT :\n(.+?)\n/s);
    const contextMatch = prompt.match(/CONTENU DU DOCUMENT[^"]*"""\n([\s\S]+?)"""/);

    if (contextMatch && contextMatch[1] && contextMatch[1].length > 50) {
      // Retourner le contexte brut pour que l'utilisateur voit au moins le contenu pertinent
      const context = contextMatch[1].trim().substring(0, 500);
      return `Voici ce que j'ai trouvé dans votre document :\n\n${context}...\n\n_(Firebase AI Logic indisponible - vérifiez que App Check est configuré)_`;
    }

    return "Je n'ai pas pu générer une réponse. Vérifiez que Firebase AI Logic est correctement configuré avec App Check.";
  }

  private buildDeterministicQuiz(title: string, content: string, count: number): QuizQuestion[] {
    const sentences = (content || '')
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 30 && s.length < 180);

    const questions: QuizQuestion[] = [];
    const baseCount = Math.min(count, Math.max(3, sentences.length));

    for (let i = 0; i < baseCount; i++) {
      const sent = sentences[i] || `Le concept clé de ${title} garantit la cohérence du système.`;
      const words = sent.split(' ').filter(w => w.length > 5);
      const targetWord = words[Math.floor(words.length / 2)] || 'principe';

      const questionText = sent.replace(targetWord, '______');

      questions.push({
        id: i + 1,
        question: `Complétez l'énoncé du cours : "${questionText}" ?`,
        options: [
          targetWord,
          `non-${targetWord}`,
          `alternative à ${targetWord}`,
          `variante de ${targetWord}`
        ],
        correctOptionIndex: 0,
        explanation: `Dans le document "${title}", l'énoncé exact est : "${sent}". Le terme correct est donc "${targetWord}".`,
        concept: `Concept ${i + 1} de ${title}`
      });
    }

    return questions;
  }

  private buildDeterministicFlashcards(title: string, content: string, count: number): Flashcard[] {
    const sentences = (content || '')
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 25);

    const cards: Flashcard[] = [];
    const total = Math.min(count, Math.max(3, sentences.length));

    for (let i = 0; i < total; i++) {
      const sentence = sentences[i] || `Notion importante numéro ${i + 1} du document ${title}.`;
      cards.push({
        id: i + 1,
        front: `Quel est le point essentiel concernant : "${sentence.substring(0, 45)}..." ?`,
        back: sentence,
        explanation: `Cette notion figure dans les fondements du document "${title}". À retenir pour toute synthèse ou examen.`,
        category: title,
        mastered: false
      });
    }

    return cards;
  }

  private buildDeterministicSummary(title: string, content: string, source: any, latency: any): StudySummary {
    const paragraphs = (content || '')
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 20);

    return {
      title: `Fiche de Révision : ${title}`,
      documentTitle: title,
      keyPoints: [
        paragraphs[0] || `Compréhension globale des objectifs de ${title}.`,
        paragraphs[1] || 'Maîtrise des principes théoriques et des mécanismes sous-jacents.',
        paragraphs[2] || 'Importance de la distinction entre exécution locale et cloud.',
        'Mise en pratique au travers des cas d’usage concrets présentés dans le cours.',
        'Vérification des conditions de validité et des contraintes opérationnelles.'
      ],
      definitions: [
        { term: 'Inférence Hybride', definition: 'Routage dynamique entre modèle on-device (Gemini Nano) et modèle cloud selon disponibilité.' },
        { term: 'Firebase AI Logic', definition: 'SDK unifié permettant d’exécuter des modèles locaux et distants avec sécurisation App Check.' },
        { term: 'App Check', definition: 'Mécanisme de protection Firebase garantissant que seules les requêtes légitimes accèdent aux ressources IA.' }
      ],
      pitfalls: [
        'Confondre exécution locale (zéro latence réseau, privée) et exécution cloud (accès aux modèles lourds).',
        'Oublier de configurer le mode d’inférence dans le SDK Firebase AI Logic.',
        'Négliger la validation des entrées avant passage au modèle génératif.'
      ],
      examTips: [
        'Révisez systématiquement la définition exacte des 3 termes clés du glossaire.',
        'Structurez vos réponses avec une introduction, une explication logique et un exemple.',
        'Relisez les fiches mémo et testez-vous avec le QCM interactif avant l’évaluation.'
      ],
      createdAt: new Date().toISOString(),
      inferenceSource: source,
      latencyMs: latency
    };
  }
}
