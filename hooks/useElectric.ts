import { API_URL, useAuthStore } from '@/utils/auth.store';
import { canvasElementMapper } from '@/utils/canvasElementMapper';
import { ELECTRIC_URL, envParams } from '@/utils/electric';
import { CanvasElementRecord, CanvasElementWrite } from '@/utils/types'; // CanvasElementWrite will be used directly
import { useShape } from '@electric-sql/react';
import { useCallback, useRef, useState } from 'react';
import { CanvasElement } from './useCanvas';

// Custom hook to implement optimistic updates
// The type U will be simplified to CanvasElementWrite
function useCustomOptimistic<T>(
  serverState: T[],
  updateFn: (state: T[], update: CanvasElementWrite) => T[]
) {
  // Local state that merges server state and optimistic updates
  const [optimisticState, setOptimisticState] = useState<T[]>(serverState);
  // Keep track of pending updates
  const pendingUpdates = useRef<CanvasElementWrite[]>([]);

  // This ref will help us compare if serverState actually changed
  const prevServerStateRef = useRef<T[]>(serverState);

  // Instead of using useEffect, we'll directly update the state when serverState changes
  // This prevents unneeded re-renders for unchanged server state
  if (
    JSON.stringify(prevServerStateRef.current) !== JSON.stringify(serverState)
  ) {
    let newState = [...serverState];
    pendingUpdates.current.forEach(update => {
      newState = updateFn(newState, update);
    });
    setOptimisticState(newState);
    prevServerStateRef.current = serverState;
  }

  // Function to apply an optimistic update
  const addOptimisticUpdate = useCallback(
    (update: CanvasElementWrite) => {
      // Add to pending updates
      pendingUpdates.current = [...pendingUpdates.current, update];
      // Update optimistic state immediately
      setOptimisticState(currentState => updateFn(currentState, update));

      // Return a function to remove this update from pending once confirmed by server
      return () => {
        pendingUpdates.current = pendingUpdates.current.filter(
          u => u !== update
        );
        // If serverState doesn't change after this, optimisticState might not auto-revert.
        // ElectricSQL sync should eventually correct the state.
      };
    },
    [updateFn]
  );

  return [optimisticState, addOptimisticUpdate] as const;
}

// API client for canvas operations
const api = {
  async request(path: string, method: string, data?: any) {
    try {
      console.log('API_URL', API_URL);
      console.log('path', path);

      const url = `${API_URL}${path}`;

      console.log(`API Request: ${method} ${url}`, data);

      // Get authentication token from the Zustand store
      const authToken = useAuthStore.getState().token;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          // Include authorization header if token is available
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        // Log detailed error information
        const errorText = await response.text();
        console.error(`API Error (${response.status}): ${errorText}`);
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      // Only parse as JSON if there is content
      const contentLength = response.headers.get('content-length');
      const hasContent = contentLength && parseInt(contentLength) > 0;

      return hasContent ? await response.json() : null;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  },
};

interface UseElectricCanvasProps {
  roomId: string;
}

export function useElectricCanvas(props: UseElectricCanvasProps) {
  const { roomId } = props;
  const { user } = useAuthStore();
  const userId = user?.id || 'anonymous';

  // Use ElectricSQL's useShape hook to sync data from Postgres
  const { isLoading, data, stream } = useShape({
    url: `${ELECTRIC_URL}/v1/shape`,
    params: {
      table: 'canvas_elements',
      where: `room_id = '${roomId}'`,
      ...envParams,
    },
  });

  // Convert ElectricSQL records to app's CanvasElement format
  const syncedElements: CanvasElement[] = (data || [])
    .map(record => {
      try {
        // Cast the record to any type first to bypass TypeScript errors
        const recordData = record as any;

        // Make sure record has all required fields before conversion
        if (
          recordData &&
          typeof recordData === 'object' &&
          'id' in recordData &&
          'tool_type' in recordData &&
          'element_data' in recordData
        ) {
          // Create a properly formatted CanvasElementRecord
          const canvasRecord: CanvasElementRecord = {
            id: recordData.id,
            room_id: recordData.room_id,
            creator_id: recordData.creator_id,
            tool_type: recordData.tool_type,
            element_data: recordData.element_data,
            created_at: new Date(recordData.created_at || Date.now()),
            updated_at: new Date(recordData.updated_at || Date.now()),
          };

          return canvasElementMapper.fromRecord(canvasRecord);
        }

        console.error('Invalid record format:', record);
        return null;
      } catch (err) {
        console.error('Error converting record:', err);
        return null;
      }
    })
    .filter(Boolean) as CanvasElement[];

  // Memoize the update function to avoid recreating it on every render
  const updateElementsState = useCallback(
    (
      synced: CanvasElement[],
      update: CanvasElementWrite // Simplified: Removed REPLACE_TEMP_WITH_REAL
    ) => {
      // Only parse if it's not a delete operation, as value might be an object not a record
      let appElement: CanvasElement | undefined;
      // No longer need to check for REPLACE_TEMP_WITH_REAL here
      if (update.operation !== 'delete') {
        appElement = canvasElementMapper.fromRecord(update.value);
      }

      switch (update.operation) {
        case 'insert':
          // Check if element already exists in synced state
          // Ensure appElement is defined for insert
          if (!appElement) return synced;
          return synced.some(element => element.id === update.value.id)
            ? synced
            : [...synced, appElement];

        case 'update':
          // Ensure appElement is defined for update
          if (!appElement) return synced;
          return synced.map(element =>
            element.id === update.value.id ? appElement! : element
          );

        case 'delete':
          // No need to use appElement here, just the ID from 'value'
          return synced.filter(element => element.id !== update.value.id);

        // Removed 'REPLACE_TEMP_WITH_REAL' case
      }
    },
    []
  );

  // Use our custom hook with memoized update function
  const [elements, addOptimisticUpdate] = useCustomOptimistic<CanvasElement>(
    // Simplified: Removed REPLACE_TEMP_WITH_REAL type
    syncedElements,
    updateElementsState
  );

  const addElement = useCallback(
    async (
      // Ensure elementData includes the id, room_id, tool_type, and element_data
      elementData: Pick<
        CanvasElementRecord,
        'id' | 'room_id' | 'tool_type' | 'element_data'
      >
    ): Promise<CanvasElementRecord | null> => {
      console.log('Adding element (useElectric):', elementData);

      // The ID now comes from elementData.id, passed from useCanvas
      const optimisticElement: CanvasElementRecord = {
        id: elementData.id, // Use the provided ID
        room_id: elementData.room_id,
        creator_id: userId, // Set by the hook/server
        tool_type: elementData.tool_type,
        element_data: elementData.element_data,
        created_at: new Date(), // Optimistic, server might override
        updated_at: new Date(), // Optimistic, server might override
      };

      const removeOptimisticInsert = addOptimisticUpdate({
        operation: 'insert',
        value: optimisticElement,
      });

      try {
        const newElementFromServer = (await api.request(
          '/canvas/elements',
          'POST',
          {
            id: elementData.id, // Send the client-generated ID to the server
            room_id: elementData.room_id,
            tool_type: elementData.tool_type,
            element_data: elementData.element_data,
            // creator_id will be set by the server based on the auth token
          }
        )) as CanvasElementRecord | null;

        // ElectricSQL sync will eventually provide the authoritative state.
        // No explicit removeOptimisticInsert() call needed on success if relying on sync.

        if (
          newElementFromServer &&
          newElementFromServer.id === elementData.id
        ) {
          // Server confirmed and returned the element with the same ID.
          return newElementFromServer;
        } else if (newElementFromServer) {
          // This case implies server returned an element but ID doesn't match,
          // which is unexpected if the server is configured to use the client's ID.
          console.warn(
            'Add element: Server returned element with mismatched ID.',
            newElementFromServer
          );
          removeOptimisticInsert(); // Rollback optimistic if ID mismatch and server is source of truth for ID.
          return newElementFromServer;
        } else {
          // Server did not return the element, or creation failed silently on server.
          console.warn(
            'Add element: Server did not return a valid element. Relying on optimistic data or sync.'
          );
          // If the API call itself was successful (not an exception),
          // we might assume the optimistic update is fine until ElectricSQL says otherwise.
          return optimisticElement; // Or null if creation is uncertain and API doesn't confirm.
        }
      } catch (error) {
        console.error('Failed to add element:', error);
        removeOptimisticInsert(); // Rollback optimistic update on API error
        return null;
      }
    },
    [addOptimisticUpdate, userId, roomId] // roomId might be implicitly used via API_URL or other context
  );

  const updateElement = useCallback(
    async (
      id: string,
      updates: Partial<
        Omit<
          CanvasElementRecord,
          'id' | 'room_id' | 'creator_id' | 'created_at' | 'updated_at'
        >
      >
    ) => {
      const currentElement = elements.find(el => el.id === id);
      if (!currentElement) {
        console.error('Element not found for update:', id);
        return;
      }

      // Assuming CanvasElement (currentElement) has camelCase properties
      // corresponding to CanvasElementRecord's snake_case properties.
      // And that CanvasElement has: id, roomId, creatorId, toolType, elementData, createdAt, updatedAt
      const optimisticUpdateData: CanvasElementRecord = {
        id: currentElement.id,
        room_id: (currentElement as any).roomId,
        creator_id: (currentElement as any).creatorId,
        tool_type: updates.tool_type ?? (currentElement as any).toolType,
        element_data:
          updates.element_data ?? (currentElement as any).elementData,
        created_at: (currentElement as any).createdAt,
        updated_at: new Date(), // Update timestamp for the optimistic update
      };

      const removeOptimisticUpdate = addOptimisticUpdate({
        operation: 'update',
        value: optimisticUpdateData,
      });

      try {
        // API expects tool_type, element_data for update
        await api.request(`/canvas/elements/${id}`, 'PUT', {
          tool_type: updates.tool_type,
          element_data: updates.element_data,
        });
        // ElectricSQL sync should handle the update from the server.
      } catch (error) {
        console.error('Failed to update element:', error);
        removeOptimisticUpdate();
      }
    },
    [elements, addOptimisticUpdate]
  );

  const removeElement = useCallback(
    async (id: string) => {
      const elementToRemove = elements.find(el => el.id === id);
      if (!elementToRemove) {
        console.warn('Element not found for removal:', id);
        return;
      }

      // Assuming CanvasElement (elementToRemove) has camelCase properties
      // corresponding to CanvasElementRecord's snake_case properties.
      const recordToDelete: CanvasElementRecord = {
        id: elementToRemove.id,
        room_id: (elementToRemove as any).roomId,
        creator_id: (elementToRemove as any).creatorId,
        tool_type: (elementToRemove as any).toolType,
        element_data: (elementToRemove as any).elementData,
        created_at: (elementToRemove as any).createdAt,
        updated_at: (elementToRemove as any).updatedAt, // Use last known updatedAt
      };

      const removeOptimisticUpdate = addOptimisticUpdate({
        operation: 'delete',
        value: recordToDelete,
      });

      try {
        await api.request(`/canvas/elements/${id}`, 'DELETE');
        // ElectricSQL sync should handle the update from the server.
      } catch (error) {
        console.error('Failed to delete element:', error);
        removeOptimisticUpdate();
      }
    },
    [elements, addOptimisticUpdate]
  );

  // Return the merged hooks
  return {
    elements,
    addElement,
    updateElement,
    removeElement,
    isLoading,
  };
}
