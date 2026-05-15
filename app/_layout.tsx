import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { getGentleReminderNotificationData } from '@/src/services/gentle-reminders';
import { getJournalNotificationData } from '@/src/services/journal-notifications';
import { usePreferencesStore } from '@/src/store/preferences-store';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  const themeMode = usePreferencesStore((state) => state.themeMode);
  const isDark = themeMode === 'dark';

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const reminderData = getGentleReminderNotificationData(response);
      if (reminderData) {
        router.push('/dashboard');
        return;
      }

      const data = getJournalNotificationData(response);
      if (!data) return;

      router.push({
        pathname: '/journal/[dateKey]',
        params: {
          dateKey: data.dateKey,
          summaryId: data.summaryId,
        },
      });
    });

    return () => subscription.remove();
  }, []);

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="main" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="dashboard" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="journal" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="journal/[dateKey]" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="settings" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="companion" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
