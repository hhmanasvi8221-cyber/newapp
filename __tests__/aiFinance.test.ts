import { buildSummary, Transaction } from '../functions/src/finance';

const transactions: Transaction[] = [
  {
    amount: 10,
    category: 'Food',
    date: '2026-04-10',
    description: 'Cafe',
    type: 'expense',
  },
  {
    amount: 20,
    category: 'Food',
    date: '2026-05-10',
    description: 'Cafe',
    type: 'expense',
  },
  {
    amount: 30,
    category: 'Food',
    date: '2026-06-10',
    description: 'Cafe',
    type: 'expense',
  },
  {
    amount: 3000,
    category: 'Other',
    date: '2026-07-01',
    description: 'Salary',
    type: 'income',
  },
  {
    amount: 60,
    category: 'Food',
    date: '2026-07-05',
    description: 'Cafe',
    type: 'expense',
  },
  {
    amount: 25,
    category: 'Shopping',
    date: '2026-07-18',
    description: 'Book',
    type: 'expense',
  },
  {
    amount: 25,
    category: 'Shopping',
    date: '2026-07-20',
    description: 'Book',
    type: 'expense',
  },
  {
    amount: 500,
    category: 'Bills',
    date: '2026-03-10',
    description: 'Old bill',
    type: 'expense',
  },
];

describe('AI finance summary', () => {
  it('summarizes real monthly totals and emits possible recent duplicate and unusual flags', () => {
    const summary = buildSummary(
      transactions,
      'USD',
      '2026-07',
      new Date('2026-07-24T12:00:00.000Z'),
    );
    expect(summary.monthly[5]).toEqual({
      month: '2026-07',
      income: 3000,
      expenses: 110,
      net: 2890,
    });
    expect(summary.currentMonth.savingsRate).toBeCloseTo(96.33, 2);
    expect(summary.possibleDuplicates).toEqual([
      { date: '2026-07-20', category: 'Shopping', amount: 25 },
    ]);
    expect(summary.unusualExpenses).toContainEqual({
      date: '2026-07-05',
      category: 'Food',
      amount: 60,
    });
    expect(summary).not.toHaveProperty('rawTransactions');
    expect(JSON.stringify(summary)).not.toContain('Cafe');
    expect(JSON.stringify(summary)).not.toContain('Salary');
  });

  it('returns zero totals and empty flags for an account with no transactions', () => {
    const summary = buildSummary(
      [],
      'INR',
      '2026-07',
      new Date('2026-07-24T12:00:00.000Z'),
    );
    expect(summary.currentMonth).toEqual({
      income: 0,
      expenses: 0,
      net: 0,
      savingsRate: 0,
    });
    expect(summary.possibleDuplicates).toEqual([]);
    expect(summary.unusualExpenses).toEqual([]);
  });
});
