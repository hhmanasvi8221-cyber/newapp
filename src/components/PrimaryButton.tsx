import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import theme from '../assets/theme';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
}: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        (pressed || disabled || loading) && styles.pressed,
      ]}
    >
      <Text style={styles.label}>{loading ? 'Please wait…' : label}</Text>
      {!loading ? <Text style={styles.arrow}>→</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 56,
    marginTop: 6,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  label: {
    color: theme.colors.background,
    fontSize: 15,
    fontWeight: '800',
  },
  arrow: {
    color: theme.colors.background,
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 10,
    marginTop: -2,
  },
});

export default PrimaryButton;
