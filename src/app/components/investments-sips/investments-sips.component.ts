import { Component, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { differenceInDays, parseISO } from 'date-fns';
import { AssetDto, EquityInvestmentDto, TransactionDto } from '../../models/master-data';

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
      currentValue: [0]
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
      currentValue: ei.currentValue
    });
  }

  toggleHistory(id: number) {
    this.showHistoryId.set(this.showHistoryId() === id ? null : id);
  }

  getTransactions(ei: EquityInvestmentDto): TransactionDto[] {
    return (ei.transactions || []).slice(0, 10);
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

        const payload: EquityInvestmentDto = {
          id,
          name: formVal.name,
          type: formVal.type,
          amount: formVal.amount,
          principal: this.editingId() ? (formVal.totalInvested || existing?.principal || formVal.amount) : (formVal.totalInvested || formVal.amount),
          currentValue: formVal.currentValue || (this.editingId() ? existing?.currentValue : formVal.amount) || formVal.amount,
          startDate: new Date(formVal.startDate).toISOString(),
          nextDueDate: formVal.nextDueDate ? new Date(formVal.nextDueDate).toISOString() : undefined,
          frequency: formVal.frequency,
          status: formVal.status,
          transactions: this.editingId() ?
            (existing?.transactions || []) :
            [{ id: '1', date: new Date(formVal.startDate).toISOString(), amount: formVal.amount, type: formVal.type }]
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
}
