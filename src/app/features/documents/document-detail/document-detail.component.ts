import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DocumentService } from '../../../core/services/document.service';
import { Document } from '../../../shared/models/document.model';

@Component({
  selector: 'app-document-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './document-detail.component.html',
  styleUrls: ['./document-detail.component.css']
})
export class DocumentDetailComponent implements OnInit {
  document: Document | null = null;
  isLoading: boolean = true;
  errorMessage: string = '';

  constructor(
    private route: ActivatedRoute,
    private documentService: DocumentService
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadDocument(+id);
    } else {
      this.errorMessage = 'ID du document manquant.';
      this.isLoading = false;
    }
  }

  loadDocument(id: number): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.documentService.getDocumentById(id).subscribe({
      next: (data) => {
        this.document = data;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Erreur lors du chargement du document.';
        this.isLoading = false;
        console.error(error);
      }
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

  getContentPreview(content: string): string {
    if (!content) return 'Aucun contenu extrait.';
    return content.length > 500 ? content.substring(0, 500) + '...' : content;
  }
}
