import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type QuoteCardProps = {
  quote: string;
};

export function QuoteCard({ quote }: QuoteCardProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>Wenwen Note</Text>
      <Text style={styles.quote}>{quote}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    backgroundColor: 'rgba(86,146,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(134,178,255,0.25)',
    padding: 14,
  },
  kicker: {
    color: '#AFCAFF',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  quote: {
    marginTop: 8,
    color: '#E9F2FF',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
});
