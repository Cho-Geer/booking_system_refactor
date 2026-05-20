import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificationBellComponent } from './notification-bell.component';
import { AdminService } from '../../services/admin.service';
import { of } from 'rxjs';

describe('NotificationBellComponent', () => {
  let component: NotificationBellComponent;
  let fixture: ComponentFixture<NotificationBellComponent>;
  let mockAdminService: jest.Mocked<AdminService>;

  beforeEach(async () => {
    mockAdminService = {
      getUnreadCount: jest.fn().mockReturnValue(of({ count: 3 })),
      getNotifications: jest.fn().mockReturnValue(of({ items: [], total: 0, page: 1, limit: 5 })),
      markNotificationRead: jest.fn().mockReturnValue(of(undefined)),
    } as unknown as jest.Mocked<AdminService>;

    await TestBed.configureTestingModule({
      imports: [NotificationBellComponent],
      providers: [
        { provide: AdminService, useValue: mockAdminService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationBellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('[Red] notification-bell dropdown event propagation bug', () => {
    // ── TEST C: Initial state ─────────────────────────────────────
    it('[Red] should start with dropdown closed', () => {
      expect(component.dropdownOpen()).toBe(false);
    });

    // ── TEST D: toggleDropdown() opens the dropdown ───────────────
    it('[Red] should open dropdown when toggleDropdown is called', () => {
      component.toggleDropdown();
      fixture.detectChanges();
      expect(component.dropdownOpen()).toBe(true);
    });

    // ── TEST A: Close button (X) click should close dropdown ──────
    // THIS TEST MUST FAIL: Event propagation bug causes the parent div's
    // toggleDropdown() to fire after closeDropdown(), re-opening the panel.
    it('[Red] should close dropdown when close button (X) is clicked', () => {
      // Open dropdown first
      component.toggleDropdown();
      fixture.detectChanges();

      // Verify dropdown is open before clicking close
      expect(component.dropdownOpen()).toBe(true);

      // Find and click the close button (X) inside the dropdown-header
      const closeButton: HTMLButtonElement | null = fixture.nativeElement.querySelector('.close-btn');
      expect(closeButton).toBeTruthy();
      closeButton!.click();
      fixture.detectChanges();

      // BUG: Event bubbles to parent div (click)="toggleDropdown()",
      // so dropdownOpen gets toggled BACK to true after closeDropdown() sets it to false.
      // This assertion FAILS with current buggy code.
      expect(component.dropdownOpen()).toBe(false);
    });

    // ── TEST B: Bell button click should close dropdown when open ──
    // NOTE: This test may pass even with the bug, because clicking the bell
    // button fires toggleDropdown() directly (no closeDropdown() in between).
    // The event reaches the parent div once and toggles the state once.
    it('[Red] should close dropdown when bell button is clicked while dropdown is open', () => {
      // Open dropdown first
      component.toggleDropdown();
      fixture.detectChanges();

      // Verify dropdown is open before clicking bell
      expect(component.dropdownOpen()).toBe(true);

      // Find and click the bell button
      const bellButton: HTMLButtonElement | null = fixture.nativeElement.querySelector('.bell-button');
      expect(bellButton).toBeTruthy();
      bellButton!.click();
      fixture.detectChanges();

      // The bell button has no click handler of its own, so the event
      // bubbles to the parent div and calls toggleDropdown(), which
      // correctly toggles from true to false.
      expect(component.dropdownOpen()).toBe(false);
    });
  });
});
