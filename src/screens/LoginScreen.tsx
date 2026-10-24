import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import theme from '../assets/theme';
import {
  getFirebaseAuthErrorMessage,
  signInWithEmail,
} from '../services/firebaseAuth';

type LoginScreenProps = {
  onShowRegister: () => void;
  onEnterDemo: () => void;
};

function LoginScreen({ onShowRegister, onEnterDemo }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const emailError =
    submitted && !emailIsValid ? 'Enter a valid email address.' : '';
  const passwordError =
    submitted && !password ? 'Please enter your password.' : '';
  const isReady = emailIsValid && password.length > 0;

  const handleSignIn = async () => {
    setSubmitted(true);
    setAuthError('');
    if (!isReady || loading) {
      return;
    }
    setLoading(true);
    try {
      await signInWithEmail(email, password);
    } catch (error) {
      setAuthError(getFirebaseAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.brand}>
              <View style={styles.brandMark}>
                <View style={styles.brandMarkInner} />
              </View>
              <Text style={styles.brandName}>Spendly</Text>
            </View>
            <View style={styles.signUpPrompt}>
              <Text style={styles.mutedText}>New here?</Text>
              <Pressable
                accessibilityRole="link"
                onPress={onShowRegister}
                hitSlop={8}
              >
                <Text style={styles.signUpLink}>Create account</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.hero}>
            <View style={styles.eyebrow}>
              <View style={styles.eyebrowDot} />
              <Text style={styles.eyebrowText}>WELCOME BACK</Text>
            </View>
            <Text style={styles.title}>
              Good to{'\n'}
              <Text style={styles.titleAccent}>see you.</Text>
            </Text>
            <Text style={styles.subtitle}>
              Sign in to pick up where you left off.
            </Text>
          </View>

          <View style={styles.form}>
            <FormField
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              label="Email address"
              onChangeText={setEmail}
              placeholder="you@example.com"
              returnKeyType="next"
              textContentType="emailAddress"
              value={email}
              error={emailError}
            />
            <FormField
              autoCapitalize="none"
              autoComplete="current-password"
              label="Password"
              onChangeText={setPassword}
              placeholder="Enter your password"
              returnKeyType="done"
              secureToggle
              textContentType="password"
              value={password}
              error={passwordError}
            />

            <PrimaryButton
              label="Sign in"
              loading={loading}
              onPress={handleSignIn}
            />

            {authError ? (
              <Text accessibilityRole="alert" style={styles.notice}>
                {authError}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="link"
              onPress={onEnterDemo}
              style={styles.demoLink}
            >
              <Text style={styles.demoLinkText}>
                Skip sign-in · open local demo
              </Text>
            </Pressable>

            <View style={styles.localNotice}>
              <Text style={styles.localNoticeText}>
                Sign in with your Firebase email and password.
              </Text>
            </View>
            <View style={styles.footer}>
              <View style={styles.footerLine} />
              <Text style={styles.footerText}>
                LOCAL · NOT SYNCED · TEMPORARY
              </Text>
              <View style={styles.footerLine} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
    paddingHorizontal: 26,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  brand: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    height: 32,
    justifyContent: 'center',
    transform: [{ rotate: '-8deg' }],
    width: 32,
  },
  brandMarkInner: {
    borderColor: theme.colors.background,
    borderRadius: 5,
    borderWidth: 2,
    height: 13,
    transform: [{ rotate: '8deg' }],
    width: 13,
  },
  brandName: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2.2,
    marginLeft: 10,
  },
  signUpPrompt: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  mutedText: {
    color: theme.colors.muted,
    fontSize: 12,
  },
  signUpLink: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 5,
  },
  hero: {
    marginBottom: 35,
    marginTop: 65,
  },
  eyebrow: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.accentDark,
    borderRadius: 30,
    flexDirection: 'row',
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  eyebrowDot: {
    backgroundColor: theme.colors.accent,
    borderRadius: 3,
    height: 6,
    marginRight: 7,
    width: 6,
  },
  eyebrowText: {
    color: theme.colors.accent,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    color: theme.colors.text,
    fontSize: 43,
    fontWeight: '800',
    letterSpacing: -1.6,
    lineHeight: 49,
    marginTop: 18,
  },
  titleAccent: {
    color: theme.colors.accent,
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 14,
    marginTop: 11,
  },
  form: {
    width: '100%',
  },
  notice: {
    color: theme.colors.accent,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
    textAlign: 'center',
  },
  demoLink: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  demoLinkText: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  localNotice: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 18,
    padding: 11,
  },
  localNoticeText: {
    color: theme.colors.muted,
    fontSize: 11,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 30,
  },
  footerLine: {
    backgroundColor: theme.colors.border,
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  footerText: {
    color: theme.colors.muted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginHorizontal: 12,
  },
});

export default LoginScreen;
