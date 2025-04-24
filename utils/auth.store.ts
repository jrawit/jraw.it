import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// API URL
const API_URL = 'http://localhost:3000/v1';

// User type definition
interface User {
  id: string;
  username: string;
  email: string;
}

// Auth store state interface
interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (username: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

// Create the auth store with persistence
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isLoading: false,
      error: null,

      // Login action
      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await axios.post(`${API_URL}/auth/login`, {
            username,
            password,
          });

          set({
            token: response.data.token,
            user: response.data.user,
            isLoading: false,
          });

          // Set auth header for future requests
          axios.defaults.headers.common['Authorization'] =
            `Bearer ${response.data.token}`;
        } catch (error) {
          let errorMessage = 'Login failed. Please check your credentials.';
          if (axios.isAxiosError(error) && error.response?.data?.message) {
            errorMessage = error.response.data.message;
          }
          set({ error: errorMessage, isLoading: false });
        }
      },

      // Register action
      register: async (username: string, email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await axios.post(`${API_URL}/auth/register`, {
            username,
            email,
            password,
          });

          set({
            token: response.data.token,
            user: response.data.user,
            isLoading: false,
          });

          // Set auth header for future requests
          axios.defaults.headers.common['Authorization'] =
            `Bearer ${response.data.token}`;
        } catch (error) {
          let errorMessage = 'Registration failed. Please try again.';
          if (axios.isAxiosError(error) && error.response?.data?.message) {
            errorMessage = error.response.data.message;
          }
          set({ error: errorMessage, isLoading: false });
        }
      },

      // Logout action
      logout: async () => {
        // Remove auth header
        delete axios.defaults.headers.common['Authorization'];

        // Clear the persisted state from AsyncStorage
        await AsyncStorage.removeItem('auth-storage');

        // Update the state
        set({
          token: null,
          user: null,
        });
      },

      // Clear error message
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// API client with auth interceptor
export const apiClient = axios.create({
  baseURL: API_URL,
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
  config => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);
