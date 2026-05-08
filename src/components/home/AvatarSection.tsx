import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type AvatarSectionProps = {
  greeting: string;
  name?: string;
};

export function AvatarSection({ greeting, name = 'Friend' }: AvatarSectionProps) {
  return (
    <View style={styles.container}>
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarLetter}>W</Text>
      </View>

      <View style={styles.textWrap}>
        <Text style={styles.greeting}>{greeting}, {name}</Text>
        <Text style={styles.caption}>Let&apos;s keep today calm and steady.</Text>
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
    backgroundColor: '#C5E9FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarLetter: {
    color: '#1B3550',
    fontSize: 19,
    fontWeight: '800',
  },
  textWrap: {
    flex: 1,
  },
  greeting: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
  },
  caption: {
    marginTop: 3,
    color: '#A8B8D7',
    fontSize: 13,
    fontWeight: '600',
  },
});
