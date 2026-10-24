import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export type UserProfile = {
  uid: string;
  fullName: string;
  email: string;
  termsAccepted: boolean;
};

export const firebaseAuth = auth;
export const firebaseFirestore = firestore;

export async function registerWithEmail(
  fullName: string,
  email: string,
  password: string,
  termsAccepted: boolean,
) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!termsAccepted) {
    throw new Error('Terms acceptance is required to create an account.');
  }
  const userCredential = await auth().createUserWithEmailAndPassword(
    normalizedEmail,
    password,
  );

  try {
    await userCredential.user.updateProfile({ displayName: fullName.trim() });
    const createdAt = firestore.FieldValue.serverTimestamp();
    await firestore().collection('users').doc(userCredential.user.uid).set({
      uid: userCredential.user.uid,
      fullName: fullName.trim(),
      email: normalizedEmail,
      termsAccepted,
      termsAcceptedAt: createdAt,
      createdAt,
      updatedAt: createdAt,
    });
  } catch (error) {
    throw new Error(
      'Your authentication account was created, but your profile could not be saved. Check the Firestore setup and try signing in again.',
      { cause: error },
    );
  }
}

export async function signInWithEmail(email: string, password: string) {
  await auth().signInWithEmailAndPassword(email.trim().toLowerCase(), password);
}

export async function signOutFirebase() {
  await auth().signOut();
}

export function getFirebaseAuthErrorMessage(error: unknown) {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String(error.code)
      : '';

  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account already exists for this email. Try signing in instead.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/weak-password':
      return 'Choose a stronger password with at least 6 characters.';
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'The email or password is incorrect.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a little and try again.';
    case 'auth/operation-not-allowed':
      return 'Email and password sign-in is disabled in Firebase Authentication settings.';
    case 'auth/network-request-failed':
      return 'Could not reach Firebase. Check your internet connection.';
    case 'firestore/permission-denied':
      return 'Firestore denied access. Deploy the included Firestore security rules.';
    default:
      return error instanceof Error
        ? error.message
        : 'Something went wrong. Please try again.';
  }
}
