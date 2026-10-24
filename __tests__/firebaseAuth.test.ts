import {
  getFirebaseAuthErrorMessage,
  registerWithEmail,
  signInWithEmail,
} from '../src/services/firebaseAuth';
import { authMock } from '../__mocks__/firebaseAuth';
import { userDocumentMock } from '../__mocks__/firebaseFirestore';

describe('Firebase account service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates an auth account and stores only the non-password profile', async () => {
    const updateProfile = jest.fn().mockResolvedValue(undefined);
    const user = { uid: 'firebase-user-id', updateProfile };
    authMock.createUserWithEmailAndPassword = jest
      .fn()
      .mockResolvedValue({ user });
    userDocumentMock.set.mockResolvedValue(undefined);

    await registerWithEmail(
      'Alex Morgan',
      '  ALEX@example.com ',
      'a-long-password',
      true,
    );

    expect(authMock.createUserWithEmailAndPassword).toHaveBeenCalledWith(
      'alex@example.com',
      'a-long-password',
    );
    expect(updateProfile).toHaveBeenCalledWith({ displayName: 'Alex Morgan' });
    const savedProfile = userDocumentMock.set.mock.calls[0][0];
    expect(savedProfile).toMatchObject({
      uid: 'firebase-user-id',
      fullName: 'Alex Morgan',
      email: 'alex@example.com',
      termsAccepted: true,
    });
    expect(savedProfile).not.toHaveProperty('password');
  });

  it('requires terms acceptance before creating an account', async () => {
    await expect(
      registerWithEmail(
        'Alex Morgan',
        'alex@example.com',
        'password123',
        false,
      ),
    ).rejects.toThrow('Terms acceptance is required');
    expect(authMock.createUserWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it('normalizes email for sign-in and translates invalid credentials', async () => {
    authMock.signInWithEmailAndPassword = jest
      .fn()
      .mockResolvedValue(undefined);
    await signInWithEmail(' ALEX@example.com ', 'password123');
    expect(authMock.signInWithEmailAndPassword).toHaveBeenCalledWith(
      'alex@example.com',
      'password123',
    );
    expect(
      getFirebaseAuthErrorMessage({ code: 'auth/invalid-credential' }),
    ).toBe('The email or password is incorrect.');
  });
});
