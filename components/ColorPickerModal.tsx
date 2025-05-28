import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useColorScheme,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const safeAreaInsets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isSmallScreen = screenWidth < 400;
  const isVerySmallScreen = screenWidth < 350;
  const isTinyScreen = screenWidth < 320; // For very old devices

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
  }, [visible, initialBackground, selectedColor]);

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

  // Dismiss keyboard when modal opens
  useEffect(() => {
    if (visible && Platform.OS !== 'web') {
      Keyboard.dismiss();
    }
  }, [visible]);

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="slide"
      onRequestClose={handleCancel}
      supportedOrientations={['portrait', 'landscape']}
    >
      <TouchableWithoutFeedback onPress={handleCancel}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardAvoidingView}
            >
              <ScrollView
                contentContainerStyle={[
                  styles.scrollContainer,
                  {
                    paddingTop: safeAreaInsets.top + 20,
                    paddingBottom: safeAreaInsets.bottom + 20,
                  },
                ]}
                showsVerticalScrollIndicator={false}
                bounces={false}
                keyboardShouldPersistTaps="handled"
              >
                <ThemedView
                  style={[
                    styles.modalContent,
                    {
                      width: isTinyScreen
                        ? '98%'
                        : isVerySmallScreen
                          ? '95%'
                          : isSmallScreen
                            ? '90%'
                            : '85%',
                      maxWidth: isSmallScreen ? screenWidth - 20 : 400,
                      maxHeight: screenHeight * 0.85,
                      marginHorizontal: isTinyScreen ? 4 : 10,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.modalTitle,
                      { fontSize: isTinyScreen ? 14 : isSmallScreen ? 16 : 18 },
                    ]}
                  >
                    Choose Background Color
                  </ThemedText>

                  {/* Color Preview with Texture */}
                  <View
                    style={[
                      styles.colorPreview,
                      { marginBottom: isSmallScreen ? 12 : 20 },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.previewText,
                        {
                          fontSize: isTinyScreen ? 12 : isSmallScreen ? 14 : 16,
                        },
                      ]}
                    >
                      Selected:
                    </ThemedText>
                    <TexturedColorView
                      color={color}
                      style={[
                        colorButtonStyle,
                        {
                          width: isTinyScreen ? 30 : isSmallScreen ? 35 : 40,
                          height: isTinyScreen ? 30 : isSmallScreen ? 35 : 40,
                          borderRadius: isTinyScreen
                            ? 15
                            : isSmallScreen
                              ? 17.5
                              : 20,
                        },
                      ]}
                      gridSize={gridSize}
                      textureOpacity={textureOpacity}
                      texture={applyTexture ? 'grid' : 'none'}
                    />
                    <ThemedText
                      style={[
                        styles.previewText,
                        {
                          fontSize: isTinyScreen ? 10 : isSmallScreen ? 12 : 16,
                        },
                      ]}
                    >
                      {color.toUpperCase()}
                    </ThemedText>
                  </View>

                  <ThemedView
                    style={[
                      styles.textureOptions,
                      { padding: isTinyScreen ? 6 : isSmallScreen ? 8 : 10 },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.sectionTitle,
                        {
                          fontSize: isTinyScreen ? 12 : isSmallScreen ? 14 : 16,
                        },
                      ]}
                    >
                      Texture Settings
                    </ThemedText>

                    <View style={styles.optionRow}>
                      <ThemedText
                        style={{
                          fontSize: isTinyScreen ? 12 : isSmallScreen ? 14 : 16,
                        }}
                      >
                        Apply Grid Texture
                      </ThemedText>
                      <TouchableOpacity
                        style={[
                          styles.toggleButton,
                          applyTexture && styles.toggleActive,
                          {
                            paddingHorizontal: isTinyScreen
                              ? 6
                              : isSmallScreen
                                ? 8
                                : 12,
                            paddingVertical: isTinyScreen
                              ? 3
                              : isSmallScreen
                                ? 4
                                : 6,
                            minWidth: isTinyScreen ? 35 : 40,
                          },
                        ]}
                        onPress={() => setApplyTexture(!applyTexture)}
                      >
                        <ThemedText
                          style={[
                            applyTexture
                              ? styles.toggleTextActive
                              : styles.toggleText,
                            {
                              fontSize: isTinyScreen
                                ? 9
                                : isSmallScreen
                                  ? 10
                                  : 12,
                            },
                          ]}
                        >
                          {applyTexture ? 'ON' : 'OFF'}
                        </ThemedText>
                      </TouchableOpacity>
                    </View>

                    {applyTexture && (
                      <>
                        <View style={styles.optionRow}>
                          <ThemedText
                            style={{
                              fontSize: isTinyScreen
                                ? 12
                                : isSmallScreen
                                  ? 14
                                  : 16,
                            }}
                          >
                            Grid Size: {gridSize}px
                          </ThemedText>
                          <View style={styles.sliderContainer}>
                            <TouchableOpacity
                              onPress={() =>
                                setGridSize(Math.max(5, gridSize - 5))
                              }
                              style={{
                                padding: isTinyScreen
                                  ? 3
                                  : isSmallScreen
                                    ? 4
                                    : 8,
                                minWidth: 32,
                                minHeight: 32,
                                justifyContent: 'center',
                                alignItems: 'center',
                              }}
                            >
                              <MaterialIcons
                                name="remove"
                                size={
                                  isTinyScreen ? 16 : isSmallScreen ? 18 : 20
                                }
                                color={isDark ? 'white' : 'black'}
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() =>
                                setGridSize(Math.min(50, gridSize + 5))
                              }
                              style={{
                                padding: isTinyScreen
                                  ? 3
                                  : isSmallScreen
                                    ? 4
                                    : 8,
                                minWidth: 32,
                                minHeight: 32,
                                justifyContent: 'center',
                                alignItems: 'center',
                              }}
                            >
                              <MaterialIcons
                                name="add"
                                size={
                                  isTinyScreen ? 16 : isSmallScreen ? 18 : 20
                                }
                                color={isDark ? 'white' : 'black'}
                              />
                            </TouchableOpacity>
                          </View>
                        </View>

                        <View style={styles.optionRow}>
                          <ThemedText
                            style={{
                              fontSize: isTinyScreen
                                ? 12
                                : isSmallScreen
                                  ? 14
                                  : 16,
                            }}
                          >
                            Opacity: {Math.round(textureOpacity * 100)}%
                          </ThemedText>
                          <View style={styles.sliderContainer}>
                            <TouchableOpacity
                              onPress={() =>
                                setTextureOpacity(
                                  Math.max(0.05, textureOpacity - 0.05)
                                )
                              }
                              style={{
                                padding: isTinyScreen
                                  ? 3
                                  : isSmallScreen
                                    ? 4
                                    : 8,
                                minWidth: 32,
                                minHeight: 32,
                                justifyContent: 'center',
                                alignItems: 'center',
                              }}
                            >
                              <MaterialIcons
                                name="remove"
                                size={
                                  isTinyScreen ? 16 : isSmallScreen ? 18 : 20
                                }
                                color={isDark ? 'white' : 'black'}
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() =>
                                setTextureOpacity(
                                  Math.min(0.5, textureOpacity + 0.05)
                                )
                              }
                              style={{
                                padding: isTinyScreen
                                  ? 3
                                  : isSmallScreen
                                    ? 4
                                    : 8,
                                minWidth: 32,
                                minHeight: 32,
                                justifyContent: 'center',
                                alignItems: 'center',
                              }}
                            >
                              <MaterialIcons
                                name="add"
                                size={
                                  isTinyScreen ? 16 : isSmallScreen ? 18 : 20
                                }
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
                        paddingHorizontal: isTinyScreen
                          ? 6
                          : isSmallScreen
                            ? 8
                            : 12,
                        paddingVertical: isTinyScreen
                          ? 5
                          : isSmallScreen
                            ? 6
                            : 8,
                        marginBottom: isTinyScreen
                          ? 8
                          : isSmallScreen
                            ? 10
                            : 15,
                      },
                    ]}
                    onPress={() => setShowAdvancedPicker(!showAdvancedPicker)}
                  >
                    <ThemedText
                      style={[
                        styles.buttonText,
                        {
                          fontSize: isTinyScreen ? 11 : isSmallScreen ? 12 : 14,
                        },
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
                          maxHeight: isTinyScreen
                            ? 150
                            : isSmallScreen
                              ? 200
                              : 250,
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
                            {
                              margin: isTinyScreen ? 2 : isSmallScreen ? 3 : 5,
                              minWidth: isTinyScreen
                                ? 22
                                : isSmallScreen
                                  ? 25
                                  : 30,
                              minHeight: isTinyScreen
                                ? 22
                                : isSmallScreen
                                  ? 25
                                  : 30,
                            },
                          ]}
                          onPress={() => handleColorSelect(colorOption)}
                        >
                          <TexturedColorView
                            color={colorOption}
                            style={[
                              styles.colorOption,
                              {
                                width: isTinyScreen
                                  ? 20
                                  : isSmallScreen
                                    ? 25
                                    : 30,
                                height: isTinyScreen
                                  ? 20
                                  : isSmallScreen
                                    ? 25
                                    : 30,
                                borderRadius: isTinyScreen
                                  ? 10
                                  : isSmallScreen
                                    ? 12.5
                                    : 15,
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
                    <View
                      style={{
                        maxHeight: isTinyScreen
                          ? 200
                          : isSmallScreen
                            ? 250
                            : 300,
                      }}
                    >
                      <ColorPicker
                        style={[
                          styles.pickerContainer,
                          {
                            backgroundColor: isDark ? '#333' : 'white',
                            padding: isTinyScreen ? 8 : isSmallScreen ? 10 : 15,
                          },
                        ]}
                        value={color}
                        sliderThickness={
                          isTinyScreen ? 18 : isSmallScreen ? 20 : 25
                        }
                        thumbSize={isTinyScreen ? 18 : isSmallScreen ? 20 : 24}
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
                            {
                              height: isTinyScreen
                                ? 100
                                : isSmallScreen
                                  ? 120
                                  : 150,
                            },
                          ]}
                          thumbShape="ring"
                          reverseVerticalChannel
                        />

                        <BrightnessSlider
                          style={[
                            styles.sliderStyle,
                            {
                              height: isTinyScreen ? 6 : isSmallScreen ? 8 : 10,
                            },
                          ]}
                        />

                        <OpacitySlider
                          style={[
                            styles.sliderStyle,
                            {
                              height: isTinyScreen ? 6 : isSmallScreen ? 8 : 10,
                            },
                          ]}
                        />

                        <View style={styles.previewTxtContainer}>
                          <InputWidget
                            inputStyle={{
                              color: isDark ? '#fff' : '#000',
                              paddingVertical: 2,
                              borderColor: '#707070',
                              fontSize: isTinyScreen
                                ? 9
                                : isSmallScreen
                                  ? 10
                                  : 12,
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
                      {
                        marginTop: isTinyScreen ? 12 : isSmallScreen ? 15 : 20,
                      },
                    ]}
                  >
                    <TouchableOpacity
                      onPress={handleCancel}
                      style={[
                        styles.modalButton,
                        styles.cancelButton,
                        {
                          backgroundColor: isDark ? '#444' : '#ccc',
                          paddingVertical: isTinyScreen
                            ? 6
                            : isSmallScreen
                              ? 8
                              : 10,
                          paddingHorizontal: isTinyScreen
                            ? 12
                            : isSmallScreen
                              ? 15
                              : 20,
                          minHeight: 44, // Ensure minimum touch target
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.actionButtonText,
                          {
                            fontSize: isTinyScreen
                              ? 12
                              : isSmallScreen
                                ? 14
                                : 16,
                          },
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
                          paddingVertical: isTinyScreen
                            ? 6
                            : isSmallScreen
                              ? 8
                              : 10,
                          paddingHorizontal: isTinyScreen
                            ? 12
                            : isSmallScreen
                              ? 15
                              : 20,
                          minHeight: 44, // Ensure minimum touch target
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.actionButtonText,
                          {
                            fontSize: isTinyScreen
                              ? 12
                              : isSmallScreen
                                ? 14
                                : 16,
                          },
                        ]}
                      >
                        Apply
                      </ThemedText>
                    </TouchableOpacity>
                  </ThemedView>
                </ThemedView>
              </ScrollView>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
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
  keyboardAvoidingView: {
    flex: 1,
    width: '100%',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100%',
    paddingHorizontal: 10,
  },
  modalContent: {
    borderRadius: 12,
    padding: 15,
    margin: 0,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8,
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
