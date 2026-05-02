import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppSidebarComponent, SidebarItem, SidebarSection } from './app-sidebar.component';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

describe('AppSidebarComponent', () => {
  let component: AppSidebarComponent;
  let fixture: ComponentFixture<AppSidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppSidebarComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AppSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  describe('desktop sidebar', () => {
    it('[Red] should have solid white background and right border', () => {
      const aside = fixture.debugElement.query(By.css('aside'));
      expect(aside).toBeTruthy();
      const classes = aside.nativeElement.className;
      expect(classes).toContain('bg-white');
      expect(classes).toContain('border-r');
      expect(classes).toContain('border-gray-200');
    });

    it('[Red] should have top padding to clear header', () => {
      const aside = fixture.debugElement.query(By.css('aside'));
      expect(aside.nativeElement.classList.contains('pt-16')).toBe(true);
    });

    it('[Red] should not have glass blur classes by default', () => {
      const aside = fixture.debugElement.query(By.css('aside'));
      const classes = aside.nativeElement.className;
      expect(classes).not.toContain('backdrop-blur');
      expect(classes).not.toContain('bg-white/75');
    });
  });

  describe('section groups', () => {
    it('[Red] should render section titles when sections are provided', () => {
      const sections: SidebarSection[] = [
        { title: 'Main', items: [{ label: 'Home', route: '/', icon: 'pi pi-home' }] },
        { title: 'Management', items: [{ label: 'Users', route: '/admin/users', icon: 'pi pi-users' }] },
      ];
      fixture.componentRef.setInput('sections', sections);
      fixture.detectChanges();

      const titles = fixture.debugElement.queryAll(By.css('[data-testid="section-title"]'));
      expect(titles.length).toBe(2);
      expect(titles[0].nativeElement.textContent.trim()).toBe('Main');
      expect(titles[1].nativeElement.textContent.trim()).toBe('Management');
    });

    it('[Red] should render flat items when no sections provided', () => {
      const items: SidebarItem[] = [
        { label: 'Home', route: '/', icon: 'pi pi-home' },
        { label: 'Profile', route: '/profile', icon: 'pi pi-user' },
      ];
      fixture.componentRef.setInput('items', items);
      fixture.detectChanges();

      const aside = fixture.debugElement.query(By.css('aside'));
      const navLinks = aside.queryAll(By.css('nav a'));
      expect(navLinks.length).toBe(2);
    });
  });

  describe('navigation items', () => {
    it('[Red] should render PrimeIcons instead of emoji', () => {
      const items: SidebarItem[] = [
        { label: 'Home', route: '/', icon: 'pi pi-home' },
      ];
      fixture.componentRef.setInput('items', items);
      fixture.detectChanges();

      const iconEl = fixture.debugElement.query(By.css('.pi'));
      expect(iconEl).toBeTruthy();
      expect(iconEl.nativeElement.classList.contains('pi-home')).toBe(true);
    });

    it('[Red] should have active state with left gradient accent bar', () => {
      const items: SidebarItem[] = [
        { label: 'Home', route: '/', icon: 'pi pi-home' },
      ];
      fixture.componentRef.setInput('items', items);
      fixture.detectChanges();

      const link = fixture.debugElement.query(By.css('aside nav a'));
      const classes = link.nativeElement.className;
      expect(classes).toContain('border-l-[3px]');
      expect(classes).toContain('border-transparent');
    });

    it('[Red] should render badge when provided', () => {
      const items: SidebarItem[] = [
        { label: 'Messages', route: '/messages', icon: 'pi pi-envelope', badge: 3 },
      ];
      fixture.componentRef.setInput('items', items);
      fixture.detectChanges();

      const badge = fixture.debugElement.query(By.css('[data-testid="sidebar-badge"]'));
      expect(badge).toBeTruthy();
      expect(badge.nativeElement.textContent.trim()).toBe('3');
    });
  });

  describe('bottom profile', () => {
    it('[Red] should render user profile summary at bottom when user provided', () => {
      fixture.componentRef.setInput('userName', 'Alice');
      fixture.componentRef.setInput('userRole', 'ADMIN');
      fixture.detectChanges();

      const profile = fixture.debugElement.query(By.css('[data-testid="sidebar-profile"]'));
      expect(profile).toBeTruthy();
      expect(profile.nativeElement.textContent).toContain('Alice');
      expect(profile.nativeElement.textContent).toContain('ADMIN');
    });
  });

  describe('mobile drawer', () => {
    it('[Red] should render overlay backdrop when isOpen is true', () => {
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();

      const overlay = fixture.debugElement.query(By.css('[data-testid="mobile-overlay"]'));
      expect(overlay).toBeTruthy();
    });

    it('[Red] should render mobile drawer when isOpen is true', () => {
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();

      const drawer = fixture.debugElement.query(By.css('[data-testid="mobile-drawer"]'));
      expect(drawer).toBeTruthy();
    });
  });
});
