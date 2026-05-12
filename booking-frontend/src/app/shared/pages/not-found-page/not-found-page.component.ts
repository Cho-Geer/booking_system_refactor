import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../../../stores/auth/auth.store';
import { RouteResolver } from '../../../core/services/route-resolver.service';

@Component({
  selector: 'app-not-found-page',
  standalone: true,
  templateUrl: './not-found-page.component.html',
  styleUrls: ['./not-found-page.component.scss'],
})
export class NotFoundPageComponent {
  private readonly router = inject(Router);
  private readonly authStore = inject(AuthStore);

  goHome(): void {
    const userType = this.authStore.currentUser()?.userType;
    const route = RouteResolver.getPostLoginRoute(userType);
    this.router.navigateByUrl(route);
  }
}
