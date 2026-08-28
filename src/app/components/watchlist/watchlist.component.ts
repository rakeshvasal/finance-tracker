import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { ToastService } from '../../services/toast.service';
import { MarketDataService, SearchResult } from '../../services/market-data.service';

interface WatchlistItem extends SearchResult {
  id?: number;
  latestPrice?: number;
  latestNav?: number;
  lastUpdated?: string;
  addedAt?: string;
  schemeName?: string;
  exchange?: string;
  category?: string;
}

interface WatchlistResponse {
  items: WatchlistItem[];
  stocks: WatchlistItem[];
  mutualFunds: WatchlistItem[];
}

@Component({
  selector: 'app-watchlist',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, FormsModule, ReactiveFormsModule],
  templateUrl: './watchlist.component.html',
  styles: []
})
export class WatchlistComponent {
  private marketDataService = inject(MarketDataService);
  private toastService = inject(ToastService);

  searchControl = new FormControl('');
  searchTypeFilter = signal<'all' | 'stocks' | 'mutualfunds'>('all');
  searchResults = signal<SearchResult[]>([]);
  isSearching = signal(false);
  showSearchResults = signal(false);

  watchlistData = signal<WatchlistResponse>({ items: [], stocks: [], mutualFunds: [] });
  isLoading = signal(false);
  portfolioId = 1;

  stocks = computed(() => this.watchlistData().stocks);
  mutualFunds = computed(() => this.watchlistData().mutualFunds);
  hasItems = computed(() => this.watchlistData().items.length > 0);

  constructor() {
    this.loadWatchlist();
  }

  setSearchFilter(filter: 'all' | 'stocks' | 'mutualfunds') {
    this.searchTypeFilter.set(filter);
    this.searchResults.set([]);
    this.showSearchResults.set(false);
  }

  onSearchButtonClick() {
    const query = this.searchControl.value;
    if (query && query.trim().length > 0) {
      this.performSearch(query);
    }
  }

  performSearch(query: string) {
    this.isSearching.set(true);
    const filter = this.searchTypeFilter();

    let searchObservable;
    if (filter === 'stocks') {
      searchObservable = this.marketDataService.searchStocks(query);
    } else if (filter === 'mutualfunds') {
      searchObservable = this.marketDataService.searchMutualFunds(query);
    } else {
      searchObservable = this.marketDataService.searchByName(query);
    }

    searchObservable.subscribe({
      next: (results: SearchResult[]) => {
        this.searchResults.set(results);
        this.showSearchResults.set(true);
        this.isSearching.set(false);
      },
      error: (err: any) => {
        console.error('Search error:', err);
        this.toastService.showError('Failed to search');
        this.isSearching.set(false);
      }
    });
  }

  loadWatchlist() {
    this.isLoading.set(true);
    this.marketDataService.getWatchlist(this.portfolioId).subscribe({
      next: (response: any) => {
        this.watchlistData.set(response);
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.error('Error loading watchlist:', err);
        this.toastService.showError('Failed to load watchlist');
        this.isLoading.set(false);
      }
    });
  }

  addToWatchlist(result: SearchResult) {
    console.log('Adding to watchlist:', result);
    this.marketDataService.addToWatchlist(this.portfolioId, result).subscribe({
      next: () => {
        this.toastService.showSuccess(`Added ${result.name} to watchlist`);
        this.searchControl.reset();
        this.searchResults.set([]);
        this.showSearchResults.set(false);
        this.loadWatchlist();
      },
      error: (err: any) => {
        console.error('Error adding to watchlist:', err);
        if (err.status === 409) {
          this.toastService.showWarning(`${result.name} is already in your watchlist`);
        } else {
          this.toastService.showError('Failed to add to watchlist');
        }
      }
    });
  }

  removeFromWatchlist(watchlistId: number) {
    if (!confirm('Remove this item from watchlist?')) return;

    this.marketDataService.removeFromWatchlist(this.portfolioId, watchlistId).subscribe({
      next: () => {
        this.toastService.showSuccess('Item removed from watchlist');
        this.loadWatchlist();
      },
      error: (err: any) => {
        console.error('Error removing from watchlist:', err);
        this.toastService.showError('Failed to remove from watchlist');
      }
    });
  }

  closeSearch() {
    this.showSearchResults.set(false);
  }

  getLatestValue(item: WatchlistItem): number | undefined {
    return item.type === 'Stock' ? item.latestPrice : item.latestNav;
  }

  getValueLabel(item: WatchlistItem): string {
    return item.type === 'Stock' ? 'Price' : 'NAV';
  }
}
