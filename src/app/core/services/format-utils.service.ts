import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FormatUtilsService {

  private readonly statusLabels: Record<string, string> = {
    PENDING: 'En attente',
    PARSING: 'En cours',
    PARSED: 'Traité',
    VECTORIZED: 'Vectorisé',
    ERROR: 'Erreur'
  };

  private readonly statusClasses: Record<string, string> = {
    PENDING: 'status-pending',
    PARSING: 'status-parsing',
    PARSED: 'status-parsed',
    VECTORIZED: 'status-vectorized',
    ERROR: 'status-error'
  };

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    } as any);
  }

  getStatusLabel(status: string): string {
    return this.statusLabels[status] || status;
  }

  getStatusClass(status: string): string {
    return this.statusClasses[status] || 'status-pending';
  }
}
