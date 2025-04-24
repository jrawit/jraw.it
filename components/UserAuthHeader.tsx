import { useAuthStore } from '@/utils/auth.store';
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import {
  Alert,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { ThemedText } from './ThemedText';

interface UserAuthHeaderProps {
  showFullInfo?: boolean;
}

export const UserAuthHeader: React.FC<UserAuthHeaderProps> = ({
  showFullInfo = false,
}) => {
  const { user, logout } = useAuthStore();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
      Alert.alert('Error', 'Failed to log out. Please try again.');
    }
  };

  if (!user) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.userInfo,
          { backgroundColor: isDark ? '#333' : '#f0f0f0' },
        ]}
      >
        <View
          style={[styles.avatar, { backgroundColor: isDark ? '#555' : '#ddd' }]}
        >
          <ThemedText style={styles.avatarText}>
            {user.username?.charAt(0).toUpperCase() || 'U'}
          </ThemedText>
        </View>

        {showFullInfo && (
          <View style={styles.userDetails}>
            <ThemedText style={styles.username}>{user.username}</ThemedText>
            <ThemedText style={styles.email}>{user.email}</ThemedText>
          </View>
        )}
      </View>

      <TouchableOpacity
        onPress={handleLogout}
        style={[
          styles.logoutButton,
          { backgroundColor: isDark ? '#444' : '#e0e0e0' },
        ]}
      >
        <MaterialIcons
          name="logout"
          size={20}
          color={isDark ? '#fff' : '#333'}
        />
        <ThemedText style={styles.logoutText}>Logout</ThemedText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingLeft: 4,
    paddingRight: 12,
    paddingVertical: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  userDetails: {
    justifyContent: 'center',
  },
  username: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  email: {
    fontSize: 12,
    opacity: 0.7,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  logoutText: {
    marginLeft: 4,
    fontSize: 14,
  },
});
