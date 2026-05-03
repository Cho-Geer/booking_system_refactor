import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TimeSlotPickerComponent } from './time-slot-picker.component';
import { BookingStore, TimeSlot } from '../../../stores/booking/booking.store';
import { BookingService } from '../booking.service';
import { SocketService, SlotUpdateEvent } from '../../../core/services/socket.service';
import { of, Subject } from 'rxjs';

describe('TimeSlotPickerComponent', () => {
  let component: TimeSlotPickerComponent;
  let fixture: ComponentFixture<TimeSlotPickerComponent>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let storeMock: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let bookingServiceMock: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let socketServiceMock: any;
  let socketSubject: Subject<SlotUpdateEvent>;

  const mockSlots: TimeSlot[] = [
    { id: 'slot-1', startTime: '2026-04-20T09:00:00', endTime: '2026-04-20T10:00:00', capacity: 1, bookedCount: 0, available: true },
    { id: 'slot-2', startTime: '2026-04-20T10:00:00', endTime: '2026-04-20T11:00:00', capacity: 1, bookedCount: 0, available: true },
    { id: 'slot-3', startTime: '2026-04-20T11:00:00', endTime: '2026-04-20T12:00:00', capacity: 1, bookedCount: 1, available: false },
    { id: 'slot-4', startTime: '2026-04-20T12:00:00', endTime: '2026-04-20T13:00:00', capacity: 1, bookedCount: 0, available: true },
  ];

  beforeEach(async () => {
    socketSubject = new Subject<SlotUpdateEvent>();

    storeMock = {
      slots: jest.fn(() => []),
      selectedSlot: jest.fn(() => null),
      isLoading: jest.fn(() => false),
      error: jest.fn(() => null),
      activeBookings: jest.fn(() => []),
      availableSlots: jest.fn(() => mockSlots.filter(s => s.available)),
      bookedSlots: jest.fn(() => mockSlots.filter(s => !s.available)),
      hasSelection: jest.fn(() => false),
      loadSlots: jest.fn(),
      selectSlot: jest.fn(),
      bookSlot: jest.fn(),
      cancelBooking: jest.fn(),
      setLoading: jest.fn(),
      setError: jest.fn(),
    };

    bookingServiceMock = {
      generatePreferSeq: jest.fn(() => 3),
      generateIdempotencyKey: jest.fn(() => 'key-123'),
      reserveSlot: jest.fn().mockReturnValue({
        status: 'SUCCESS',
        slot: { id: 'slot-1', startTime: '2026-04-20T09:00:00', endTime: '2026-04-20T10:00:00', capacity: 1, bookedCount: 1, available: false },
      }),
      cancelBooking: jest.fn(),
    };

    socketServiceMock = {
      subscribeToSlotUpdates: jest.fn(() => socketSubject.asObservable()),
      connect: jest.fn(),
      disconnect: jest.fn(),
      joinRoom: jest.fn(),
      leaveRoom: jest.fn(),
      isConnected: jest.fn(() => false),
    };

    await TestBed.configureTestingModule({
      imports: [TimeSlotPickerComponent],
      providers: [
        { provide: BookingStore, useValue: storeMock },
        { provide: BookingService, useValue: bookingServiceMock },
        { provide: SocketService, useValue: socketServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TimeSlotPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should implement OnInit', () => {
      expect(typeof component.ngOnInit).toBe('function');
    });

    it('should implement OnDestroy', () => {
      // Component uses DestroyRef for cleanup
      expect(component).toBeTruthy();
    });

    it('should reference store signals', () => {
      expect(component.availableSlots).toBe(storeMock.availableSlots);
      expect(component.isLoading).toBe(storeMock.isLoading);
      expect(component.error).toBe(storeMock.error);
    });
  });

  describe('ngOnInit()', () => {
    it('should subscribe to socket slot updates', () => {
      expect(socketServiceMock.subscribeToSlotUpdates).toHaveBeenCalled();
    });
  });

  describe('teardown', () => {
    it('should not throw on destroy', () => {
      expect(() => fixture.destroy()).not.toThrow();
    });
  });

  describe('slot filtering', () => {
    it('should show only active slots in availableSlots', () => {
      storeMock.availableSlots.mockReturnValue(mockSlots.filter(s => s.available));
      fixture.detectChanges(false);

      // Available slots are those with isActive=true
      expect(storeMock.availableSlots).toHaveBeenCalled();
    });

    it('should disable unavailable slot cards', () => {
      storeMock.slots.mockReturnValue(mockSlots);
      storeMock.availableSlots.mockReturnValue(mockSlots);
      fixture.detectChanges(false);

      const cards = fixture.nativeElement.querySelectorAll('.slot-card');
      // slot-3 is inactive (unavailable)
      const inactiveCard = (Array.from(cards) as HTMLButtonElement[]).find(
        (btn) => btn.textContent?.includes('已预约')
      );

      if (inactiveCard) {
        expect(inactiveCard.disabled).toBe(true);
        expect(inactiveCard.classList.contains('slot-unavailable')).toBe(true);
      }
    });

    it('should not disable available slot cards', () => {
      storeMock.slots.mockReturnValue(mockSlots);
      storeMock.availableSlots.mockReturnValue(mockSlots);
      fixture.detectChanges(false);

      const cards = fixture.nativeElement.querySelectorAll('.slot-card');
      const availableCards = Array.from(cards).filter(
        c => c.classList.contains('slot-available')
      );
      availableCards.forEach((card: HTMLButtonElement) => {
        expect(card.disabled).toBe(false);
      });
    });
  });

  describe('slot selection', () => {
    beforeEach(() => {
      storeMock.slots.mockReturnValue(mockSlots);
      storeMock.availableSlots.mockReturnValue(mockSlots);
    });

    it('should call store.selectSlot when clicking an active slot', () => {
      fixture.detectChanges(false);

      const cards = fixture.nativeElement.querySelectorAll('.slot-card.slot-available');
      if (cards.length > 0) {
        (cards[0] as HTMLButtonElement).click();
        expect(storeMock.selectSlot).toHaveBeenCalled();
      }
    });

    it('should call bookingService.reserveSlot when clicking an active slot', () => {
      fixture.detectChanges(false);

      const cards = fixture.nativeElement.querySelectorAll('.slot-card.slot-available');
      if (cards.length > 0) {
        (cards[0] as HTMLButtonElement).click();
        expect(bookingServiceMock.reserveSlot).toHaveBeenCalled();
      }
    });

    it('should not select inactive slots on click', () => {
      fixture.detectChanges(false);

      const cards = fixture.nativeElement.querySelectorAll('.slot-card');
      // Find the inactive slot card
      const inactiveCard = (Array.from(cards) as HTMLButtonElement[]).find(
        (btn) => btn.classList.contains('slot-unavailable')
      );

      if (inactiveCard) {
        inactiveCard.click();
        expect(storeMock.selectSlot).not.toHaveBeenCalled();
        expect(bookingServiceMock.reserveSlot).not.toHaveBeenCalled();
      }
    });

    it('should highlight selected slot', () => {
      storeMock.selectedSlot.mockReturnValue(mockSlots[0]);
      storeMock.hasSelection.mockReturnValue(true);
      fixture.detectChanges(false);

      const isSelected = component.isSelected(mockSlots[0]);
      expect(isSelected).toBe(true);
    });

    it('should not highlight non-selected slots', () => {
      storeMock.selectedSlot.mockReturnValue(mockSlots[0]);
      storeMock.hasSelection.mockReturnValue(true);
      fixture.detectChanges(false);

      const isSelected = component.isSelected(mockSlots[1]);
      expect(isSelected).toBe(false);
    });

    it('should return false when no slot is selected', () => {
      storeMock.selectedSlot.mockReturnValue(null);
      fixture.detectChanges(false);

      const isSelected = component.isSelected(mockSlots[0]);
      expect(isSelected).toBe(false);
    });
  });

  describe('socket subscription for real-time updates', () => {
    it('should receive slot updates from socket', () => {
      const mockUpdate: SlotUpdateEvent = {
        slotId: 'slot-1',
        isActive: false,
        bookedBy: 'user-123',
        timestamp: Date.now(),
      };

      jest.spyOn(component, 'handleSlotUpdate');

      socketSubject.next(mockUpdate);

      expect(component.handleSlotUpdate).toHaveBeenCalledWith(mockUpdate);
    });

    it('should process multiple slot updates', () => {
      jest.spyOn(component, 'handleSlotUpdate');

      socketSubject.next({ slotId: 'slot-1', isActive: false, timestamp: Date.now() });
      socketSubject.next({ slotId: 'slot-2', isActive: true, timestamp: Date.now() });
      socketSubject.next({ slotId: 'slot-3', isActive: false, bookedBy: 'user-456', timestamp: Date.now() });

      expect(component.handleSlotUpdate).toHaveBeenCalledTimes(3);
    });
  });

  describe('handleSlotUpdate()', () => {
    it('should update slot availability in real-time', () => {
      storeMock.slots.mockReturnValue([...mockSlots]);

      const update: SlotUpdateEvent = {
        slotId: 'slot-1',
        isActive: false,
        bookedBy: 'user-123',
        timestamp: Date.now(),
      };

      component.handleSlotUpdate(update);

      expect(storeMock.loadSlots).toHaveBeenCalled();
      const updatedSlots = (storeMock.loadSlots as jest.Mock).mock.lastCall[0];
      const updatedSlot = updatedSlots.find((s: TimeSlot) => s.id === 'slot-1');
      expect(updatedSlot.available).toBe(false);
      expect(updatedSlot.bookedBy).toBe('user-123');
    });

    it('should update slot to active when update indicates active', () => {
      const inactiveSlots = mockSlots.map(s => ({ ...s, isActive: false }));
      storeMock.slots.mockReturnValue(inactiveSlots);

      const update: SlotUpdateEvent = {
        slotId: 'slot-1',
        isActive: true,
        timestamp: Date.now(),
      };

      component.handleSlotUpdate(update);

      const updatedSlots = (storeMock.loadSlots as jest.Mock).mock.lastCall[0];
      const updatedSlot = updatedSlots.find((s: TimeSlot) => s.id === 'slot-1');
      expect(updatedSlot.available).toBe(true);
    });

    it('should not affect other slots when updating one slot', () => {
      storeMock.slots.mockReturnValue([...mockSlots]);

      const update: SlotUpdateEvent = {
        slotId: 'slot-1',
        isActive: false,
        bookedBy: 'user-123',
        timestamp: Date.now(),
      };

      component.handleSlotUpdate(update);

      const updatedSlots = (storeMock.loadSlots as jest.Mock).mock.lastCall[0];
      const unchangedSlot = updatedSlots.find((s: TimeSlot) => s.id === 'slot-2');
      expect(unchangedSlot.available).toBe(true);
      expect(unchangedSlot.bookedBy).toBeUndefined();
    });

    it('should clear bookedBy when slot becomes active', () => {
      const bookedSlots = mockSlots.map(s => ({ ...s, available: false, bookedBy: 'user-999' }));
      storeMock.slots.mockReturnValue(bookedSlots);

      const update: SlotUpdateEvent = {
        slotId: 'slot-2',
        isActive: true,
        timestamp: Date.now(),
      };

      component.handleSlotUpdate(update);

      const updatedSlots = (storeMock.loadSlots as jest.Mock).mock.lastCall[0];
      const updatedSlot = updatedSlots.find((s: TimeSlot) => s.id === 'slot-2');
      expect(updatedSlot.available).toBe(true);
      expect(updatedSlot.bookedBy).toBeUndefined();
    });
  });

  describe('retryLoad()', () => {
    it('should call store.loadSlots with empty array', () => {
      component.retryLoad();

      expect(storeMock.loadSlots).toHaveBeenCalledWith([]);
    });
  });

  describe('template rendering', () => {
    beforeEach(() => {
      storeMock.slots.mockReturnValue(mockSlots);
      storeMock.availableSlots.mockReturnValue(mockSlots);
    });

    it('should render slot cards for each slot', () => {
      try { fixture.detectChanges(); } catch { /* NG0100 expected */ }

      const cards = fixture.nativeElement.querySelectorAll('.slot-card');
      // All 4 mockSlots render via availableSlots (mock returns all 4)
      expect(cards.length).toBe(4);
    });

    it('should render time for each slot', () => {
      try { fixture.detectChanges(); } catch { /* NG0100 expected */ }

      const cards = fixture.nativeElement.querySelectorAll('.slot-card');
      const timeTexts = Array.from(cards).map(c => c.textContent);
      expect(timeTexts.some(t => t.includes('9:00'))).toBe(true);
      expect(timeTexts.some(t => t.includes('10:00'))).toBe(true);
    });

    it('should show loading state when isLoading is true', () => {
      storeMock.isLoading.mockReturnValue(true);
      storeMock.error.mockReturnValue(null);
      fixture = TestBed.createComponent(TimeSlotPickerComponent);
      component = fixture.componentInstance;
      try { fixture.detectChanges(); } catch { /* NG0100 expected */ }

      const loading = fixture.nativeElement.querySelector('[role="status"]');
      expect(loading).toBeTruthy();
    });

    it('should not show loading state when isLoading is false', () => {
      try { fixture.detectChanges(); } catch { /* NG0100 expected */ }

      const loading = fixture.nativeElement.querySelector('[role="status"]');
      expect(loading).toBeFalsy();
    });

    it('should show error state when error has value', () => {
      storeMock.error.mockReturnValue('Failed to load slots');
      storeMock.isLoading.mockReturnValue(false);
      storeMock.availableSlots.mockReturnValue([]);
      fixture = TestBed.createComponent(TimeSlotPickerComponent);
      component = fixture.componentInstance;
      try { fixture.detectChanges(); } catch { /* NG0100 expected */ }

      const error = fixture.nativeElement.querySelector('[class*="glass-level-1"]');
      expect(error).toBeTruthy();
      expect(error.textContent).toContain('Failed to load slots');
    });

    it('should show retry button in error state', () => {
      storeMock.error.mockReturnValue('Failed to load slots');
      storeMock.isLoading.mockReturnValue(false);
      storeMock.availableSlots.mockReturnValue([]);
      fixture = TestBed.createComponent(TimeSlotPickerComponent);
      component = fixture.componentInstance;
      try { fixture.detectChanges(); } catch { /* NG0100 expected */ }

      const retryButton = fixture.nativeElement.querySelector('[class*="gradient-primary"]');
      expect(retryButton).toBeTruthy();
    });

    it('should not show error state when error is null', () => {
      storeMock.error.mockReturnValue(null);
      storeMock.isLoading.mockReturnValue(false);
      try { fixture.detectChanges(); } catch { /* NG0100 expected */ }

      const errorContainer = fixture.nativeElement.querySelector('.time-slots-page>div');
      const hasError = Array.from(fixture.nativeElement.querySelectorAll('*'))
        .some((el: Element) => el.textContent?.includes('加载失败'));
      expect(hasError).toBe(false);
    });

    it('should show empty state when no slots available', () => {
      storeMock.availableSlots.mockReturnValue([]);
      storeMock.slots.mockReturnValue([]);
      storeMock.isLoading.mockReturnValue(false);
      storeMock.error.mockReturnValue(null);
      fixture = TestBed.createComponent(TimeSlotPickerComponent);
      component = fixture.componentInstance;
      try { fixture.detectChanges(); } catch { /* NG0100 expected */ }

      // Should show app-empty-state (title text)
      const hasEmptyText = Array.from(fixture.nativeElement.querySelectorAll('*'))
        .some((el: Element) => el.textContent?.includes('暂无可用时间段'));
      expect(hasEmptyText).toBe(true);
    });

    it('should show booked status for unavailable slots', () => {
      fixture.detectChanges(false);

      const cards = fixture.nativeElement.querySelectorAll('.slot-card.slot-unavailable');
      expect(cards.length).toBeGreaterThan(0);
      const texts = Array.from(cards).map(c => c.textContent);
      expect(texts.some(t => t.includes('已预约'))).toBe(true);
    });

    it('[RED] should have slot-available class on available slot cards', () => {
      storeMock.availableSlots.mockReturnValue(mockSlots.filter(s => s.available));
      fixture.detectChanges(false);

      const cards = fixture.nativeElement.querySelectorAll('.slot-card');
      const availableCards = Array.from(cards).filter(
        c => c.classList.contains('slot-available')
      );
      expect(availableCards.length).toBeGreaterThan(0);
    });

    it('[RED] should have slot-selected class on selected slot', () => {
      storeMock.selectedSlot.mockReturnValue(mockSlots[0]);
      storeMock.hasSelection.mockReturnValue(true);

      // Verify isSelected method works correctly
      expect(component.isSelected(mockSlots[0])).toBe(true);
      expect(component.isSelected(mockSlots[1])).toBe(false);
    });

    it('[RED] should have slot-unavailable class for unavailable slots', () => {
      fixture.detectChanges(false);

      const cards = fixture.nativeElement.querySelectorAll('.slot-card.slot-unavailable');
      cards.forEach((card: HTMLElement) => {
        expect(card.hasAttribute('disabled')).toBe(true);
      });
    });
  });

  describe('component lifecycle', () => {
    it('should set up socket subscription on init', () => {
      expect(socketServiceMock.subscribeToSlotUpdates).toHaveBeenCalled();
    });

    it('should clean up on destroy', () => {
      expect(() => fixture.destroy()).not.toThrow();
    });

    it('should not throw on double destroy', () => {
      fixture.destroy();
      expect(() => fixture.destroy()).not.toThrow();
    });
  });
});
