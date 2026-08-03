// Ce qu'on envoie pour se connecter
export interface LoginRequest {
  username: string;
  password: string;
}

// Ce qu'on envoie pour s'inscrire
export interface RegisterRequest {
  username: string;
  password: string;
  role?: string;  // Optionnel, par défaut "USER"
}

// Ce qu'on reçoit du backend après connexion
export interface AuthResponse {
  token: string;
  publicId: string;
  username: string;
  role: string;
}
