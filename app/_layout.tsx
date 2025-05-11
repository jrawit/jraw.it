import { useAuthStore } from '@/utils/auth.store';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Authentication protection component
function AuthenticationGuard({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  useEffect(() => {
    try {
      // Check if we're not already on the auth screens
      const inAuthGroup = segments[0] === 'login' || segments[0] === 'register';

      // If no token and not on auth screens, redirect to login
      if (!token && !inAuthGroup) {
        router.replace('/login');
      } else if (token && inAuthGroup) {
        // If authenticated and on auth screens, redirect to home
        router.replace('/');
      }
    } catch (error) {
      // Handle any errors that may occur during the redirect
      // Ignore Attempted to navigate before mounting the Root Layout component - expo issue
      console.log('Error during authentication guard:', error);
    }
  }, [token, segments, router]);

  return <>{children}</>;
}

export default function RootLayout() {
  // Load fonts using the useFonts hook
  const [loaded, error] = useFonts({
    Montserrat: require('../assets/fonts/montserrat/Montserrat-Regular.ttf'),
    'Montserrat-Italic': require('../assets/fonts/montserrat/Montserrat-Italic.ttf'),
    'Montserrat-Bold': require('../assets/fonts/montserrat/Montserrat-Bold.ttf'),
    'Montserrat-BoldItalic': require('../assets/fonts/montserrat/Montserrat-BoldItalic.ttf'),
    OpenSans: require('../assets/fonts/open-sans/OpenSans-Regular.ttf'),
    'OpenSans-Italic': require('../assets/fonts/open-sans/OpenSans-Italic.ttf'),
    'OpenSans-Bold': require('../assets/fonts/open-sans/OpenSans-Bold.ttf'),
    'OpenSans-BoldItalic': require('../assets/fonts/open-sans/OpenSans-BoldItalic.ttf'),
    Raleway: require('../assets/fonts/raleway/Raleway-Regular.ttf'),
    'Raleway-Italic': require('../assets/fonts/raleway/Raleway-Italic.ttf'),
    'Raleway-Bold': require('../assets/fonts/raleway/Raleway-Bold.ttf'),
    'Raleway-BoldItalic': require('../assets/fonts/raleway/Raleway-BoldItalic.ttf'),
    Roboto: require('../assets/fonts/roboto/Roboto-Regular.ttf'),
    'Roboto-Italic': require('../assets/fonts/roboto/Roboto-Italic.ttf'),
    'Roboto-Bold': require('../assets/fonts/roboto/Roboto-Bold.ttf'),
    'Roboto-BoldItalic': require('../assets/fonts/roboto/Roboto-BoldItalic.ttf'),
  });

  // Hide splash screen once fonts are loaded or if there's an error
  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  // Return null while fonts are still loading (splash screen will show)
  if (!loaded && !error) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthenticationGuard>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
        </Stack>
      </AuthenticationGuard>
    </GestureHandlerRootView>
  );
}
