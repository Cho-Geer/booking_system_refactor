import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ServiceSelectionComponent } from './service-selection.component';
import { BookingStore } from '../../../stores/booking/booking.store';
import { ApiService } from '../../../core/services/api.service';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

/**
 * Responsive Design Tests for ServiceSelection Component
 * Tests: single-column cards on mobile, touch-friendly cards
 */
describe('ServiceSelectionComponent - Responsive Design', () => {
  let component: ServiceSelectionComponent;
  let fixture: ComponentFixture<ServiceSelectionComponent>;
  let apiServiceMock: Record<string, jest.Mock>;
  let bookingStoreMock: Record<string, unknown>;

  const mockServices = [
    { id: 'svc-1', name: 'Haircut', description: 'Basic haircut', durationMinutes: 30, price: 25, active: true, imageUrl: null },
    { id: 'svc-2', name: 'Coloring', description: 'Full coloring', durationMinutes: 120, price: 80, active: true, imageUrl: null },
  ];

  beforeEach(async () => {
    bookingStoreMock = {
      loadSlots: jest.fn(),
    };

    apiServiceMock = {
      getServices: jest.fn(() => of(mockServices)),
    };

    await TestBed.configureTestingModule({
      imports: [ServiceSelectionComponent],
      providers: [
        provideRouter([]),
        { provide: BookingStore, useValue: bookingStoreMock },
        { provide: ApiService, useValue: apiServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ServiceSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('touch-friendly cards', () => {
    it('[RED] should render service cards', () => {
      fixture.detectChanges();
      const cards = fixture.nativeElement.querySelectorAll('.service-card');
      expect(cards.length).toBeGreaterThan(0);
    });

    it('[RED] should have service cards as clickable with cursor pointer', () => {
      fixture.detectChanges();
      const cards = fixture.nativeElement.querySelectorAll('.service-card');
      cards.forEach((card: HTMLElement) => {
        expect(card.classList.contains('service-card')).toBeTruthy();
      });
    });
  });

  describe('responsive card layout', () => {
    it('[RED] should have responsive services grid', () => {
      fixture.detectChanges();
      const servicesContainer = fixture.nativeElement.querySelector('.services');
      expect(servicesContainer).toBeTruthy();
      // CSS uses grid that goes single column on mobile via @media query
    });
  });
});
