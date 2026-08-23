import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-4 right-4 z-50 space-y-2">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          [class]="getToastClass(toast.type)"
          class="px-6 py-4 rounded-lg shadow-lg max-w-md animate-slide-in"
        >
          <div class="flex items-center justify-between">
            <span>{{ toast.message }}</span>
            <button
              (click)="toastService.remove(toast.id)"
              class="ml-4 text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>
      }
    </div>
  `
})
export class ToastContainerComponent {
  toastService = inject(ToastService);

  getToastClass(type: string): string {
    const baseClass = 'text-white ';
    switch (type) {
      case 'success': return baseClass + 'bg-green-600';
      case 'error': return baseClass + 'bg-red-600';
      case 'warning': return baseClass + 'bg-yellow-600';
      case 'info': return baseClass + 'bg-blue-600';
      default: return baseClass + 'bg-gray-600';
    }
  }
}
