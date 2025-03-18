import { ThemedView } from '@/components/ThemedView';
import { Link, router, Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, useColorScheme } from 'react-native';
import { TextInput } from 'react-native-gesture-handler';
import { io } from 'socket.io-client';

interface CreateRoomResponse {
  success: boolean;
  roomId: string;
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();

  const [roomId, setRoomId] = useState('');


  const handleCreateRoom = () => {
    const socket = io('http://localhost:3000/room');

    // Check if room already exists
    socket.emit('checkRoomExists', { roomId: roomId }, (response: any) => {
      console.log('Room exists:', response);

      if (response.success) {
        const roomExists = response.exists;

        if (roomExists) {
          console.log('Room already exists');
          router.push(`/canvas/${roomId}`);
        } else {
          console.log('Creating room:', roomId);
          // Only create room if it doesn't exist
          socket.emit(
            'createRoom',
            { name: roomId },
            (response: CreateRoomResponse) => {
              console.log('Room created:', response);

              if (response.success) {
                console.log(`Room created with ID: ${response.roomId}`);
                // Navigate to the room
                router.push(`/canvas/${response.roomId}`);
              }
            }
          );
        }
      }
    });
  };
  return (
    <ThemedView>
      <Stack.Screen
        options={{
          title: 'Home',
          headerStyle: {
            backgroundColor: colorScheme === 'dark' ? 'black' : 'white',
          },
          headerTintColor: colorScheme === 'dark' ? 'white' : 'black',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <Link
        href="/canvas/1"
        style={{ color: colorScheme === 'dark' ? 'white' : 'black' }}
      >
        Go to Canvas
      </Link>

      <TextInput
        editable
        onChangeText={text => setRoomId(text)}
        value={roomId}
        placeholder="Enter Room ID"
        placeholderTextColor={colorScheme === 'dark' ? '#999' : '#666'}
        style={{
          color: colorScheme === 'dark' ? 'white' : 'black',
          borderBottomWidth: 1,
          borderBottomColor: colorScheme === 'dark' ? '#666' : '#ccc',
          paddingVertical: 8,
          marginVertical: 10,
        }}
      />
      <Pressable
        onPress={handleCreateRoom}
        style={({ pressed }) => ({
          backgroundColor:
            colorScheme === 'dark'
              ? pressed
                ? '#333'
                : '#444'
              : pressed
                ? '#ccc'
                : '#ddd',
          padding: 10,
          borderRadius: 5,
          marginTop: 10,
          alignItems: 'center',
        })}
      >
        <Text
          style={{
            color: colorScheme === 'dark' ? 'white' : 'black',
            fontWeight: '500',
          }}
        >
          Create Room
        </Text>
      </Pressable>
    </ThemedView>
  );
}