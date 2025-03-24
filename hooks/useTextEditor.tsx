import { Group, Rect, Text, useFont } from '@shopify/react-native-skia';
import { useCallback, useEffect, useState } from 'react';
import { Tools } from '../constants/Tools';

export type TextElement = {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
};

export function useTextEditor(
  socket: any,
  clientId: string,
  roomId: string | string[],
  isSyncing: boolean,
  setIsSyncing: (value: boolean) => void,
  currentTool: Tools,
  panOffset: { x: number; y: number }
) {
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [selectedText, setSelectedText] = useState<TextElement | null>(null);
  const [isAddingText, setIsAddingText] = useState(false);
  const [newTextValue, setNewTextValue] = useState('');
  const [newTextPosition, setNewTextPosition] = useState({ x: 0, y: 0 });

  // Initialize socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Listen for text updates from other clients
    socket.on('textAdded', (data: any) => {
      console.log('Received textAdded event:', data);
      if (data.senderId === clientId) return;

      setIsSyncing(true);
      setTextElements(prev => [...prev, data.textElement]);
      setTimeout(() => setIsSyncing(false), 100);
    });

    socket.on('textMoved', (data: any) => {
      console.log('Received textMoved event:', data);
      if (data.senderId === clientId) return;

      setIsSyncing(true);
      setTextElements(prev =>
        prev.map(item =>
          item.id === data.textId
            ? { ...item, x: item.x + data.changeX, y: item.y + data.changeY }
            : item
        )
      );
      setTimeout(() => setIsSyncing(false), 100);
    });

    // Request all text elements on join
    socket.on('joinRoom', (data: any) => {
      console.log('Received textElements in joinRoom:', data.textElements);
      if (data.textElements && Array.isArray(data.textElements)) {
        setTextElements(data.textElements);
      }
    });

    return () => {
      socket.off('textAdded');
      socket.off('textMoved');
    };
  }, [socket, clientId, setIsSyncing]);

  // Handle initiating text addition
  const startAddingText = useCallback(
    (x: number, y: number) => {
      if (currentTool !== Tools.TEXT) return;

      // Adjust for pan offset
      const adjustedX = x - (panOffset?.x || 0);
      const adjustedY = y - (panOffset?.y || 0);

      console.log('Starting text addition at:', adjustedX, adjustedY);
      setNewTextPosition({ x: adjustedX, y: adjustedY });
      setIsAddingText(true);
      setNewTextValue('');
    },
    [currentTool, panOffset]
  );

  // Confirm text addition
  const confirmAddText = useCallback(
    (color: string, fontSize: number = 24) => {
      if (!newTextValue.trim()) {
        setIsAddingText(false);
        return;
      }

      const newText: TextElement = {
        id: `text_${Date.now()}`,
        text: newTextValue.trim(),
        x: newTextPosition.x,
        y: newTextPosition.y,
        color,
        fontSize,
      };

      console.log('Adding new text:', newText);

      setTextElements(prev => [...prev, newText]);
      setIsAddingText(false);

      // Emit to socket if not syncing
      if (!isSyncing && socket) {
        console.log('Emitting textAdded event:', newText);
        socket.emit('textAdded', {
          roomId,
          textElement: newText,
          senderId: clientId,
        });
      }
    },
    [newTextValue, newTextPosition, isSyncing, socket, roomId, clientId]
  );

  // Cancel adding text
  const cancelAddText = useCallback(() => {
    setIsAddingText(false);
    setNewTextValue('');
  }, []);

  // Handle text selection
  const handleTextSelection = useCallback(
    (x: number, y: number) => {
      // Only allow selection if using the SELECT tool
      if (currentTool !== Tools.SELECT) {
        return false;
      }

      // Adjust coordinates by pan offset
      const adjustedX = x - (panOffset?.x || 0);
      const adjustedY = y - (panOffset?.y || 0);

      // Simple hit testing - could be improved for better text bounds calculation
      const touchedText = textElements.find(text => {
        // Approximate text width based on length and fontSize
        const approximateWidth = text.text.length * (text.fontSize * 0.6);
        const approximateHeight = text.fontSize;

        return (
          adjustedX >= text.x &&
          adjustedX <= text.x + approximateWidth &&
          adjustedY >= text.y - approximateHeight &&
          adjustedY <= text.y
        );
      });

      if (touchedText) {
        console.log('Selected text:', touchedText);
        setSelectedText(touchedText);
        return true; // Text was selected
      }

      setSelectedText(null);
      return false; // No text was selected
    },
    [currentTool, panOffset, textElements]
  );

  // Move selected text
  const moveSelectedText = useCallback(
    (changeX: number, changeY: number) => {
      if (!selectedText || currentTool !== Tools.SELECT) return false;

      setTextElements(prev =>
        prev.map(item =>
          item.id === selectedText.id
            ? { ...item, x: item.x + changeX, y: item.y + changeY }
            : item
        )
      );

      // Update selectedText position as well
      setSelectedText(prev =>
        prev ? { ...prev, x: prev.x + changeX, y: prev.y + changeY } : null
      );

      // Emit to socket if not syncing
      if (!isSyncing && socket) {
        console.log('Emitting textMoved event:', {
          textId: selectedText.id,
          changeX,
          changeY,
        });

        socket.emit('textMoved', {
          roomId,
          textId: selectedText.id,
          changeX,
          changeY,
          senderId: clientId,
        });
      }

      return true; // Text was moved
    },
    [selectedText, currentTool, isSyncing, socket, roomId, clientId]
  );

  // Reset text selection
  const resetTextSelection = useCallback(() => {
    setSelectedText(null);
  }, []);

  return {
    textElements,
    setTextElements,
    selectedText,
    isAddingText,
    newTextValue,
    setNewTextValue,
    startAddingText,
    confirmAddText,
    cancelAddText,
    handleTextSelection,
    moveSelectedText,
    resetTextSelection,
  };
}

// Alternative TextElement implementation
export function TextElement({
  text,
  x,
  y,
  fontSize,
  color,
  panOffset = { x: 0, y: 0 },
  isSelected = false,
}: {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  panOffset?: { x: number; y: number };
  isSelected?: boolean;
}) {
  // Use SpaceMono font that's already loaded in _layout.tsx
  const font = useFont(
    require('../assets/fonts/SpaceMono-Regular.ttf'),
    fontSize
  );

  if (!font) {
    console.log('SpaceMono font loading...');
    return null;
  }

  return (
    <Group>
      <Text
        x={x + panOffset.x}
        y={y + panOffset.y}
        text={text}
        font={font}
        color={color}
      />
      {isSelected && (
        // Selection highlight
        <Rect
          x={x + panOffset.x - 2}
          y={y + panOffset.y - fontSize}
          width={text.length * fontSize * 0.6 + 4}
          height={fontSize + 4}
          color="rgba(0, 102, 255, 0.2)"
        />
      )}
    </Group>
  );
}
