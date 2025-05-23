import { API_URL, useAuthStore } from '@/utils/auth.store';
import { canvasElementMapper } from '@/utils/canvasElementMapper';
import { ELECTRIC_URL, envParams } from '@/utils/electric';
import { CanvasElementRecord, CanvasElementWrite } from '@/utils/types'; // CanvasElementWrite will be used directly
import { useShape } from '@electric-sql/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

  // Use useEffect to properly react to serverState changes
  useEffect(() => {
    console.log('useCustomOptimistic: serverState changed', {
      serverStateLength: serverState.length,
      pendingUpdatesLength: pendingUpdates.current.length,
    });

    // Clean up pending updates for elements that no longer exist in server state
    const serverElementIds = new Set(
      serverState.map((element: any) => element.id)
    );
    const originalPendingLength = pendingUpdates.current.length;

    console.log(
      'useCustomOptimistic: current pending updates before cleanup',
      pendingUpdates.current.map(u => ({
        id: u.value.id,
        operation: u.operation,
      }))
    );
    console.log(
      'useCustomOptimistic: server element IDs',
      Array.from(serverElementIds)
    );

    pendingUpdates.current = pendingUpdates.current.filter(update => {
      // Keep updates for elements that still exist in server state
      // For delete operations, only keep them if the element still exists (delete is still pending)
      if (update.operation === 'delete') {
        return serverElementIds.has(update.value.id);
      }
      // For insert/update operations, only keep them if the element still exists
      return serverElementIds.has(update.value.id);
    });

    console.log(
      'useCustomOptimistic: current pending updates after cleanup',
      pendingUpdates.current.map(u => ({
        id: u.value.id,
        operation: u.operation,
      }))
    );

    if (pendingUpdates.current.length !== originalPendingLength) {
      console.log('useCustomOptimistic: cleaned up stale pending updates', {
        originalLength: originalPendingLength,
        newLength: pendingUpdates.current.length,
      });
    }

    let newState = [...serverState];
    pendingUpdates.current.forEach(update => {
      newState = updateFn(newState, update);
    });
    console.log('useCustomOptimistic: setting optimistic state', {
      newStateLength: newState.length,
    });
    setOptimisticState(newState);
  }, [serverState, updateFn]); // Include updateFn in dependencies

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
          u =>
            !(
              u.value.id === update.value.id && u.operation === update.operation
            ) // Compare by ID AND operation for removal
        );
        // If serverState doesn't change after this, optimisticState might not auto-revert.
        // ElectricSQL sync should eventually correct the state.
      };
    },
    [updateFn] // Include updateFn dependency
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
  const syncedElements: CanvasElement[] = useMemo(
    () =>
      (data || [])
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
        .filter(Boolean) as CanvasElement[],
    [data]
  );

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
      elementsData: Pick<
        CanvasElementRecord,
        'id' | 'room_id' | 'tool_type' | 'element_data'
      >[]
    ): Promise<CanvasElementRecord[] | null> => {
      if (!elementsData || elementsData.length === 0) {
        return [];
      }
      console.log('Adding elements (useElectric):', elementsData);

      const removeOptimisticInserts: (() => void)[] = [];
      const optimisticElements: CanvasElementRecord[] = [];

      elementsData.forEach(elementData => {
        const optimisticElement: CanvasElementRecord = {
          id: elementData.id,
          room_id: elementData.room_id,
          creator_id: userId,
          tool_type: elementData.tool_type,
          element_data: elementData.element_data,
          created_at: new Date(),
          updated_at: new Date(),
        };
        optimisticElements.push(optimisticElement);
        removeOptimisticInserts.push(
          addOptimisticUpdate({
            operation: 'insert',
            value: optimisticElement,
          })
        );
      });

      try {
        const elementsToCreate = elementsData.map(elementData => ({
          id: elementData.id,
          room_id: elementData.room_id,
          tool_type: elementData.tool_type,
          element_data: elementData.element_data,
        }));

        const createdElementsFromServer = (await api.request(
          '/canvas/elements',
          'POST',
          elementsToCreate
        )) as CanvasElementRecord[] | null;

        if (createdElementsFromServer && createdElementsFromServer.length > 0) {
          // Basic check, assumes server returns elements in the same order or all succeed/fail
          // More sophisticated matching might be needed if IDs can change or partial success is possible
          return createdElementsFromServer;
        } else {
          console.warn(
            'Add elements: Server did not return valid elements. Relying on optimistic data or sync.'
          );
          return optimisticElements; // Return optimistic elements if server response is not as expected but no error thrown
        }
      } catch (error) {
        console.error('Failed to add elements:', error);
        removeOptimisticInserts.forEach(remove => remove()); // Rollback all optimistic updates on API error
        return null;
      }
    },
    [addOptimisticUpdate, userId, roomId]
  );

  const updateElement = useCallback(
    async (
      updatesArray: {
        id: string;
        updates: Partial<
          Omit<
            CanvasElementRecord,
            'id' | 'room_id' | 'creator_id' | 'created_at' | 'updated_at'
          >
        >;
      }[]
    ) => {
      if (!updatesArray || updatesArray.length === 0) {
        return;
      }

      const removeOptimisticUpdates: (() => void)[] = [];
      const elementsToUpdateForApi: any[] = [];

      for (const { id, updates } of updatesArray) {
        const currentElement = elements.find(el => el.id === id);
        if (!currentElement) {
          console.warn('Element not found for update:', id);
          continue; // Skip this update if element not found
        }

        const optimisticUpdateData: CanvasElementRecord = {
          id: currentElement.id,
          room_id: (currentElement as any).roomId,
          creator_id: (currentElement as any).creatorId,
          tool_type: updates.tool_type ?? (currentElement as any).toolType,
          element_data:
            updates.element_data ?? (currentElement as any).elementData,
          created_at: (currentElement as any).createdAt,
          updated_at: new Date(),
        };

        removeOptimisticUpdates.push(
          addOptimisticUpdate({
            operation: 'update',
            value: optimisticUpdateData,
          })
        );

        elementsToUpdateForApi.push({
          id: id,
          tool_type: updates.tool_type,
          element_data: updates.element_data,
        });
      }

      if (elementsToUpdateForApi.length === 0) {
        return; // No valid elements to update
      }

      try {
        await api.request(`/canvas/elements`, 'PUT', elementsToUpdateForApi);
        // ElectricSQL sync should handle the update from the server.
      } catch (error) {
        console.error('Failed to update elements:', error);
        removeOptimisticUpdates.forEach(remove => remove());
      }
    },
    [elements, addOptimisticUpdate]
  );

  const removeElement = useCallback(
    async (ids: string[]) => {
      if (!ids || ids.length === 0) {
        return;
      }

      const removeOptimisticDeletes: (() => void)[] = [];
      const recordsToDelete: CanvasElementRecord[] = [];

      for (const id of ids) {
        const elementToRemove = elements.find(el => el.id === id);
        if (!elementToRemove) {
          console.warn('Element not found for removal:', id);
          continue; // Skip if element not found
        }

        // Use the canvasElementMapper to create a proper record format
        // We need to provide roomId and userId for the mapping
        const recordToDelete: CanvasElementRecord =
          canvasElementMapper.toRecord(elementToRemove, roomId, userId);
        recordsToDelete.push(recordToDelete);

        removeOptimisticDeletes.push(
          addOptimisticUpdate({
            operation: 'delete',
            value: recordToDelete,
          })
        );
      }

      if (recordsToDelete.length === 0) {
        return; // No valid elements to delete
      }

      try {
        await api.request(`/canvas/elements`, 'DELETE', { ids });
        // ElectricSQL sync should handle the update from the server.
        // Clean up optimistic deletes on success since server will provide the updated state
        removeOptimisticDeletes.forEach(remove => remove());
      } catch (error) {
        console.error('Failed to delete elements:', error);
        removeOptimisticDeletes.forEach(remove => remove());
      }
    },
    [elements, addOptimisticUpdate, roomId, userId]
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
