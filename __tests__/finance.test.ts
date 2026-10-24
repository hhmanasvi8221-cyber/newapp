import {
  calculateTotals,
  getExpenseBreakdown,
  isValidDate,
  Transaction,
} from '../src/assets/finance';

const transactions: Transaction[] = [
  {
    id: 'income-1',
    title: 'Pay',
    category: 'Other',
    amount: 2000,
    type: 'income',
    date: new Date().toISOString().slice(0, 10),
  },
  {
    id: 'expense-1',
    title: 'Groceries',
    category: 'Food',
    amount: 300,
    type: 'expense',
    date: new Date().toISOString().slice(0, 10),
  },
  {
    id: 'expense-2',
    title: 'Lunch',
    category: 'Food',
    amount: 50,
    type: 'expense',
    date: new Date().toISOString().slice(0, 10),
  },
];

describe('finance calculations', () => {
  it('calculates current-month totals and savings rate from transactions', () => {
    expect(calculateTotals(transactions)).toEqual({
      balance: 1650,
      income: 2000,
      expenses: 350,
      savingsRate: 82.5,
    });
  });

  it('returns a zero savings rate when there is no income', () => {
    expect(
      calculateTotals(
        transactions.filter(transaction => transaction.type === 'expense'),
      ).savingsRate,
    ).toBe(0);
  });

  it('groups expense amounts by category', () => {
    expect(getExpenseBreakdown(transactions)).toEqual([
      { category: 'Food', amount: 350 },
    ]);
  });

  it('accepts real ISO calendar dates and rejects invalid dates', () => {
    expect(isValidDate('2024-02-29')).toBe(true);
    expect(isValidDate('2025-02-29')).toBe(false);
    expect(isValidDate('2025-13-01')).toBe(false);
    expect(isValidDate('01/31/2025')).toBe(false);
  });
});
