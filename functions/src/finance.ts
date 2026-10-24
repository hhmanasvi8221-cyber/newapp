export type Transaction = {
  amount: number;
  category: string;
  date: string;
  description: string;
  type: 'income' | 'expense';
};

export type MoneySummary = {
  currency: string;
  selectedMonth: string;
  monthly: Array<{
    month: string;
    income: number;
    expenses: number;
    net: number;
  }>;
  currentMonth: {
    income: number;
    expenses: number;
    net: number;
    savingsRate: number;
  };
  categories: Array<{ category: string; amount: number }>;
  possibleDuplicates: Array<{
    date: string;
    category: string;
    amount: number;
  }>;
  unusualExpenses: Array<{
    date: string;
    category: string;
    amount: number;
  }>;
};

function addMonths(month: string, offset: number) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber - 1 + offset, 1))
    .toISOString()
    .slice(0, 7);
}

export function buildSummary(
  transactions: Transaction[],
  currency: string,
  selectedMonth: string,
  asOfDate = new Date(),
): MoneySummary {
  const months = Array.from({ length: 6 }, (_, index) =>
    addMonths(selectedMonth, index - 5),
  );
  const monthly = months.map(month => {
    const matching = transactions.filter(item => item.date.startsWith(month));
    const income = matching
      .filter(item => item.type === 'income')
      .reduce((total, item) => total + item.amount, 0);
    const expenses = matching
      .filter(item => item.type === 'expense')
      .reduce((total, item) => total + item.amount, 0);
    return { month, income, expenses, net: income - expenses };
  });
  const currentTransactions = transactions.filter(item =>
    item.date.startsWith(selectedMonth),
  );
  const income = currentTransactions
    .filter(item => item.type === 'income')
    .reduce((total, item) => total + item.amount, 0);
  const expenses = currentTransactions
    .filter(item => item.type === 'expense')
    .reduce((total, item) => total + item.amount, 0);
  const categoryMap = new Map<string, number>();
  currentTransactions
    .filter(item => item.type === 'expense')
    .forEach(item =>
      categoryMap.set(
        item.category,
        (categoryMap.get(item.category) ?? 0) + item.amount,
      ),
    );

  const endDate = asOfDate.toISOString().slice(0, 10);
  const startDate = new Date(asOfDate);
  startDate.setUTCDate(startDate.getUTCDate() - 30);
  const recentStart = startDate.toISOString().slice(0, 10);
  const recentExpenses = transactions
    .filter(
      item =>
        item.type === 'expense' &&
        item.date >= recentStart &&
        item.date <= endDate,
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const possibleDuplicates: MoneySummary['possibleDuplicates'] = [];
  for (let index = 0; index < recentExpenses.length; index += 1) {
    const current = recentExpenses[index];
    const normalizedDescription = current.description
      .trim()
      .toLocaleLowerCase();
    const match = recentExpenses.slice(index + 1).find(candidate => {
      const daysApart = Math.abs(
        Date.parse(`${current.date}T00:00:00Z`) -
          Date.parse(`${candidate.date}T00:00:00Z`),
      );
      const similarAmount =
        Math.abs(current.amount - candidate.amount) <=
        Math.max(current.amount, candidate.amount) * 0.01;
      return (
        candidate.category === current.category &&
        candidate.description.trim().toLocaleLowerCase() ===
          normalizedDescription &&
        similarAmount &&
        daysApart <= 7 * 24 * 60 * 60 * 1000
      );
    });
    if (match) {
      possibleDuplicates.push({
        date: current.date,
        category: current.category,
        amount: current.amount,
      });
    }
    if (possibleDuplicates.length >= 10) {
      break;
    }
  }

  const historicalExpenses = transactions.filter(
    item => item.type === 'expense' && item.date.slice(0, 7) < selectedMonth,
  );
  const historicalTotals = new Map<string, { amount: number; count: number }>();
  historicalExpenses.forEach(item => {
    const total = historicalTotals.get(item.category) ?? {
      amount: 0,
      count: 0,
    };
    total.amount += item.amount;
    total.count += 1;
    historicalTotals.set(item.category, total);
  });
  const unusualExpenses = recentExpenses
    .filter(item => {
      const history = historicalTotals.get(item.category);
      return Boolean(
        history &&
          history.count >= 3 &&
          item.amount >= (history.amount / history.count) * 2.5,
      );
    })
    .slice(0, 10)
    .map(({ date, category, amount }) => ({ date, category, amount }));

  return {
    currency,
    selectedMonth,
    monthly,
    currentMonth: {
      income,
      expenses,
      net: income - expenses,
      savingsRate: income > 0 ? ((income - expenses) / income) * 100 : 0,
    },
    categories: Array.from(categoryMap, ([category, amount]) => ({
      category,
      amount,
    })).sort((a, b) => b.amount - a.amount),
    possibleDuplicates,
    unusualExpenses,
  };
}
