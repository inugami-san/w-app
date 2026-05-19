import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/src/theme/app-theme';

type QuoteCardProps = {
  quote: string;
};

export function QuoteCard({ quote }: QuoteCardProps) {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: theme.primarySoft }]}>
        <Ionicons name="sparkles-outline" size={16} color={theme.primaryStrong} />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.kicker, { color: theme.subtle }]}>Daily note</Text>
        <Text style={[styles.quote, { color: theme.textStrong }]}>{quote}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 18,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  quote: {
    marginTop: 5,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
});
