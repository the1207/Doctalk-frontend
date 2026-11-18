import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class LayoutComponent {
  username: string = '';

  constructor(private authService: AuthService, private router: Router) {
    const user = this.authService.getUser();
    this.username = user?.username || 'Utilisateur';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
