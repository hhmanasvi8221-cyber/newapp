import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import AiAssistantPanel from '../components/AiAssistantPanel';
import {
  Budget,
  calculateTotals,
  categories,
  currencies,
  formatMoney,
  getExpenseBreakdown,
  getMonthlyChartData,
  isValidDate,
  Transaction,
  TransactionType,
} from '../assets/finance';
import theme from '../assets/theme';
import {
  getFirebaseAuthErrorMessage,
  UserProfile,
} from '../services/firebaseAuth';

type DashboardScreenProps = {
  transactions: Transaction[];
  budgets: Budget[];
  currency: string;
  transactionsLoading?: boolean;
  transactionError?: string;
  onCurrencyChange: (currency: string) => void;
  onSaveTransaction: (transaction: Transaction) => void | Promise<void>;
  onDeleteTransaction: (id: string) => void | Promise<void>;
  onSaveBudget: (budget: Budget) => void;
  onDeleteBudget: (id: string) => void;
  onSignOut: () => void;
  profile?: UserProfile;
  authActionError?: string;
};

type Page = 'overview' | 'transactions' | 'ai' | 'budgets' | 'settings';
type SortKey = 'date' | 'amount' | 'type' | 'category';

const today = () => new Date().toISOString().slice(0, 10);
const shiftDate = (value: string, days: number) => {
  if (!isValidDate(value)) {
    return today();
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

function DashboardScreen({
  transactions,
  budgets,
  currency,
  transactionsLoading = false,
  transactionError = '',
  onCurrencyChange,
  onSaveTransaction,
  onDeleteTransaction,
  onSaveBudget,
  onDeleteBudget,
  onSignOut,
  profile,
  authActionError,
}: DashboardScreenProps) {
  const [page, setPage] = useState<Page>('overview');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [chartRange, setChartRange] = useState<'6M' | '3M'>('6M');
  const [modal, setModal] = useState<'transaction' | 'budget' | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [viewing, setViewing] = useState<Transaction | null>(null);
  const [budgetCategory, setBudgetCategory] = useState(categories[0]);
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [transactionSaving, setTransactionSaving] = useState(false);
  const [transactionCategory, setTransactionCategory] = useState(categories[0]);
  const [transactionType, setTransactionType] =
    useState<TransactionType>('expense');
  const [date, setDate] = useState(today());
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const totals = useMemo(() => calculateTotals(transactions), [transactions]);
  const breakdown = useMemo(
    () => getExpenseBreakdown(transactions),
    [transactions],
  );
  const chartData = useMemo(
    () => getMonthlyChartData(transactions, chartRange === '6M'),
    [transactions, chartRange],
  );
  const maxChartValue = Math.max(
    1,
    ...chartData.flatMap(item => [item.income, item.expenses]),
  );
  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const matches = transactions.filter(item => {
      const matchesSearch =
        !query ||
        item.title.toLocaleLowerCase().includes(query) ||
        item.category.toLocaleLowerCase().includes(query);
      return (
        matchesSearch &&
        (typeFilter === 'all' || item.type === typeFilter) &&
        (categoryFilter === 'All' || item.category === categoryFilter)
      );
    });
    return matches.sort((a, b) => {
      switch (sortBy) {
        case 'amount':
          return b.amount - a.amount;
        case 'type':
          return a.type.localeCompare(b.type) || b.date.localeCompare(a.date);
        case 'category':
          return (
            a.category.localeCompare(b.category) || b.date.localeCompare(a.date)
          );
        default:
          return b.date.localeCompare(a.date);
      }
    });
  }, [transactions, search, typeFilter, categoryFilter, sortBy]);

  const closeModal = () => {
    setModal(null);
    setFormError('');
  };

  const openTransactionForm = (transaction?: Transaction) => {
    setEditing(transaction ?? null);
    setAmount(transaction ? String(transaction.amount) : '');
    setTitle(transaction?.title ?? '');
    setTransactionCategory(transaction?.category ?? categories[0]);
    setTransactionType(transaction?.type ?? 'expense');
    setDate(transaction?.date ?? today());
    setFormError('');
    setModal('transaction');
  };

  const handleSaveTransaction = async () => {
    const parsedAmount = Number(amount);
    if (!title.trim() || title.trim().length > 120) {
      setFormError('Add a description of up to 120 characters.');
      return;
    }
    if (
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0 ||
      parsedAmount > 1_000_000_000_000
    ) {
      setFormError(
        'Enter an amount greater than zero and no more than 1 trillion.',
      );
      return;
    }
    if (!categories.includes(transactionCategory)) {
      setFormError('Choose a valid category.');
      return;
    }
    if (!isValidDate(date)) {
      setFormError('Use a valid date in YYYY-MM-DD format.');
      return;
    }
    setTransactionSaving(true);
    try {
      await onSaveTransaction({
        id: editing?.id ?? (profile ? '' : `${Date.now()}-${Math.random()}`),
        title: title.trim(),
        category: transactionCategory,
        amount: parsedAmount,
        type: transactionType,
        date,
      });
      setSuccessMessage(
        profile
          ? editing
            ? 'Transaction updated in Firestore.'
            : 'Transaction saved to Firestore.'
          : editing
          ? 'Transaction updated in this session.'
          : 'Transaction added to this session.',
      );
      closeModal();
    } catch (error) {
      setFormError(getFirebaseAuthErrorMessage(error));
    } finally {
      setTransactionSaving(false);
    }
  };

  const handleSaveBudget = () => {
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError('Enter a monthly budget greater than zero.');
      return;
    }
    onSaveBudget({
      id: `${Date.now()}-${Math.random()}`,
      category: budgetCategory,
      amount: parsedAmount,
    });
    setSuccessMessage('Budget updated in this session.');
    closeModal();
  };

  const confirmDelete = (transaction: Transaction) => {
    Alert.alert(
      'Delete transaction?',
      `"${transaction.title}" will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setTransactionSaving(true);
            try {
              await onDeleteTransaction(transaction.id);
              setViewing(null);
              setSuccessMessage(
                profile
                  ? 'Transaction deleted from Firestore.'
                  : 'Transaction removed from this session.',
              );
            } catch (error) {
              Alert.alert(
                'Could not delete transaction',
                getFirebaseAuthErrorMessage(error),
              );
            } finally {
              setTransactionSaving(false);
            }
          },
        },
      ],
    );
  };

  const titleByPage: Record<Page, string> = {
    overview: 'Overview',
    transactions: 'Transactions',
    ai: 'AI Money Coach',
    budgets: 'Budgets',
    settings: 'Settings',
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.brand}>
          <View style={styles.brandMark}>
            <Text style={styles.brandGlyph}>S</Text>
          </View>
          <View>
            <Text style={styles.brandName}>Spendly</Text>
            <Text style={styles.localCaption}>
              {profile ? 'FIREBASE ACCOUNT' : 'LOCAL DEMO'}
            </Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => openTransactionForm()}
          style={styles.addButton}
        >
          <Text style={styles.addButtonText}>＋ Add</Text>
        </Pressable>
      </View>

      <View style={styles.titleBar}>
        <View>
          <Text style={styles.pageTitle}>{titleByPage[page]}</Text>
          <Text style={styles.pageSubtitle}>
            {page === 'overview'
              ? profile
                ? `Welcome back, ${profile.fullName}`
                : 'Your money, at a glance'
              : 'Manage your finances'}
          </Text>
        </View>
        {page === 'overview' ? (
          <View style={styles.periodPill}>
            <Text style={styles.periodText}>
              {new Date().toLocaleDateString('en', {
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </View>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {successMessage ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setSuccessMessage('')}
            style={styles.successBanner}
          >
            <Text style={styles.successText}>✓ {successMessage} ×</Text>
          </Pressable>
        ) : null}
        <View style={styles.localBanner}>
          <Text style={styles.localBannerIcon}>ⓘ</Text>
          <Text style={styles.localBannerText}>
            {profile
              ? 'Transactions are saved to your private Firestore account. Budgets and display preferences remain local to this session.'
              : 'Demo data only · held in memory and cleared when the app closes. Not synced or securely stored.'}
          </Text>
        </View>
        {transactionsLoading ? (
          <Text style={styles.statusMessage}>
            Loading your saved transactions…
          </Text>
        ) : null}
        {transactionError ? (
          <Text accessibilityRole="alert" style={styles.authError}>
            Could not load transactions: {transactionError}
          </Text>
        ) : null}

        {page === 'overview' ? (
          <>
            <View style={styles.summaryGrid}>
              <SummaryCard
                label="Total balance"
                value={formatMoney(totals.balance, currency)}
                detail={
                  profile
                    ? 'From all saved transactions'
                    : 'From all session transactions'
                }
                icon="◈"
                accent
              />
              <SummaryCard
                label="Income this month"
                value={formatMoney(totals.income, currency)}
                detail="Current calendar month"
                icon="↗"
              />
              <SummaryCard
                label="Expenses this month"
                value={formatMoney(totals.expenses, currency)}
                detail="Current calendar month"
                icon="↘"
              />
              <SummaryCard
                label="Savings rate"
                value={`${totals.savingsRate.toFixed(0)}%`}
                detail={
                  totals.income
                    ? 'Income minus expenses ÷ income'
                    : 'Add income to calculate'
                }
                icon="◎"
              />
            </View>

            {transactions.length === 0 && transactionsLoading ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Loading your activity</Text>
                <Text style={styles.emptyText}>
                  Your saved income and expenses will appear here.
                </Text>
              </View>
            ) : transactions.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Text style={styles.emptyIconText}>＋</Text>
                </View>
                <Text style={styles.emptyTitle}>
                  Start with your first transaction
                </Text>
                <Text style={styles.emptyText}>
                  Add income or an expense to see your balance, spending
                  categories, and trends.
                </Text>
                <PrimaryButton
                  label="Add a transaction"
                  onPress={() => openTransactionForm()}
                />
              </View>
            ) : (
              <>
                <View style={styles.card}>
                  <View style={styles.cardHeading}>
                    <View>
                      <Text style={styles.cardTitle}>Cash flow</Text>
                      <Text style={styles.cardSubtitle}>
                        Income vs. expenses
                      </Text>
                    </View>
                    <View style={styles.segment}>
                      {(['3M', '6M'] as const).map(range => (
                        <Pressable
                          key={range}
                          onPress={() => setChartRange(range)}
                          style={[
                            styles.segmentOption,
                            chartRange === range && styles.segmentOptionActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.segmentText,
                              chartRange === range && styles.segmentTextActive,
                            ]}
                          >
                            {range}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                  <View style={styles.legend}>
                    <LegendDot label="Income" color={theme.colors.accent} />
                    <LegendDot label="Expenses" color="#8291FF" />
                  </View>
                  <View style={styles.chart}>
                    {chartData.map(item => (
                      <View key={item.key} style={styles.chartColumn}>
                        <View style={styles.barPair}>
                          <View
                            style={[
                              styles.chartBar,
                              styles.incomeBar,
                              {
                                height: Math.max(
                                  3,
                                  (item.income / maxChartValue) * 110,
                                ),
                              },
                            ]}
                          />
                          <View
                            style={[
                              styles.chartBar,
                              styles.expenseBar,
                              {
                                height: Math.max(
                                  3,
                                  (item.expenses / maxChartValue) * 110,
                                ),
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.chartLabel}>{item.label}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={styles.chartHint}>
                    Bars are calculated from your saved transactions.
                  </Text>
                </View>

                <View style={styles.card}>
                  <View style={styles.cardHeading}>
                    <View>
                      <Text style={styles.cardTitle}>Spending by category</Text>
                      <Text style={styles.cardSubtitle}>
                        All recorded expenses
                      </Text>
                    </View>
                  </View>
                  {breakdown.length ? (
                    breakdown.slice(0, 6).map((item, index) => {
                      const total = breakdown.reduce(
                        (sum, row) => sum + row.amount,
                        0,
                      );
                      const colors = [
                        '#B8F36B',
                        '#8291FF',
                        '#F3A56B',
                        '#E982B8',
                        '#5AD6C4',
                        '#C49AFF',
                      ];
                      return (
                        <View key={item.category} style={styles.breakdownRow}>
                          <View
                            style={[
                              styles.categoryDot,
                              {
                                backgroundColor: colors[index % colors.length],
                              },
                            ]}
                          />
                          <Text style={styles.breakdownCategory}>
                            {item.category}
                          </Text>
                          <View style={styles.breakdownTrack}>
                            <View
                              style={[
                                styles.breakdownFill,
                                {
                                  width: `${
                                    total ? (item.amount / total) * 100 : 0
                                  }%`,
                                  backgroundColor:
                                    colors[index % colors.length],
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.breakdownAmount}>
                            {formatMoney(item.amount, currency)}
                          </Text>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.emptyInline}>
                      No expense categories yet.
                    </Text>
                  )}
                </View>

                <BudgetOverview
                  budgets={budgets}
                  transactions={transactions}
                  currency={currency}
                  onManage={() => setPage('budgets')}
                />
              </>
            )}

            <TransactionList
              transactions={filteredTransactions.slice(0, 5)}
              currency={currency}
              search={search}
              setSearch={setSearch}
              typeFilter={typeFilter}
              setTypeFilter={setTypeFilter}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
              sortBy={sortBy}
              setSortBy={setSortBy}
              onView={setViewing}
              onEdit={openTransactionForm}
              onViewAll={() => setPage('transactions')}
              emptyMessage="Nothing to show yet. Add a transaction to get started."
            />
          </>
        ) : null}

        {page === 'transactions' ? (
          <TransactionList
            transactions={filteredTransactions}
            currency={currency}
            search={search}
            setSearch={setSearch}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
            onView={setViewing}
            onEdit={openTransactionForm}
            emptyMessage="No transactions match these filters."
          />
        ) : null}

        {page === 'ai' ? (
          <AiAssistantPanel currency={currency} enabled={Boolean(profile)} />
        ) : null}

        {page === 'budgets' ? (
          <View style={styles.card}>
            <View style={styles.cardHeading}>
              <View>
                <Text style={styles.cardTitle}>Monthly budgets</Text>
                <Text style={styles.cardSubtitle}>
                  {profile
                    ? 'Progress from your saved expenses'
                    : "Progress from this session's expenses"}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setBudgetCategory(
                    categories.find(
                      category =>
                        !budgets.some(item => item.category === category),
                    ) ?? categories[0],
                  );
                  setAmount('');
                  setModal('budget');
                }}
                style={styles.smallAction}
              >
                <Text style={styles.smallActionText}>＋ Add</Text>
              </Pressable>
            </View>
            {budgets.length ? (
              <>
                <View style={styles.budgetTotal}>
                  <Text style={styles.cardSubtitle}>Total monthly budget</Text>
                  <Text style={styles.budgetTotalAmount}>
                    {formatMoney(
                      budgets.reduce((sum, budget) => sum + budget.amount, 0),
                      currency,
                    )}
                  </Text>
                </View>
                {budgets.map(budget => {
                  const spent = transactions
                    .filter(
                      item =>
                        item.type === 'expense' &&
                        item.category === budget.category &&
                        item.date.startsWith(
                          new Date().toISOString().slice(0, 7),
                        ),
                    )
                    .reduce((sum, item) => sum + item.amount, 0);
                  const progress = Math.min(spent / budget.amount, 1);
                  return (
                    <View key={budget.id} style={styles.budgetItem}>
                      <View style={styles.budgetTitleRow}>
                        <Text style={styles.breakdownCategory}>
                          {budget.category}
                        </Text>
                        <Pressable
                          onPress={() => onDeleteBudget(budget.id)}
                          hitSlop={8}
                        >
                          <Text style={styles.removeText}>Remove</Text>
                        </Pressable>
                      </View>
                      <View style={styles.budgetMeta}>
                        <Text style={styles.cardSubtitle}>
                          {formatMoney(spent, currency)} spent
                        </Text>
                        <Text style={styles.cardSubtitle}>
                          of {formatMoney(budget.amount, currency)}
                        </Text>
                      </View>
                      <ProgressBar
                        progress={progress}
                        warning={progress >= 0.8}
                      />
                      <Text style={styles.budgetRemaining}>
                        {spent > budget.amount
                          ? `${formatMoney(
                              spent - budget.amount,
                              currency,
                            )} over budget`
                          : `${formatMoney(
                              budget.amount - spent,
                              currency,
                            )} remaining`}
                      </Text>
                    </View>
                  );
                })}
              </>
            ) : (
              <View style={styles.emptyBudget}>
                <Text style={styles.emptyTitle}>No budgets yet</Text>
                <Text style={styles.emptyText}>
                  Set a category limit to track your monthly spending.
                </Text>
              </View>
            )}
          </View>
        ) : null}

        {page === 'settings' ? (
          <View style={styles.card}>
            {authActionError ? (
              <Text accessibilityRole="alert" style={styles.authError}>
                {authActionError}
              </Text>
            ) : null}
            <Text style={styles.cardTitle}>Preferences</Text>
            <Text style={[styles.cardSubtitle, styles.settingsSubtitle]}>
              Choose how amounts are displayed. This is a display preference for
              the current session.
            </Text>
            <Text style={styles.settingsLabel}>Currency</Text>
            <View style={styles.chipRow}>
              {Object.keys(currencies).map(code => (
                <Chip
                  key={code}
                  label={code}
                  selected={currency === code}
                  onPress={() => onCurrencyChange(code)}
                />
              ))}
            </View>
            <View style={styles.settingsDivider} />
            <Text style={styles.cardTitle}>
              {profile ? 'Firebase account' : 'Local demo data'}
            </Text>
            <Text style={[styles.cardSubtitle, styles.settingsSubtitle]}>
              {profile
                ? `Signed in as ${profile.fullName} (${profile.email}). Your income and expenses are stored under your Firebase account. Budgets and display preferences are temporary and reset when you sign out.`
                : 'Transactions and budgets only live in app memory. Closing the app clears them. Login and registration are not connected to authentication.'}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={onSignOut}
              style={styles.signOutButton}
            >
              <Text style={styles.signOutText}>
                {profile ? 'Sign out of Firebase' : 'Return to sign-in screen'}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.tabBar}>
        {(
          [
            ['overview', '⌂', 'Home'],
            ['transactions', '↕', 'Activity'],
            ['ai', '✦', 'AI Coach'],
            ['budgets', '▤', 'Budgets'],
            ['settings', '⚙', 'Settings'],
          ] as const
        ).map(([key, icon, label]) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityState={{ selected: page === key }}
            onPress={() => setPage(key)}
            style={styles.tab}
          >
            <Text style={[styles.tabIcon, page === key && styles.tabActive]}>
              {icon}
            </Text>
            <Text style={[styles.tabLabel, page === key && styles.tabActive]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Modal
        animationType="slide"
        onRequestClose={closeModal}
        transparent
        visible={modal !== null}
      >
        <View style={styles.modalBackdrop}>
          <ScrollView
            contentContainerStyle={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>
                    {modal === 'budget'
                      ? 'Create a budget'
                      : editing
                      ? 'Edit transaction'
                      : 'Add transaction'}
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    {profile
                      ? 'Saved securely to your Firebase account'
                      : 'Only available in this app session'}
                  </Text>
                </View>
                <Pressable onPress={closeModal} hitSlop={12}>
                  <Text style={styles.closeButton}>×</Text>
                </Pressable>
              </View>

              {modal === 'budget' ? (
                <>
                  <Text style={styles.fieldLabel}>Category</Text>
                  <View style={styles.chipRow}>
                    {categories.map(category => (
                      <Chip
                        key={category}
                        label={category}
                        selected={budgetCategory === category}
                        onPress={() => setBudgetCategory(category)}
                      />
                    ))}
                  </View>
                  <FormField
                    label={`Monthly limit (${currency})`}
                    keyboardType="decimal-pad"
                    onChangeText={setAmount}
                    placeholder="0.00"
                    value={amount}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.fieldLabel}>Type</Text>
                  <View style={styles.chipRow}>
                    {(['expense', 'income'] as const).map(type => (
                      <Chip
                        key={type}
                        label={type === 'expense' ? 'Expense' : 'Income'}
                        selected={transactionType === type}
                        onPress={() => setTransactionType(type)}
                      />
                    ))}
                  </View>
                  <FormField
                    label="Description"
                    onChangeText={setTitle}
                    placeholder="e.g. Weekly groceries"
                    value={title}
                  />
                  <FormField
                    label={`Amount (${currency})`}
                    keyboardType="decimal-pad"
                    onChangeText={setAmount}
                    placeholder="0.00"
                    value={amount}
                  />
                  <Text style={styles.fieldLabel}>Category</Text>
                  <View style={[styles.chipRow, styles.categoryPicker]}>
                    {categories.map(category => (
                      <Chip
                        key={category}
                        label={category}
                        selected={transactionCategory === category}
                        onPress={() => setTransactionCategory(category)}
                      />
                    ))}
                  </View>
                  <FormField
                    label="Date (YYYY-MM-DD)"
                    autoCapitalize="none"
                    onChangeText={setDate}
                    placeholder="2026-01-31"
                    value={date}
                  />
                  <View style={styles.dateActions}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setDate(shiftDate(date, -1))}
                      style={styles.secondaryButton}
                    >
                      <Text style={styles.secondaryButtonText}>
                        ← Previous day
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setDate(today())}
                      style={styles.secondaryButton}
                    >
                      <Text style={styles.secondaryButtonText}>Today</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setDate(shiftDate(date, 1))}
                      style={styles.secondaryButton}
                    >
                      <Text style={styles.secondaryButtonText}>Next day →</Text>
                    </Pressable>
                  </View>
                </>
              )}
              {formError ? (
                <Text accessibilityRole="alert" style={styles.formError}>
                  {formError}
                </Text>
              ) : null}
              <PrimaryButton
                label={
                  modal === 'budget'
                    ? 'Save budget'
                    : editing
                    ? 'Save changes'
                    : 'Add transaction'
                }
                onPress={
                  modal === 'budget' ? handleSaveBudget : handleSaveTransaction
                }
                loading={modal === 'transaction' && transactionSaving}
              />
              <Pressable onPress={closeModal} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setViewing(null)}
        transparent
        visible={viewing !== null}
      >
        {viewing ? (
          <View style={styles.viewModalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>{viewing.title}</Text>
                  <Text style={styles.cardSubtitle}>
                    {viewing.category} · {viewing.date}
                  </Text>
                </View>
                <Pressable onPress={() => setViewing(null)} hitSlop={12}>
                  <Text style={styles.closeButton}>×</Text>
                </Pressable>
              </View>
              <Text
                style={[
                  styles.transactionAmount,
                  viewing.type === 'income' && styles.incomeText,
                ]}
              >
                {viewing.type === 'income' ? '+' : '−'}
                {formatMoney(viewing.amount, currency)}
              </Text>
              <View style={styles.viewActions}>
                <Pressable
                  onPress={() => {
                    const selected = viewing;
                    setViewing(null);
                    openTransactionForm(selected);
                  }}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Edit</Text>
                </Pressable>
                <Pressable
                  onPress={() => confirmDelete(viewing)}
                  style={styles.deleteButton}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}
      </Modal>
    </SafeAreaView>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  icon,
  accent,
}: {
  label: string;
  value: string;
  detail: string;
  icon: string;
  accent?: boolean;
}) {
  return (
    <View style={[styles.summaryCard, accent && styles.summaryCardAccent]}>
      <View style={styles.summaryTop}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={[styles.summaryIcon, accent && styles.summaryIconAccent]}>
          {icon}
        </Text>
      </View>
      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.summaryValue}>
        {value}
      </Text>
      <Text style={styles.summaryDetail}>{detail}</Text>
    </View>
  );
}

function LegendDot({ label, color }: { label: string; color: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.chartHint}>{label}</Text>
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

function TransactionList({
  transactions,
  currency,
  search,
  setSearch,
  typeFilter,
  setTypeFilter,
  categoryFilter,
  setCategoryFilter,
  sortBy,
  setSortBy,
  onView,
  onEdit,
  onViewAll,
  emptyMessage,
}: {
  transactions: Transaction[];
  currency: string;
  search: string;
  setSearch: (value: string) => void;
  typeFilter: 'all' | TransactionType;
  setTypeFilter: (value: 'all' | TransactionType) => void;
  categoryFilter: string;
  setCategoryFilter: (value: string) => void;
  sortBy: SortKey;
  setSortBy: (value: SortKey) => void;
  onView: (transaction: Transaction) => void;
  onEdit: (transaction: Transaction) => void;
  onViewAll?: () => void;
  emptyMessage: string;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeading}>
        <View>
          <Text style={styles.cardTitle}>Recent transactions</Text>
          <Text style={styles.cardSubtitle}>Your latest activity</Text>
        </View>
        {onViewAll ? (
          <Pressable onPress={onViewAll} hitSlop={8}>
            <Text style={styles.smallActionText}>View all →</Text>
          </Pressable>
        ) : null}
      </View>
      <FormField
        accessibilityLabel="Search transactions"
        label="Search"
        onChangeText={setSearch}
        placeholder="Search name or category"
        value={search}
      />
      <View style={styles.filterRow}>
        {(['all', 'expense', 'income'] as const).map(type => (
          <Chip
            key={type}
            label={type === 'all' ? 'All' : type}
            selected={typeFilter === type}
            onPress={() => setTypeFilter(type)}
          />
        ))}
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            const order: SortKey[] = ['date', 'amount', 'type', 'category'];
            setSortBy(order[(order.indexOf(sortBy) + 1) % order.length]);
          }}
          style={styles.sortButton}
        >
          <Text style={styles.sortText}>Sort: {sortBy} ↓</Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryFilters}
      >
        <Chip
          label="All categories"
          selected={categoryFilter === 'All'}
          onPress={() => setCategoryFilter('All')}
        />
        {categories.map(category => (
          <Chip
            key={category}
            label={category}
            selected={categoryFilter === category}
            onPress={() => setCategoryFilter(category)}
          />
        ))}
      </ScrollView>
      {transactions.length ? (
        transactions.map(transaction => (
          <View key={transaction.id} style={styles.transactionRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => onView(transaction)}
              style={styles.transactionMain}
            >
              <View style={styles.transactionIcon}>
                <Text style={styles.transactionIconText}>
                  {transaction.type === 'income' ? '↗' : '↘'}
                </Text>
              </View>
              <View style={styles.transactionInfo}>
                <Text numberOfLines={1} style={styles.transactionTitle}>
                  {transaction.title}
                </Text>
                <Text style={styles.transactionMeta}>
                  {transaction.category} · {transaction.date}
                </Text>
              </View>
              <Text
                style={[
                  styles.transactionAmount,
                  transaction.type === 'income' && styles.incomeText,
                ]}
              >
                {transaction.type === 'income' ? '+' : '−'}
                {formatMoney(transaction.amount, currency)}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edit ${transaction.title}`}
              onPress={() => onEdit(transaction)}
              hitSlop={8}
            >
              <Text style={styles.moreAction}>···</Text>
            </Pressable>
          </View>
        ))
      ) : (
        <Text style={styles.emptyInline}>{emptyMessage}</Text>
      )}
    </View>
  );
}

function BudgetOverview({
  budgets,
  transactions,
  currency,
  onManage,
}: {
  budgets: Budget[];
  transactions: Transaction[];
  currency: string;
  onManage: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeading}>
        <View>
          <Text style={styles.cardTitle}>Budget progress</Text>
          <Text style={styles.cardSubtitle}>Monthly category limits</Text>
        </View>
        <Pressable onPress={onManage} hitSlop={8}>
          <Text style={styles.smallActionText}>Manage →</Text>
        </Pressable>
      </View>
      {budgets.length ? (
        budgets.slice(0, 3).map(budget => {
          const spent = transactions
            .filter(
              item =>
                item.type === 'expense' &&
                item.category === budget.category &&
                item.date.startsWith(new Date().toISOString().slice(0, 7)),
            )
            .reduce((sum, item) => sum + item.amount, 0);
          return (
            <View key={budget.id} style={styles.budgetItem}>
              <View style={styles.budgetMeta}>
                <Text style={styles.breakdownCategory}>{budget.category}</Text>
                <Text style={styles.cardSubtitle}>
                  {formatMoney(spent, currency)} /{' '}
                  {formatMoney(budget.amount, currency)}
                </Text>
              </View>
              <ProgressBar
                progress={Math.min(spent / budget.amount, 1)}
                warning={spent / budget.amount >= 0.8}
              />
            </View>
          );
        })
      ) : (
        <Text style={styles.emptyInline}>
          Create a budget to track category spending.
        </Text>
      )}
    </View>
  );
}

function ProgressBar({
  progress,
  warning,
}: {
  progress: number;
  warning: boolean;
}) {
  return (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          warning && styles.progressFillWarning,
          { width: `${Math.max(0, Math.min(progress, 1)) * 100}%` },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: theme.colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  brand: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    height: 34,
    justifyContent: 'center',
    marginRight: 10,
    width: 34,
  },
  brandGlyph: {
    color: theme.colors.background,
    fontSize: 18,
    fontWeight: '900',
  },
  brandName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  localCaption: {
    color: theme.colors.accent,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginTop: 2,
  },
  addButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: 11,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  addButtonText: {
    color: theme.colors.background,
    fontSize: 13,
    fontWeight: '800',
  },
  titleBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  pageTitle: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  pageSubtitle: {
    color: theme.colors.muted,
    fontSize: 12,
    marginTop: 4,
  },
  periodPill: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  periodText: {
    color: theme.colors.text,
    fontSize: 10,
    fontWeight: '600',
  },
  content: {
    paddingBottom: 30,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  localBanner: {
    alignItems: 'flex-start',
    backgroundColor: '#171C2A',
    borderColor: theme.colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 16,
    padding: 12,
  },
  localBannerIcon: {
    color: theme.colors.accent,
    fontSize: 15,
    fontWeight: '700',
    marginRight: 9,
  },
  localBannerText: {
    color: theme.colors.muted,
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
  successBanner: {
    backgroundColor: theme.colors.accentDark,
    borderRadius: 10,
    marginBottom: 12,
    padding: 12,
  },
  successText: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    minHeight: 118,
    padding: 14,
    width: '48.5%',
  },
  summaryCardAccent: {
    backgroundColor: theme.colors.accentDark,
    borderColor: '#35452A',
  },
  summaryTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    color: theme.colors.muted,
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
  },
  summaryIcon: {
    color: '#8291FF',
    fontSize: 17,
    fontWeight: '700',
  },
  summaryIconAccent: {
    color: theme.colors.accent,
  },
  summaryValue: {
    color: theme.colors.text,
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 14,
  },
  summaryDetail: {
    color: theme.colors.muted,
    fontSize: 9,
    lineHeight: 13,
    marginTop: 5,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  cardHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: theme.colors.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  segment: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    flexDirection: 'row',
    padding: 3,
  },
  segmentOption: {
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  segmentOptionActive: {
    backgroundColor: theme.colors.surfaceRaised,
  },
  segmentText: {
    color: theme.colors.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: theme.colors.text,
  },
  legend: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    marginRight: 16,
  },
  legendDot: {
    borderRadius: 4,
    height: 8,
    marginRight: 6,
    width: 8,
  },
  chart: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    height: 145,
    justifyContent: 'space-around',
    paddingTop: 15,
  },
  chartColumn: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barPair: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    height: 115,
  },
  chartBar: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    marginHorizontal: 2,
    minHeight: 3,
    width: 12,
  },
  incomeBar: {
    backgroundColor: theme.colors.accent,
  },
  expenseBar: {
    backgroundColor: '#8291FF',
  },
  chartLabel: {
    color: theme.colors.muted,
    fontSize: 9,
    marginTop: 8,
  },
  chartHint: {
    color: theme.colors.muted,
    fontSize: 10,
    lineHeight: 15,
  },
  breakdownRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 14,
  },
  categoryDot: {
    borderRadius: 4,
    height: 8,
    marginRight: 9,
    width: 8,
  },
  breakdownCategory: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '600',
    width: 86,
  },
  breakdownTrack: {
    backgroundColor: theme.colors.background,
    borderRadius: 5,
    flex: 1,
    height: 5,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  breakdownFill: {
    borderRadius: 5,
    height: '100%',
  },
  breakdownAmount: {
    color: theme.colors.text,
    fontSize: 10,
    fontWeight: '600',
    minWidth: 61,
    textAlign: 'right',
  },
  emptyInline: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 19,
    paddingVertical: 10,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentDark,
    borderRadius: 18,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  emptyIconText: {
    color: theme.colors.accent,
    fontSize: 26,
    fontWeight: '400',
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyText: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
    maxWidth: 280,
    textAlign: 'center',
  },
  smallAction: {
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  smallActionText: {
    color: theme.colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  budgetItem: {
    marginBottom: 15,
  },
  budgetTotal: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
    padding: 12,
  },
  budgetTotalAmount: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  budgetTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  budgetMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressTrack: {
    backgroundColor: theme.colors.background,
    borderRadius: 5,
    height: 7,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: theme.colors.accent,
    borderRadius: 5,
    height: '100%',
  },
  progressFillWarning: {
    backgroundColor: '#F2AA63',
  },
  budgetRemaining: {
    color: theme.colors.muted,
    fontSize: 10,
    marginTop: 6,
  },
  emptyBudget: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  filterRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 9,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 13,
  },
  categoryFilters: {
    marginBottom: 9,
  },
  chip: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 5,
    marginRight: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  chipSelected: {
    backgroundColor: theme.colors.accentDark,
    borderColor: '#435936',
  },
  chipText: {
    color: theme.colors.muted,
    fontSize: 10,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: theme.colors.accent,
  },
  sortButton: {
    marginLeft: 'auto',
    padding: 7,
  },
  sortText: {
    color: theme.colors.muted,
    fontSize: 10,
    fontWeight: '600',
  },
  transactionRow: {
    alignItems: 'center',
    borderTopColor: theme.colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingVertical: 12,
  },
  transactionMain: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
  },
  transactionIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 11,
    height: 38,
    justifyContent: 'center',
    marginRight: 10,
    width: 38,
  },
  transactionIconText: {
    color: theme.colors.accent,
    fontSize: 17,
    fontWeight: '700',
  },
  transactionInfo: {
    flex: 1,
    marginRight: 8,
  },
  transactionTitle: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  transactionMeta: {
    color: theme.colors.muted,
    fontSize: 9,
    marginTop: 4,
  },
  transactionAmount: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  incomeText: {
    color: theme.colors.accent,
  },
  moreAction: {
    color: theme.colors.muted,
    fontSize: 20,
    marginLeft: 12,
    paddingHorizontal: 4,
  },
  tabBar: {
    backgroundColor: theme.colors.surface,
    borderTopColor: theme.colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 5,
    paddingTop: 8,
  },
  tab: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 3,
  },
  tabIcon: {
    color: theme.colors.muted,
    fontSize: 18,
  },
  tabLabel: {
    color: theme.colors.muted,
    fontSize: 9,
    marginTop: 3,
  },
  tabActive: {
    color: theme.colors.accent,
    fontWeight: '700',
  },
  modalBackdrop: {
    backgroundColor: 'rgba(0,0,0,0.72)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalScroll: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 19,
    fontWeight: '800',
  },
  closeButton: {
    color: theme.colors.muted,
    fontSize: 28,
    paddingHorizontal: 5,
  },
  fieldLabel: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 9,
  },
  categoryPicker: {
    marginBottom: 9,
  },
  dateActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  formError: {
    color: theme.colors.danger,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  authError: {
    color: theme.colors.danger,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  statusMessage: {
    color: theme.colors.muted,
    fontSize: 12,
    marginBottom: 12,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  cancelText: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  viewModalBackdrop: {
    backgroundColor: 'rgba(0,0,0,0.72)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  viewActions: {
    flexDirection: 'row',
    marginTop: 22,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 12,
    flex: 1,
    marginRight: 8,
    paddingVertical: 14,
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: '#321B24',
    borderRadius: 12,
    flex: 1,
    marginLeft: 8,
    paddingVertical: 14,
  },
  deleteButtonText: {
    color: theme.colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  removeText: {
    color: theme.colors.danger,
    fontSize: 10,
    fontWeight: '600',
  },
  settingsSubtitle: {
    marginBottom: 18,
    marginTop: 8,
  },
  settingsLabel: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
  },
  settingsDivider: {
    backgroundColor: theme.colors.border,
    height: StyleSheet.hairlineWidth,
    marginVertical: 20,
  },
  signOutButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 12,
    marginTop: 6,
    paddingVertical: 14,
  },
  signOutText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
});

export default DashboardScreen;
