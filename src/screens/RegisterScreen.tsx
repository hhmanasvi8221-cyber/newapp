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
  registerWithEmail,
} from '../services/firebaseAuth';

type RegisterScreenProps = {
  onShowLogin: () => void;
  onEnterDemo: () => void;
};

function RegisterScreen({ onShowLogin, onEnterDemo }: RegisterScreenProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [registrationError, setRegistrationError] = useState('');
  const [loading, setLoading] = useState(false);

  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const nameError = submitted && !name.trim() ? 'Please enter your name.' : '';
  const emailError =
    submitted && !emailIsValid ? 'Enter a valid email address.' : '';
  const passwordError =
    submitted && password.length < 8 ? 'Use at least 8 characters.' : '';
  const termsError =
    submitted && !acceptedTerms ? 'Please accept the terms to continue.' : '';
  const isReady = Boolean(
    name.trim() && emailIsValid && password.length >= 8 && acceptedTerms,
  );

  const handleSubmit = async () => {
    setSubmitted(true);
    setRegistrationError('');
    if (!isReady || loading) {
      return;
    }
    setLoading(true);
    try {
      await registerWithEmail(name, email, password, acceptedTerms);
    } catch (error) {
      setRegistrationError(getFirebaseAuthErrorMessage(error));
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
            <View style={styles.signInPrompt}>
              <Text style={styles.mutedText}>Already a member?</Text>
              <Text
                accessibilityRole="link"
                onPress={onShowLogin}
                style={styles.signInLink}
              >
                Sign in
              </Text>
            </View>
          </View>

          <View style={styles.hero}>
            <View style={styles.eyebrow}>
              <View style={styles.eyebrowDot} />
              <Text style={styles.eyebrowText}>SECURE ACCOUNT ACCESS</Text>
            </View>
            <Text style={styles.title}>
              Create your{'\n'}
              <Text style={styles.titleAccent}>account.</Text>
            </Text>
            <Text style={styles.subtitle}>
              Create your account to access your personal finance workspace.
            </Text>
          </View>

          <View style={styles.form}>
            <FormField
              autoCapitalize="words"
              autoComplete="name"
              label="Full name"
              onChangeText={setName}
              placeholder="e.g. Alex Morgan"
              returnKeyType="next"
              textContentType="name"
              value={name}
              error={nameError}
            />
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
              autoComplete="new-password"
              label="Password"
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              returnKeyType="done"
              secureToggle
              textContentType="newPassword"
              value={password}
              error={passwordError}
            />

            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acceptedTerms }}
              onPress={() => setAcceptedTerms(value => !value)}
              style={styles.termsRow}
            >
              <View
                style={[
                  styles.checkbox,
                  acceptedTerms && styles.checkboxChecked,
                ]}
              >
                {acceptedTerms ? <Text style={styles.checkmark}>✓</Text> : null}
              </View>
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </Pressable>
            {termsError ? (
              <Text style={styles.termsError}>{termsError}</Text>
            ) : null}

            <PrimaryButton
              label="Create account"
              loading={loading}
              onPress={handleSubmit}
            />

            {registrationError ? (
              <Text accessibilityRole="alert" style={styles.notice}>
                {registrationError}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="link"
              onPress={onEnterDemo}
              style={styles.demoLink}
            >
              <Text style={styles.demoLinkText}>
                Continue without an account · open local demo
              </Text>
            </Pressable>

            <View style={styles.localNotice}>
              <Text style={styles.localNoticeText}>
                Your profile is stored in Firestore; your password is handled by
                Firebase Authentication and is never written to Firestore.
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
  signInPrompt: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  mutedText: {
    color: theme.colors.muted,
    fontSize: 12,
  },
  signInLink: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 5,
  },
  hero: {
    marginBottom: 29,
    marginTop: 53,
  },
  eyebrow: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentDark,
    borderRadius: 30,
    flexDirection: 'row',
    paddingHorizontal: 11,
    paddingVertical: 7,
    alignSelf: 'flex-start',
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
  termsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 18,
    marginTop: 1,
  },
  checkbox: {
    alignItems: 'center',
    borderColor: theme.colors.border,
    borderRadius: 5,
    borderWidth: 1,
    height: 19,
    justifyContent: 'center',
    marginRight: 10,
    width: 19,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  checkmark: {
    color: theme.colors.background,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 16,
  },
  termsText: {
    color: theme.colors.muted,
    flex: 1,
    fontSize: 12,
    lineHeight: 19,
  },
  termsLink: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  termsError: {
    color: theme.colors.danger,
    fontSize: 12,
    marginBottom: 12,
    marginTop: -12,
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
    textAlign: 'center',
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

export default RegisterScreen;
