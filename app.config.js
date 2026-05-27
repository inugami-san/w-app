export default {
  name: 'Wenwen',
  slug: 'wenwen-app',
  version: '1.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'wenwenapp',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  updates: {
    url: 'https://u.expo.dev/da47e4d2-6af8-4751-a972-60656bde75eb',
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.christianjariol.wapp"
  },
  android: {
    package: 'com.christianjariol.wapp',
    adaptiveIcon: {
      backgroundColor: '#F8F5EF',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  extra: {
    eas: {
      projectId: 'da47e4d2-6af8-4751-a972-60656bde75eb',
    },
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/wenwen-splash-head.png',
        imageWidth: 220,
        backgroundColor: '#F8F5EF',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Wenwen lets you attach a photo to your journal when you choose one.',
      },
    ],
    [
      'expo-audio',
      {
        microphonePermission: 'Wenwen lets you record voice check-ins when you choose to use them.',
        recordAudioAndroid: true,
      },
    ],
    [
      'expo-sensors',
      {
        motionPermission: 'Wenwen uses motion data to show your step count when you start step tracking.',
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission: 'Wenwen uses your location to save places you visit when place auto-sync is on.',
        locationAlwaysAndWhenInUsePermission: 'Wenwen uses background location to automatically save places you visit when place auto-sync is on.',
        locationAlwaysPermission: 'Wenwen uses background location to automatically save places you visit when place auto-sync is on.',
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      },
    ],
    'expo-sqlite',
    'expo-font',
    'expo-web-browser',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};
