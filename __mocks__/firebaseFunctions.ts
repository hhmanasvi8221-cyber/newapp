export const httpsCallableMock = jest.fn();

const functions = jest.fn(() => ({
  httpsCallable: httpsCallableMock,
}));

export default functions;
