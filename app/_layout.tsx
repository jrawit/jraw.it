import { useAuthStore } from '@/utils/auth.store';
import {
  Stack,
  useRootNavigationState,
  useRouter,
  useSegments,
} from 'expo-router';
import { useEffect } from 'react';

// Auth component to protect routes
function AuthGuard({ children }: { children: React.ReactNode }) {
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const { token, user } = useAuthStore();

  useEffect(() => {
    // Skip protection logic until the app is ready
    if (!navigationState?.key) return;

    const inAuthGroup = segments[0] === '(auth)';

    // Check if the user is authenticated
    const isAuthenticated = !!token && !!user;

    // If user is not authenticated and not in auth group, redirect to login
    if (
      !isAuthenticated &&
      !inAuthGroup &&
      segments[0] !== 'login' &&
      segments[0] !== 'register'
    ) {
      // Redirect to the login page

      router.replace('/login');
    }

    // If user is authenticated and in auth group, redirect to home
    if (
      isAuthenticated &&
      (segments[0] === 'login' || segments[0] === 'register')
    ) {
      router.replace('/');
    }
  }, [segments, navigationState?.key, token, user]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <AuthGuard>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </AuthGuard>
  );
}
