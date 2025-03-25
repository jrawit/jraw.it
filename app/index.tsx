import { CreateRoomPanel } from '@/components/CreateRoomPanel';
import { RoomCard } from '@/components/RoomCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
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
        }}
      />

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
            Welcome to DrawIt
          </ThemedText>
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
