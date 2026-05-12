import { Component, input, output, signal, computed, HostListener, ElementRef, inject, effect, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

export interface SearchSuggestion {
  label: string;
  value: string;
}

@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [FormsModule, InputText],
  templateUrl: './app-search-input.component.html',
  styleUrl: './app-search-input.component.scss',
})
export class AppSearchInputComponent implements OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly value = input<string>('');
  readonly placeholder = input<string>('');
  readonly suggestions = input<SearchSuggestion[]>([]);
  readonly debounceMs = input<number>(300);
  readonly minLength = input<number>(1);
  readonly styleClass = input<string>('');

  readonly valueChange = output<string>();
  readonly suggestionSelect = output<string>();

  readonly showDropdown = signal(false);
  readonly inputValue = signal('');

  private readonly _inputChange$ = new Subject<string>();

  constructor() {
    effect(() => {
      this.inputValue.set(this.value());
    });

    this._inputChange$.pipe(
      debounceTime(this.debounceMs()),
      distinctUntilChanged(),
    ).subscribe(value => {
      this.valueChange.emit(value);
    });
  }

  readonly filteredSuggestions = computed(() => {
    const query = this.inputValue().toLowerCase().trim();
    if (query.length < this.minLength()) return [];
    return this.suggestions().filter(s =>
      s.label.toLowerCase().includes(query) || s.value.toLowerCase().includes(query)
    );
  });

  onValueChange(value: string): void {
    this.inputValue.set(value);
    this.showDropdown.set(value.length >= this.minLength());
    this._inputChange$.next(value);
  }

  onFocus(): void {
    if (this.inputValue().length >= this.minLength()) {
      this.showDropdown.set(true);
    }
  }

  selectSuggestion(suggestion: SearchSuggestion): void {
    this.inputValue.set(suggestion.label);
    this.showDropdown.set(false);
    this.suggestionSelect.emit(suggestion.label);
    this._inputChange$.next(suggestion.label);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target as Node)) {
      this.showDropdown.set(false);
    }
  }

  @HostListener('keydown.escape')
  onEscape(): void {
    this.showDropdown.set(false);
  }

  @HostListener('keydown.enter')
  onEnter(): void {
    if (this.showDropdown() && this.filteredSuggestions().length > 0) {
      this.selectSuggestion(this.filteredSuggestions()[0]);
    }
  }

  ngOnDestroy(): void {
    this._inputChange$.complete();
  }
}
