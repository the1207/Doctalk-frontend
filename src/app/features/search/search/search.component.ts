import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DocumentService } from '../../../core/services/document.service';
import { Document } from '../../../shared/models/document.model';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css']
})
export class SearchComponent {
  query: string = '';
  results: Document[] = [];
  isLoading: boolean = false;
  errorMessage: string = '';
  searchMode: 'text' | 'semantic' = 'text';

  constructor(private documentService: DocumentService) { }

  onSearch(): void {
    if (!this.query.trim()) {
      this.results = [];
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.results = [];

    if (this.searchMode === 'text') {
      this.documentService.searchDocuments(this.query.trim()).subscribe({
        next: (data) => {
          this.results = data;
          this.isLoading = false;
        },
        error: (error) => {
          this.errorMessage = 'Erreur lors de la recherche.';
          this.isLoading = false;
          console.error(error);
        }
      });
    } else {
      this.documentService.searchSemantic(this.query.trim()).subscribe({
        next: (data) => {
          this.results = data;
          this.isLoading = false;
        },
        error: (error) => {
          this.errorMessage = 'Erreur lors de la recherche sémantique.';
          this.isLoading = false;
          console.error(error);
        }
      });
    }
  }

  clearSearch(): void {
    this.query = '';
    this.results = [];
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
      year: 'numeric'
    });
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
}
