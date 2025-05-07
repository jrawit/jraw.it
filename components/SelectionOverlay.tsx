import { Selection } from '@/utils/selectionUtils';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

interface SelectionOverlayProps {
  selection: Selection | null;
  top: number;
  left: number;
}

// Define handle size for easier calculation and touch detection
export const HANDLE_SIZE = 8;
export const HANDLE_TOUCH_AREA = 24; // Larger touch area

const SelectionOverlay: React.FC<SelectionOverlayProps> = ({
  selection,
  top,
  left,
}) => {
  const normalizedSelection = useMemo(() => {
    if (!selection) return null;

    const renderX =
      selection.width < 0 ? selection.x + selection.width : selection.x;
    const renderY =
      selection.height < 0 ? selection.y + selection.height : selection.y;
    const renderWidth = Math.abs(selection.width);
    const renderHeight = Math.abs(selection.height);

    if (renderWidth === 0 || renderHeight === 0) return null;

    return { x: renderX, y: renderY, width: renderWidth, height: renderHeight };
  }, [selection]);

  // Calculate handle positions
  const handles = useMemo(() => {
    // Check selection existence and selected status
    if (!normalizedSelection || !selection) return [];

    const {
      x: renderX,
      y: renderY,
      width: renderWidth,
      height: renderHeight,
    } = normalizedSelection;

    const halfW = renderWidth / 2;
    const halfH = renderHeight / 2;

    // Define all 8 handles
    const allHandles = [
      { x: renderX, y: renderY }, // 0: Top-left
      { x: renderX + halfW, y: renderY }, // 1: Top-middle
      { x: renderX + renderWidth, y: renderY }, // 2: Top-right
      { x: renderX + renderWidth, y: renderY + halfH }, // 3: Middle-right
      { x: renderX + renderWidth, y: renderY + renderHeight }, // 4: Bottom-right
      { x: renderX + halfW, y: renderY + renderHeight }, // 5: Bottom-middle
      { x: renderX, y: renderY + renderHeight }, // 6: Bottom-left
      { x: renderX, y: renderY + halfH }, // 7: Middle-left
    ];

    // Return only corners if selection is not finalized
    if (!selection.selected) {
      return [
        allHandles[0], // Top-left
        allHandles[2], // Top-right
        allHandles[4], // Bottom-right
        allHandles[6], // Bottom-left
      ];
    }

    // Return all handles if selection is finalized
    return allHandles;
  }, [normalizedSelection, selection]); // Add selection dependency

  if (!normalizedSelection) {
    return null;
  }

  const { width: renderWidth, height: renderHeight } = normalizedSelection;

  return (
    <>
      <View
        style={[
          styles.selectionBox,
          {
            left: left,
            top: top,
            width: renderWidth,
            height: renderHeight,
          },
        ]}
      />
      {/* Render handles */}
      {handles.map((handle, index) => (
        <View
          key={`handle-${handle.x}-${handle.y}-${index}`}
          style={[
            styles.selectionHandle,
            {
              left: handle.x - HANDLE_SIZE / 2,
              top: handle.y - HANDLE_SIZE / 2,
            },
          ]}
        />
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  selectionBox: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 134, 223, 0.8)',
    backgroundColor: 'rgba(0, 134, 223, 0.1)',
    pointerEvents: 'none', // Allow gestures to pass through
  },
  selectionHandle: {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: 'rgba(0, 134, 223, 1)',
    borderRadius: 2,
    pointerEvents: 'none', // Allow gestures to pass through
  },
});

export default SelectionOverlay;
