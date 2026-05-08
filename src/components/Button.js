import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, igGradient } from '../theme/colors';

export default function Button({ title, onPress, variant = 'primary', disabled, style }) {
  if (variant === 'primary' && !disabled) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [styles.btn, pressed && styles.pressed, style]}
      >
        <LinearGradient
          colors={igGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Text style={[styles.label, styles.labelOnGradient]}>{title}</Text>
      </Pressable>
    );
  }

  const palette = variantPalette(variant);
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: palette.borderWidth ?? 0,
        },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.label, { color: palette.text }]}>{title}</Text>
    </Pressable>
  );
}

function variantPalette(variant) {
  switch (variant) {
    case 'ghost':
      return {
        bg: 'transparent',
        border: colors.border,
        text: colors.textSecondary,
        borderWidth: 1,
      };
    case 'danger':
      return { bg: colors.danger, border: colors.danger, text: '#fff' };
    case 'token':
      return { bg: colors.text, border: colors.text, text: '#fff' };
    case 'success':
      return { bg: colors.success, border: colors.success, text: '#fff' };
    case 'primary':
    default:
      return { bg: '#dbdbdb', border: '#dbdbdb', text: '#fff' };
  }
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  label: {
    ...fonts.uiBold,
    fontSize: 15,
    letterSpacing: 0.3,
  },
  labelOnGradient: {
    color: '#fff',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
});
