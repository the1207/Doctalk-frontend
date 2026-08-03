import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // ============================================
  // ROUTES PUBLIQUES (sans authentification)
  // ============================================
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },

  // ============================================
  // ROUTES PROTÉGÉES (avec authentification)
  // ============================================
  {
    path: '',
    loadComponent: () => import('./layout/layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [AuthGuard],
    children: [
      // Redirection par défaut vers /documents
      { path: '', redirectTo: 'documents', pathMatch: 'full' },

      // Documents
      {
        path: 'documents',
        loadComponent: () => import('./features/documents/document-list/document-list.component').then(m => m.DocumentListComponent)
      },
      {
        path: 'documents/:id',
        loadComponent: () => import('./features/documents/document-detail/document-detail.component').then(m => m.DocumentDetailComponent)
      },

      // Tags
      {
        path: 'tags',
        loadComponent: () => import('./features/tags/tag-list/tag-list.component').then(m => m.TagListComponent)
      },

      // Folders
      {
        path: 'folders',
        loadComponent: () => import('./features/folders/folder-list/folder-list.component').then(m => m.FolderListComponent)
      },

      // Search
      {
        path: 'search',
        loadComponent: () => import('./features/search/search/search.component').then(m => m.SearchComponent)
      },

      // Chat
      {
        path: 'chat',
        loadComponent: () => import('./features/chat/chat/chat.component').then(m => m.ChatComponent)
      }
    ]
  },

  // ============================================
  // ROUTE 404 (toute URL non reconnue)
  // ============================================
  { path: '**', redirectTo: '/documents' }
];
