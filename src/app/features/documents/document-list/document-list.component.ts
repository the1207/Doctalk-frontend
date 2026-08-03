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
  selectedFile: File | null = null;
  uploadTitle: string = '';
  isUploading: boolean = false;

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
        this.errorMessage = 'Erreur lors du chargement des documents.';
        this.isLoading = false;
        console.error(error);
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      // Auto-remplir le titre avec le nom du fichier
      this.uploadTitle = this.selectedFile.name;
    }
  }

  uploadDocument(): void {
    if (!this.selectedFile) {
      this.errorMessage = 'Veuillez sélectionner un fichier.';
      return;
    }

    if (!this.uploadTitle.trim()) {
      this.errorMessage = 'Veuillez saisir un titre.';
      return;
    }

    this.isUploading = true;
    this.errorMessage = '';

    this.documentService.uploadDocument(this.selectedFile, this.uploadTitle).subscribe({
      next: () => {
        this.isUploading = false;
        this.selectedFile = null;
        this.uploadTitle = '';
        // Recharger la liste
        this.loadDocuments();
        // Réinitialiser l'input file
        const fileInput = document.getElementById('fileInput') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      },
      error: (error) => {
        this.isUploading = false;
        this.errorMessage = 'Erreur lors de l\'upload du document.';
        console.error(error);
      }
    });
  }

  deleteDocument(id: number, title: string): void {
    if (confirm(`Voulez-vous vraiment supprimer le document "${title}" ?`)) {
      this.documentService.deleteDocument(id).subscribe({
        next: () => {
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
      'PARSING': 'En cours',
      'PARSED': 'Traité',
      'VECTORIZED': 'Vectorisé',
      'ERROR': 'Erreur'
    };
    return labels[status] || status;
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
}
