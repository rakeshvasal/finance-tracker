import { Component, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { differenceInDays, parseISO, addMonths, addQuarters, addYears } from 'date-fns';
import { EquityInvestmentDto, TransactionDto } from '../../models/master-data';

@Component({
  selector: 'app-investments-sips',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, DecimalPipe, ReactiveFormsModule],
  templateUrl: './investments-sips.component.html',
  styles: []
})
export class InvestmentsSipsComponent {
  private fb = inject(FormBuilder);
  private dataService = inject(DataService);
  equityInvestments = this.dataService.equityInvestmentsState;

  showForm = signal<boolean>(false);
  editingId = signal<number | null>(null);
  investForm: FormGroup;

  showHistoryId = signal<number | null>(null);

  constructor() {
    this.investForm = this.fb.group({
      type: ['SIP', Validators.required],
      isNewFund: [true],
      existingFundId: [''],
      name: ['', [Validators.required, Validators.minLength(3)]],
      amount: ['', [Validators.required, Validators.min(1)]],
      totalInvested: ['', [Validators.min(0)]],
      startDate: ['', Validators.required],
      nextDueDate: [''],
      frequency: ['Monthly'],
      status: ['Active', Validators.required],
      currentValue: [0],
      // Stock-specific fields
      units: ['', [Validators.min(0)]],
      buyPrice: ['', [Validators.min(0)]],
      currentUnitPrice: ['', [Validators.min(0)]]
    });

    this.investForm.get('type')?.valueChanges.subscribe(type => {
      const nextDue = this.investForm.get('nextDueDate');
      if (type === 'SIP') {
        nextDue?.setValidators([Validators.required]);
      } else {
        nextDue?.clearValidators();
      }
      nextDue?.updateValueAndValidity();
    });

    this.investForm.get('isNewFund')?.valueChanges.subscribe(isNew => {
      const name = this.investForm.get('name');
      const existing = this.investForm.get('existingFundId');
      if (isNew) {
        name?.setValidators([Validators.required]);
        existing?.clearValidators();
      } else {
        name?.clearValidators();
        existing?.setValidators([Validators.required]);
      }
      name?.updateValueAndValidity();
      existing?.updateValueAndValidity();
    });
  }

  toggleForm() {
    this.showForm.update(v => !v);
    if (!this.showForm()) {
      this.cancelEdit();
    }
  }

  cancelEdit() {
    this.editingId.set(null);
    this.investForm.reset({ type: 'SIP', isNewFund: true, status: 'Active', frequency: 'Monthly' });
  }

  startEdit(ei: EquityInvestmentDto) {
    this.editingId.set(ei.id);
    this.showForm.set(true);

    const start = ei.startDate ? ei.startDate.split('T')[0] : '';
    const next = ei.nextDueDate ? ei.nextDueDate.split('T')[0] : '';

    this.investForm.patchValue({
      type: ei.type,
      name: ei.name,
      amount: ei.amount,
      totalInvested: ei.principal,
      startDate: start,
      nextDueDate: next,
      frequency: ei.frequency || 'Monthly',
      status: ei.status,
      currentValue: ei.currentValue,
      units: ei.units || '',
      buyPrice: ei.buyPrice || '',
      currentUnitPrice: ei.currentUnitPrice || ''
    });
  }

  toggleHistory(id: number) {
    this.showHistoryId.set(this.showHistoryId() === id ? null : id);
  }

  deleteInvestment(ei: EquityInvestmentDto) {
    if (confirm(`Are you sure you want to delete the investment in ${ei.name}?`)) {
      this.dataService.deleteEquityInvestment(ei.id);
    }
  }

  onSubmit() {
    if (this.investForm.valid) {
      const formVal = this.investForm.value;

      if (!formVal.isNewFund && formVal.type === 'Lumpsum') {
        // Add Lumpsum to existing fund
        this.dataService.addTransaction(Number(formVal.existingFundId), {
          date: new Date(formVal.startDate).toISOString(),
          amount: formVal.amount,
          type: 'Lumpsum'
        });
      } else {
        const id = this.editingId() ?? (Math.max(...this.equityInvestments().map(s => s.id), 0) + 1);

        // Find existing record to preserve principal if editing
        const existing = this.equityInvestments().find(ei => ei.id === id);

        let principal: number;
        let currentValue: number;
        let amount: number;

        if (formVal.type === 'Stock') {
          // For stocks: calculate based on units and prices
          const units = parseFloat(formVal.units) || 0;
          const buyPrice = parseFloat(formVal.buyPrice) || 0;
          const currentUnitPrice = parseFloat(formVal.currentUnitPrice) || 0;
          
          principal = units * buyPrice;
          currentValue = units * currentUnitPrice;
          amount = units; // Store units as amount for stock
        } else {
          principal = this.editingId() ? (formVal.totalInvested || existing?.principal || formVal.amount) : (formVal.totalInvested || formVal.amount);
          currentValue = formVal.currentValue || (this.editingId() ? existing?.currentValue : formVal.amount) || formVal.amount;
          amount = formVal.amount;
        }

        const payload: EquityInvestmentDto = {
          id,
          name: formVal.name,
          type: formVal.type,
          amount,
          principal,
          currentValue,
          startDate: new Date(formVal.startDate).toISOString(),
          nextDueDate: formVal.nextDueDate ? new Date(formVal.nextDueDate).toISOString() : undefined,
          frequency: formVal.frequency,
          status: formVal.status,
          portfolioId: '',
          transactions: this.editingId() ?
            (existing?.transactions || []) :
            [{ id: '1', date: new Date(formVal.startDate).toISOString(), amount: formVal.amount, type: formVal.type as 'SIP' | 'Lumpsum' }],
          units: formVal.type === 'Stock' ? parseFloat(formVal.units) || 0 : undefined,
          buyPrice: formVal.type === 'Stock' ? parseFloat(formVal.buyPrice) || 0 : undefined,
          currentUnitPrice: formVal.type === 'Stock' ? parseFloat(formVal.currentUnitPrice) || 0 : undefined
        };

        this.dataService.upsertEquityInvestment(payload);
      }

      this.cancelEdit();
      this.showForm.set(false);
    } else {
      Object.keys(this.investForm.controls).forEach(key => {
        this.investForm.get(key)?.markAsTouched();
      });
    }
  }

  calculateCAGR(ei: EquityInvestmentDto): string {
    if (!ei.principal || !ei.currentValue || !ei.startDate) return '0.00%';
    const start = parseISO(ei.startDate);
    const end = new Date();
    const days = differenceInDays(end, start);
    const years = days / 365.25;
    if (years <= 0) return '0.00%';
    const ratio = ei.currentValue / ei.principal;
    const cagr = (Math.pow(ratio, 1 / years) - 1) * 100;
    return `${cagr.toFixed(2)}%`;
  }

  getCAGRColor(ei: EquityInvestmentDto): string {
    const cagrStr = this.calculateCAGR(ei);
    const cagr = parseFloat(cagrStr);
    return cagr < 0 ? 'text-danger-600' : 'text-brand-600';
  }

  getSIPAge(ei: EquityInvestmentDto): string {
    if (!ei.startDate) return '';
    const start = parseISO(ei.startDate);
    const end = new Date();
    const days = differenceInDays(end, start);
    if (days < 30) return `${days} days`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} months`;
    const years = Math.floor(days / 365);
    const remainingMonths = Math.floor((days % 365) / 30);
    return remainingMonths > 0 ? `${years}y ${remainingMonths}m` : `${years} years`;
  }

  getNextPayoutDate(ei: EquityInvestmentDto): Date | null {
    if (ei.type !== 'SIP' || !ei.nextDueDate || !ei.frequency) return null;

    const today = new Date();
    let nextDate = parseISO(ei.nextDueDate);

    while (nextDate < today) {
      if (ei.frequency === 'Monthly') {
        nextDate = addMonths(nextDate, 1);
      } else if (ei.frequency === 'Quarterly') {
        nextDate = addQuarters(nextDate, 1);
      } else if (ei.frequency === 'Yearly') {
        nextDate = addYears(nextDate, 1);
      }
    }

    return nextDate;
  }

  getAllTransactions(ei: EquityInvestmentDto): TransactionDto[] {
    return (ei.transactions || []).slice(0, 10).sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }
}
