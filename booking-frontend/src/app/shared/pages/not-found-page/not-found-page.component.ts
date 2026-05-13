import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../../../stores/auth/auth.store';
import { RouteResolver } from '../../../core/services/route-resolver.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-not-found-page',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './not-found-page.component.html',
  styleUrls: ['./not-found-page.component.scss'],
})
export class NotFoundPageComponent {
  private readonly router = inject(Router);
  private readonly authStore = inject(AuthStore);

  goHome(): void {
    const userRole = this.authStore.currentUser()?.role;
    const route = RouteResolver.getPostLoginRoute(userRole);
    this.router.navigateByUrl(route);
  }
}
