import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  useColorScheme,
  Pressable,
} from 'react-native';
import ColorPicker, {
    Panel2,
    BrightnessSlider,
    OpacitySlider,
    InputWidget,
    ColorFormatsObject,
  } from 'reanimated-color-picker';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

interface ColorPickerModalProps {
  visible: boolean;
  initialColor: string;
  onSelectColor: (color: string) => void;
  onCancel: () => void;
}

// Keep the predefined colors for quick selection
const COLORS = [
  '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#03A9F4', 
  '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', 
  '#FF9800', '#FF5722', '#795548', '#607D8B', '#FFFFFF', '#000000',
];

export default function ColorPickerModal({
  visible,
  initialColor,
  onSelectColor,
  onCancel,
}: ColorPickerModalProps) {
  const [color, setColor] = useState<string>(initialColor);
  const [showAdvancedPicker, setShowAdvancedPicker] = useState<boolean>(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  // Shared value for animations
  const selectedColor = useSharedValue(initialColor);

  // Reset state when modal becomes visible with initialColor
  useEffect(() => {
    if (visible) {
      setColor(initialColor);
      selectedColor.value = initialColor;
    }
  }, [visible, initialColor]);
  
  const colorButtonStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: selectedColor.value,
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: '#ccc',
    };
  });

  const handleColorSelect = (color: string) => {
    setColor(color);
    selectedColor.value = color;
  };

  const handleSubmit = () => {
    onSelectColor(color);
  };

  const handleCancel = () => {
    setColor(initialColor);
    onCancel();
  };

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <ThemedView style={styles.modalOverlay}>
        <ThemedView style={styles.modalContent}>
          <ThemedText style={styles.modalTitle}>Choose Background Color</ThemedText>

          {/* Color Preview */}
          <View style={styles.colorPreview}>
            <ThemedText style={styles.previewText}>Selected:</ThemedText>
            <Animated.View style={colorButtonStyle} />
            <ThemedText style={styles.previewText}>{color.toUpperCase()}</ThemedText>
          </View>

          {/* Toggle between simple and advanced pickers */}
          <TouchableOpacity
            style={[
              styles.toggleButton,
              {
                backgroundColor: isDark ? '#444' : '#eee',
              },
            ]}
            onPress={() => setShowAdvancedPicker(!showAdvancedPicker)}
          >
            <ThemedText style={styles.buttonText}>
              {showAdvancedPicker ? 'Simple Color Grid' : 'Advanced Color Picker'}
            </ThemedText>
          </TouchableOpacity>

          {/* Quick Color Selection */}
          {!showAdvancedPicker && (
            <View style={styles.colorGrid}>
              {COLORS.map((colorOption) => (
                <TouchableOpacity
                  key={colorOption}
                  style={[
                    styles.colorOption,
                    { backgroundColor: colorOption },
                    color === colorOption && styles.selectedColorOption,
                  ]}
                  onPress={() => handleColorSelect(colorOption)}
                />
              ))}
            </View>
          )}

          {/* Advanced Color Picker */}
          {showAdvancedPicker && (
            <ColorPicker
              style={{
                ...styles.pickerContainer,
                backgroundColor: isDark ? '#333' : 'white',
              }}
              value={color}
              sliderThickness={25}
              thumbSize={24}
              thumbShape="circle"
              onComplete={(colorValue: ColorFormatsObject) => {
                'worklet';
                selectedColor.value = colorValue.hex;
              }}
              onCompleteJS={(colorValue: ColorFormatsObject) => {
                setColor(colorValue.hex);
              }}
              adaptSpectrum
              boundedThumb
            >
              <Panel2
                style={styles.panelStyle}
                thumbShape="ring"
                reverseVerticalChannel
              />

              <BrightnessSlider style={styles.sliderStyle} />

              <OpacitySlider style={styles.sliderStyle} />

              <View style={styles.previewTxtContainer}>
                <InputWidget
                  inputStyle={{
                    color: isDark ? '#fff' : '#000',
                    paddingVertical: 2,
                    borderColor: '#707070',
                    fontSize: 12,
                    marginLeft: 5,
                  }}
                  iconColor="#707070"
                />
              </View>
            </ColorPicker>
          )}

          {/* Action Buttons */}
          <ThemedView style={styles.modalButtons}>
            <TouchableOpacity
              onPress={handleCancel}
              style={[
                styles.modalButton,
                styles.cancelButton,
                {
                  backgroundColor: isDark ? '#444' : '#ccc',
                },
              ]}
            >
              <ThemedText style={styles.actionButtonText}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              style={[styles.modalButton, styles.applyButton]}
            >
              <ThemedText style={styles.actionButtonText}>Apply</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  colorPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  previewText: {
    fontSize: 16,
    marginHorizontal: 8,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 10,
  },
  colorOption: {
    width: 30,
    height: 30,
    borderRadius: 15,
    margin: 5,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  selectedColorOption: {
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  toggleButton: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  pickerContainer: {
    alignSelf: 'center',
    width: '100%',
    padding: 15,
    borderRadius: 10,
    elevation: 5,
    marginVertical: 10,
  },
  panelStyle: {
    borderRadius: 8,
    elevation: 2,
  },
  sliderStyle: {
    borderRadius: 10,
    marginTop: 10,
    elevation: 2,
  },
  previewTxtContainer: {
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 1,
    borderColor: '#bebdbe',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ccc',
  },
  applyButton: {
    backgroundColor: '#007AFF',
  },
  actionButtonText: {
    fontWeight: 'bold',
    color: 'white',
  },
});