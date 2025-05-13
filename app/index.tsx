import { CreateRoomPanel } from '@/components/CreateRoomPanel';
import { RoomCard } from '@/components/RoomCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { UserAuthHeader } from '@/components/UserAuthHeader';
import { useAuthStore } from '@/utils/auth.store';
import { ELECTRIC_URL, envParams } from '@/utils/electric';
import { createRoom, deleteRoom, renameRoom } from '@/utils/room.service';
import { Row } from '@electric-sql/client/model'; // Correct import for Row
import { useShape } from '@electric-sql/react';
import { router, Stack } from 'expo-router';
import { useEffect, useMemo, useState } from 'react'; // Added useMemo
import {
  Alert,
  Button,
  FlatList,
  Platform, // Added Platform
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';

// Interface for the data structure returned by ElectricSQL useShape
interface RoomShape extends Row {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  // Add index signature for compatibility with ElectricSQL Row type
  [key: string]: any;
}

// App-specific Room interface used by components like RoomCard
interface Room {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [roomId, setRoomId] = useState('');
  const { width } = useWindowDimensions();
  const [numColumns, setNumColumns] = useState(
    Math.max(1, Math.floor(width / 220))
  );

  const { user, token } = useAuthStore();
  const isLoggedIn = !!user && !!token;

  // Subscribe to rooms data using ElectricSQL's useShape
  const { data: roomsShapeData, isLoading: roomsLoading } = useShape<RoomShape>(
    {
      url: `${ELECTRIC_URL}/v1/shape`,
      params: isLoggedIn
        ? {
            table: 'rooms',
            where: `owner_id = '${user?.id}'`,
            ...envParams,
          }
        : { table: 'rooms', ...envParams, where: '1=0' },
    }
  );

  // Transform RoomShapeData (from ElectricSQL) to Room[] (for the app)
  const rooms: Room[] = useMemo(() => {
    if (!isLoggedIn || !roomsShapeData) {
      return [];
    }
    // Ensure that the data from useShape is correctly typed before mapping
    const mappedRooms = roomsShapeData.map((shape: RoomShape) => ({
      id: shape.id,
      name: shape.name,
      owner_id: shape.owner_id,
      created_at: shape.created_at,
      updated_at: shape.updated_at,
    }));
    // Sort by updated_at descending to show most recently updated rooms first
    mappedRooms.sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
    return mappedRooms;
  }, [roomsShapeData, isLoggedIn]);

  useEffect(() => {
    // Recalculate number of columns when screen width changes
    setNumColumns(Math.max(1, Math.floor(width / 220)));
  }, [width]);

  const handleCreateRoom = async () => {
    if (!isLoggedIn || !user) {
      if (Platform.OS === 'web') {
        window.alert(
          'Authentication Required: You need to login to create a room'
        );
      } else {
        Alert.alert(
          'Authentication Required',
          'You need to login to create a room'
        );
      }
      return;
    }

    if (!roomId.trim()) {
      if (Platform.OS === 'web') {
        window.alert('Room Name Required: Please enter a name for your room');
      } else {
        Alert.alert('Room Name Required', 'Please enter a name for your room');
      }
      return;
    }

    try {
      const response = await createRoom(roomId, user.id);
      router.push(`/canvas/${response.roomId}`);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || 'Failed to create room';
      if (Platform.OS === 'web') {
        window.alert(`Error: ${errorMessage}`);
      } else {
        Alert.alert('Error', errorMessage);
      }
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this room?')) {
        try {
          await deleteRoom(roomId);
          // Optionally, trigger a refresh of the rooms list if not handled by ElectricSQL automatically
          // e.g., by refetching or updating the local state if roomsShapeData is not reactive enough
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.message || 'Failed to delete room';
          window.alert(`Error: ${errorMessage}`);
        }
      }
    } else {
      Alert.alert(
        'Confirm Deletion',
        'Are you sure you want to delete this room?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            onPress: async () => {
              try {
                await deleteRoom(roomId);
                Alert.alert('Success', 'Room deleted successfully');
                // Optionally, trigger a refresh of the rooms list if not handled by ElectricSQL automatically
                // e.g., by refetching or updating the local state if roomsShapeData is not reactive enough
              } catch (error: any) {
                const errorMessage =
                  error.response?.data?.message || 'Failed to delete room';
                Alert.alert('Error', errorMessage);
              }
            },
            style: 'destructive',
          },
        ]
      );
    }
  };

  const handleRenameRoom = async (roomId: string, currentName: string) => {
    if (Platform.OS === 'web') {
      const newName = window.prompt(
        'Enter the new name for the room:',
        currentName
      );
      if (newName === null) {
        // User pressed Cancel
        return;
      }
      const newNameTrimmed = newName.trim();
      if (newNameTrimmed === '') {
        window.alert('Room name cannot be empty.');
        return;
      }
      if (newNameTrimmed === currentName) {
        return;
      }
      try {
        await renameRoom(roomId, newNameTrimmed);
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message || 'Failed to rename room';
        window.alert(`Error: ${errorMessage}`);
      }
    } else {
      // Native platforms
      Alert.prompt(
        'Rename Room',
        'Enter the new name for the room:',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {}, // Do nothing on cancel
          },
          {
            text: 'Rename',
            onPress: async (textFromPrompt?: string) => {
              const newName = textFromPrompt || ''; // Default to empty string if undefined
              const newNameTrimmed = newName.trim();

              if (newNameTrimmed === '') {
                Alert.alert('Error', 'Room name cannot be empty.');
                return;
              }
              if (newNameTrimmed === currentName) {
                // Alert.alert('Info', 'Room name is the same.'); // Optional
                return;
              }
              try {
                await renameRoom(roomId, newNameTrimmed);
                Alert.alert('Success', 'Room renamed successfully');
                // Optionally, trigger a refresh of the rooms list
              } catch (error: any) {
                const errorMessage =
                  error.response?.data?.message || 'Failed to rename room';
                Alert.alert('Error', errorMessage);
              }
            },
          },
        ],
        'plain-text',
        currentName
      );
    }
  };

  const renderItem = ({ item }: { item: Room }) => {
    const cardWidth = (width - 40) / numColumns - 16;
    return (
      <RoomCard
        title={item.name}
        edited={new Date(item.updated_at).toLocaleDateString()}
        width={cardWidth}
        isDark={isDark}
        onPress={() => router.push(`/canvas/${item.id}`)}
        onDelete={() => handleDeleteRoom(item.id)}
        onRename={() => handleRenameRoom(item.id, item.name)}
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
            data={rooms} // Use the transformed rooms
            renderItem={renderItem}
            keyExtractor={item => item.id}
            numColumns={numColumns}
            key={numColumns} // Important for re-rendering when numColumns changes
            contentContainerStyle={styles.grid}
            scrollEnabled={false} // Main ScrollView handles scrolling
            refreshing={roomsLoading} // Use isLoading from useShape
            ListEmptyComponent={
              !roomsLoading && isLoggedIn ? (
                <ThemedText style={{ textAlign: 'center', marginTop: 20 }}>
                  No rooms found. Create one above!
                </ThemedText>
              ) : !isLoggedIn && !roomsLoading ? (
                <ThemedText style={{ textAlign: 'center', marginTop: 20 }}>
                  Please log in to see your rooms.
                </ThemedText>
              ) : null
            }
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
