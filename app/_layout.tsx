import { Stack } from 'expo-router';
import { createContext, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Create an auth context
export const AuthContext = createContext({
  isAuthenticated: false,
  username: '',
  login: (username: string) => {},
  logout: () => {},
});

export default function RootLayout() {
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    username: '',
  });

  const authContext = {
    isAuthenticated: authState.isAuthenticated,
    username: authState.username,
    login: (username: string) => {
      setAuthState({
        isAuthenticated: true,
        username,
      });
    },
    logout: () => {
      setAuthState({
        isAuthenticated: false,
        username: '',
      });
    },
  };

  return (
    <AuthContext.Provider value={authContext}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack />
      </GestureHandlerRootView>
    </AuthContext.Provider>
  );
}