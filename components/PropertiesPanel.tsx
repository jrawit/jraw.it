import { ThemedView } from '@/components/ThemedView';
import { CanvasElements } from '@/constants/CanvasElement';
import { Tools } from '@/constants/Tools';
import { CanvasElement } from '@/hooks/useCanvas';
import { Slider } from '@miblanchard/react-native-slider';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import ColorPicker, {
  BrightnessSlider,
  ColorFormatsObject,
  InputWidget,
  OpacitySlider,
  Panel2,
} from 'reanimated-color-picker';
import { ThemedText } from './ThemedText';

interface PropertiesPanelProps {
  selectedElements: CanvasElement[];
  modifyElement: (id: string, newElement: CanvasElements.Any) => void;
  style?: StyleProp<ViewStyle>;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedElements,
  modifyElement,
  style,
}) => {
  const selectedElement = selectedElements[0];
  const element = selectedElement?.element;

  // Initialize all hooks at the top, regardless of early returns
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [fontSize, setFontSize] = useState<number>(20);
  const [textContent, setTextContent] = useState<string>('');
  const [spikes, setSpikes] = useState<number>(5);

  // --- Color Logic ---
  const editingColorProperty = useRef<
    'strokeColor' | 'fillColor' | 'color' | null
  >(null);
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [previewColor, setPreviewColor] = useState<string | null>(null);

  // Determine base colors based on element type and properties
  const getBaseColor = useCallback(
    (prop: 'strokeColor' | 'fillColor' | 'color'): string => {
      if (!element) return prop === 'fillColor' ? '#FFFFFF00' : '#000000';
      if (prop === 'color' && 'color' in element)
        return element.color ?? '#000000';
      if (prop === 'strokeColor' && 'strokeColor' in element)
        return element.strokeColor ?? '#000000';
      if (prop === 'fillColor' && 'fillColor' in element)
        return element.fillColor ?? '#FFFFFF00'; // Default to transparent white
      // Fallbacks
      if (prop === 'strokeColor' || prop === 'color') return '#000000';
      return '#FFFFFF00';
    },
    [element]
  );

  const baseStrokeColor = getBaseColor('strokeColor');
  const baseFillColor = getBaseColor('fillColor');
  const baseTextColor = getBaseColor('color');

  const animatedStrokeColor = useSharedValue(baseStrokeColor);
  const animatedFillColor = useSharedValue(baseFillColor);
  const animatedTextColor = useSharedValue(baseTextColor);

  // --- Effects for updating state and animations ---
  useEffect(() => {
    if (!element) return;
    // Update local state when selected element changes
    setStrokeWidth(
      (element && 'strokeWidth' in element ? element.strokeWidth : 3) ?? 3
    );
    setFontSize(
      (element && 'fontSize' in element ? element.fontSize : 20) ?? 20
    );
    setTextContent((element && 'text' in element ? element.text : '') ?? '');
    setSpikes((element && 'spikes' in element ? element.spikes : 5) ?? 5);

    // Update base colors and animations if picker is closed
    if (!colorPickerVisible) {
      const newBaseStroke = getBaseColor('strokeColor');
      const newBaseFill = getBaseColor('fillColor');
      const newBaseText = getBaseColor('color');
      animatedStrokeColor.value = withTiming(newBaseStroke);
      animatedFillColor.value = withTiming(newBaseFill);
      animatedTextColor.value = withTiming(newBaseText);
    }
  }, [
    selectedElement,
    colorPickerVisible,
    animatedFillColor,
    animatedStrokeColor,
    animatedTextColor,
    element,
    getBaseColor,
  ]);

  // Update stroke color animation
  useEffect(() => {
    let targetColor: string;
    if (
      colorPickerVisible &&
      editingColorProperty.current === 'strokeColor' &&
      previewColor
    ) {
      targetColor = previewColor;
    } else {
      targetColor = getBaseColor('strokeColor');
    }
    animatedStrokeColor.value = targetColor;
  }, [
    previewColor,
    element,
    colorPickerVisible,
    animatedStrokeColor,
    getBaseColor,
  ]);

  // Update fill color animation
  useEffect(() => {
    let targetColor: string;
    if (
      colorPickerVisible &&
      editingColorProperty.current === 'fillColor' &&
      previewColor
    ) {
      targetColor = previewColor;
    } else {
      targetColor = getBaseColor('fillColor');
    }
    animatedFillColor.value = targetColor;
  }, [
    previewColor,
    element,
    colorPickerVisible,
    animatedFillColor,
    getBaseColor,
  ]);

  // Update text color animation
  useEffect(() => {
    let targetColor: string;
    if (
      colorPickerVisible &&
      editingColorProperty.current === 'color' &&
      previewColor
    ) {
      targetColor = previewColor;
    } else {
      targetColor = getBaseColor('color');
    }
    animatedTextColor.value = targetColor;
  }, [
    previewColor,
    element,
    colorPickerVisible,
    animatedTextColor,
    getBaseColor,
  ]);

  // --- Handlers ---
  const handlePropertyChange = useCallback(
    (property: any, value: any) => {
      if (!selectedElement || !element) return;
      modifyElement(selectedElement.id, {
        ...element,
        [property]: value,
      });
    },
    [modifyElement, selectedElement, element]
  );

  const handleColorComplete = useCallback(
    (colorObj: ColorFormatsObject) => {
      if (editingColorProperty.current) {
        handlePropertyChange(editingColorProperty.current, colorObj.hex);
      }
    },
    [handlePropertyChange]
  );

  const handleColorPreview = useCallback((colorObj: ColorFormatsObject) => {
    'worklet';
    runOnJS(setPreviewColor)(colorObj.hex);
  }, []);

  const openColorPicker = (property: 'strokeColor' | 'fillColor' | 'color') => {
    // If the picker is already visible and the same property button is clicked, close it.
    if (colorPickerVisible && editingColorProperty.current === property) {
      setColorPickerVisible(false);
      editingColorProperty.current = null; // Reset the editing property
      return;
    }

    // Otherwise, open/switch the picker
    editingColorProperty.current = property;
    const initialColor = getBaseColor(property);
    setPreviewColor(initialColor);
    // Update shared value immediately for picker initial value
    if (property === 'strokeColor') animatedStrokeColor.value = initialColor;
    else if (property === 'fillColor') animatedFillColor.value = initialColor;
    else if (property === 'color') animatedTextColor.value = initialColor;
    setColorPickerVisible(true);
  };

  // --- Animated Styles ---
  const strokeAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: animatedStrokeColor.value,
  }));
  const fillAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: animatedFillColor.value,
  }));
  const textAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: animatedTextColor.value,
  }));

  // Early returns after all hooks have been called
  if (!selectedElement) return null;
  if (!element) return null;
  if (selectedElements.length !== 1) return null;
  if (
    selectedElements[0].tool === Tools.IMAGE ||
    selectedElements[0].tool === Tools.EMOJI
  )
    return null;

  const tool = selectedElement.tool;

  // --- Conditional Property Checks ---
  const hasStrokeWidth =
    tool === Tools.PEN ||
    tool === Tools.HIGHLIGHTER ||
    tool === Tools.LINE ||
    tool === Tools.RECTANGLE ||
    tool === Tools.CIRCLE ||
    tool === Tools.TRIANGLE ||
    tool === Tools.STAR;
  const hasFillColor =
    tool === Tools.RECTANGLE ||
    tool === Tools.CIRCLE ||
    tool === Tools.TRIANGLE ||
    tool === Tools.STAR;
  const hasFontSize = tool === Tools.TEXT;
  const hasTextContent = tool === Tools.TEXT;
  const hasSpikes = tool === Tools.STAR;
  const hasTextColor = tool === Tools.TEXT;
  return (
    <>
      <ThemedView
        style={[styles.panelContainer, style]}
        lightColor="#F9FAFB"
        darkColor="#323336"
      >
        {/* --- Stroke Color --- */}
        {hasStrokeWidth && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle} type="defaultSemiBold">
              Stroke Color
            </ThemedText>
            <Pressable onPress={() => openColorPicker('strokeColor')}>
              <Animated.View style={[styles.colorButton, strokeAnimatedStyle]}>
                <ThemedText style={styles.colorButtonText}>
                  {colorPickerVisible &&
                  editingColorProperty.current === 'strokeColor' &&
                  previewColor
                    ? previewColor
                    : baseStrokeColor}
                </ThemedText>
              </Animated.View>
            </Pressable>
          </View>
        )}

        {/* --- Fill Color --- */}
        {hasFillColor && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle} type="defaultSemiBold">
              Fill Color
            </ThemedText>
            <Pressable onPress={() => openColorPicker('fillColor')}>
              <Animated.View style={[styles.colorButton, fillAnimatedStyle]}>
                <ThemedText style={styles.colorButtonText}>
                  {colorPickerVisible &&
                  editingColorProperty.current === 'fillColor' &&
                  previewColor
                    ? previewColor
                    : baseFillColor}
                </ThemedText>
              </Animated.View>
            </Pressable>
          </View>
        )}

        {/* --- Text Color --- */}
        {hasTextColor && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle} type="defaultSemiBold">
              Text Color
            </ThemedText>
            <Pressable onPress={() => openColorPicker('color')}>
              <Animated.View style={[styles.colorButton, textAnimatedStyle]}>
                <ThemedText style={styles.colorButtonText}>
                  {colorPickerVisible &&
                  editingColorProperty.current === 'color' &&
                  previewColor
                    ? previewColor
                    : baseTextColor}
                </ThemedText>
              </Animated.View>
            </Pressable>
          </View>
        )}

        {/* --- Stroke Width --- */}
        {hasStrokeWidth && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle} type="defaultSemiBold">
              Stroke Width: {strokeWidth.toFixed(0)}
            </ThemedText>
            <Slider
              minimumValue={1}
              maximumValue={50} // Adjust max as needed
              step={1}
              value={strokeWidth}
              onValueChange={value => {
                setStrokeWidth(value[0]);
              }}
              onSlidingComplete={value => {
                handlePropertyChange('strokeWidth', value[0]);
              }}
              minimumTrackTintColor="#007AFF"
              thumbTintColor="#007AFF"
              maximumTrackTintColor="#D3D3D3"
            />
          </View>
        )}

        {/* --- Font Size --- */}
        {hasFontSize && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle} type="defaultSemiBold">
              Font Size: {fontSize.toFixed(0)}
            </ThemedText>
            <Slider
              minimumValue={8}
              maximumValue={80}
              step={1}
              value={fontSize}
              onValueChange={value => {
                setFontSize(value[0]);
              }}
              onSlidingComplete={value =>
                handlePropertyChange('fontSize', value[0])
              }
              minimumTrackTintColor="#007AFF"
              thumbTintColor="#007AFF"
              maximumTrackTintColor="#D3D3D3"
            />
          </View>
        )}

        {/* --- Text Content --- */}
        {hasTextContent && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle} type="defaultSemiBold">
              Text
            </ThemedText>
            <TextInput
              style={styles.textInput}
              value={textContent}
              onChangeText={setTextContent}
              onBlur={() => {
                handlePropertyChange('text', textContent);
              }}
              multiline
            />
          </View>
        )}

        {/* --- Spikes (for Star) --- */}
        {hasSpikes && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle} type="defaultSemiBold">
              Spikes: {spikes.toFixed(0)}
            </ThemedText>
            <Slider
              minimumValue={3}
              maximumValue={15}
              step={1}
              value={spikes}
              onValueChange={value => {
                setSpikes(value[0]);
              }}
              onSlidingComplete={value =>
                handlePropertyChange('spikes', value[0])
              }
              minimumTrackTintColor="#007AFF"
              thumbTintColor="#007AFF"
              maximumTrackTintColor="#D3D3D3"
            />
          </View>
        )}
      </ThemedView>

      {/* --- Color Picker Popover --- */}
      {colorPickerVisible && (
        <ThemedView
          style={[
            styles.pickerPopover,
            {
              top: 110,
              left: 290,
            },
          ]}
          lightColor="#FFFFFF"
          darkColor="#1C1C1E"
        >
          <ColorPicker
            style={styles.pickerContainer}
            value={
              previewColor ??
              getBaseColor(editingColorProperty.current ?? 'strokeColor')
            }
            sliderThickness={20}
            thumbSize={20}
            thumbShape="circle"
            onChange={handleColorPreview}
            onCompleteJS={handleColorComplete}
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
            <ThemedView style={styles.previewTxtContainer}>
              <InputWidget
                inputStyle={{
                  paddingVertical: 2,
                  fontSize: 12,
                  marginLeft: 5,
                }}
              />
            </ThemedView>
          </ColorPicker>
        </ThemedView>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  panelContainer: {
    position: 'absolute',
    top: 110,
    left: 30,
    width: 250,
    borderRadius: 8,
    padding: 15,
    flexDirection: 'column',
    alignItems: 'stretch',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 20,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    marginBottom: 8,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.7,
  },
  colorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 30,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.3)',
  },
  colorButtonText: {
    fontSize: 13,
    color: 'white',
    fontWeight: '500',
  },
  slider: {
    width: '100%',
    height: 30,
  },
  textInput: {
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.3)',
    borderRadius: 6,
    padding: 8,
    minHeight: 60,
    fontSize: 14,
  },
  pickerPopover: {
    position: 'absolute',
    zIndex: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  pickerContainer: {
    width: 220,
    padding: 12,
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
    height: 10,
  },
  previewTxtContainer: {
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.2)',
  },
});

export default PropertiesPanel;
