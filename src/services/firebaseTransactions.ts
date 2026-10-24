import firestore from '@react-native-firebase/firestore';
import { isValidDate, Transaction, categories } from '../assets/finance';

function getUserTransactions(userId: string) {
  if (!userId.trim()) {
    throw new Error('A signed-in user is required to access transactions.');
  }
  return firestore()
    .collection('users')
    .doc(userId)
    .collection('transactions');
}

function validateTransaction(transaction: Transaction) {
  if (
    !Number.isFinite(transaction.amount) ||
    transaction.amount <= 0 ||
    transaction.amount > 1_000_000_000_000
  ) {
    throw new Error('Enter a valid amount greater than zero.');
  }
  if (transaction.type !== 'income' && transaction.type !== 'expense') {
    throw new Error('Choose income or expense.');
  }
  if (!categories.includes(transaction.category)) {
    throw new Error('Choose a valid category.');
  }
  if (!transaction.title.trim() || transaction.title.trim().length > 120) {
    throw new Error('Description must be between 1 and 120 characters.');
  }
  if (!isValidDate(transaction.date)) {
    throw new Error('Choose a valid date in YYYY-MM-DD format.');
  }
}

function parseTransaction(id: string, value: Record<string, unknown>) {
  const { amount, category, date, description, type } = value;
  if (
    typeof amount !== 'number' ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    typeof category !== 'string' ||
    !categories.includes(category) ||
    typeof date !== 'string' ||
    !isValidDate(date) ||
    typeof description !== 'string' ||
    !description.trim() ||
    (type !== 'income' && type !== 'expense')
  ) {
    throw new Error('A saved transaction has invalid or incomplete data.');
  }
  return {
    id,
    amount,
    category,
    date,
    title: description,
    type,
  } satisfies Transaction;
}

export function listenToUserTransactions(
  userId: string,
  onTransactions: (transactions: Transaction[]) => void,
  onError: (error: unknown) => void,
) {
  return getUserTransactions(userId)
    .orderBy('date', 'desc')
    .onSnapshot(
      snapshot => {
        try {
          onTransactions(
            snapshot.docs.map(document =>
              parseTransaction(
                document.id,
                document.data() as Record<string, unknown>,
              ),
            ),
          );
        } catch (error) {
          onError(error);
        }
      },
      onError,
    );
}

export async function saveUserTransaction(
  userId: string,
  transaction: Transaction,
) {
  validateTransaction(transaction);
  const collection = getUserTransactions(userId);
  const now = firestore.FieldValue.serverTimestamp();
  const data = {
    amount: transaction.amount,
    category: transaction.category,
    date: transaction.date,
    description: transaction.title.trim(),
    type: transaction.type,
    updatedAt: now,
  };
  if (transaction.id) {
    await collection.doc(transaction.id).update(data);
    return;
  }
  await collection.add({ ...data, createdAt: now });
}

export async function deleteUserTransaction(userId: string, id: string) {
  if (!id.trim()) {
    throw new Error('A transaction is required to delete it.');
  }
  await getUserTransactions(userId).doc(id).delete();
}
