import { Component, inject, computed } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FinancialHealthService } from '../../services/financial-health.service';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts: () => import('echarts') })],
  templateUrl: './dashboard.component.html',
  styles: []
})
export class DashboardComponent {
  healthService = inject(FinancialHealthService);

  netWorth = this.healthService.totalNetWorth;
  assets = this.healthService.totalAssets;
  liabilities = this.healthService.totalLiabilities;
  healthScore = this.healthService.financialHealthScore;

  netWorthChange = computed(() => {
    const history = this.healthService.historicalNetWorth();
    if (history.length < 2) return { text: 'Starting path...', isPositive: true };

    const current = history[history.length - 1].value;
    const previous = history[history.length - 2].value;

    if (previous === 0) return { text: 'New tracking', isPositive: true };

    const change = ((current - previous) / previous) * 100;
    return {
      text: `${change >= 0 ? '↑' : '↓'} ${Math.abs(change).toFixed(1)}% vs last month`,
      isPositive: change >= 0
    };
  });

  netWorthChartOptions = computed(() => {
    const historicalData = this.healthService.historicalNetWorth();
    const months = historicalData.map(d => d.month);
    const values = historicalData.map(d => d.value);

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          let val = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumSignificantDigits: 3 }).format(params[0].value);
          return `${params[0].name}: ${val}`;
        }
      },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', boundaryGap: false, data: months },
      yAxis: { type: 'value', axisLabel: { formatter: '₹{value}' } },
      series: [
        {
          name: 'Net Worth',
          type: 'line',
          data: values,
          smooth: true,
          lineStyle: { color: '#2563eb', width: 3 },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: 'rgba(37, 99, 235, 0.5)' }, { offset: 1, color: 'rgba(37, 99, 235, 0)' }]
            }
          },
          itemStyle: { color: '#2563eb' }
        }
      ]
    };
  });

  allocationChartOptions = computed(() => {
    const current = this.healthService.currentAllocation();
    const target = this.healthService.targetAllocation();

    return {
      tooltip: { trigger: 'item', formatter: '{a} <br/>{b}: {c}%' },
      legend: { bottom: '0%', left: 'center' },
      series: [
        {
          name: 'Current Allocation',
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['25%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
          label: { show: false, position: 'center' },
          emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold' } },
          labelLine: { show: false },
          data: [
            { value: current.Equity, name: 'Equity', itemStyle: { color: '#3b82f6' } },
            { value: current.Debt, name: 'Debt', itemStyle: { color: '#10b981' } },
            { value: current.Gold, name: 'Gold', itemStyle: { color: '#f59e0b' } },
            { value: current.Cash, name: 'Cash', itemStyle: { color: '#64748b' } }
          ]
        },
        {
          name: 'Target Allocation',
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['75%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
          label: { show: false, position: 'center' },
          emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold' } },
          labelLine: { show: false },
          data: [
            { value: target.Equity, name: 'Equity', itemStyle: { color: '#93c5fd' } },
            { value: target.Debt, name: 'Debt', itemStyle: { color: '#6ee7b7' } },
            { value: target.Gold, name: 'Gold', itemStyle: { color: '#fcd34d' } },
            { value: target.Cash, name: 'Cash', itemStyle: { color: '#cbd5e1' } }
          ]
        }
      ]
    };
  });

  constructor() { }
}
