export default {
  name: 'wenwen-app',
  slug: 'wenwen-app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'wenwenapp',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.christianjariol.wapp"
  },
  android: {
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
        image: './assets/images/splash-icon.png',
        imageWidth: 280,
        resizeMode: 'contain',
        backgroundColor: '#F8F5EF',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Wenwen lets you attach a photo to your journal when you choose one.',
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
