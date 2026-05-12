import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatCardComponent } from './stat-card.component';
import { By } from '@angular/platform-browser';

describe('StatCardComponent', () => {
  let component: StatCardComponent;
  let fixture: ComponentFixture<StatCardComponent>;

  const mockData = {
    label: "Today's Bookings",
    value: 24,
    icon: 'pi pi-calendar',
    iconBg: 'bg-accent-green/10',
    iconColor: 'text-accent-green',
    trend: '+12%',
    trendUp: true,
    progress: 75,
    target: 32,
    color: 'from-accent-green to-accent-green-dark',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StatCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('data', mockData);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('[Red] should display the card label', () => {
    const el = fixture.nativeElement;
    expect(el.textContent).toContain("Today's Bookings");
  });

  it('[Red] should display the card value', () => {
    const el = fixture.nativeElement;
    expect(el.textContent).toContain('24');
  });

  it('[Red] should display the correct icon', () => {
    const icon = fixture.nativeElement.querySelector('.pi-calendar');
    expect(icon).toBeTruthy();
  });

  it('[Red] should display trend indicator', () => {
    const el = fixture.nativeElement;
    expect(el.textContent).toContain('+12%');
  });

  it('[Red] should display target value', () => {
    const el = fixture.nativeElement;
    expect(el.textContent).toContain('Target:');
    expect(el.textContent).toContain('32');
  });

  it('[Red] should display progress percentage', () => {
    const el = fixture.nativeElement;
    expect(el.textContent).toContain('75%');
  });
});
