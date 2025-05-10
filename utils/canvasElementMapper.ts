import { CanvasElements } from '@/constants/CanvasElement';
import { Tools } from '@/constants/Tools';
import { CanvasElementMapper } from '@/utils/types';

// A mapper to convert between our app's CanvasElement format and ElectricSQL's record format
export const canvasElementMapper: CanvasElementMapper = {
  toRecord(element, roomId, userId) {
    return {
      id: element.id,
      room_id: roomId,
      creator_id: userId,
      tool_type: element.tool,
      element_data: JSON.stringify(element.element), // Ensure this is always a string when sending to server/DB
      created_at: new Date(),
      updated_at: new Date(),
      // is_deleted: false, // This was removed in a previous migration, ensure it's not being added here
    };
  },

  fromRecord(record) {
    let parsedElementData;
    if (typeof record.element_data === 'string') {
      try {
        parsedElementData = JSON.parse(record.element_data);
      } catch (e) {
        console.error(
          'Failed to parse element_data string:',
          record.element_data,
          e
        );
        // Fallback or default structure if parsing fails, or re-throw
        parsedElementData = {}; // Or handle error appropriately
      }
    } else if (
      typeof record.element_data === 'object' &&
      record.element_data !== null
    ) {
      parsedElementData = record.element_data; // Already an object, use directly
    } else {
      console.warn(
        'element_data is neither a string nor a valid object:',
        record.element_data
      );
      parsedElementData = {}; // Default to empty object or handle as an error
    }

    return {
      id: record.id,
      tool: record.tool_type as Tools,
      element: parsedElementData as CanvasElements.Any,
    };
  },
};
