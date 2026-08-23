import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  toasts = signal<Toast[]>([]);
  private idCounter = 0;

  showSuccess(message: string): void {
    this.show('success', message);
  }

  showError(message: string): void {
    this.show('error', message);
  }

  showInfo(message: string): void {
    this.show('info', message);
  }

  showWarning(message: string): void {
    this.show('warning', message);
  }

  private show(type: Toast['type'], message: string): void {
    const toast: Toast = {
      id: this.idCounter++,
      type,
      message
    };

    this.toasts.update(toasts => [...toasts, toast]);

    setTimeout(() => this.remove(toast.id), 5000);
  }

  remove(id: number): void {
    this.toasts.update(toasts => toasts.filter(t => t.id !== id));
  }
}
