import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { NotFoundPageComponent } from './not-found-page.component';

describe('NotFoundPageComponent', () => {
  let component: NotFoundPageComponent;
  let fixture: ComponentFixture<NotFoundPageComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotFoundPageComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(NotFoundPageComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should display "404" prominently', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const heading = compiled.querySelector('h1');
    expect(heading).toBeTruthy();
    expect(heading?.textContent).toContain('404');
  });

  it('should display "Page Not Found" message', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Page Not Found');
  });

  it('should display descriptive error text', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain(
      "The page you're looking for doesn't exist."
    );
  });

  it('should have a "Back to Home" button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector('button');
    expect(button).toBeTruthy();
    expect(button?.textContent).toContain('Back to Home');
  });

  it('should navigate to "/booking" when "Back to Home" button is clicked', () => {
    const button = fixture.debugElement.query(By.css('button'));
    expect(button).toBeTruthy();

    const navigateSpy = spyOn(router, 'navigateByUrl');
    button.nativeElement.click();

    expect(navigateSpy).toHaveBeenCalledWith('/booking');
  });
});
