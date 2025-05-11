import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Pressable, StyleSheet } from 'react-native';
import { TextInput } from 'react-native-gesture-handler';

interface CreateRoomPanelProps {
  roomId: string;
  setRoomId: (text: string) => void;
  onCreateRoom: () => void;
  isDark: boolean;
}

export function CreateRoomPanel({
  roomId,
  setRoomId,
  onCreateRoom,
  isDark,
}: CreateRoomPanelProps) {
  return (
    <ThemedView style={styles.createRoomContainer}>
      <TextInput
        editable
        onChangeText={text => setRoomId(text)}
        value={roomId}
        placeholder="Enter room name"
        placeholderTextColor={isDark ? '#999' : '#666'}
        style={[
          styles.roomInput,
          {
            color: isDark ? 'white' : 'black',
            borderBottomColor: isDark ? '#666' : '#ccc',
          },
        ]}
      />
      <Pressable
        onPress={onCreateRoom}
        style={({ pressed }) => [
          styles.createButton,
          {
            backgroundColor: isDark
              ? pressed
                ? '#2a6bb8'
                : '#3a86ff'
              : pressed
                ? '#0064d6'
                : '#007BFF',
          },
        ]}
      >
        <ThemedText style={styles.createButtonText}>Create Room</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  createRoomContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  roomInput: {
    flex: 1,
    height: 48,
    borderBottomWidth: 1,
    paddingHorizontal: 10,
    marginRight: 12,
    fontSize: 16,
  },
  createButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 1, height: 2 },
  },
  createButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});
