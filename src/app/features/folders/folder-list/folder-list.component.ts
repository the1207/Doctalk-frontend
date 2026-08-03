import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FolderService } from '../../../core/services/folder.service';
import { Folder, FolderRequest } from '../../../shared/models/folder.model';

@Component({
  selector: 'app-folder-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './folder-list.component.html',
  styleUrls: ['./folder-list.component.css']
})
export class FolderListComponent implements OnInit {
  folders: Folder[] = [];
  rootFolders: Folder[] = [];
  isLoading: boolean = true;
  errorMessage: string = '';

  // Formulaire d'ajout/édition
  isEditing: boolean = false;
  editingFolderId: number | null = null;
  folderForm: FolderRequest = {
    name: '',
    parentId: null
  };

  constructor(private folderService: FolderService) { }

  ngOnInit(): void {
    this.loadFolders();
  }

  loadFolders(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.folderService.getFolders().subscribe({
      next: (data) => {
        this.folders = data;
        this.rootFolders = data.filter(f => f.parentId === null);
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Erreur lors du chargement des dossiers.';
        this.isLoading = false;
        console.error(error);
      }
    });
  }

  getSubFolders(parentId: number): Folder[] {
    return this.folders.filter(f => f.parentId === parentId);
  }

  getFolderName(id: number | null): string {
    if (id === null) return 'Racine';
    const folder = this.folders.find(f => f.id === id);
    return folder ? folder.name : 'Racine';
  }

  resetForm(): void {
    this.folderForm = { name: '', parentId: null };
    this.isEditing = false;
    this.editingFolderId = null;
  }

  startEdit(folder: Folder): void {
    this.isEditing = true;
    this.editingFolderId = folder.id;
    this.folderForm = {
      name: folder.name,
      parentId: folder.parentId
    };
  }

  onSubmit(): void {
    if (!this.folderForm.name.trim()) {
      this.errorMessage = 'Le nom du dossier est obligatoire.';
      return;
    }

    if (this.isEditing && this.editingFolderId !== null) {
      // Modifier un dossier existant
      this.folderService.updateFolder(this.editingFolderId, this.folderForm).subscribe({
        next: () => {
          this.loadFolders();
          this.resetForm();
        },
        error: (error) => {
          this.errorMessage = 'Erreur lors de la modification du dossier.';
          console.error(error);
        }
      });
    } else {
      // Créer un nouveau dossier
      this.folderService.createFolder(this.folderForm).subscribe({
        next: () => {
          this.loadFolders();
          this.resetForm();
        },
        error: (error) => {
          this.errorMessage = 'Erreur lors de la création du dossier.';
          console.error(error);
        }
      });
    }
  }

  deleteFolder(id: number, name: string): void {
    if (confirm(`Voulez-vous vraiment supprimer le dossier "${name}" ?`)) {
      this.folderService.deleteFolder(id).subscribe({
        next: () => {
          this.loadFolders();
        },
        error: (error) => {
          this.errorMessage = 'Erreur lors de la suppression du dossier.';
          console.error(error);
        }
      });
    }
  }
}
