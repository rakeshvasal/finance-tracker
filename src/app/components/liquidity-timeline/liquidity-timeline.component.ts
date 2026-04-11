import { Component, inject, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { DataService } from '../../services/data.service';
import { differenceInDays, parseISO } from 'date-fns';
import { UpcomingMaturityDto, EquityInvestmentDto } from '../../models/master-data';

@Component({
  selector: 'app-liquidity-timeline',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe],
  templateUrl: './liquidity-timeline.component.html',
  styles: []
})
export class LiquidityTimelineComponent {
  private dataService = inject(DataService);
  upcomingMaturities = this.dataService.maturitiesState;
  equityInvestments = this.dataService.equityInvestmentsState;

  timelineEvents = computed(() => {
    const today = new Date();
    const events: any[] = [];
    this.upcomingMaturities().forEach((m: UpcomingMaturityDto) => {
      events.push({
        title: m.name, type: m.type, amount: m.amount, date: m.date, isIncoming: true,
        daysUntil: differenceInDays(parseISO(m.date), today)
      });
    });
    this.equityInvestments().forEach((ei: EquityInvestmentDto) => {
      if (ei.status === 'Active' && ei.type === 'SIP' && ei.nextDueDate) {
        events.push({
          title: ei.name, type: 'SIP Deduction', amount: ei.amount, date: ei.nextDueDate, isIncoming: false,
          daysUntil: differenceInDays(parseISO(ei.nextDueDate), today)
        });
      }
    });
    return events.sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  });
}
