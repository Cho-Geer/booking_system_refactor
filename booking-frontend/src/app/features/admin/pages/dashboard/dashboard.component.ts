import { Component, computed, inject, OnInit } from '@angular/core';
import { AdminStore } from '../../stores/admin.store';
import { AdminService } from '../../services/admin.service';
import { AppCardComponent } from '../../../../shared/components/atoms/app-card/app-card.component';
import { CurrencyPipe, DatePipe } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [AppCardComponent, CurrencyPipe, DatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly store = inject(AdminStore);
  private readonly adminService = inject(AdminService);

  readonly vm = this.store.vm;

  readonly maxCount = computed(() => {
    const trend = this.vm().stats?.bookingTrend;
    if (!trend || trend.length === 0) return 0;
    return Math.max(...trend.map(t => t.count));
  });

  readonly maxServiceCount = computed(() => {
    const pop = this.vm().stats?.servicePopularity;
    if (!pop || pop.length === 0) return 0;
    return Math.max(...pop.map(p => p.count));
  });

  ngOnInit(): void {
    this.loadStats();
  }

  private loadStats(): void {
    this.store.setLoading(true);
    this.adminService.getStats().subscribe({
      next: (stats) => {
        this.store.setStats(stats);
        this.store.setLoading(false);
      },
      error: (err) => {
        this.store.setError(err.message ?? 'Failed to load stats');
      },
    });
  }
}
