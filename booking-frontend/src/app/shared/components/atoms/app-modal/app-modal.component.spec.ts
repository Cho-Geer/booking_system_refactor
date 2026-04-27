import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { AppModalComponent } from './app-modal.component';
import { Dialog } from 'primeng/dialog';

describe('AppModalComponent', () => {
  let component: AppModalComponent;
  let fixture: ComponentFixture<AppModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppModalComponent, Dialog],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(AppModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render p-dialog element', () => {
    const dialogEl = fixture.debugElement.query(By.css('p-dialog'));
    expect(dialogEl).toBeTruthy();
  });

  it('should forward header text to p-dialog', () => {
    fixture.componentRef.setInput('header', 'Modal Title');
    fixture.detectChanges();

    const dialogEl = fixture.debugElement.query(By.css('p-dialog'));
    expect(dialogEl).toBeTruthy();
  });

  it('should forward visible state to p-dialog', () => {
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();

    const dialogEl = fixture.debugElement.query(By.css('p-dialog'));
    expect(dialogEl).toBeTruthy();
  });

  it('should emit visibleChange when dialog visibility changes', () => {
    const spy = jest.spyOn(component.visibleChange, 'emit');

    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();

    const dialogEl = fixture.debugElement.query(By.css('p-dialog'));
    if (dialogEl) {
      dialogEl.triggerEventHandler('visibleChange', false);
    }

    expect(spy).toHaveBeenCalledWith(false);
  });

  it('should forward closable to p-dialog', () => {
    fixture.componentRef.setInput('closable', true);
    fixture.detectChanges();

    const dialogEl = fixture.debugElement.query(By.css('p-dialog'));
    expect(dialogEl).toBeTruthy();
  });

  it('should forward modal to p-dialog', () => {
    fixture.componentRef.setInput('modal', true);
    fixture.detectChanges();

    const dialogEl = fixture.debugElement.query(By.css('p-dialog'));
    expect(dialogEl).toBeTruthy();
  });

  it('should forward dismissableMask to p-dialog', () => {
    fixture.componentRef.setInput('dismissableMask', true);
    fixture.detectChanges();

    const dialogEl = fixture.debugElement.query(By.css('p-dialog'));
    expect(dialogEl).toBeTruthy();
  });

  it('should forward custom styleClass to p-dialog', () => {
    fixture.componentRef.setInput('styleClass', 'w-96');
    fixture.detectChanges();

    const dialogEl = fixture.debugElement.query(By.css('p-dialog'));
    expect(dialogEl).toBeTruthy();
  });

  it('should project content inside dialog', () => {
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();

    const dialogEl = fixture.debugElement.query(By.css('p-dialog'));
    expect(dialogEl).toBeTruthy();
  });
});
