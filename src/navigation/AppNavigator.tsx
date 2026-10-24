import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import DashboardScreen from '../screens/DashboardScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import { Budget, Transaction } from '../assets/finance';
import theme from '../assets/theme';
import {
  firebaseAuth,
  firebaseFirestore,
  getFirebaseAuthErrorMessage,
  signOutFirebase,
  UserProfile,
} from '../services/firebaseAuth';
import {
  deleteUserTransaction,
  listenToUserTransactions,
  saveUserTransaction,
} from '../services/firebaseTransactions';

type FirebaseScreenState =
  | 'initializing'
  | 'signedOut'
  | 'profileLoading'
  | 'signedIn'
  | 'profileMissing'
  | 'profileError'
  | 'unavailable';

function AppNavigator() {
  const [screen, setScreen] = useState<'login' | 'register'>('login');
  const [inDemo, setInDemo] = useState(false);
  const [demoTransactions, setDemoTransactions] = useState<Transaction[]>([]);
  const [demoBudgets, setDemoBudgets] = useState<Budget[]>([]);
  const [demoCurrency, setDemoCurrency] = useState('USD');
  const [accountTransactions, setAccountTransactions] = useState<Transaction[]>(
    [],
  );
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState('');
  const [accountBudgets, setAccountBudgets] = useState<Budget[]>([]);
  const [accountCurrency, setAccountCurrency] = useState('USD');
  const [firebaseState, setFirebaseState] =
    useState<FirebaseScreenState>('initializing');
  const [firebaseUser, setFirebaseUser] =
    useState<FirebaseAuthTypes.User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [firebaseError, setFirebaseError] = useState('');
  const [retryProfile, setRetryProfile] = useState(0);

  useEffect(() => {
    let stopProfile: (() => void) | undefined;
    let stopAuth: (() => void) | undefined;
    let currentUid: string | null = null;

    try {
      stopAuth = firebaseAuth().onAuthStateChanged(user => {
        if (user?.uid !== currentUid) {
          setAccountTransactions([]);
          setTransactionsLoading(Boolean(user));
          setTransactionsError('');
          setAccountBudgets([]);
          setAccountCurrency('USD');
          currentUid = user?.uid ?? null;
        }
        stopProfile?.();
        stopProfile = undefined;
        setFirebaseUser(user);
        setProfile(null);
        setFirebaseError('');
        if (!user) {
          setTransactionsLoading(false);
          setFirebaseState('signedOut');
          return;
        }

        setFirebaseState('profileLoading');
        stopProfile = firebaseFirestore()
          .collection('users')
          .doc(user.uid)
          .onSnapshot(
            document => {
              if (!document.exists) {
                setFirebaseState('profileMissing');
                return;
              }
              const data = document.data();
              if (
                !data ||
                typeof data.fullName !== 'string' ||
                typeof data.email !== 'string' ||
                data.uid !== user.uid
              ) {
                setFirebaseError(
                  'Your saved profile is incomplete or invalid.',
                );
                setFirebaseState('profileError');
                return;
              }
              setProfile({
                uid: user.uid,
                fullName: data.fullName,
                email: data.email,
                termsAccepted: data.termsAccepted === true,
              });
              setFirebaseState('signedIn');
            },
            error => {
              setFirebaseError(getFirebaseAuthErrorMessage(error));
              setFirebaseState('profileError');
            },
          );
      });
    } catch (error) {
      setFirebaseError(getFirebaseAuthErrorMessage(error));
      setFirebaseState('unavailable');
    }

    return () => {
      stopProfile?.();
      stopAuth?.();
    };
  }, [retryProfile]);

  useEffect(() => {
    if (!firebaseUser || firebaseState !== 'signedIn') {
      return;
    }

    setTransactionsLoading(true);
    setTransactionsError('');
    return listenToUserTransactions(
      firebaseUser.uid,
      transactions => {
        setAccountTransactions(transactions);
        setTransactionsLoading(false);
        setTransactionsError('');
      },
      error => {
        setTransactionsLoading(false);
        setTransactionsError(getFirebaseAuthErrorMessage(error));
      },
    );
  }, [firebaseUser, firebaseState]);

  const openDemo = () => {
    setScreen('login');
    setInDemo(true);
  };

  if (
    firebaseState === 'initializing' ||
    (firebaseUser && firebaseState === 'profileLoading')
  ) {
    return <LoadingScreen />;
  }

  if (
    firebaseState === 'profileMissing' ||
    firebaseState === 'profileError' ||
    (firebaseState === 'unavailable' && !inDemo)
  ) {
    return (
      <FirebaseStatusScreen
        message={
          firebaseState === 'profileMissing'
            ? 'Your Firebase account is signed in, but its Firestore profile could not be found. Confirm Firestore is created and its rules are deployed.'
            : firebaseError ||
              'Firebase could not be initialized. Check this platform’s Firebase configuration and setup.'
        }
        onRetry={() => setRetryProfile(value => value + 1)}
        onSignOut={async () => {
          try {
            await signOutFirebase();
          } catch (error) {
            setFirebaseError(getFirebaseAuthErrorMessage(error));
            setFirebaseState('profileError');
          }
        }}
        onOpenDemo={firebaseState === 'unavailable' ? openDemo : undefined}
      />
    );
  }

  if (firebaseState === 'signedIn' && firebaseUser && profile) {
    return (
      <DashboardScreen
        transactions={accountTransactions}
        budgets={accountBudgets}
        currency={accountCurrency}
        transactionsLoading={transactionsLoading}
        transactionError={transactionsError}
        profile={profile}
        authActionError={firebaseError}
        onCurrencyChange={setAccountCurrency}
        onSaveTransaction={transaction =>
          saveUserTransaction(firebaseUser.uid, transaction).catch(error => {
            throw new Error(getFirebaseAuthErrorMessage(error));
          })
        }
        onDeleteTransaction={id =>
          deleteUserTransaction(firebaseUser.uid, id).catch(error => {
            throw new Error(getFirebaseAuthErrorMessage(error));
          })
        }
        onSaveBudget={budget =>
          setAccountBudgets(current => {
            const existing = current.find(
              item => item.category === budget.category,
            );
            return existing
              ? current.map(item =>
                  item.category === budget.category
                    ? { ...budget, id: existing.id }
                    : item,
                )
              : [...current, budget];
          })
        }
        onDeleteBudget={id =>
          setAccountBudgets(current => current.filter(item => item.id !== id))
        }
        onSignOut={async () => {
          try {
            await signOutFirebase();
            setAccountTransactions([]);
            setAccountBudgets([]);
            setAccountCurrency('USD');
          } catch (error) {
            setFirebaseError(getFirebaseAuthErrorMessage(error));
            setFirebaseState('profileError');
          }
        }}
      />
    );
  }

  if (inDemo) {
    return (
      <DashboardScreen
        transactions={demoTransactions}
        budgets={demoBudgets}
        currency={demoCurrency}
        onCurrencyChange={setDemoCurrency}
        onSaveTransaction={transaction =>
          setDemoTransactions(current => {
            const index = current.findIndex(item => item.id === transaction.id);
            if (index < 0) {
              return [transaction, ...current];
            }
            return current.map(item =>
              item.id === transaction.id ? transaction : item,
            );
          })
        }
        onDeleteTransaction={id =>
          setDemoTransactions(current => current.filter(item => item.id !== id))
        }
        onSaveBudget={budget =>
          setDemoBudgets(current => {
            const existing = current.find(
              item => item.category === budget.category,
            );
            if (existing) {
              return current.map(item =>
                item.category === budget.category
                  ? { ...budget, id: existing.id }
                  : item,
              );
            }
            return [...current, budget];
          })
        }
        onDeleteBudget={id =>
          setDemoBudgets(current => current.filter(item => item.id !== id))
        }
        onSignOut={() => {
          setDemoTransactions([]);
          setDemoBudgets([]);
          setDemoCurrency('USD');
          setInDemo(false);
        }}
      />
    );
  }

  if (screen === 'register') {
    return (
      <RegisterScreen
        onShowLogin={() => setScreen('login')}
        onEnterDemo={openDemo}
      />
    );
  }

  return (
    <LoginScreen
      onShowRegister={() => setScreen('register')}
      onEnterDemo={openDemo}
    />
  );
}

function LoadingScreen() {
  return (
    <View style={styles.statusScreen}>
      <ActivityIndicator color={theme.colors.accent} size="large" />
      <Text style={styles.statusText}>Checking your Firebase session…</Text>
    </View>
  );
}

function FirebaseStatusScreen({
  message,
  onRetry,
  onSignOut,
  onOpenDemo,
}: {
  message: string;
  onRetry: () => void;
  onSignOut: () => void;
  onOpenDemo?: () => void;
}) {
  return (
    <View style={styles.statusScreen}>
      <Text style={styles.statusTitle}>Can’t load your account</Text>
      <Text accessibilityRole="alert" style={styles.statusText}>
        {message}
      </Text>
      <Pressable onPress={onRetry} style={styles.retryButton}>
        <Text style={styles.retryText}>Try again</Text>
      </Pressable>
      <Pressable onPress={onSignOut} style={styles.signOutButton}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
      {onOpenDemo ? (
        <Pressable onPress={onOpenDemo} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Continue to local demo</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  statusScreen: {
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: 28,
  },
  statusTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  statusText: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 14,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: 11,
    marginTop: 22,
    paddingHorizontal: 28,
    paddingVertical: 13,
  },
  retryText: {
    color: theme.colors.background,
    fontSize: 13,
    fontWeight: '800',
  },
  signOutButton: {
    padding: 15,
  },
  signOutText: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default AppNavigator;
