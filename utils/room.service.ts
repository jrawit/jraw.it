import { apiClient } from '@/utils/auth.store';
import { v4 as uuidv4 } from 'uuid';

// Type definitions
export interface Room {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    username: string;
  };
  elements?: any[];
  members?: any[];
}

export interface CreateRoomResponse {
  success: boolean;
  message: string;
  roomId: string;
  room: Room;
}

export interface GetRoomsResponse {
  success: boolean;
  rooms: Room[];
}

// Generate a UUIDv4 for the room ID
export const generateRoomId = (): string => {
  return uuidv4();
};

// Create a new room
export const createRoom = async (
  name: string,
  ownerId: string
): Promise<CreateRoomResponse> => {
  try {
    // Generate a UUID for the room ID
    const id = generateRoomId();

    // Call the API to create a room
    const response = await apiClient.post('/room', {
      id,
      name,
      owner_id: ownerId,
    });

    return response.data;
  } catch (error: any) {
    console.error(
      'Error creating room:',
      error.response?.data || error.message
    );
    throw error;
  }
};

// Delete a room by ID
export const deleteRoom = async (
  roomId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await apiClient.delete(`/room/${roomId}`);
    return response.data;
  } catch (error: any) {
    console.error(
      'Error deleting room:',
      error.response?.data || error.message
    );
    throw error;
  }
};

// Rename a room
export const renameRoom = async (
  roomId: string,
  newName: string
): Promise<CreateRoomResponse> => {
  try {
    const response = await apiClient.put(`/room/${roomId}/name`, {
      name: newName,
    });
    return response.data;
  } catch (error: any) {
    console.error(
      'Error renaming room:',
      error.response?.data || error.message
    );
    throw error;
  }
};

// Get all rooms
export const getRooms = async (): Promise<GetRoomsResponse> => {
  try {
    const response = await apiClient.get('/room');
    return response.data;
  } catch (error: any) {
    console.error(
      'Error fetching rooms:',
      error.response?.data || error.message
    );
    throw error;
  }
};

// Get a specific room by ID
export const getRoom = async (
  roomId: string
): Promise<{ success: boolean; room: Room }> => {
  try {
    const response = await apiClient.get(`/room/${roomId}`);
    return response.data;
  } catch (error: any) {
    console.error(
      'Error fetching room:',
      error.response?.data || error.message
    );
    throw error;
  }
};
