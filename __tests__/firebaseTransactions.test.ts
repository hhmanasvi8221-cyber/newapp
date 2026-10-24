import {
  deleteUserTransaction,
  listenToUserTransactions,
  saveUserTransaction,
} from '../src/services/firebaseTransactions';
import {
  transactionDocumentMock,
  transactionsCollectionMock,
  userDocumentMock,
} from '../__mocks__/firebaseFirestore';
import { Transaction } from '../src/assets/finance';

const transaction: Transaction = {
  id: '',
  title: 'Monthly salary',
  category: 'Other',
  amount: 3200,
  type: 'income',
  date: '2026-10-24',
};

describe('Firebase transaction service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    transactionsCollectionMock.add.mockResolvedValue({ id: 'new-transaction' });
    transactionDocumentMock.update.mockResolvedValue(undefined);
    transactionDocumentMock.delete.mockResolvedValue(undefined);
  });

  it('saves new records to the signed-in user collection without changing the description', async () => {
    await saveUserTransaction('user-123', transaction);

    expect(userDocumentMock.collection).toHaveBeenCalledWith('transactions');
    expect(transactionsCollectionMock.add).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 3200,
        category: 'Other',
        date: '2026-10-24',
        description: 'Monthly salary',
        type: 'income',
        createdAt: { __timestamp: true },
      }),
    );
    expect(transactionsCollectionMock.add.mock.calls[0][0]).not.toHaveProperty(
      'password',
    );
  });

  it('updates an existing transaction document and deletes only the requested id', async () => {
    await saveUserTransaction('user-123', {
      ...transaction,
      id: 'transaction-123',
    });
    await deleteUserTransaction('user-123', 'transaction-123');

    expect(transactionsCollectionMock.doc).toHaveBeenCalledWith(
      'transaction-123',
    );
    expect(transactionDocumentMock.update).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Monthly salary' }),
    );
    expect(transactionDocumentMock.delete).toHaveBeenCalledTimes(1);
  });

  it('reads and maps saved transactions from the current user collection', () => {
    const onSnapshot = jest.fn();
    transactionsCollectionMock.orderBy.mockReturnValue({ onSnapshot });
    const onTransactions = jest.fn();
    const onError = jest.fn();
    listenToUserTransactions('user-123', onTransactions, onError);

    expect(transactionsCollectionMock.orderBy).toHaveBeenCalledWith(
      'date',
      'desc',
    );
    onSnapshot.mock.calls[0][0]({
      docs: [
        {
          id: 'saved-1',
          data: () => ({
            amount: 3200,
            category: 'Other',
            date: '2026-10-24',
            description: 'Monthly salary',
            type: 'income',
          }),
        },
      ],
    });
    expect(onTransactions).toHaveBeenCalledWith([
      { ...transaction, id: 'saved-1' },
    ]);
    expect(onError).not.toHaveBeenCalled();
  });

  it('rejects invalid amounts and missing user ids before writing', async () => {
    await expect(
      saveUserTransaction('user-123', { ...transaction, amount: 0 }),
    ).rejects.toThrow('valid amount');
    await expect(saveUserTransaction('', transaction)).rejects.toThrow(
      'signed-in user',
    );
    expect(transactionsCollectionMock.add).not.toHaveBeenCalled();
  });
});
