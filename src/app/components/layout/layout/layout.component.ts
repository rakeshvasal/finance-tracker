import { Component, signal, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastContainerComponent } from '../../../components/shared/toast-container.component';
import { LoadingSpinnerComponent } from '../../../components/shared/loading-spinner.component';
import { DataService } from '../../../services/data.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, ToastContainerComponent, LoadingSpinnerComponent],
  template: `
    <div class="flex h-screen bg-slate-50 font-sans text-slate-800">
      
      <!-- Mobile sidebar backdrop -->
      @if (isMobileMenuOpen()) {
        <div 
          class="fixed inset-0 z-20 bg-slate-900/50 transition-opacity lg:hidden"
          (click)="toggleMobileMenu()"
        ></div>
      }

      <!-- Sidebar -->
      <aside 
        class="fixed inset-y-0 left-0 z-30 w-64 transform bg-white border-r border-slate-200 transition-transform duration-300 lg:static lg:translate-x-0"
        [ngClass]="{'translate-x-0': isMobileMenuOpen(), '-translate-x-full': !isMobileMenuOpen()}"
      >
        <div class="flex h-16 items-center justify-between px-6 border-b border-slate-100">
          <div class="flex items-center gap-2 text-brand-600">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-8 h-8">
               <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
             </svg>
             <span class="text-xl font-bold tracking-tight text-slate-900">WealthPort</span>
          </div>
          <button class="lg:hidden text-slate-500 hover:text-slate-700" (click)="toggleMobileMenu()">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav class="mt-6 px-4 space-y-1">
          <a routerLink="/dashboard" routerLinkActive="bg-brand-50 text-brand-700 font-medium" [routerLinkActiveOptions]="{exact: true}" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors" (click)="closeOnMobile()">
            <svg class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
            Dashboard
          </a>

          <a routerLink="/portfolio-manager" routerLinkActive="bg-brand-50 text-brand-700 font-medium" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors" (click)="closeOnMobile()">
            <svg class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
            </svg>
            Portfolio Manager
          </a>

          <a routerLink="/investments-sips" routerLinkActive="bg-brand-50 text-brand-700 font-medium" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors" (click)="closeOnMobile()">
             <svg class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/>
            </svg>
            Equity Investments Tracker
          </a>

          <a routerLink="/liquidity-timeline" routerLinkActive="bg-brand-50 text-brand-700 font-medium" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors" (click)="closeOnMobile()">
            <svg class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            Liquidity Timeline
          </a>
        </nav>
      </aside>

      <!-- Global Toast and Loading -->
      <app-toast-container></app-toast-container>
      <app-loading-spinner></app-loading-spinner>

      <!-- Main Content Container -->
      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">

        <!-- Mobile Header Bar -->
        <header class="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 lg:hidden">
           <div class="flex items-center gap-2 text-brand-600">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-8 h-8">
               <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
             </svg>
             <span class="text-xl font-bold tracking-tight text-slate-900">WealthPort</span>
          </div>
          <button class="text-slate-500 hover:text-slate-700" (click)="toggleMobileMenu()">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>

        <!-- Main Content -->
        <main class="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50/50">
          <div class="container mx-auto px-4 py-8 lg:px-8 max-w-7xl">
            <router-outlet></router-outlet>
          </div>
        </main>

      </div>
    </div>
  `,
  styles: []
})
export class LayoutComponent {
  private dataService = inject(DataService);
  isMobileMenuOpen = signal(false);

  toggleMobileMenu() { this.isMobileMenuOpen.update(v => !v); }
  closeOnMobile() { if (this.isMobileMenuOpen()) { this.isMobileMenuOpen.set(false); } }
}
