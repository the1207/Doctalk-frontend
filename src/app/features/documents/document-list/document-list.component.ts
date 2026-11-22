import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DocumentService } from '../../../core/services/document.service';
import { Document } from '../../../shared/models/document.model';

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './document-list.component.html',
  styleUrls: ['./document-list.component.css']
})
export class DocumentListComponent implements OnInit {
  documents: Document[] = [];
  isLoading: boolean = true;
  errorMessage: string = '';
  successMessage: string = '';
  selectedFile: File | null = null;
  uploadTitle: string = '';
  isUploading: boolean = false;
  isDragging: boolean = false;
  searchTerm: string = '';

  constructor(private documentService: DocumentService) { }

  ngOnInit(): void {
    this.loadDocuments();
  }

  loadDocuments(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.documentService.getDocuments().subscribe({
      next: (data) => {
        this.documents = data;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Impossible de contacter le backend. Vérifiez que le serveur Spring Boot est démarré.';
        this.isLoading = false;
        console.error(error);
      }
    });
  }

  get filteredDocuments(): Document[] {
    if (!this.searchTerm.trim()) {
      return this.documents;
    }
    const term = this.searchTerm.toLowerCase();
    return this.documents.filter(doc =>
      (doc.title && doc.title.toLowerCase().includes(term)) ||
      (doc.filename && doc.filename.toLowerCase().includes(term))
    );
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      this.handleFile(event.dataTransfer.files[0]);
    }
  }

  triggerFileInput(): void {
    const input = document.getElementById('fileInput') as HTMLInputElement;
    if (input) {
      input.click();
    }
  }

  private handleFile(file: File): void {
    this.selectedFile = file;
    // Nettoyer l'extension pour le titre par défaut
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
    this.uploadTitle = nameWithoutExt.charAt(0).toUpperCase() + nameWithoutExt.slice(1);
    this.errorMessage = '';
    this.successMessage = '';
  }

  clearSelectedFile(): void {
    this.selectedFile = null;
    this.uploadTitle = '';
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  uploadDocument(): void {
    if (!this.selectedFile) {
      this.errorMessage = 'Veuillez sélectionner un document à téléverser.';
      return;
    }

    if (!this.uploadTitle.trim()) {
      this.errorMessage = 'Veuillez renseigner un titre pour ce document.';
      return;
    }

    this.isUploading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.documentService.uploadDocument(this.selectedFile, this.uploadTitle).subscribe({
      next: (newDoc) => {
        this.isUploading = false;
        this.successMessage = `Document "${newDoc.title || this.uploadTitle}" téléversé et indexé avec succès !`;
        this.clearSelectedFile();
        this.loadDocuments();
      },
      error: (error) => {
        this.isUploading = false;
        this.errorMessage = 'Erreur lors du téléversement vers le serveur Spring Boot. Vérifiez la connexion à Supabase / backend.';
        console.error(error);
      }
    });
  }

  deleteDocument(id: number, title: string, event: Event): void {
    event.stopPropagation();
    if (confirm(`Voulez-vous vraiment supprimer le document "${title}" de votre base RAG ?`)) {
      this.documentService.deleteDocument(id).subscribe({
        next: () => {
          this.successMessage = `Document "${title}" supprimé.`;
          this.loadDocuments();
        },
        error: (error) => {
          this.errorMessage = 'Erreur lors de la suppression.';
          console.error(error);
        }
      });
    }
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'PENDING': 'status-pending',
      'PARSING': 'status-parsing',
      'PARSED': 'status-parsed',
      'VECTORIZED': 'status-vectorized',
      'ERROR': 'status-error'
    };
    return classes[status] || 'status-pending';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'PENDING': 'En attente',
      'PARSING': 'Traitement IA...',
      'PARSED': 'Prêt',
      'VECTORIZED': 'Vectorisé & Prêt',
      'ERROR': 'Erreur'
    };
    return labels[status] || status;
  }

  getFileIcon(filename: string): string {
    if (!filename) return '📄';
    const lower = filename.toLowerCase();
    if (lower.endsWith('.pdf')) return '📕';
    if (lower.endsWith('.doc') || lower.endsWith('.docx')) return '📘';
    if (lower.endsWith('.txt') || lower.endsWith('.md')) return '📝';
    return '📄';
  }

  formatFileSize(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
}
