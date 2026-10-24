import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import theme from '../assets/theme';

type FormFieldProps = TextInputProps & {
  label: string;
  error?: string;
  secureToggle?: boolean;
};

function FormField({
  label,
  error,
  secureToggle = false,
  secureTextEntry,
  ...inputProps
}: FormFieldProps) {
  const [focused, setFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isSecure = secureToggle ? !passwordVisible : secureTextEntry;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputWrapper,
          focused && styles.inputWrapperFocused,
          error && styles.inputWrapperError,
        ]}
      >
        <TextInput
          {...inputProps}
          accessibilityLabel={inputProps.accessibilityLabel ?? label}
          secureTextEntry={isSecure}
          onFocus={event => {
            setFocused(true);
            inputProps.onFocus?.(event);
          }}
          onBlur={event => {
            setFocused(false);
            inputProps.onBlur?.(event);
          }}
          placeholderTextColor={theme.colors.muted}
          selectionColor={theme.colors.accent}
          style={styles.input}
        />
        {secureToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              passwordVisible ? 'Hide password' : 'Show password'
            }
            hitSlop={8}
            onPress={() => setPasswordVisible(visible => !visible)}
            style={styles.toggle}
          >
            <Text style={styles.toggleText}>
              {passwordVisible ? 'Hide' : 'Show'}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
  },
  label: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 9,
  },
  inputWrapper: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 54,
    paddingHorizontal: 15,
  },
  inputWrapperFocused: {
    borderColor: theme.colors.accent,
  },
  inputWrapperError: {
    borderColor: theme.colors.danger,
  },
  input: {
    color: theme.colors.text,
    flex: 1,
    fontSize: 15,
    paddingVertical: 14,
  },
  toggle: {
    paddingLeft: 12,
    paddingVertical: 8,
  },
  toggleText: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  error: {
    color: theme.colors.danger,
    fontSize: 12,
    marginTop: 6,
  },
});

export default FormField;
