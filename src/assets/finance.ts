export type TransactionType = 'income' | 'expense';

export type Transaction = {
  id: string;
  title: string;
  category: string;
  amount: number;
  type: TransactionType;
  date: string;
};

export type Budget = {
  id: string;
  category: string;
  amount: number;
};

export const categories = [
  'Food',
  'Transport',
  'Shopping',
  'Bills',
  'Health',
  'Entertainment',
  'Education',
  'Other',
];

export const currencies: Record<string, { symbol: string; locale: string }> = {
  USD: { symbol: '$', locale: 'en-US' },
  EUR: { symbol: '€', locale: 'de-DE' },
  GBP: { symbol: '£', locale: 'en-GB' },
  INR: { symbol: '₹', locale: 'en-IN' },
};

export function formatMoney(amount: number, currency: string) {
  const settings = currencies[currency] ?? currencies.USD;
  return new Intl.NumberFormat(settings.locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function calculateTotals(transactions: Transaction[]) {
  const month = new Date().toISOString().slice(0, 7);
  const monthTransactions = transactions.filter(item =>
    item.date.startsWith(month),
  );
  const income = monthTransactions
    .filter(item => item.type === 'income')
    .reduce((total, item) => total + item.amount, 0);
  const expenses = monthTransactions
    .filter(item => item.type === 'expense')
    .reduce((total, item) => total + item.amount, 0);
  const balance = transactions.reduce(
    (total, item) =>
      total + (item.type === 'income' ? item.amount : -item.amount),
    0,
  );

  return {
    balance,
    income,
    expenses,
    savingsRate: income > 0 ? ((income - expenses) / income) * 100 : 0,
  };
}

export function getExpenseBreakdown(transactions: Transaction[]) {
  const totals = new Map<string, number>();
  transactions
    .filter(item => item.type === 'expense')
    .forEach(item =>
      totals.set(item.category, (totals.get(item.category) ?? 0) + item.amount),
    );
  return Array.from(totals.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function getMonthlyChartData(
  transactions: Transaction[],
  monthly: boolean,
) {
  const now = new Date();
  const count = 6;
  const buckets = Array.from({ length: count }, (_, index) => {
    const date = new Date(
      now.getFullYear(),
      now.getMonth() - (count - 1 - index),
      1,
    );
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        '0',
      )}`,
      label: date.toLocaleDateString('en', { month: 'short' }),
      income: 0,
      expenses: 0,
    };
  });
  const bucketByKey = new Map(buckets.map(bucket => [bucket.key, bucket]));
  transactions.forEach(item => {
    const bucket = bucketByKey.get(item.date.slice(0, 7));
    if (bucket) {
      bucket[item.type === 'income' ? 'income' : 'expenses'] += item.amount;
    }
  });
  if (!monthly) {
    return buckets.slice(-3);
  }
  return buckets;
}
