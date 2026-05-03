import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ServiceSelectionComponent } from './service-selection.component';
import { BookingStore, TimeSlot } from '../../../stores/booking/booking.store';
import { BookingService } from '../booking.service';
import { ApiService, Service } from '../../../core/services/api.service';
import { of, throwError, Subject } from 'rxjs';

describe('ServiceSelectionComponent', () => {
  let component: ServiceSelectionComponent;
  let fixture: ComponentFixture<ServiceSelectionComponent>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let storeMock: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let bookingServiceMock: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let apiServiceMock: any;

  const mockServices: Service[] = [
    { id: 'svc-1', name: 'Haircut', description: 'Standard haircut', durationMinutes: 30, price: 25 },
    { id: 'svc-2', name: 'Coloring', description: 'Hair coloring', durationMinutes: 60, price: 50 },
    { id: 'svc-3', name: 'Styling', description: 'Hair styling', durationMinutes: 45, price: 35 },
  ];

  beforeEach(async () => {
    storeMock = {
      slots: jest.fn(() => []),
      selectedSlot: jest.fn(() => null),
      isLoading: jest.fn(() => false),
      error: jest.fn(() => null),
      activeBookings: jest.fn(() => []),
      availableSlots: jest.fn(() => []),
      bookedSlots: jest.fn(() => []),
      hasSelection: jest.fn(() => false),
      loadSlots: jest.fn(),
      selectSlot: jest.fn(),
      bookSlot: jest.fn(),
      cancelBooking: jest.fn(),
      setLoading: jest.fn(),
      setError: jest.fn(),
      setSelectedServiceId: jest.fn(),
    };

    bookingServiceMock = {
      generatePreferSeq: jest.fn(() => 3),
      generateIdempotencyKey: jest.fn(() => 'key-123'),
      reserveSlot: jest.fn(),
      cancelBooking: jest.fn(),
    };

    apiServiceMock = {
      getServices: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ServiceSelectionComponent],
      providers: [
        { provide: BookingStore, useValue: storeMock },
        { provide: BookingService, useValue: bookingServiceMock },
        { provide: ApiService, useValue: apiServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ServiceSelectionComponent);
    component = fixture.componentInstance;
  });

  describe('initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize services signal as empty array', () => {
      expect(component.services()).toEqual([]);
    });

    it('should initialize selectedServiceId signal as null', () => {
      expect(component.selectedServiceId()).toBeNull();
    });

    it('should initialize isLoading signal as false', () => {
      expect(component.isLoading()).toBe(false);
    });

    it('should initialize searchQuery as empty', () => {
      expect(component.searchQuery()).toBe('');
    });

    it('should initialize activeCategory as null', () => {
      expect(component.activeCategory()).toBeNull();
    });

    it('should call loadServices in ngOnInit', () => {
      apiServiceMock.getServices.mockReturnValue(of(mockServices));
      fixture.detectChanges();

      expect(apiServiceMock.getServices).toHaveBeenCalled();
    });
  });

  describe('loadServices()', () => {
    it('should set isLoading to true before API call', () => {
      const subject = new Subject<typeof mockServices>();
      apiServiceMock.getServices.mockReturnValue(subject.asObservable());

      component.isLoading.set(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (component as any).loadServices();

      expect(component.isLoading()).toBe(true);

      subject.next(mockServices);
      subject.complete();
    });

    it('should populate services signal on successful API response', () => {
      apiServiceMock.getServices.mockReturnValue(of(mockServices));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (component as any).loadServices();

      expect(component.services()).toEqual(mockServices);
    });

    it('should set isLoading to false on successful API response', () => {
      apiServiceMock.getServices.mockReturnValue(of(mockServices));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (component as any).loadServices();

      expect(component.isLoading()).toBe(false);
    });

    it('should set isLoading to false on API error', () => {
      apiServiceMock.getServices.mockReturnValue(throwError(() => new Error('Network error')));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (component as any).loadServices();

      expect(component.isLoading()).toBe(false);
    });

    it('should handle empty services list', () => {
      apiServiceMock.getServices.mockReturnValue(of([]));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (component as any).loadServices();

      expect(component.services()).toEqual([]);
      expect(component.isLoading()).toBe(false);
    });
  });

  describe('selectService()', () => {
    it('should set selectedServiceId to the selected service id', () => {
      const service = mockServices[0];
      component.selectService(service);

      expect(component.selectedServiceId()).toBe('svc-1');
    });

    it('should call store.loadSlots with empty array', () => {
      const service = mockServices[0];
      component.selectService(service);

      expect(storeMock.loadSlots).toHaveBeenCalledWith([]);
    });

    it('should update selection when different service is selected', () => {
      component.selectService(mockServices[0]);
      expect(component.selectedServiceId()).toBe('svc-1');

      component.selectService(mockServices[1]);
      expect(component.selectedServiceId()).toBe('svc-2');
    });

    it('should call store.setSelectedServiceId with service id', () => {
      const service = mockServices[0];
      component.selectService(service);

      expect(storeMock.setSelectedServiceId).toHaveBeenCalledWith('svc-1');
    });
  });

  describe('isSelected()', () => {
    it('should return true for selected service', () => {
      component.selectedServiceId.set('svc-1');
      const service = mockServices[0];

      expect(component.isSelected(service)).toBe(true);
    });

    it('should return false for non-selected service', () => {
      component.selectedServiceId.set('svc-1');
      const service = mockServices[1];

      expect(component.isSelected(service)).toBe(false);
    });

    it('should return false when no service is selected', () => {
      component.selectedServiceId.set(null);

      expect(component.isSelected(mockServices[0])).toBe(false);
    });
  });

  describe('search and filter', () => {
    beforeEach(() => {
      component.services.set(mockServices);
    });

    it('should filter services by search query', () => {
      component.onSearchInput('color');
      expect(component.filteredServices().length).toBe(1); // Coloring
    });

    it('should return all services with empty search', () => {
      component.onSearchInput('');
      expect(component.filteredServices().length).toBe(3);
    });

    it('should return empty when search matches nothing', () => {
      component.onSearchInput('zzzzzz');
      expect(component.filteredServices().length).toBe(0);
    });

    it('should set category filter', () => {
      component.setCategoryFilter('Haircut');
      expect(component.activeCategory()).toBe('Haircut');
    });

    it('should clear category filter with null', () => {
      component.setCategoryFilter('Haircut');
      component.setCategoryFilter(null);
      expect(component.activeCategory()).toBeNull();
    });
  });

  describe('categories computed', () => {
    it('should derive categories from service names', () => {
      component.services.set(mockServices);
      const cats = component.categories();
      expect(cats.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty categories when no services', () => {
      component.services.set([]);
      expect(component.categories().length).toBe(0);
    });
  });

  describe('template rendering', () => {
    beforeEach(() => {
      apiServiceMock.getServices.mockReturnValue(of(mockServices));
      fixture.detectChanges();
    });

    it('should render service card wrappers for each service', () => {
      const cards = fixture.nativeElement.querySelectorAll('.service-card-wrapper');
      expect(cards.length).toBe(3);
    });

    it('should render service name in each card', () => {
      const cards = fixture.nativeElement.querySelectorAll('.service-card-wrapper');
      const texts = cards[0].textContent || '';
      expect(texts).toContain('Haircut');
    });

    it('should render service description', () => {
      const cards = fixture.nativeElement.querySelectorAll('.service-card-wrapper');
      expect(cards[0].textContent).toContain('Standard haircut');
    });

    it('should render service duration', () => {
      const cards = fixture.nativeElement.querySelectorAll('.service-card-wrapper');
      expect(cards[0].textContent).toContain('30');
      expect(cards[0].textContent).toContain('分钟');
    });

    it('should render service price', () => {
      const cards = fixture.nativeElement.querySelectorAll('.service-card-wrapper');
      expect(cards[0].textContent).toContain('$25');
    });

    it('should not show loading state when not loading', () => {
      const skeleton = fixture.nativeElement.querySelector('[role="status"]');
      expect(skeleton).toBeFalsy();
    });

    it('should show loading skeleton when isLoading is true', () => {
      component.isLoading.set(true);
      fixture.detectChanges();

      const skeleton = fixture.nativeElement.querySelector('[role="status"]');
      expect(skeleton).toBeTruthy();
      const skeletonItems = skeleton.querySelectorAll('.skeleton');
      expect(skeletonItems.length).toBeGreaterThan(0);
    });

    it('should highlight selected service card with selected class', () => {
      component.selectService(mockServices[0]);
      fixture.detectChanges();

      const wrappers = fixture.nativeElement.querySelectorAll('.service-card-wrapper');
      expect(wrappers[0].classList.contains('selected')).toBe(true);
      expect(wrappers[1].classList.contains('selected')).toBe(false);
    });

    it('should have app-card with gradient-card-selected when selected', () => {
      component.selectService(mockServices[0]);
      fixture.detectChanges();

      const cards = fixture.nativeElement.querySelectorAll('.service-card');
      expect(cards[0].classList.contains('gradient-card-selected')).toBe(true);
    });

    it('[RED] should have services-page class on container', () => {
      const container = fixture.nativeElement.querySelector('.services-page');
      expect(container).toBeTruthy();
    });

    it('[RED] should have gradient-text class on header', () => {
      const header = fixture.nativeElement.querySelector('.gradient-text');
      expect(header).toBeTruthy();
      expect(header.textContent).toContain('选择服务');
    });
  });

  describe('user interaction', () => {
    beforeEach(() => {
      apiServiceMock.getServices.mockReturnValue(of(mockServices));
      fixture.detectChanges();
    });

    it('should select service on card wrapper click', () => {
      const wrappers = fixture.nativeElement.querySelectorAll('.service-card-wrapper');
      wrappers[0].click();

      expect(component.selectedServiceId()).toBe('svc-1');
    });

    it('should select service on Enter key press on wrapper', () => {
      const wrappers = fixture.nativeElement.querySelectorAll('.service-card-wrapper');
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      wrappers[1].dispatchEvent(event);

      expect(component.selectedServiceId()).toBe('svc-2');
    });

    it('should change selection when clicking different wrappers', () => {
      const wrappers = fixture.nativeElement.querySelectorAll('.service-card-wrapper');

      wrappers[0].click();
      expect(component.selectedServiceId()).toBe('svc-1');

      wrappers[2].click();
      expect(component.selectedServiceId()).toBe('svc-3');
    });
  });

  describe('error state', () => {
    it('should handle empty services gracefully', () => {
      apiServiceMock.getServices.mockReturnValue(of([]));
      fixture.detectChanges();

      const wrappers = fixture.nativeElement.querySelectorAll('.service-card-wrapper');
      expect(wrappers.length).toBe(0);
    });
  });

  describe('skeleton shimmer loading', () => {
    beforeEach(() => {
      apiServiceMock.getServices.mockReturnValue(of(mockServices));
      fixture.detectChanges();
      component.isLoading.set(true);
      fixture.detectChanges();
    });

    it('[RED] should show skeleton shimmer loading when isLoading is true', () => {
      const skeleton = fixture.nativeElement.querySelector('[role="status"]');
      expect(skeleton).toBeTruthy();
      const skeletons = skeleton.querySelectorAll('.skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('[RED] should have skeleton placeholder elements for shimmer effect', () => {
      const skeleton = fixture.nativeElement.querySelector('[role="status"]');
      expect(skeleton).toBeTruthy();
    });
  });
});
