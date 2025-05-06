import { CanvasElements } from '@/constants/CanvasElement';
import { Fonts } from '@/hooks/useFontManager';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
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
  InputWidget,
  OpacitySlider,
  Panel2,
} from 'reanimated-color-picker';
import { ThemedView } from './ThemedView';

interface TextEditorProps {
  textElement: CanvasElements.Text;
  position: { x: number; y: number };
  onBlur?: () => void;
  onDelete?: () => void;
  onCreate?: (updatedTextElement: CanvasElements.Text) => void;
  onTextChange?: (updatedTextElement: CanvasElements.Text) => void;
}

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const TextEditor: React.FC<TextEditorProps> = ({
  textElement,
  position,
  onBlur,
  onCreate,
  onTextChange,
}) => {
  // Text input state - start empty when creating, or with existing text when editing
  const [text, setText] = useState(textElement.text || '');
  const isDark = useColorScheme() === 'dark';

  // Formatting state
  const [fontSize, setFontSize] = useState<number>(textElement.fontSize);
  const [fontFamily, setFontFamily] = useState<string>(textElement.fontFamily);
  const [isBold, setIsBold] = useState<boolean>(
    textElement.fontWeight === 'bold'
  );
  const [isItalic, setIsItalic] = useState<boolean>(
    textElement.fontStyle === 'italic'
  );
  const [currentColor, setCurrentColor] = useState<string>(textElement.color);
  const animatedCurrentColor = useSharedValue(textElement.color);
  const [colorPickerVisible, setColorPickerVisible] = useState<boolean>(false);
  const [fontPickerVisible, setFontPickerVisible] = useState<boolean>(false);

  useEffect(() => {
    if (onTextChange) {
      const updatedTextElement: CanvasElements.Text = {
        ...textElement,
        text: text,
        fontSize: fontSize,
        fontFamily: fontFamily,
        fontWeight: isBold ? 'bold' : 'normal',
        fontStyle: isItalic ? 'italic' : 'normal',
        color: currentColor,
      };
      onTextChange(updatedTextElement);
    }
  }, [
    text,
    fontSize,
    fontFamily,
    isBold,
    isItalic,
    currentColor,
    onTextChange,
    textElement,
  ]);

  // Handle blur event only when clicking outside the entire editor
  const handleSubmit = () => {
    // For new text elements, only create if there's content and onCreate is provided
    if (text.trim() && onCreate) {
      // Create updated text element with all formatting properties
      const updatedTextElement: CanvasElements.Text = {
        ...textElement,
        text: text,
        fontSize: fontSize,
        fontFamily: fontFamily,
        fontWeight: isBold ? 'bold' : 'normal',
        fontStyle: isItalic ? 'italic' : 'normal',
        color: currentColor,
      };
      onCreate(updatedTextElement);
    }

    // Call the onBlur callback if provided
    if (onBlur) {
      onBlur();
    }
  };

  const animatedInputStyle = useAnimatedStyle(() => {
    return {
      color: animatedCurrentColor.value,
    };
  });

  const animatedColorIndicatorStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: animatedCurrentColor.value,
    };
  });

  return (
    <View style={styles.editorContainer}>
      {/* Wrapper for both toolbar and input */}
      <View
        style={[
          styles.editorWrapper,
          {
            left: position.x,
            top: position.y - 100,
          },
        ]}
      >
        {/* Formatting Toolbar - Above the text */}
        <View
          style={[
            styles.toolbar,
            isDark ? styles.toolbarDark : styles.toolbarLight,
          ]}
        >
          {/* First toolbar row */}
          <View style={styles.toolbarRow}>
            {/* Font Family Dropdown */}
            <TouchableOpacity
              style={[
                styles.fontFamilyButton,
                fontPickerVisible && styles.activeButton,
              ]}
              onPress={() => {
                setFontPickerVisible(prev => !prev);
                if (colorPickerVisible) setColorPickerVisible(false);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.fontFamilyButtonText,
                  isDark ? styles.textDark : styles.textLight,
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {fontFamily}
              </Text>
              <MaterialIcons
                name={fontPickerVisible ? 'arrow-drop-up' : 'arrow-drop-down'}
                size={18}
                color={isDark ? '#fff' : '#333'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={() => setFontSize(prevSize => Math.max(8, prevSize - 2))}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="text-decrease"
                size={18}
                color={isDark ? '#fff' : '#333'}
              />
            </TouchableOpacity>

            <Text
              style={[
                styles.fontSize,
                isDark ? styles.textDark : styles.textLight,
              ]}
            >
              {fontSize}px
            </Text>

            <TouchableOpacity
              style={styles.button}
              onPress={() =>
                setFontSize(prevSize => Math.min(72, prevSize + 2))
              }
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="text-increase"
                size={18}
                color={isDark ? '#fff' : '#333'}
              />
            </TouchableOpacity>
          </View>

          {/* Second toolbar row */}
          <View style={styles.toolbarRow}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                setColorPickerVisible(prev => !prev);
                if (fontPickerVisible) setFontPickerVisible(false);
              }}
              activeOpacity={0.7}
            >
              <Animated.View
                style={[styles.colorIndicator, animatedColorIndicatorStyle]}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, isBold && styles.activeButton]}
              onPress={() => setIsBold(prev => !prev)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="format-bold"
                size={20}
                color={isBold ? '#007AFF' : isDark ? '#fff' : '#333'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, isItalic && styles.activeButton]}
              onPress={() => setIsItalic(prev => !prev)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="format-italic"
                size={20}
                color={isItalic ? '#007AFF' : isDark ? '#fff' : '#333'}
              />
            </TouchableOpacity>

            {/* Submit button */}
            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={handleSubmit}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="check"
                size={20}
                color={isDark ? '#fff' : '#333'}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Font picker dropdown */}
        {fontPickerVisible && (
          <ThemedView
            style={[
              styles.dropdownContainer,
              {
                top: 90, // Position below the two-row toolbar
                left: 0,
              },
            ]}
            lightColor="#FFFFFF"
            darkColor="#333333"
          >
            <ScrollView style={styles.fontListContainer}>
              {Fonts.map(font => (
                <TouchableOpacity
                  key={font}
                  style={[
                    styles.fontOption,
                    fontFamily === font && styles.selectedFontOption,
                  ]}
                  onPress={() => {
                    setFontFamily(font);
                    setFontPickerVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.fontOptionText,
                      { fontFamily: font },
                      isDark ? styles.textDark : styles.textLight,
                      fontFamily === font && styles.selectedFontText,
                    ]}
                  >
                    {font}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </ThemedView>
        )}

        {/* Color picker - floating above the toolbar */}
        {colorPickerVisible && (
          <ThemedView
            style={[
              styles.colorPickerContainer,
              {
                top: -300, // Position above the toolbar instead of below
                left: 60, // Center it better relative to the color button
              },
            ]}
            lightColor="#FFFFFF"
            darkColor="#333333"
          >
            <ColorPicker
              value={currentColor}
              onChange={color => {
                'worklet';
                animatedCurrentColor.value = color.hex;
              }}
              onCompleteJS={color => {
                setCurrentColor(color.hex);
                animatedCurrentColor.value = color.hex;
              }}
              sliderThickness={20}
              thumbSize={20}
              thumbShape="circle"
              adaptSpectrum
              boundedThumb
            >
              <Panel2
                style={styles.colorPanel}
                thumbShape="ring"
                reverseVerticalChannel
              />
              <BrightnessSlider style={styles.slider} />
              <OpacitySlider style={styles.slider} />
              <View style={styles.previewTxtContainer}>
                <InputWidget
                  containerStyle={{ width: '100%', maxWidth: 200 }}
                  inputStyle={{
                    paddingVertical: 2,
                    fontSize: 12,
                    marginLeft: 5,
                    color: isDark ? '#FFFFFF' : '#000000',
                  }}
                  iconColor={isDark ? '#FFFFFF' : '#707070'}
                />
              </View>
            </ColorPicker>
          </ThemedView>
        )}

        {/* Text Input Field */}
        <View
          style={[
            styles.textInputContainer,
            {
              marginTop: 10,
            },
          ]}
        >
          <AnimatedTextInput
            allowFontScaling={false}
            autoCapitalize="none"
            autoComplete="off"
            autoFocus
            style={[
              styles.input,
              {
                fontSize: fontSize,
                fontFamily: fontFamily,
                fontWeight: isBold ? 'bold' : 'normal',
                fontStyle: isItalic ? 'italic' : 'normal',
                backgroundColor: 'transparent',
              },
              animatedInputStyle,
            ]}
            value={text}
            onChangeText={(value: string) => setText(value)}
            placeholder="Enter text here"
            placeholderTextColor={`rgba(${parseInt(currentColor.slice(1, 3), 16)}, ${parseInt(
              currentColor.slice(3, 5),
              16
            )}, ${parseInt(currentColor.slice(5, 7), 16)}, 0.5)`}
            multiline={true}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  editorContainer: {
    position: 'absolute',
    zIndex: 1000,
    width: '100%',
    height: '100%',
    pointerEvents: 'box-none',
  },
  editorWrapper: {
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'baseline',
  },
  textInputContainer: {
    minWidth: 100,
  },
  input: {
    minHeight: 30,
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none',
    }),
  },
  toolbar: {
    borderRadius: 8,
    padding: 6,
    flexDirection: 'column', // Changed from row to column for two rows
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  toolbarLight: {
    backgroundColor: 'white',
    borderColor: '#E5E7EB',
    shadowColor: '#000',
  },
  toolbarDark: {
    backgroundColor: '#333',
    borderColor: '#555',
    shadowColor: '#000',
  },
  textLight: {
    color: '#333',
  },
  textDark: {
    color: '#fff',
  },
  button: {
    padding: 6,
    borderRadius: 4,
    marginHorizontal: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  fontSize: {
    minWidth: 30,
    textAlign: 'center',
    fontSize: 14,
    marginHorizontal: 4,
  },
  colorIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  submitButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  colorPickerContainer: {
    position: 'absolute',
    left: 0,
    padding: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  colorPanel: {
    width: 220,
    height: 150,
    borderRadius: 8,
  },
  slider: {
    marginTop: 10,
    height: 20,
    borderRadius: 8,
  },
  previewTxtContainer: {
    marginTop: 10,
    width: '100%',
    maxWidth: 220,
    flexDirection: 'row', // Helps control layout when switching between color formats
    flexWrap: 'wrap', // Allows inputs to wrap if they exceed container width
  },
  fontFamilyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  fontFamilyButtonText: {
    fontSize: 14,
    maxWidth: 80,
  },
  dropdownContainer: {
    position: 'absolute',
    width: 160,
    maxHeight: 200,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  fontListContainer: {
    maxHeight: 200,
  },
  fontOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  selectedFontOption: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  fontOptionText: {
    fontSize: 14,
  },
  selectedFontText: {
    fontWeight: '500',
    color: '#007AFF',
  },
});

export default TextEditor;
