import { CanvasElements } from '@/constants/CanvasElement';
import { Tools } from '@/constants/Tools';

// ElectricSQL Canvas Element Record type
export interface CanvasElementRecord {
  id: string;
  room_id: string;
  creator_id: string;
  tool_type: string;
  element_data: string;
  created_at: Date;
  updated_at: Date;
}

// Type for optimistic updates in ElectricSQL
export interface CanvasElementWrite {
  operation: 'insert' | 'update' | 'delete';
  value: CanvasElementRecord;
}

// For mapping between app local format and ElectricSQL format
export interface CanvasElementMapper {
  toRecord(
    element: {
      id: string;
      element: CanvasElements.Any;
      tool: Tools;
    },
    roomId: string,
    userId: string
  ): CanvasElementRecord;

  fromRecord(record: CanvasElementRecord): {
    id: string;
    element: CanvasElements.Any;
    tool: Tools;
  };
}
