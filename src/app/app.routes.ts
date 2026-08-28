import { Routes } from '@angular/router';
import { LayoutComponent } from './components/layout/layout/layout.component';

export const routes: Routes = [
    {
        path: '',
        component: LayoutComponent,
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            {
                path: 'dashboard',
                loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent)
            },
            {
                path: 'watchlist',
                loadComponent: () => import('./components/watchlist/watchlist.component').then(m => m.WatchlistComponent)
            },
            {
                path: 'portfolio-manager',
                loadComponent: () => import('./components/portfolio-manager/portfolio-manager.component').then(m => m.PortfolioManagerComponent)
            },
            {
                path: 'investments-sips',
                loadComponent: () => import('./components/investments-sips/investments-sips.component').then(m => m.InvestmentsSipsComponent)
            },
            {
                path: 'liquidity-timeline',
                loadComponent: () => import('./components/liquidity-timeline/liquidity-timeline.component').then(m => m.LiquidityTimelineComponent)
            }
        ]
    },
    { path: '**', redirectTo: 'dashboard' }
];
