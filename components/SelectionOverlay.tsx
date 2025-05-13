import { Selection } from '@/utils/selectionUtils';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export const HANDLE_SIZE = 12;
export const HANDLE_TOUCH_AREA = 24; // Larger than visible size for easier touch

interface SelectionOverlayProps {
  selection: Selection;
  top: number;
  left: number;
}

const SelectionOverlay: React.FC<SelectionOverlayProps> = ({
  selection,
  top,
  left,
}) => {
  const width = Math.abs(selection.width);
  const height = Math.abs(selection.height);
  const rotation = selection.rotation || 0;

  const normalizeRotation = (rad: number): number => {
    // Normalize to range 0-2π
    let normalized = rad % (2 * Math.PI);
    if (normalized < 0) normalized += 2 * Math.PI;
    return normalized;
  };

  // Convert rotation to CSS degrees
  const rotationDeg = (normalizeRotation(rotation) * 180) / Math.PI;

  // Calculate center for rotation pivot
  const centerX = width / 2;
  const centerY = height / 2;

  // Calculate position for rotation handle (bottom middle + offset)
  const rotationHandlePosition = {
    left: centerX - HANDLE_SIZE / 2,
    top: height + 30 - HANDLE_SIZE / 2, // Position below the selection
  };

  return (
    <View
      style={[
        styles.selectionContainer,
        {
          top,
          left,
          width,
          height,
          transform: [
            { translateX: centerX },
            { translateY: centerY },
            { rotate: `${rotationDeg}deg` },
            { translateX: -centerX },
            { translateY: -centerY },
          ],
        },
      ]}
    >
      {/* Selection outline */}
      <View style={styles.selectionBorder} />

      {/* Scaling handles */}
      <View style={[styles.handle, styles.topLeftHandle]} />
      <View style={[styles.handle, styles.topCenterHandle]} />
      <View style={[styles.handle, styles.topRightHandle]} />
      <View style={[styles.handle, styles.middleRightHandle]} />
      <View style={[styles.handle, styles.bottomRightHandle]} />
      <View style={[styles.handle, styles.bottomCenterHandle]} />
      <View style={[styles.handle, styles.bottomLeftHandle]} />
      <View style={[styles.handle, styles.middleLeftHandle]} />

      {/* Rotation handle - at the bottom */}
      <View
        style={[
          styles.rotationHandleLine,
          { top: height, left: centerX - 1, height: 25 },
        ]}
      />
      <View
        style={[
          styles.rotationHandle,
          {
            left: rotationHandlePosition.left,
            top: rotationHandlePosition.top,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  selectionContainer: {
    position: 'absolute',
    pointerEvents: 'none',
  },
  selectionBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: '#4285F4',
    borderStyle: 'dashed',
  },
  handle: {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#4285F4',
  },
  topLeftHandle: {
    top: -HANDLE_SIZE / 2,
    left: -HANDLE_SIZE / 2,
  },
  topCenterHandle: {
    top: -HANDLE_SIZE / 2,
    left: '50%',
    marginLeft: -HANDLE_SIZE / 2,
  },
  topRightHandle: {
    top: -HANDLE_SIZE / 2,
    right: -HANDLE_SIZE / 2,
  },
  middleRightHandle: {
    top: '50%',
    marginTop: -HANDLE_SIZE / 2,
    right: -HANDLE_SIZE / 2,
  },
  bottomRightHandle: {
    bottom: -HANDLE_SIZE / 2,
    right: -HANDLE_SIZE / 2,
  },
  bottomCenterHandle: {
    bottom: -HANDLE_SIZE / 2,
    left: '50%',
    marginLeft: -HANDLE_SIZE / 2,
  },
  bottomLeftHandle: {
    bottom: -HANDLE_SIZE / 2,
    left: -HANDLE_SIZE / 2,
  },
  middleLeftHandle: {
    top: '50%',
    marginTop: -HANDLE_SIZE / 2,
    left: -HANDLE_SIZE / 2,
  },
  // Rotation handle styles
  rotationHandle: {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: '#4285F4',
    borderWidth: 1,
    borderColor: '#FFF',
  },
  rotationHandleLine: {
    position: 'absolute',
    width: 2,
    backgroundColor: '#4285F4',
  },
});

export default SelectionOverlay;
