import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { BookingStore } from '../../../stores/booking/booking.store';
import { BookingService } from '../booking.service';
import { Service, ApiService } from '../../../core/services/api.service';
import { AppCardComponent } from '../../../shared/components/atoms/app-card/app-card.component';
import { AppInputComponent } from '../../../shared/components/atoms/app-input/app-input.component';
import { AppEmptyStateComponent } from '../../../shared/components/atoms/app-empty-state/app-empty-state.component';

export interface ServiceCategory {
  id: string;
  name: string;
}

@Component({
  selector: 'app-service-selection',
  standalone: true,
  imports: [
    CurrencyPipe,
    AppCardComponent,
    AppInputComponent,
    AppEmptyStateComponent,
  ],
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

  // Search & filter
  searchQuery = signal('');
  activeCategory = signal<string | null>(null);

  // Derived categories from services
  categories = computed<ServiceCategory[]>(() => {
    // For demo, use first word of name as category
    const cats = new Set<string>();
    this.services().forEach(s => {
      const cat = s.name.split(' ')[0] || 'General';
      cats.add(cat);
    });
    return Array.from(cats).map(c => ({ id: c, name: c }));
  });

  // Filtered services based on search and category
  filteredServices = computed(() => {
    let result = this.services();
    const query = this.searchQuery().toLowerCase().trim();
    const category = this.activeCategory();

    if (query) {
      result = result.filter(
        s => s.name.toLowerCase().includes(query) || s.description.toLowerCase().includes(query)
      );
    }

    if (category) {
      result = result.filter(s => (s.name.split(' ')[0] || 'General') === category);
    }

    return result;
  });

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
    this.store.setSelectedServiceId(service.id);
    this.store.loadSlots([]);
    this.loadSlotsForService(service.id);
  }

  private loadSlotsForService(serviceId: string): void {
    // This would typically load slots from the API
    // For now, we're just marking the service as selected
  }

  isSelected(service: Service): boolean {
    return this.selectedServiceId() === service.id;
  }

  setCategoryFilter(category: string | null): void {
    this.activeCategory.set(category);
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
  }
}
