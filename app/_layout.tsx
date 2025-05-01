import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '../utils/auth.store';

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
