import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-not-found-page',
  standalone: true,
  templateUrl: './not-found-page.component.html',
  styleUrls: ['./not-found-page.component.scss'],
})
export class NotFoundPageComponent {
  private readonly router = inject(Router);

  goHome(): void {
    this.router.navigateByUrl('/booking');
  }
}
