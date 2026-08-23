import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { HttpParams } from '@angular/common/http';

export interface StockPrice {
  symbol: string;
  name: string;
  exchange: string;
  currentPrice: number;
  previousClose: number;
  changePercent: number;
  volume: number;
  lastUpdated: string;
}

export interface MutualFundNAV {
  schemeCode: string;
  schemeName: string;
  nav: number;
  date: string;
  schemeType: string;
}

export interface SearchResult {
  symbol: string;
  name: string;
  type: 'Stock' | 'MutualFund';
  exchange?: string;
  schemeCode?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MarketDataService {
  private api = inject(ApiService);

  getStockPrice(symbol: string, exchange: string = 'NSE'): Observable<StockPrice> {
    return this.api.get<StockPrice>(`/market/stock/${symbol}?exchange=${exchange}`);
  }

  getMutualFundNAV(schemeCode: string): Observable<MutualFundNAV> {
    return this.api.get<MutualFundNAV>(`/market/mutualfund/${schemeCode}`);
  }

  batchStockPrices(symbols: string[]): Observable<StockPrice[]> {
    return this.api.post<StockPrice[]>('/market/batch-stocks', { symbols });
  }

  batchMutualFundNAVs(schemeCodes: string[]): Observable<MutualFundNAV[]> {
    return this.api.post<MutualFundNAV[]>('/market/batch-mutualfunds', { schemeCodes });
  }

  refreshAllPrices(portfolioId: string): Observable<any> {
    return this.api.post<any>('/market/refresh-prices', { portfolioId });
  }

  searchStocks(query: string): Observable<SearchResult[]> {
    const params = new HttpParams().set('q', query);
    return this.api.get<SearchResult[]>('/search/stocks', params);
  }

  searchMutualFunds(query: string): Observable<SearchResult[]> {
    const params = new HttpParams().set('q', query);
    return this.api.get<SearchResult[]>('/search/mutualfunds', params);
  }

  searchAll(query: string): Observable<SearchResult[]> {
    const params = new HttpParams().set('q', query);
    return this.api.get<SearchResult[]>('/search/all', params);
  }
}
