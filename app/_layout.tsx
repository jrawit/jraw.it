import { useAuthStore } from '@/utils/auth.store';
import {
  Stack,
  useRootNavigationState,
  useRouter,
  useSegments,
} from 'expo-router';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Auth component to protect routes
function AuthGuard({ children }: { children: React.ReactNode }) {
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const { token, user } = useAuthStore();

  useEffect(() => {
    // Skip protection logic until the app is ready
    if (!navigationState?.key) return;

    const firstSegment = segments[0] || '';

    // Check if the user is authenticated
    const isAuthenticated = !!token && !!user;

    // Define which routes are public (don't require authentication)
    const isAuthRoute = firstSegment === 'login' || firstSegment === 'register';

    if (!isAuthenticated && !isAuthRoute) {
      // If not authenticated and not on a public route, redirect to login
      router.replace('/login');
    } else if (isAuthenticated && isAuthRoute) {
      // If authenticated and on an auth route, redirect to home
      router.replace('/');
    }
  }, [segments, navigationState?.key, token, user]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthGuard>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
        </Stack>
      </AuthGuard>
    </GestureHandlerRootView>
  );
}
