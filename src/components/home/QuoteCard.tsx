import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
        { backgroundColor: theme.primarySoft, borderColor: theme.softBorder },
      ]}
    >
      <Text style={[styles.kicker, { color: theme.primaryStrong }]}>Wenwen Note</Text>
      <Text style={[styles.quote, { color: theme.textStrong }]}>{quote}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  quote: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
});
