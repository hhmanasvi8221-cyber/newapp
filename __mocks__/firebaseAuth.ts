export const authMock = {
  onAuthStateChanged: (
    listener: (user: { uid: string; email: string | null } | null) => void,
  ) => {
    listener(null);
    return jest.fn();
  },
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
};

const auth = jest.fn(() => authMock);

export default auth;
