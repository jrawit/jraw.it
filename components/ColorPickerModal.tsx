import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import ColorPicker, {
  BrightnessSlider,
  ColorFormatsObject,
  InputWidget,
  OpacitySlider,
  Panel2,
} from 'reanimated-color-picker';

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
  style: StyleProp<ViewStyle>; // Use StyleProp<ViewStyle> to allow arrays
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
  // Flatten the style to handle arrays and ensure it's an object
  const flatStyle = StyleSheet.flatten(style);
  const viewHeight =
    typeof flatStyle?.height === 'number' ? flatStyle.height : 0;
  const viewWidth = typeof flatStyle?.width === 'number' ? flatStyle.width : 0;

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
          {Array.from({
            length: Math.floor(viewHeight / gridSize), // Use flattened height
          }).map((_, i) => (
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
          ))}

          {/* Vertical lines */}
          {Array.from({
            length: Math.floor(viewWidth / gridSize), // Use flattened width
          }).map((_, i) => (
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
          ))}
        </View>
      )}
    </View>
  );
};

interface Background {
  color: string;
  texture: boolean;
  gridSize: number;
  textureOpacity: number;
}

interface ColorPickerModalProps {
  visible: boolean;
  initialBackground: Background;
  onSelectBackground: (backgroundState: Background) => void;
  onCancel: () => void;
}

export default function ColorPickerModal({
  visible,
  // Destructure initialBackground
  initialBackground,
  onSelectBackground,
  onCancel,
}: ColorPickerModalProps) {
  // Initialize state from initialBackground object
  const [color, setColor] = useState<string>(initialBackground.color);
  const [applyTexture, setApplyTexture] = useState<boolean>(
    initialBackground.texture
  );

  const [showAdvancedPicker, setShowAdvancedPicker] = useState<boolean>(false);

  const [gridSize, setGridSize] = useState<number>(initialBackground.gridSize);
  const [textureOpacity, setTextureOpacity] = useState<number>(
    initialBackground.textureOpacity
  );
  const isDark = useColorScheme() === 'dark';
  const selectedColor = useSharedValue(initialBackground.color);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isSmallScreen = screenWidth < 400;
  const isVerySmallScreen = screenWidth < 350;

  // Reset state when modal becomes visible using initialBackground
  useEffect(() => {
    if (visible) {
      setColor(initialBackground.color);
      selectedColor.value = initialBackground.color;
      setApplyTexture(initialBackground.texture);
      setGridSize(initialBackground.gridSize);
      setTextureOpacity(initialBackground.textureOpacity);
    }
    // Depend on the initialBackground object
  }, [visible, initialBackground]);

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
    onSelectBackground({
      color,
      texture: applyTexture,
      gridSize,
      textureOpacity,
    });
  };

  const handleCancel = () => {
    onCancel();
  };

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.modalOverlay}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <ThemedView
            style={[
              styles.modalContent,
              {
                width: isVerySmallScreen
                  ? '90%'
                  : isSmallScreen
                    ? '80%'
                    : '70%',
                maxWidth: isSmallScreen ? screenWidth - 40 : 400,
                maxHeight: screenHeight * 0.8,
              },
            ]}
          >
            <ThemedText
              style={[styles.modalTitle, { fontSize: isSmallScreen ? 16 : 18 }]}
            >
              Choose Background Color
            </ThemedText>

            {/* Color Preview with Texture */}
            <View
              style={[
                styles.colorPreview,
                { marginBottom: isSmallScreen ? 15 : 20 },
              ]}
            >
              <ThemedText
                style={[
                  styles.previewText,
                  { fontSize: isSmallScreen ? 14 : 16 },
                ]}
              >
                Selected:
              </ThemedText>
              <TexturedColorView
                color={color}
                style={[
                  colorButtonStyle,
                  {
                    width: isSmallScreen ? 35 : 40,
                    height: isSmallScreen ? 35 : 40,
                    borderRadius: isSmallScreen ? 17.5 : 20,
                  },
                ]}
                gridSize={gridSize}
                textureOpacity={textureOpacity}
                texture={applyTexture ? 'grid' : 'none'}
              />
              <ThemedText
                style={[
                  styles.previewText,
                  { fontSize: isSmallScreen ? 12 : 16 },
                ]}
              >
                {color.toUpperCase()}
              </ThemedText>
            </View>

            <ThemedView
              style={[
                styles.textureOptions,
                { padding: isSmallScreen ? 8 : 10 },
              ]}
            >
              <ThemedText
                style={[
                  styles.sectionTitle,
                  { fontSize: isSmallScreen ? 14 : 16 },
                ]}
              >
                Texture Settings
              </ThemedText>

              <View style={styles.optionRow}>
                <ThemedText style={{ fontSize: isSmallScreen ? 14 : 16 }}>
                  Apply Grid Texture
                </ThemedText>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    applyTexture && styles.toggleActive,
                    {
                      paddingHorizontal: isSmallScreen ? 8 : 12,
                      paddingVertical: isSmallScreen ? 4 : 6,
                    },
                  ]}
                  onPress={() => setApplyTexture(!applyTexture)}
                >
                  <ThemedText
                    style={[
                      applyTexture
                        ? styles.toggleTextActive
                        : styles.toggleText,
                      { fontSize: isSmallScreen ? 10 : 12 },
                    ]}
                  >
                    {applyTexture ? 'ON' : 'OFF'}
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {applyTexture && (
                <>
                  <View style={styles.optionRow}>
                    <ThemedText style={{ fontSize: isSmallScreen ? 14 : 16 }}>
                      Grid Size: {gridSize}px
                    </ThemedText>
                    <View style={styles.sliderContainer}>
                      <TouchableOpacity
                        onPress={() => setGridSize(Math.max(5, gridSize - 5))}
                        style={{ padding: isSmallScreen ? 4 : 8 }}
                      >
                        <MaterialIcons
                          name="remove"
                          size={isSmallScreen ? 18 : 20}
                          color={isDark ? 'white' : 'black'}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setGridSize(Math.min(50, gridSize + 5))}
                        style={{ padding: isSmallScreen ? 4 : 8 }}
                      >
                        <MaterialIcons
                          name="add"
                          size={isSmallScreen ? 18 : 20}
                          color={isDark ? 'white' : 'black'}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.optionRow}>
                    <ThemedText style={{ fontSize: isSmallScreen ? 14 : 16 }}>
                      Opacity: {Math.round(textureOpacity * 100)}%
                    </ThemedText>
                    <View style={styles.sliderContainer}>
                      <TouchableOpacity
                        onPress={() =>
                          setTextureOpacity(
                            Math.max(0.05, textureOpacity - 0.05)
                          )
                        }
                        style={{ padding: isSmallScreen ? 4 : 8 }}
                      >
                        <MaterialIcons
                          name="remove"
                          size={isSmallScreen ? 18 : 20}
                          color={isDark ? 'white' : 'black'}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() =>
                          setTextureOpacity(
                            Math.min(0.5, textureOpacity + 0.05)
                          )
                        }
                        style={{ padding: isSmallScreen ? 4 : 8 }}
                      >
                        <MaterialIcons
                          name="add"
                          size={isSmallScreen ? 18 : 20}
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
                  paddingHorizontal: isSmallScreen ? 8 : 12,
                  paddingVertical: isSmallScreen ? 6 : 8,
                  marginBottom: isSmallScreen ? 10 : 15,
                },
              ]}
              onPress={() => setShowAdvancedPicker(!showAdvancedPicker)}
            >
              <ThemedText
                style={[
                  styles.buttonText,
                  { fontSize: isSmallScreen ? 12 : 14 },
                ]}
              >
                {showAdvancedPicker
                  ? 'Simple Color Grid'
                  : 'Advanced Color Picker'}
              </ThemedText>
            </TouchableOpacity>

            {/* Quick Color Selection with Textures */}
            {!showAdvancedPicker && (
              <View
                style={[
                  styles.colorGrid,
                  {
                    maxHeight: isSmallScreen ? 200 : 250,
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                  },
                ]}
              >
                {COLORS.map(colorOption => (
                  <TouchableOpacity
                    key={colorOption}
                    style={[
                      color === colorOption && styles.selectedColorOption,
                      { margin: isSmallScreen ? 3 : 5 },
                    ]}
                    onPress={() => handleColorSelect(colorOption)}
                  >
                    <TexturedColorView
                      color={colorOption}
                      style={[
                        styles.colorOption,
                        {
                          width: isSmallScreen ? 25 : 30,
                          height: isSmallScreen ? 25 : 30,
                          borderRadius: isSmallScreen ? 12.5 : 15,
                        },
                        color === colorOption && { borderWidth: 0 },
                      ]}
                      gridSize={3}
                      textureOpacity={0.12}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Advanced Color Picker */}
            {showAdvancedPicker && (
              <View style={{ maxHeight: isSmallScreen ? 250 : 300 }}>
                <ColorPicker
                  style={[
                    styles.pickerContainer,
                    {
                      backgroundColor: isDark ? '#333' : 'white',
                      padding: isSmallScreen ? 10 : 15,
                    },
                  ]}
                  value={color}
                  sliderThickness={isSmallScreen ? 20 : 25}
                  thumbSize={isSmallScreen ? 20 : 24}
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
                    style={[
                      styles.panelStyle,
                      { height: isSmallScreen ? 120 : 150 },
                    ]}
                    thumbShape="ring"
                    reverseVerticalChannel
                  />

                  <BrightnessSlider
                    style={[
                      styles.sliderStyle,
                      { height: isSmallScreen ? 8 : 10 },
                    ]}
                  />

                  <OpacitySlider
                    style={[
                      styles.sliderStyle,
                      { height: isSmallScreen ? 8 : 10 },
                    ]}
                  />

                  <View style={styles.previewTxtContainer}>
                    <InputWidget
                      inputStyle={{
                        color: isDark ? '#fff' : '#000',
                        paddingVertical: 2,
                        borderColor: '#707070',
                        fontSize: isSmallScreen ? 10 : 12,
                        marginLeft: 5,
                      }}
                      iconColor="#707070"
                    />
                  </View>
                </ColorPicker>
              </View>
            )}

            {/* Action Buttons */}
            <ThemedView
              style={[
                styles.modalButtons,
                { marginTop: isSmallScreen ? 15 : 20 },
              ]}
            >
              <TouchableOpacity
                onPress={handleCancel}
                style={[
                  styles.modalButton,
                  styles.cancelButton,
                  {
                    backgroundColor: isDark ? '#444' : '#ccc',
                    paddingVertical: isSmallScreen ? 8 : 10,
                    paddingHorizontal: isSmallScreen ? 15 : 20,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.actionButtonText,
                    { fontSize: isSmallScreen ? 14 : 16 },
                  ]}
                >
                  Cancel
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmit}
                style={[
                  styles.modalButton,
                  styles.applyButton,
                  {
                    paddingVertical: isSmallScreen ? 8 : 10,
                    paddingHorizontal: isSmallScreen ? 15 : 20,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.actionButtonText,
                    { fontSize: isSmallScreen ? 14 : 16 },
                  ]}
                >
                  Apply
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100%',
  },
  modalContent: {
    borderRadius: 10,
    padding: 15,
    margin: 0,
    alignSelf: 'center',
  },
  modalTitle: {
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  colorPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  previewText: {
    fontWeight: '500',
  },
  textureOptions: {
    borderRadius: 8,
    marginBottom: 15,
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
  },
  toggleButton: {
    borderRadius: 15,
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: '#007AFF',
  },
  toggleText: {
    color: '#666',
  },
  toggleTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  buttonText: {
    fontWeight: '500',
  },
  colorGrid: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  colorOption: {
    borderWidth: 1,
    borderColor: '#ccc',
  },
  selectedColorOption: {
    borderWidth: 3,
    borderColor: '#007AFF',
    borderRadius: 20,
  },
  pickerContainer: {
    borderRadius: 12,
  },
  panelStyle: {
    borderRadius: 12,
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
    borderColor: 'rgba(128, 128, 128, 0.2)',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    borderRadius: 5,
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
  textureOverlay: {
    backgroundColor: 'transparent',
  },
});
