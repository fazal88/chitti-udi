import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';

import * as SecureStore from 'expo-secure-store';
import * as React from 'react';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [checking, setChecking] = React.useState(true);
  const [hasName, setHasName] = React.useState<boolean | null>(null);
  const router = useRouter();

  React.useEffect(() => {
    (async () => {
      const name = await SecureStore.getItemAsync('userName');
      console.log('Stored username:', name);
      console.log('Has name:', !!name);
      setHasName(!!name);
      setChecking(false);
    })();
  }, []);

  // Redirect based on whether user has a name
  React.useEffect(() => {
    if (!checking && hasName !== null) {
      if (hasName) {
        router.replace('/(tabs)');
      } else {
        router.replace('/UsernameScreen');
      }
    }
  }, [hasName, checking, router]);

  if (!loaded || checking || hasName === null) {
    return null;
  }

  console.log('hasName value:', hasName);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="UsernameScreen" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
