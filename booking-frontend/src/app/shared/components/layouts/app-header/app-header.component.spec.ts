import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AppHeaderComponent } from './app-header.component';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

describe('AppHeaderComponent', () => {
  let component: AppHeaderComponent;
  let fixture: ComponentFixture<AppHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppHeaderComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AppHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('[Red] should start with scrollY signal at 0', () => {
    expect(component.scrollY()).toBe(0);
  });

  describe('default appearance', () => {
    it('[Red] should have solid white background by default', () => {
      const header = fixture.debugElement.query(By.css('header'));
      const classes = header.nativeElement.className;
      expect(classes).toContain('bg-white');
    });

    it('[Red] should have bottom border by default', () => {
      const header = fixture.debugElement.query(By.css('header'));
      const classes = header.nativeElement.className;
      expect(classes).toContain('border-b');
      expect(classes).toContain('border-gray-200');
    });

    it('[Red] should have height 64px', () => {
      const header = fixture.debugElement.query(By.css('header'));
      expect(header.nativeElement.classList.contains('h-16')).toBe(true);
    });

    it('[Red] should not have shadow when scrollY is 0', () => {
      const header = fixture.debugElement.query(By.css('header'));
      const classes = header.nativeElement.className;
      expect(classes).not.toContain('shadow-md');
    });
  });

  describe('scroll state', () => {
    it('[Red] should add box shadow when scrolled past threshold', () => {
      component.scrollY.set(20);
      fixture.detectChanges();

      const header = fixture.debugElement.query(By.css('header'));
      const classes = header.nativeElement.className;
      expect(classes).toContain('shadow-md');
    });

    it('[Red] should not have blur backdrop class on scroll', () => {
      component.scrollY.set(20);
      fixture.detectChanges();

      const header = fixture.debugElement.query(By.css('header'));
      const classes = header.nativeElement.className;
      expect(classes).not.toContain('backdrop-blur-xl');
    });
  });

  describe('navigation elements', () => {
    it('[Red] should render hamburger menu button on mobile', () => {
      const btn = fixture.debugElement.query(By.css('button[aria-label="Toggle menu"]'));
      expect(btn).toBeTruthy();
    });

    it('[Red] should render logo text "Booking"', () => {
      const logo = fixture.debugElement.query(By.css('a[routerLink="/"]'));
      expect(logo.nativeElement.textContent.trim()).toBe('Booking');
    });

    it('[Red] should render nav links when provided', () => {
      fixture.componentRef.setInput('navLinks', [
        { label: 'Home', route: '/' },
        { label: 'Profile', route: '/profile' },
      ]);
      fixture.detectChanges();

      const nav = fixture.debugElement.query(By.css('nav'));
      const links = nav.queryAll(By.css('a'));
      expect(links.length).toBe(2);
    });
  });

  describe('notification and user', () => {
    it('[Red] should render notification bell', () => {
      const bell = fixture.debugElement.query(By.css('.pi-bell'));
      expect(bell).toBeTruthy();
    });

    it('[Red] should render notification badge when count > 0', () => {
      fixture.componentRef.setInput('notificationCount', 5);
      fixture.detectChanges();

      const badge = fixture.debugElement.query(By.css('[data-testid="notification-badge"]'));
      expect(badge).toBeTruthy();
      expect(badge.nativeElement.textContent.trim()).toBe('5');
    });

    it('[Red] should render user avatar and name when logged in', () => {
      fixture.componentRef.setInput('userName', 'Alice');
      fixture.detectChanges();

      const avatar = fixture.debugElement.query(By.css('p-avatar'));
      expect(avatar).toBeTruthy();
      const nameSpan = fixture.debugElement.query(By.css('.user-name'));
      expect(nameSpan.nativeElement.textContent.trim()).toBe('Alice');
    });

    it('[Red] should render admin badge when isAdmin is true', () => {
      fixture.componentRef.setInput('userName', 'Admin');
      fixture.componentRef.setInput('isAdmin', true);
      fixture.detectChanges();

      const adminBadge = fixture.debugElement.query(By.css('[data-testid="admin-badge"]'));
      expect(adminBadge).toBeTruthy();
    });

    it('[Red] should render login button when no user', () => {
      fixture.componentRef.setInput('userName', undefined);
      fixture.detectChanges();

      const loginBtn = fixture.debugElement.query(By.css('a[routerLink="/auth/login"]'));
      expect(loginBtn).toBeTruthy();
    });
  });
});
