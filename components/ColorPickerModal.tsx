import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Modal,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  View,
  ViewStyle, // Import ViewStyle
} from 'react-native';
import { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import ColorPicker, {
  BrightnessSlider,
  ColorFormatsObject,
  InputWidget,
  OpacitySlider,
  Panel2,
} from 'reanimated-color-picker';

// Add the COLORS constant here
const COLORS = [
  '#F44336',
  '#E91E63',
  '#9C27B0',
  '#673AB7',
  '#3F51B5',
  '#2196F3',
  '#03A9F4',
  '#00BCD4',
  '#009688',
  '#4CAF50',
  '#8BC34A',
  '#CDDC39',
  '#FFEB3B',
  '#FFC107',
  '#FF9800',
  '#FF5722',
  '#795548',
  '#607D8B',
  '#FFFFFF',
  '#000000',
];

// Define props interface for TexturedColorView
interface TexturedColorViewProps {
  color: string;
  style: ViewStyle;
  texture?: 'grid' | 'none';
  textureOpacity?: number;
  gridSize?: number;
}

const TexturedColorView = ({
  color,
  style,
  texture = 'grid',
  textureOpacity = 0.1,
  gridSize = 4,
}: TexturedColorViewProps) => {
  // Use the interface here
  return (
    <View style={[{ position: 'relative' }, style]}>
      <View style={[style, { backgroundColor: color }]} />

      {texture === 'grid' && (
        <View
          style={[
            style,
            styles.textureOverlay,
            {
              opacity: textureOpacity,
              borderWidth: 0,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            },
          ]}
        >
          {/* Horizontal lines */}
          {Array.from({ length: Math.floor(style.height / gridSize) }).map(
            (_, i) => (
              <View
                key={`h-${i}`}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  height: 1,
                  top: i * gridSize,
                  backgroundColor: 'rgba(0,0,0,0.2)',
                }}
              />
            )
          )}

          {/* Vertical lines */}
          {Array.from({ length: Math.floor(style.width / gridSize) }).map(
            (_, i) => (
              <View
                key={`v-${i}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  width: 1,
                  left: i * gridSize,
                  backgroundColor: 'rgba(0,0,0,0.2)',
                }}
              />
            )
          )}
        </View>
      )}
    </View>
  );
};

interface ColorPickerModalProps {
  visible: boolean;
  initialColor: string;
  onSelectColor: (
    color: string,
    applyTexture?: boolean,
    gridSize?: number,
    textureOpacity?: number
  ) => void;
  onCancel: () => void;
  initialTexture?: boolean;
  initialGridSize?: number;
  initialTextureOpacity?: number;
}

export default function ColorPickerModal({
  visible,
  initialColor,
  onSelectColor,
  onCancel,
  initialTexture = false,
  initialGridSize = 20,
  initialTextureOpacity = 0.1,
}: ColorPickerModalProps) {
  const [color, setColor] = useState<string>(initialColor);
  const [showAdvancedPicker, setShowAdvancedPicker] = useState<boolean>(false);
  const [applyTexture, setApplyTexture] = useState<boolean>(initialTexture);
  const [gridSize, setGridSize] = useState<number>(initialGridSize);
  const [textureOpacity, setTextureOpacity] = useState<number>(
    initialTextureOpacity
  );
  const isDark = useColorScheme() === 'dark'; // Add this line to define isDark
  const selectedColor = useSharedValue(initialColor); // Fix missing selectedColor

  // Reset state when modal becomes visible with initialColor
  useEffect(() => {
    if (visible) {
      setColor(initialColor);
      selectedColor.value = initialColor;
      setApplyTexture(initialTexture);
      setGridSize(initialGridSize);
      setTextureOpacity(initialTextureOpacity);
    }
  }, [
    visible,
    initialColor,
    initialTexture,
    initialGridSize,
    initialTextureOpacity,
  ]);

  const colorButtonStyle = useAnimatedStyle(() => {
    return {
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
    onSelectColor(color, applyTexture, gridSize, textureOpacity);
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
          <ThemedText style={styles.modalTitle}>
            Choose Background Color
          </ThemedText>
          {/* Color Preview with Texture */}
          <View style={styles.colorPreview}>
            <ThemedText style={styles.previewText}>Selected:</ThemedText>
            <TexturedColorView
              color={color}
              style={colorButtonStyle}
              gridSize={gridSize}
              textureOpacity={textureOpacity}
              texture={applyTexture ? 'grid' : 'none'}
            />
            <ThemedText style={styles.previewText}>
              {color.toUpperCase()}
            </ThemedText>
          </View>
          <ThemedView style={styles.textureOptions}>
            <ThemedText style={styles.sectionTitle}>
              Texture Settings
            </ThemedText>

            <View style={styles.optionRow}>
              <ThemedText>Apply Grid Texture</ThemedText>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  applyTexture && styles.toggleActive,
                ]}
                onPress={() => setApplyTexture(!applyTexture)}
              >
                <ThemedText
                  style={
                    applyTexture ? styles.toggleTextActive : styles.toggleText
                  }
                >
                  {applyTexture ? 'ON' : 'OFF'}
                </ThemedText>
              </TouchableOpacity>
            </View>

            {applyTexture && (
              <>
                <View style={styles.optionRow}>
                  <ThemedText>Grid Size: {gridSize}px</ThemedText>
                  <View style={styles.sliderContainer}>
                    <TouchableOpacity
                      onPress={() => setGridSize(Math.max(5, gridSize - 5))}
                    >
                      <MaterialIcons
                        name="remove"
                        size={20}
                        color={isDark ? 'white' : 'black'}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setGridSize(Math.min(50, gridSize + 5))}
                    >
                      <MaterialIcons
                        name="add"
                        size={20}
                        color={isDark ? 'white' : 'black'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.optionRow}>
                  <ThemedText>
                    Opacity: {Math.round(textureOpacity * 100)}%
                  </ThemedText>
                  <View style={styles.sliderContainer}>
                    <TouchableOpacity
                      onPress={() =>
                        setTextureOpacity(Math.max(0.05, textureOpacity - 0.05))
                      }
                    >
                      <MaterialIcons
                        name="remove"
                        size={20}
                        color={isDark ? 'white' : 'black'}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() =>
                        setTextureOpacity(Math.min(0.5, textureOpacity + 0.05))
                      }
                    >
                      <MaterialIcons
                        name="add"
                        size={20}
                        color={isDark ? 'white' : 'black'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </ThemedView>
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
              {showAdvancedPicker
                ? 'Simple Color Grid'
                : 'Advanced Color Picker'}
            </ThemedText>
          </TouchableOpacity>
          {/* Quick Color Selection with Textures */}
          {!showAdvancedPicker && (
            <View style={styles.colorGrid}>
              {COLORS.map(colorOption => (
                <TouchableOpacity
                  key={colorOption}
                  style={[color === colorOption && styles.selectedColorOption]}
                  onPress={() => handleColorSelect(colorOption)}
                >
                  <TexturedColorView
                    color={colorOption}
                    style={[
                      styles.colorOption,
                      color === colorOption && { borderWidth: 0 },
                    ]}
                    gridSize={3}
                    textureOpacity={0.12}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
          ){/* Advanced Color Picker */}
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
  textureOptions: {
    marginVertical: 15,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 10,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
    justifyContent: 'space-between',
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#ccc',
  },
  toggleActive: {
    backgroundColor: '#007AFF',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  toggleTextActive: {
    fontSize: 12,
    fontWeight: '500',
    color: 'white',
  },
  modalContent: {
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxWidth: 500,
  },
  textureOverlay: {
    overflow: 'hidden',
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
