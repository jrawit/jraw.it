import AntDesign from '@expo/vector-icons/AntDesign';
import Slider from '@react-native-community/slider';
import React, { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
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
import { ToolData, Tools } from '../constants/Tools';
import { ThemedView } from './ThemedView';

import { Easing, withTiming } from 'react-native-reanimated';

type ToolbarProps = {
  tool: Tools;
  onToolChange: (tool: Tools) => void;
  onStrokeWidthChange: (strokeWidth: number) => void;
  onColorChange: (color: string) => void;
  isDrawing?: boolean; // Add this prop to detect drawing state
};

const Toolbar: React.FC<ToolbarProps> = ({
  tool,
  onToolChange,
  onStrokeWidthChange,
  onColorChange,
  isDrawing = false,
}) => {
  const colorScheme = useColorScheme();
  // Add this with your existing shared values
  const collapsed = useSharedValue(false);

  // Toggle handler
  const toggleCollapse = () => {
    collapsed.value = !collapsed.value;
    setIsCollapsed(!isCollapsed); // <- This updates the icon
  };

  const [isCollapsed, setIsCollapsed] = useState(false);

  // Animation style
  const collapsibleStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scaleY: withTiming(collapsed.value ? 0 : 1, {
            duration: 300,
            easing: Easing.out(Easing.quad),
          }),
        },
      ],
      opacity: withTiming(collapsed.value ? 0 : 1, {
        duration: 300,
      }),
      overflow: 'hidden',
    };
  });
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  // React state for initial color
  const [initialColor, setInitialColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(3);

  // Shared value for animations
  const selectedColor = useSharedValue(initialColor);

  // Effect to hide color picker when drawing starts
  useEffect(() => {
    if (isDrawing && colorPickerVisible) {
      setColorPickerVisible(false);
    }
  }, [isDrawing, colorPickerVisible]);

  const colorButtonStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: selectedColor.value,
      width: 50,
      height: 50,
      borderRadius: 50,
    };
  });

  return (
    <>
      <ThemedView style={styles.container}>
        <TouchableOpacity
          onPress={toggleCollapse}
          style={{ bottom: 4, zIndex: 2 }}
        >
          <Animated.View
            style={{
              padding: 10,
              backgroundColor: '#007AFF',
              borderRadius: 30,
            }}
          >
            {isCollapsed ? (
              <AntDesign name="up" size={24} color="black" />
            ) : (
              <AntDesign name="down" size={24} color="black" />
            )}
          </Animated.View>
        </TouchableOpacity>
        <Animated.View style={[styles.toolsContainer, collapsibleStyle]}>
          <View style={styles.toolsContainer}>
            {Object.entries(ToolData).map(
              ([toolType, { iconComponent: IconComponent, iconName }]) => {
                return (
                  <TouchableOpacity
                    key={toolType}
                    onPress={() => onToolChange(toolType as Tools)}
                    style={[
                      styles.button,
                      tool === toolType && styles.activeButton,
                    ]}
                  >
                    <IconComponent
                      name={iconName}
                      size={24}
                      color={tool === toolType ? 'white' : 'black'}
                    />
                  </TouchableOpacity>
                );
              }
            )}
            {colorPickerVisible ? (
              <ColorPicker
                style={{
                  ...styles.pickerContainer,
                  backgroundColor: colorScheme === 'dark' ? '#333' : 'white',
                }}
                value={initialColor}
                sliderThickness={25}
                thumbSize={24}
                thumbShape="circle"
                onComplete={(color: ColorFormatsObject) => {
                  'worklet';
                  selectedColor.value = color.hex;
                }}
                onCompleteJS={(color: ColorFormatsObject) => {
                  setInitialColor(color.hex);
                  onColorChange(color.hex);
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
            ) : null}

            <Pressable
              onPress={() => setColorPickerVisible(!colorPickerVisible)}
            >
              <Animated.View style={colorButtonStyle} />
            </Pressable>

            <View style={styles.sliderContainer}>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={100}
                step={1}
                value={strokeWidth}
                onSlidingComplete={value => {
                  setStrokeWidth(value);
                  onStrokeWidthChange(value);
                }}
                minimumTrackTintColor="#007AFF"
                thumbTintColor="#007AFF"
                maximumTrackTintColor="#D3D3D3"
              />
            </View>
          </View>
        </Animated.View>
      </ThemedView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
    position: 'absolute',
    bottom: '2%',
    justifyContent: 'center',
    backgroundColor: 'F0F0F0', // dont change this, important for the design
  },
  toolsContainer: {
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#323336',
    position: 'relative',
    marginTop: 0,
    marginRight: 'auto',
    marginBottom: 0,
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    gap: 8,
  },
  button: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 14,
    borderRadius: 50,
    marginVertical: 5,
    elevation: 3,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
  },
  activeButton: {
    backgroundColor: '#007AFF',
  },
  sliderContainer: {
    width: 120,
    marginVertical: 10,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  pickerContainer: {
    alignSelf: 'center',
    width: 300,
    padding: 20,
    borderRadius: 20,
    boxShadow: '0px 5px 6.27px rgba(0, 0, 0, 0.34)',
    elevation: 10,
    position: 'absolute',
    bottom: 100,
    right: 10,
    zIndex: 1,
  },
  panelStyle: {
    borderRadius: 16,
    boxShadow: '0px 2px 3.84px rgba(0, 0, 0, 0.25)',
    elevation: 5,
  },
  sliderStyle: {
    borderRadius: 20,
    marginTop: 20,
    boxShadow: '0px 2px 3.84px rgba(0, 0, 0, 0.25)',
    elevation: 5,
  },
  previewTxtContainer: {
    paddingTop: 20,
    marginTop: 20,
    borderTopWidth: 1,
    borderColor: '#bebdbe',
  },
});

export default Toolbar;
