import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuthStore } from '@/utils/auth.store';
import { MaterialIcons } from '@expo/vector-icons';
import { Link, router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Field-specific error messages
  const [errors, setErrors] = useState({
    username: '',
    password: '',
    general: '',
  });

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Auth store state and actions
  const {
    login,
    user,
    token,
    isLoading,
    error,
    clearError,
    validationErrors,
    clearValidationErrors,
  } = useAuthStore();

  // Handle successful login
  useEffect(() => {
    if (user && token) {
      router.replace('/');
    }
  }, [user, token]);

  // Handle backend errors
  useEffect(() => {
    if (error || validationErrors.length > 0) {
      // Map validation errors to form fields
      if (validationErrors.length > 0) {
        const newErrors = { ...errors };

        validationErrors.forEach(({ path, message }) => {
          if (path === 'username') {
            newErrors.username = message;
          } else if (path === 'password') {
            newErrors.password = message;
          }
        });

        setErrors(newErrors);
        clearValidationErrors();
      } else if (error) {
        // Parse general error message to determine what kind of error it is
        if (error.includes('Invalid credentials')) {
          setErrors(prev => ({
            ...prev,
            password: 'Incorrect username or password',
          }));
        } else {
          setErrors(prev => ({ ...prev, general: error }));
        }
        clearError();
      }
    }
  }, [error, validationErrors, clearError, clearValidationErrors, errors]);

  // Clear specific field error
  const clearFieldError = (field: keyof typeof errors) => {
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleLogin = async () => {
    // Reset errors
    setErrors({
      username: '',
      password: '',
      general: '',
    });

    // Client-side validation is minimal since we're relying on the server's Zod validation
    let hasErrors = false;

    // Validate username/email
    if (!username.trim()) {
      setErrors(prev => ({
        ...prev,
        username: 'Username or email is required',
      }));
      hasErrors = true;
    }

    // Validate password
    if (!password.trim()) {
      setErrors(prev => ({ ...prev, password: 'Password is required' }));
      hasErrors = true;
    }

    if (hasErrors) {
      return;
    }

    await login(username, password);
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Login',
          headerStyle: {
            backgroundColor: isDark ? 'black' : 'white',
          },
          headerTintColor: isDark ? 'white' : 'black',
        }}
      />

      <View style={styles.formContainer}>
        <ThemedText type="title" style={styles.title}>
          Welcome back!
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Sign in to continue using JrawIt
        </ThemedText>

        {errors.general && (
          <Text
            style={[
              styles.errorMessage,
              { color: isDark ? '#ff9999' : '#e74c3c' },
            ]}
          >
            {errors.general}
          </Text>
        )}

        <View style={styles.inputGroup}>
          <ThemedText style={styles.inputLabel}>Username or Email</ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDark ? '#333' : 'white',
                borderColor: errors.username
                  ? '#e74c3c'
                  : isDark
                    ? '#555'
                    : '#ddd',
                color: isDark ? 'white' : 'black',
              },
            ]}
            value={username}
            onChangeText={text => {
              setUsername(text);
              clearFieldError('username');
            }}
            placeholder="Enter your username or email"
            placeholderTextColor={isDark ? '#999' : '#999'}
            autoCapitalize="none"
          />
          {errors.username && (
            <Text style={styles.fieldError}>{errors.username}</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <ThemedText style={styles.inputLabel}>Password</ThemedText>
          <View
            style={[
              styles.passwordInputContainer,
              {
                borderColor: errors.password
                  ? '#e74c3c'
                  : isDark
                    ? '#555'
                    : '#ddd',
              },
            ]}
          >
            <TextInput
              style={[
                styles.passwordInput,
                {
                  backgroundColor: isDark ? '#333' : 'white',
                  color: isDark ? 'white' : 'black',
                },
              ]}
              value={password}
              onChangeText={text => {
                setPassword(text);
                clearFieldError('password');
              }}
              placeholder="Enter your password"
              placeholderTextColor={isDark ? '#999' : '#999'}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <MaterialIcons
                name={showPassword ? 'visibility' : 'visibility-off'}
                size={24}
                color={isDark ? '#999' : '#666'}
              />
            </TouchableOpacity>
          </View>
          {errors.password && (
            <Text style={styles.fieldError}>{errors.password}</Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.forgotPassword}
          onPress={() => console.log('Forgot password')}
        >
          <ThemedText style={styles.forgotPasswordText}>
            Forgot Password?
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.loginButton,
            isLoading && styles.disabledButton,
          ]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <ThemedText style={styles.buttonText}>Login</ThemedText>
          )}
        </TouchableOpacity>

        <View style={styles.registerContainer}>
          <ThemedText>Don't have an account? </ThemedText>
          <Link href="/register" asChild>
            <TouchableOpacity>
              <ThemedText style={styles.registerLink}>Sign up</ThemedText>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 40,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    marginBottom: 8,
    fontSize: 16,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 16,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
    height: 50,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 10,
    fontSize: 16,
    borderWidth: 0,
  },
  eyeIcon: {
    height: '100%',
    paddingHorizontal: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#007BFF',
  },
  button: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButton: {
    backgroundColor: '#007BFF',
    marginBottom: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  registerLink: {
    color: '#007BFF',
    fontWeight: '600',
  },
  errorMessage: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 14,
  },
  fieldError: {
    color: '#e74c3c',
    fontSize: 12,
    marginTop: 5,
    marginLeft: 2,
  },
  disabledButton: {
    backgroundColor: '#74b4f5',
  },
});
