import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuthStore } from '@/utils/auth.store';
import { MaterialIcons } from '@expo/vector-icons';
import { Link, router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Field-specific error states
  const [errors, setErrors] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    general: '',
  });

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Auth store state and actions
  const {
    register,
    user,
    token,
    isLoading,
    error,
    clearError,
    validationErrors,
    clearValidationErrors,
  } = useAuthStore();

  // Handle successful registration
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
          } else if (path === 'email') {
            newErrors.email = message;
          } else if (path === 'password') {
            newErrors.password = message;
          }
        });

        setErrors(newErrors);
        clearValidationErrors();
      } else if (error) {
        // Check if error contains specific field information
        if (error.includes('Username already taken')) {
          setErrors(prev => ({ ...prev, username: 'Username already taken' }));
        } else if (error.includes('Email already registered')) {
          setErrors(prev => ({ ...prev, email: 'Email already registered' }));
        } else {
          setErrors(prev => ({ ...prev, general: error }));
        }
        clearError();
      }
    }
  }, [error, validationErrors, clearError, clearValidationErrors, errors]);

  // Helper function to clear a specific error
  const clearFieldError = (field: keyof typeof errors) => {
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleRegister = async () => {
    // Reset all errors
    setErrors({
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      general: '',
    });

    let hasErrors = false;

    // Client-side validation
    if (username.length > 30) {
      setErrors(prev => ({
        ...prev,
        username: 'Username cannot exceed 30 characters',
      }));
      hasErrors = true;
    }

    // For confirmPassword which is not validated by the server
    if (password !== confirmPassword) {
      setErrors(prev => ({
        ...prev,
        confirmPassword: 'Passwords do not match',
      }));
      hasErrors = true;
    }

    if (hasErrors) {
      return;
    }

    // Register the user - let the server's Zod validation handle most validations
    await register(username, email, password, name || undefined);
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Create Account',
          headerStyle: {
            backgroundColor: isDark ? 'black' : 'white',
          },
          headerTintColor: isDark ? 'white' : 'black',
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formContainer}>
          <ThemedText type="title" style={styles.title}>
            Create an Account
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Join JrawIt and start collaborating
          </ThemedText>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>
              Full Name (Optional)
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? '#333' : 'white',
                  borderColor: isDark ? '#555' : '#ddd',
                  color: isDark ? 'white' : 'black',
                },
              ]}
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              placeholderTextColor={isDark ? '#999' : '#999'}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Username</ThemedText>
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
              placeholder="Choose a username"
              placeholderTextColor={isDark ? '#999' : '#999'}
              autoCapitalize="none"
            />
            {errors.username ? (
              <Text style={styles.fieldError}>{errors.username}</Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Email</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? '#333' : 'white',
                  borderColor: errors.email
                    ? '#e74c3c'
                    : isDark
                      ? '#555'
                      : '#ddd',
                  color: isDark ? 'white' : 'black',
                },
              ]}
              value={email}
              onChangeText={text => {
                setEmail(text);
                clearFieldError('email');
              }}
              placeholder="Enter your email"
              placeholderTextColor={isDark ? '#999' : '#999'}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email ? (
              <Text style={styles.fieldError}>{errors.email}</Text>
            ) : null}
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
                placeholder="Create a password"
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
            {errors.password ? (
              <Text style={styles.fieldError}>{errors.password}</Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Confirm Password</ThemedText>
            <View
              style={[
                styles.passwordInputContainer,
                {
                  borderColor: errors.confirmPassword
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
                value={confirmPassword}
                onChangeText={text => {
                  setConfirmPassword(text);
                  clearFieldError('confirmPassword');
                }}
                placeholder="Confirm your password"
                placeholderTextColor={isDark ? '#999' : '#999'}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}
              >
                <MaterialIcons
                  name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                  size={24}
                  color={isDark ? '#999' : '#666'}
                />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword ? (
              <Text style={styles.fieldError}>{errors.confirmPassword}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              styles.registerButton,
              isLoading && styles.disabledButton,
            ]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <ThemedText style={styles.buttonText}>Create Account</ThemedText>
            )}
          </TouchableOpacity>

          <View style={styles.loginContainer}>
            <ThemedText>Already have an account? </ThemedText>
            <Link href="/login" asChild>
              <TouchableOpacity>
                <ThemedText style={styles.loginLink}>Log in</ThemedText>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  formContainer: {
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
  button: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerButton: {
    backgroundColor: '#007BFF',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  loginLink: {
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
