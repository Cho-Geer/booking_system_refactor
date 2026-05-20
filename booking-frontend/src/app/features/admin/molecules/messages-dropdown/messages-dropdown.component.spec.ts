import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessagesDropdownComponent } from './messages-dropdown.component';
import { AdminService } from '../../services/admin.service';
import { of } from 'rxjs';

describe('MessagesDropdownComponent', () => {
  let component: MessagesDropdownComponent;
  let fixture: ComponentFixture<MessagesDropdownComponent>;
  let mockAdminService: jest.Mocked<AdminService>;

  beforeEach(async () => {
    mockAdminService = {
      getMessageUnreadCount: jest.fn().mockReturnValue(of({ count: 5 })),
      getMessages: jest.fn().mockReturnValue(of({ items: [], total: 0, page: 1, limit: 20 })),
    } as unknown as jest.Mocked<AdminService>;

    await TestBed.configureTestingModule({
      imports: [MessagesDropdownComponent],
      providers: [
        { provide: AdminService, useValue: mockAdminService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MessagesDropdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── TEST: Component creation ───────────────────────────
  it('[Red] should create the component', () => {
    expect(component).toBeTruthy();
  });

  // ── TEST: Envelope icon button display ──────────────────
  it('[Red] should display envelope icon button', () => {
    const envelopeButton: HTMLButtonElement | null = fixture.nativeElement.querySelector('.envelope-button');
    expect(envelopeButton).toBeTruthy();
  });

  // ── TEST: Dropdown opens when envelope icon is clicked ──
  it('[Red] should open dropdown when envelope icon is clicked', () => {
    expect(component.dropdownOpen()).toBe(false);

    const envelopeButton: HTMLButtonElement | null = fixture.nativeElement.querySelector('.envelope-button');
    expect(envelopeButton).toBeTruthy();
    envelopeButton!.click();
    fixture.detectChanges();

    expect(component.dropdownOpen()).toBe(true);
  });

  // ── TEST: Dropdown closes when envelope icon is clicked again ──
  it('[Red] should close dropdown when envelope icon is clicked again while open', () => {
    // Open dropdown first
    component.toggleDropdown();
    fixture.detectChanges();
    expect(component.dropdownOpen()).toBe(true);

    // Click envelope button again
    const envelopeButton: HTMLButtonElement | null = fixture.nativeElement.querySelector('.envelope-button');
    expect(envelopeButton).toBeTruthy();
    envelopeButton!.click();
    fixture.detectChanges();

    expect(component.dropdownOpen()).toBe(false);
  });

  // ── TEST: Unread count badge display ────────────────────
  it('[Red] should display unread count badge', () => {
    component.messageCount.set(5);
    fixture.detectChanges();

    const badge: HTMLElement | null = fixture.nativeElement.querySelector('.unread-badge');
    expect(badge).toBeTruthy();
    expect(badge!.textContent).toContain('5');
  });

  // ── TEST: Close button (X) should close dropdown ────────
  it('[Red] should close dropdown when close button (X) is clicked', () => {
    // Open dropdown first
    component.toggleDropdown();
    fixture.detectChanges();
    expect(component.dropdownOpen()).toBe(true);

    // Find and click the close button (X)
    const closeButton: HTMLButtonElement | null = fixture.nativeElement.querySelector('.close-btn');
    expect(closeButton).toBeTruthy();
    closeButton!.click();
    fixture.detectChanges();

    expect(component.dropdownOpen()).toBe(false);
  });
});
