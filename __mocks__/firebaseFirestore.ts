export const transactionDocumentMock = {
  update: jest.fn(),
  delete: jest.fn(),
};

export const transactionsCollectionMock = {
  add: jest.fn(),
  doc: jest.fn(() => transactionDocumentMock),
  orderBy: jest.fn(() => ({
    onSnapshot: jest.fn(),
  })),
};

export const userDocumentMock = {
  onSnapshot: jest.fn(),
  set: jest.fn(),
  collection: jest.fn(() => transactionsCollectionMock),
};

const firestore = Object.assign(
  jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => userDocumentMock),
    })),
  })),
  {
    FieldValue: {
      serverTimestamp: jest.fn(() => ({ __timestamp: true })),
    },
  },
);

export default firestore;
