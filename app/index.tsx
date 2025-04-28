import { CreateRoomPanel } from '@/components/CreateRoomPanel';
import { RoomCard } from '@/components/RoomCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { UserAuthHeader } from '@/components/UserAuthHeader';
import { useAuthStore } from '@/utils/auth.store';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Button,
  FlatList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import { io } from 'socket.io-client';

interface CreateRoomResponse {
  success: boolean;
  roomId: string;
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [roomId, setRoomId] = useState('');
  const { width } = useWindowDimensions();
  const [numColumns, setNumColumns] = useState(
    Math.max(1, Math.floor(width / 220))
  );

  // Get user from auth store
  const { user, token } = useAuthStore();
  const isLoggedIn = !!user && !!token;

  useEffect(() => {
    // Ensure we have at least 1 column and account for proper padding
    setNumColumns(Math.max(1, Math.floor(width / 220)));
  }, [width]);

  const handleCreateRoom = () => {
    const socket = io('http://localhost:3000/room');

    socket.emit('checkRoomExists', { roomId: roomId }, (response: any) => {
      console.log('Room exists:', response);

      if (response.success) {
        const roomExists = response.exists;

        if (roomExists) {
          console.log('Room already exists');
          router.push(`/canvas/${roomId}`);
        } else {
          console.log('Creating room:', roomId);
          socket.emit(
            'createRoom',
            { name: roomId },
            (response: CreateRoomResponse) => {
              console.log('Room created:', response);

              if (response.success) {
                console.log(`Room created with ID: ${response.roomId}`);
                router.push(`/canvas/${response.roomId}`);
              }
            }
          );
        }
      }
    });
  };

  const dummyData = [
    { id: '1', title: 'Title 1', edited: '2025-03-24' },
    { id: '2', title: 'Title 2', edited: '2025-03-23' },
    { id: '3', title: 'Title 3', edited: '2025-03-22' },
  ];

  const renderItem = ({
    item,
  }: {
    item: { id: string; title: string; edited: string };
  }) => {
    // Calculate card width with proper margins to prevent cutoff
    const cardWidth = (width - 40) / numColumns - 16; // 40px for container padding, 16px for card margins

    return (
      <RoomCard
        title={item.title}
        edited={item.edited}
        width={cardWidth}
        isDark={isDark}
      />
    );
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Home',
          headerStyle: {
            backgroundColor: isDark ? 'black' : 'white',
          },
          headerTintColor: isDark ? 'white' : 'black',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerRight: () =>
            isLoggedIn ? null : (
              <TouchableOpacity
                onPress={() => router.push('/login')}
                style={styles.headerButton}
              >
                <ThemedText>Login</ThemedText>
              </TouchableOpacity>
            ),
        }}
      />

      {isLoggedIn && <UserAuthHeader showFullInfo={false} />}

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome and Create Room Section */}
        <ThemedView
          style={[
            styles.welcomeSection,
            { borderBottomColor: isDark ? '#333' : '#e0e0e0' },
          ]}
        >
          <ThemedText type="title" style={styles.welcomeTitle}>
            Welcome to JrawIt
            {isLoggedIn && user ? `, ${user.username}` : ''}
          </ThemedText>
          <Button
            title="Go to test canvas"
            onPress={() => router.push('/canvas/test')}
          />
          {!isLoggedIn && (
            <ThemedView style={styles.authBanner}>
              <ThemedText style={styles.authText}>
                Create an account to save your canvases
              </ThemedText>
              <TouchableOpacity
                style={styles.authButton}
                onPress={() => router.push('/register')}
              >
                <ThemedText style={styles.authButtonText}>Sign Up</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          )}

          <ThemedText type="default" style={styles.welcomeSubtitle}>
            Create a new room or join an existing one
          </ThemedText>

          <CreateRoomPanel
            roomId={roomId}
            setRoomId={setRoomId}
            onCreateRoom={handleCreateRoom}
            isDark={isDark}
          />
        </ThemedView>

        {/* Recent Rooms Section */}
        <ThemedView style={styles.recentSection}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Recent Rooms
          </ThemedText>

          <FlatList
            data={dummyData}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            numColumns={numColumns}
            key={numColumns}
            contentContainerStyle={styles.grid}
            scrollEnabled={false} // Disable scrolling in the FlatList, use the main ScrollView instead
          />
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20, // Extra padding at the bottom
  },
  headerButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  authBanner: {
    backgroundColor: 'rgba(0, 123, 255, 0.1)',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  authText: {
    flex: 1,
    marginRight: 10,
  },
  authButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  authButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  welcomeSection: {
    paddingTop: 24,
    paddingBottom: 25,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    marginBottom: 10,
  },
  welcomeTitle: {
    fontSize: 28,
    marginBottom: 10,
  },
  welcomeSubtitle: {
    marginBottom: 24,
  },
  recentSection: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 18,
  },
  grid: {
    paddingVertical: 5,
  },
});
