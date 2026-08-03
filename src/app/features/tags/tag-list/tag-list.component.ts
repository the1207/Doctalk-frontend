import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TagService } from '../../../core/services/tag.service';
import { Tag, TagRequest } from '../../../shared/models/tag.model';

@Component({
  selector: 'app-tag-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tag-list.component.html',
  styleUrls: ['./tag-list.component.css']
})
export class TagListComponent implements OnInit {
  tags: Tag[] = [];
  isLoading: boolean = true;
  errorMessage: string = '';

  // Formulaire d'ajout/édition
  isEditing: boolean = false;
  editingTagId: number | null = null;
  tagForm: TagRequest = {
    name: '',
    color: '#4a6cf7'
  };

  constructor(private tagService: TagService) { }

  ngOnInit(): void {
    this.loadTags();
  }

  loadTags(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.tagService.getTags().subscribe({
      next: (data) => {
        this.tags = data;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Erreur lors du chargement des tags.';
        this.isLoading = false;
        console.error(error);
      }
    });
  }

  resetForm(): void {
    this.tagForm = { name: '', color: '#4a6cf7' };
    this.isEditing = false;
    this.editingTagId = null;
  }

  startEdit(tag: Tag): void {
    this.isEditing = true;
    this.editingTagId = tag.id;
    this.tagForm = {
      name: tag.name,
      color: tag.color
    };
  }

  onSubmit(): void {
    if (!this.tagForm.name.trim()) {
      this.errorMessage = 'Le nom du tag est obligatoire.';
      return;
    }

    if (this.isEditing && this.editingTagId !== null) {
      // Modifier un tag existant
      this.tagService.updateTag(this.editingTagId, this.tagForm).subscribe({
        next: () => {
          this.loadTags();
          this.resetForm();
        },
        error: (error) => {
          this.errorMessage = 'Erreur lors de la modification du tag.';
          console.error(error);
        }
      });
    } else {
      // Créer un nouveau tag
      this.tagService.createTag(this.tagForm).subscribe({
        next: () => {
          this.loadTags();
          this.resetForm();
        },
        error: (error) => {
          this.errorMessage = 'Erreur lors de la création du tag.';
          console.error(error);
        }
      });
    }
  }

  deleteTag(id: number, name: string): void {
    if (confirm(`Voulez-vous vraiment supprimer le tag "${name}" ?`)) {
      this.tagService.deleteTag(id).subscribe({
        next: () => {
          this.loadTags();
        },
        error: (error) => {
          this.errorMessage = 'Erreur lors de la suppression du tag.';
          console.error(error);
        }
      });
    }
  }

  getTagColor(color: string): string {
    return color || '#4a6cf7';
  }
}
