import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { WelcomeCardComponent } from './welcome-card.component';
import { By } from '@angular/platform-browser';

describe('WelcomeCardComponent', () => {
  let component: WelcomeCardComponent;
  let fixture: ComponentFixture<WelcomeCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WelcomeCardComponent, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(WelcomeCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('[Red] should display welcome heading', () => {
    const h1 = fixture.nativeElement.querySelector('h1');
    expect(h1).toBeTruthy();
    expect(h1.textContent).toContain('Welcome');
  });

  it('[Red] should display the provided date', () => {
    const testDate = new Date('2026-05-06');
    fixture.componentRef.setInput('today', testDate);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('May');
  });

  it('[Red] should have View Appointments button', () => {
    const button = fixture.debugElement.query(By.css('app-button'));
    expect(button).toBeTruthy();
  });
});
