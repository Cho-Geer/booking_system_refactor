import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RecentServicesTableComponent } from './recent-services-table.component';
import { By } from '@angular/platform-browser';

describe('RecentServicesTableComponent', () => {
  let component: RecentServicesTableComponent;
  let fixture: ComponentFixture<RecentServicesTableComponent>;

  const mockRows = [
    {
      service: { id: '1', name: 'Haircut', description: 'Standard haircut', duration: 30, price: 25, active: true, createdAt: '2026-01-01T10:00:00Z' },
      statusBadge: 'confirmed' as const,
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecentServicesTableComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(RecentServicesTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('rows', mockRows);
    fixture.detectChanges();
  });

  it('should create', () => expect(component).toBeTruthy());

  it('[Red] should render service name', () => {
    expect(fixture.nativeElement.textContent).toContain('Haircut');
  });

  it('[Red] should emit rowClick when view button clicked', () => {
    const spy = jest.spyOn(component.rowClick, 'emit');
    const btn = fixture.debugElement.query(By.css('app-button'));
    btn.triggerEventHandler('onClick', null);
    expect(spy).toHaveBeenCalledWith(mockRows[0]);
  });
});