import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { LoginRequest, RegisterRequest, AuthResponse } from '../../shared/models/auth.model';
import { User } from '../../shared/models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService extends ApiService {

  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';

  // Méthode pour se connecter
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/login`, credentials);
  }

  // Méthode pour s'inscrire
  register(data: RegisterRequest): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}/auth/register`, data);
  }

  // Sauvegarder le token et l'utilisateur dans le localStorage
  saveAuthData(token: string, user: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  // Récupérer le token stocké
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  // Récupérer l'utilisateur stocké
  getUser(): AuthResponse | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  // Vérifier si l'utilisateur est connecté
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Se déconnecter (supprimer le token et l'utilisateur)
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }
}
