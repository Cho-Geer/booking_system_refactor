import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { NotFoundPageComponent } from './not-found-page.component';

describe('NotFoundPageComponent', () => {
  let component: NotFoundPageComponent;
  let fixture: ComponentFixture<NotFoundPageComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotFoundPageComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(NotFoundPageComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should display "404" prominently', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const heading = compiled.querySelector('h1');
    expect(heading).toBeTruthy();
    expect(heading?.textContent).toContain('404');
  });

  it('should display "Page Not Found" message', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Page Not Found');
  });

  it('should display descriptive error text', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain(
      "The page you're looking for doesn't exist."
    );
  });

  it('should have a "Back to Home" button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector('button');
    expect(button).toBeTruthy();
    expect(button?.textContent).toContain('Back to Home');
  });

  it('should navigate to "/booking" when "Back to Home" button is clicked', () => {
    const button = fixture.debugElement.query(By.css('button'));
    expect(button).toBeTruthy();

    const navigateSpy = spyOn(router, 'navigateByUrl');
    button.nativeElement.click();

    expect(navigateSpy).toHaveBeenCalledWith('/booking');
  });

  // ==========================================
  // [FE-ROLE-UNIFY] userType → role rename
  // ==========================================

  describe('[RoleRename] goHome() should use role-based routing', () => {
    it('goHome() should read user.role not user.userType [RED] fails because code uses userType', () => {
      // TARGET: goHome reads `this.authStore.currentUser()?.role`
      // CURRENT: reads `this.authStore.currentUser()?.userType` on line 17
      const fs = require('fs');
      const path = require('path');
      const componentPath = path.resolve(__dirname, './not-found-page.component.ts');
      const content = fs.readFileSync(componentPath, 'utf-8');

      const goHomeMatch = content.match(/goHome\(\).*?\{[\s\S]*?^\s*\}/m);
      expect(goHomeMatch).not.toBeNull();
      if (goHomeMatch) {
        const goHomeBody = goHomeMatch[0];
        // TARGET: should reference `role` not `userType`
        // CURRENT: references `userType` → this FAILS
        expect(goHomeBody).not.toContain('userType');
      }
    });

    it('goHome() should redirect ADMIN role to /admin/dashboard [RED] fails because code reads userType', () => {
      // Inject AuthStore into the component's injector context
      // TARGET: Admin user with role=ADMIN → redirect to /admin/dashboard
      // CURRENT: goHome reads userType which is undefined when role is set → redirects to default /booking

      // We need a fresh TestBed with the AuthStore that has an ADMIN user with role field
      // This test checks the TARGET behavior
      const navigateSpy = spyOn(router, 'navigateByUrl');

      // Force-set the AuthStore through the injector
      const authStore = (component as any).authStore;
      // Set user with role (TARGET shape) instead of userType
      jest.spyOn(authStore, 'currentUser').mockReturnValue({
        id: '1',
        name: 'Admin User',
        role: 'ADMIN',
        email: 'admin@test.com',
      });

      component.goHome();

      // TARGET: ADMIN role → /admin/dashboard
      // CURRENT: userType is undefined → falls back to /booking → this FAILS
      expect(navigateSpy).toHaveBeenCalledWith('/admin/dashboard');
    });
  });
});
