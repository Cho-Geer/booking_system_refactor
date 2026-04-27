import { Component, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { BookingStore } from '../../../stores/booking/booking.store';
import { BookingService } from '../booking.service';
import { Service, ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-service-selection',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './service-selection.component.html',
  styleUrl: './service-selection.component.scss',
})
export class ServiceSelectionComponent implements OnInit {
  private store = inject(BookingStore);
  private bookingService = inject(BookingService);
  private api = inject(ApiService);

  services = signal<Service[]>([]);
  selectedServiceId = signal<string | null>(null);
  isLoading = signal(false);

  ngOnInit(): void {
    this.loadServices();
  }

  private loadServices(): void {
    this.isLoading.set(true);
    this.api.getServices().subscribe({
      next: (services) => {
        this.services.set(services);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  selectService(service: Service): void {
    this.selectedServiceId.set(service.id);
    this.store.loadSlots([]);
    // Load slots for selected service - would call API here
    this.loadSlotsForService(service.id);
  }

  private loadSlotsForService(serviceId: string): void {
    // This would typically load slots from the API
    // For now, we're just marking the service as selected
  }

  isSelected(service: Service): boolean {
    return this.selectedServiceId() === service.id;
  }
}
