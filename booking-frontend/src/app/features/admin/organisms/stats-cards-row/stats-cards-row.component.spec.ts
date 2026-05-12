import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatsCardsRowComponent } from './stats-cards-row.component';
import { By } from '@angular/platform-browser';

describe('StatsCardsRowComponent', () => {
  let component: StatsCardsRowComponent;
  let fixture: ComponentFixture<StatsCardsRowComponent>;

  const mockCards = [
    {
      label: "Today's Bookings",
      value: 24, icon: 'pi pi-calendar',
      iconBg: 'bg-accent-green/10', iconColor: 'text-accent-green',
      trend: '+12%', trendUp: true, progress: 75, target: 32,
      color: 'from-accent-green to-accent-green-dark',
    },
    {
      label: 'Pending Confirmation',
      value: 5, icon: 'pi pi-clock',
      iconBg: 'bg-accent-yellow/10', iconColor: 'text-accent-yellow',
      trend: '-3%', trendUp: false, progress: 30, target: 17,
      color: 'from-accent-yellow to-accent-orange',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatsCardsRowComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StatsCardsRowComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('cards', mockCards);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('[Red] should render stat-card for each item', () => {
    const cards = fixture.debugElement.queryAll(By.css('app-stat-card'));
    expect(cards.length).toBe(2);
  });

  it('[Red] should pass correct data to first stat-card', () => {
    const cardEl = fixture.debugElement.query(By.css('app-stat-card'));
    expect(cardEl.componentInstance.data()).toEqual(mockCards[0]);
  });

  it('[Red] should render 4-column grid layout', () => {
    const grid = fixture.nativeElement.querySelector('.grid');
    expect(grid).toBeTruthy();
    expect(grid.className).toContain('grid-cols-1');
    expect(grid.className).toContain('lg:grid-cols-4');
  });
});
