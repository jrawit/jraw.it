import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { CanvasElements } from '@/constants/CanvasElement';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import ColorPicker, {
  BrightnessSlider,
  ColorFormatsObject,
  InputWidget,
  OpacitySlider,
  Panel2,
} from 'reanimated-color-picker';

interface TextModalProps {
  visible: boolean;
  position: { x: number; y: number };
  onCancel: () => void;
  onSubmit: (textElement: CanvasElements.Text) => void;
  initialText?: Partial<CanvasElements.Text>;
}

export function TextModal({
  visible,
  position,
  onCancel,
  onSubmit,
  initialText,
}: TextModalProps) {
  const colorScheme = useColorScheme();

  // Internal state management
  const [text, setText] = useState(initialText?.text || '');
  const [color, setColor] = useState(initialText?.color || 'black');
  const [isBold, setIsBold] = useState(
    initialText?.fontWeight === 'bold' || false
  );
  const [isItalic, setIsItalic] = useState(
    initialText?.fontStyle === 'italic' || false
  );
  const [fontSize, setFontSize] = useState(initialText?.fontSize || 20);
  const [colorPickerVisible, setColorPickerVisible] = useState(false);

  // Shared value for animations
  const selectedColor = useSharedValue(color);

  // Reset state when modal becomes visible
  useEffect(() => {
    if (visible) {
      setText(initialText?.text || '');
      setColor(initialText?.color || 'black');
      selectedColor.value = initialText?.color || 'black';
      setIsBold(initialText?.fontWeight === 'bold' || false);
      setIsItalic(initialText?.fontStyle === 'italic' || false);
      setFontSize(initialText?.fontSize || 20);
    }
  }, [visible, initialText]);

  const colorButtonStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: selectedColor.value,
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: '#ccc',
    };
  });

  const handleSubmit = () => {
    if (!text.trim()) return;

    const textElement: CanvasElements.Text = {
      text: text,
      point: position,
      fontFamily: 'Roboto',
      fontSize: fontSize,
      color: color,
      fontStyle: isItalic
        ? 'italic'
        : ('normal' as 'normal' | 'italic' | 'oblique'),
      fontWeight: isBold
        ? 'bold'
        : ('normal' as
            | 'normal'
            | 'bold'
            | '100'
            | '200'
            | '300'
            | '400'
            | '500'
            | '600'
            | '700'
            | '800'
            | '900'),
    };

    onSubmit(textElement);

    // Reset state after submission
    setText('');
    setColor('black');
    setIsBold(false);
    setIsItalic(false);
    setFontSize(20);
  };

  const handleCancel = () => {
    setText('');
    setColor('black');
    setIsBold(false);
    setIsItalic(false);
    setFontSize(20);
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
          <ThemedText style={styles.modalTitle}>Add Text</ThemedText>
          <TextInput
            style={[
              styles.textInput,
              {
                color: color,
                backgroundColor: colorScheme === 'dark' ? '#333' : '#fff',
                borderColor: colorScheme === 'dark' ? '#555' : '#ccc',
                fontWeight: isBold ? 'bold' : 'normal',
                fontStyle: isItalic ? 'italic' : 'normal',
                fontSize: fontSize,
              },
            ]}
            value={text}
            onChangeText={setText}
            placeholder="Enter text here"
            placeholderTextColor={colorScheme === 'dark' ? '#aaa' : '#666'}
            autoFocus={true}
            multiline={true}
            maxLength={500}
          />
          <ThemedView style={styles.formattingControls}>
            <ThemedView style={styles.fontSizeControls}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setFontSize(Math.max(10, fontSize - 2))}
              >
                <MaterialIcons
                  name="text-decrease"
                  size={22}
                  color={colorScheme === 'dark' ? 'white' : 'black'}
                />
              </TouchableOpacity>
              <ThemedText style={styles.fontSizeText}>{fontSize}px</ThemedText>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setFontSize(Math.min(72, fontSize + 2))}
              >
                <MaterialIcons
                  name="text-increase"
                  size={22}
                  color={colorScheme === 'dark' ? 'white' : 'black'}
                />
              </TouchableOpacity>
            </ThemedView>
            <ThemedView style={styles.toggleButtons}>
              <TouchableOpacity
                style={[styles.iconButton, isBold && styles.activeToggle]}
                onPress={() => setIsBold(!isBold)}
              >
                <MaterialCommunityIcons
                  name="format-bold"
                  size={22}
                  color={colorScheme === 'dark' ? 'white' : 'black'}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconButton, isItalic && styles.activeToggle]}
                onPress={() => setIsItalic(!isItalic)}
              >
                <MaterialCommunityIcons
                  name="format-italic"
                  size={22}
                  color={colorScheme === 'dark' ? 'white' : 'black'}
                />
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.colorPickerContainer}>
            <ThemedText style={styles.colorPickerLabel}>Text Color:</ThemedText>

            <View style={styles.colorPickerRow}>
              <Pressable
                onPress={() => setColorPickerVisible(!colorPickerVisible)}
                style={styles.colorPickerButton}
              >
                <Animated.View style={colorButtonStyle} />
                <ThemedText style={styles.colorButtonText}>
                  {colorPickerVisible ? 'Close Picker' : 'Choose Color'}
                </ThemedText>
              </Pressable>
            </View>

            {colorPickerVisible && (
              <ColorPicker
                style={{
                  ...styles.pickerContainer,
                  backgroundColor: colorScheme === 'dark' ? '#333' : 'white',
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
                      color: '#fff',
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
          </ThemedView>

          <ThemedView style={styles.modalButtons}>
            <TouchableOpacity
              onPress={handleCancel}
              style={[
                styles.modalButton,
                styles.cancelButton,
                {
                  backgroundColor: colorScheme === 'dark' ? '#444' : '#ccc',
                },
              ]}
            >
              <ThemedText style={styles.buttonText}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              style={[styles.modalButton, styles.addButton]}
            >
              <ThemedText style={styles.buttonText}>Add Text</ThemedText>
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
  textInput: {
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    minHeight: 100,
    fontSize: 16,
    marginBottom: 15,
  },
  formattingControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  fontSizeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontSizeText: {
    marginHorizontal: 8,
    fontSize: 16,
  },
  toggleButtons: {
    flexDirection: 'row',
  },
  iconButton: {
    padding: 8,
    borderRadius: 5,
    marginHorizontal: 3,
  },
  activeToggle: {
    backgroundColor: 'rgba(0, 122, 255, 0.3)',
  },
  colorPickerContainer: {
    marginBottom: 15,
  },
  colorPickerLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  colorPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  colorPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 5,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  colorButtonText: {
    marginLeft: 8,
    fontSize: 14,
  },
  colorOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
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
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  addButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    fontWeight: 'bold',
    color: 'white',
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
});
