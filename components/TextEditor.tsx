import { CanvasElements } from '@/constants/CanvasElement';
import { Fonts } from '@/hooks/useFontManager';
import { MaterialIcons } from '@expo/vector-icons';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  LayoutChangeEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  useWindowDimensions,
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

// Custom hook for text formatting state management
const useTextFormatting = (textElement: CanvasElements.Text) => {
  const [text, setText] = useState(textElement.text || '');
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
  const [lineCount, setLineCount] = useState(1);

  // Direct text change handler without debounce for better responsiveness
  const handleTextChange = useCallback((value: string) => {
    setText(value);
    // Calculate number of lines based on newline characters
    const newLineCount = value.split('\n').length;
    setLineCount(Math.max(1, newLineCount)); // Ensure at least 1 line
  }, []);

  const decreaseFontSize = useCallback(() => {
    setFontSize(prevSize => Math.max(8, prevSize - 2));
  }, []);

  const increaseFontSize = useCallback(() => {
    setFontSize(prevSize => Math.min(72, prevSize + 2));
  }, []);

  const toggleBold = useCallback(() => setIsBold(prev => !prev), []);
  const toggleItalic = useCallback(() => setIsItalic(prev => !prev), []);

  const onColorChangeWorklet = useCallback((color: { hex: string }) => {
    'worklet';
    animatedCurrentColor.value = color.hex;
  }, []);

  const onColorChangeCompleteJS = useCallback((color: { hex: string }) => {
    setCurrentColor(color.hex);
  }, []);

  // Optimize placeholder color calculation with useMemo and improved logic
  const placeholderTextColor = useMemo(() => {
    // Parse once and store RGB values
    const r = parseInt(currentColor.slice(1, 3), 16);
    const g = parseInt(currentColor.slice(3, 5), 16);
    const b = parseInt(currentColor.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, 0.5)`;
  }, [currentColor]);

  const updatedTextElement = useMemo(
    (): CanvasElements.Text => ({
      ...textElement,
      text,
      fontSize,
      fontFamily,
      fontWeight: isBold ? 'bold' : 'normal',
      fontStyle: isItalic ? 'italic' : ('normal' as 'italic' | 'normal'),
      color: currentColor,
    }),
    [textElement, text, fontSize, fontFamily, isBold, isItalic, currentColor]
  );

  return {
    text,
    fontSize,
    fontFamily,
    isBold,
    isItalic,
    currentColor,
    animatedCurrentColor,
    lineCount,
    handleTextChange,
    decreaseFontSize,
    increaseFontSize,
    toggleBold,
    toggleItalic,
    onColorChangeWorklet,
    onColorChangeCompleteJS,
    placeholderTextColor,
    setFontFamily,
    updatedTextElement,
  };
};

// Custom hook for layout management
const useEditorLayout = (position: { x: number; y: number }) => {
  const [inputHeight, setInputHeight] = useState<number>(0);
  const [toolbarHeight, setToolbarHeight] = useState<number>(0);
  const [availableSpace, setAvailableSpace] = useState<{
    above: number;
    below: number;
  }>({ above: 0, below: 0 });
  const [toolbarPosition, setToolbarPosition] = useState<
    'top' | 'bottom' | null
  >(null);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [colorPickerVisible, setColorPickerVisible] = useState<boolean>(false);
  const [fontPickerVisible, setFontPickerVisible] = useState<boolean>(false);
  const [fontButtonLayout, setFontButtonLayout] = useState<{
    x: number;
    y: number;
    width: number;
  }>({ x: 0, y: 0, width: 0 });

  const toolbarRef = useRef<View>(null);
  const inputRef = useRef<View>(null);
  const fontButtonRef = useRef<View>(null);

  // Use the built-in hook instead of manually creating a memo
  const { height: screenHeight } = useWindowDimensions();

  useEffect(() => {
    if (initialized && toolbarHeight > 0) {
      const spaceAbove = position.y;
      const spaceBelow = screenHeight - position.y;

      setAvailableSpace({
        above: spaceAbove,
        below: spaceBelow,
      });

      // Decide toolbar position based on available space
      setToolbarPosition(spaceAbove >= toolbarHeight + 20 ? 'top' : 'bottom');
    }
  }, [position.y, toolbarHeight, screenHeight, initialized]);

  const handleToolbarLayout = useCallback((event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    setToolbarHeight(height);
    setInitialized(true);
  }, []);

  const handleInputLayout = useCallback((event: LayoutChangeEvent) => {
    setInputHeight(event.nativeEvent.layout.height);
  }, []);

  // Add a content size change handler for more responsive height updates
  const handleContentSizeChange = useCallback(
    (_width: number, height: number) => {
      setInputHeight(height);
    },
    []
  );

  const handleFontButtonLayout = useCallback((event: LayoutChangeEvent) => {
    const { x, y, width } = event.nativeEvent.layout;
    setFontButtonLayout({ x, y, width });
  }, []);

  const toggleFontPicker = useCallback(() => {
    setFontPickerVisible(prev => !prev);
    setColorPickerVisible(false);
  }, []);

  const toggleColorPicker = useCallback(() => {
    setColorPickerVisible(prev => !prev);
    setFontPickerVisible(false);
  }, []);

  // Memoize toolbar position style to reduce calculations
  const toolbarPositionStyle = useMemo(() => {
    if (toolbarPosition === 'top') {
      return { bottom: inputHeight + 10 };
    } else if (toolbarPosition === 'bottom') {
      return { top: inputHeight + 10 };
    }
    return { top: -1000 }; // Hidden off-screen while measuring
  }, [toolbarPosition, inputHeight]);

  const getToolbarPositionStyle = useCallback(() => {
    return toolbarPositionStyle;
  }, [toolbarPositionStyle]);

  // Determine font picker position - always open to bottom
  const getFontPickerPosition = useCallback(() => {
    return {
      top: fontButtonLayout.y - 58,
      left: fontButtonLayout.x,
    };
  }, [fontButtonLayout.x, fontButtonLayout.y]);

  // Determine color picker position
  const getColorPickerPosition = useCallback(() => {
    if (toolbarPosition === 'top') {
      return availableSpace.above > 350
        ? { bottom: toolbarHeight + inputHeight + 20 }
        : { top: inputHeight + 10 };
    } else {
      return availableSpace.above > 350
        ? { bottom: inputHeight + toolbarHeight + 15 }
        : { top: inputHeight + toolbarHeight + 15 };
    }
  }, [toolbarPosition, availableSpace, inputHeight, toolbarHeight]);

  return {
    toolbarHeight,
    toolbarPosition,
    initialized,
    colorPickerVisible,
    fontPickerVisible,
    toolbarRef,
    inputRef,
    fontButtonRef,
    handleToolbarLayout,
    handleInputLayout,
    handleFontButtonLayout,
    toggleFontPicker,
    toggleColorPicker,
    getToolbarPositionStyle,
    getFontPickerPosition,
    getColorPickerPosition,
    handleContentSizeChange,
  };
};

// Font Picker Component
const FontPicker = React.memo(
  ({
    isVisible,
    position,
    currentFont,
    onSelectFont,
  }: {
    isVisible: boolean;
    position: any;
    currentFont: string;
    onSelectFont: (font: string) => void;
  }) => {
    const isDark = useColorScheme() === 'dark';
    if (!isVisible) return null;

    return (
      <ThemedView
        style={[styles.dropdownContainer, position]}
        lightColor="#FFFFFF"
        darkColor="#333333"
      >
        <ScrollView style={styles.fontListContainer}>
          {Fonts.map(font => (
            <TouchableOpacity
              key={font}
              style={[
                styles.fontOption,
                currentFont === font && styles.selectedFontOption,
              ]}
              onPress={() => onSelectFont(font)}
            >
              <Text
                style={[
                  styles.fontOptionText,
                  { fontFamily: font },
                  isDark ? styles.textDark : styles.textLight,
                  currentFont === font && styles.selectedFontText,
                ]}
              >
                {font}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ThemedView>
    );
  }
);

// Color Picker Component
const ColorPickerPanel = React.memo(
  ({
    isVisible,
    position,
    currentColor,
    onChange,
    onComplete,
  }: {
    isVisible: boolean;
    position: any;
    currentColor: string;
    onChange: any;
    onComplete: any;
  }) => {
    const isDark = useColorScheme() === 'dark';

    if (!isVisible) return null;

    return (
      <ThemedView
        style={[styles.colorPickerContainer, position]}
        lightColor="#FFFFFF"
        darkColor="#333333"
      >
        <ColorPicker
          value={currentColor}
          onChange={onChange}
          onCompleteJS={onComplete}
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
    );
  }
);

const TextEditor: React.FC<TextEditorProps> = React.memo(
  ({ textElement, position, onBlur, onCreate, onTextChange }) => {
    const isDark = useColorScheme() === 'dark';

    // Use custom hooks to manage state and logic
    const {
      text,
      fontSize,
      fontFamily,
      isBold,
      isItalic,
      currentColor,
      animatedCurrentColor,
      lineCount,
      handleTextChange,
      decreaseFontSize,
      increaseFontSize,
      toggleBold,
      toggleItalic,
      onColorChangeWorklet,
      onColorChangeCompleteJS,
      placeholderTextColor,
      setFontFamily,
      updatedTextElement,
    } = useTextFormatting(textElement);

    const {
      toolbarPosition,
      initialized,
      colorPickerVisible,
      fontPickerVisible,
      toolbarRef,
      inputRef,
      fontButtonRef,
      handleToolbarLayout,
      handleInputLayout,
      handleFontButtonLayout,
      toggleFontPicker,
      toggleColorPicker,
      getToolbarPositionStyle,
      getFontPickerPosition,
      getColorPickerPosition,
      handleContentSizeChange,
    } = useEditorLayout(position);

    // Call onTextChange with updated text element with appropriate dependencies
    useEffect(() => {
      if (onTextChange && text.trim()) {
        onTextChange(updatedTextElement);
      }
    }, [updatedTextElement, onTextChange, text]);

    // Handle submit - create or blur
    const handleSubmit = useCallback(() => {
      const trimmedText = text.trim();
      if (trimmedText && onCreate) {
        const trimmedElement = {
          ...updatedTextElement,
          text: trimmedText,
        };
        onCreate(trimmedElement);
      }

      if (onBlur) {
        onBlur();
      }
    }, [text, onCreate, onBlur, updatedTextElement]);

    // Memoize animated styles
    const animatedInputStyle = useAnimatedStyle(
      () => ({
        color: animatedCurrentColor.value,
      }),
      []
    );

    const animatedColorIndicatorStyle = useAnimatedStyle(
      () => ({
        backgroundColor: animatedCurrentColor.value,
      }),
      []
    );

    // Font selection callback
    const selectFontFamily = useCallback(
      (font: string) => {
        setFontFamily(font);
        // Close the font picker after selection
        if (fontPickerVisible) {
          toggleFontPicker();
        }
      },
      [setFontFamily, fontPickerVisible, toggleFontPicker]
    );

    return (
      <View style={styles.editorContainer}>
        <View
          style={[styles.editorWrapper, { left: position.x, top: position.y }]}
        >
          {/* Text Input Field */}
          <View
            ref={inputRef}
            style={styles.textInputContainer}
            onLayout={handleInputLayout}
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
              onChangeText={handleTextChange}
              placeholder="Enter text here"
              placeholderTextColor={placeholderTextColor}
              multiline={true}
              numberOfLines={lineCount}
              onContentSizeChange={e => {
                handleContentSizeChange(
                  e.nativeEvent.contentSize.width,
                  e.nativeEvent.contentSize.height
                );
              }}
            />
          </View>

          {/* Formatting Toolbar */}
          <View
            ref={toolbarRef}
            onLayout={handleToolbarLayout}
            style={[
              styles.toolbar,
              isDark ? styles.toolbarDark : styles.toolbarLight,
              getToolbarPositionStyle(),
            ]}
          >
            {/* First toolbar row */}
            <View style={styles.toolbarRow}>
              <TouchableOpacity
                ref={fontButtonRef}
                onLayout={handleFontButtonLayout}
                style={[
                  styles.fontFamilyButton,
                  fontPickerVisible && styles.activeButton,
                ]}
                onPress={toggleFontPicker}
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
                onPress={decreaseFontSize}
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
                onPress={increaseFontSize}
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
                onPress={toggleColorPicker}
                activeOpacity={0.7}
              >
                <Animated.View
                  style={[styles.colorIndicator, animatedColorIndicatorStyle]}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, isBold && styles.activeButton]}
                onPress={toggleBold}
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
                onPress={toggleItalic}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="format-italic"
                  size={20}
                  color={isItalic ? '#007AFF' : isDark ? '#fff' : '#333'}
                />
              </TouchableOpacity>

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
          <FontPicker
            isVisible={
              fontPickerVisible && initialized && toolbarPosition !== null
            }
            position={getFontPickerPosition()}
            currentFont={fontFamily}
            onSelectFont={selectFontFamily}
          />

          {/* Color picker */}
          <ColorPickerPanel
            isVisible={
              colorPickerVisible && initialized && toolbarPosition !== null
            }
            position={getColorPickerPosition()}
            currentColor={currentColor}
            onChange={onColorChangeWorklet}
            onComplete={onColorChangeCompleteJS}
          />
        </View>
      </View>
    );
  }
);

// Styles remain unchanged
const styles = StyleSheet.create({
  editorContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    pointerEvents: 'box-none',
    overflow: 'hidden',
  },
  editorWrapper: {
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'baseline',
    width: '100%',
  },
  textInputContainer: {
    minWidth: 100,
    width: '100%',
  },
  input: {
    outline: 'none',
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none',
    }),
    minWidth: '10%',
  },
  toolbar: {
    position: 'absolute',
    borderRadius: 8,
    padding: 6,
    flexDirection: 'column',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 5,
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    flexWrap: 'wrap',
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
