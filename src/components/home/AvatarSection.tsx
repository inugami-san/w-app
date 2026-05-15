import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/src/theme/app-theme';

type AvatarSectionProps = {
  greeting: string;
  name?: string;
};

export function AvatarSection({ greeting, name = 'Friend' }: AvatarSectionProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.avatarCircle,
          { backgroundColor: theme.primarySoft, borderColor: theme.surface },
        ]}
      >
        <Text style={[styles.avatarLetter, { color: theme.primaryStrong }]}>W</Text>
      </View>

      <View style={styles.textWrap}>
        <Text style={[styles.greeting, { color: theme.text }]}>{greeting}, {name}</Text>
        <Text style={[styles.caption, { color: theme.muted }]}>Here&apos;s today&apos;s plan.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  avatarLetter: {
    fontSize: 19,
    fontWeight: '800',
  },
  textWrap: {
    flex: 1,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
  },
  caption: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: '600',
  },
});
