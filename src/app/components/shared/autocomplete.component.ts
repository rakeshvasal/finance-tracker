import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface AutocompleteItem {
  label: string;
  value: any;
  metadata?: any;
}

@Component({
  selector: 'app-autocomplete',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative">
      <input
        type="text"
        [(ngModel)]="searchQuery"
        (input)="onSearch()"
        [placeholder]="placeholder"
        class="w-full px-3 py-2 border rounded-lg"
      />

      @if (isOpen() && results().length > 0) {
        <div class="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          @for (item of results(); track item.value) {
            <div
              (click)="selectItem(item)"
              class="px-3 py-2 hover:bg-gray-100 cursor-pointer"
            >
              <div class="font-medium">{{ item.label }}</div>
              @if (item.metadata) {
                <div class="text-sm text-gray-500">{{ item.metadata }}</div>
              }
            </div>
          }
        </div>
      }
    </div>
  `
})
export class AutocompleteComponent {
  @Input() placeholder = 'Search...';
  @Input() results = signal<AutocompleteItem[]>([]);
  @Output() search = new EventEmitter<string>();
  @Output() select = new EventEmitter<AutocompleteItem>();

  searchQuery = '';
  isOpen = signal<boolean>(false);

  onSearch(): void {
    this.isOpen.set(this.searchQuery.length >= 2);
    if (this.searchQuery.length >= 2) {
      this.search.emit(this.searchQuery);
    }
  }

  selectItem(item: AutocompleteItem): void {
    this.searchQuery = item.label;
    this.isOpen.set(false);
    this.select.emit(item);
  }
}
