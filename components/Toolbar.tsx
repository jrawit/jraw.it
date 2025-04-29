import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'; // Import for shape icon
import Slider from '@react-native-community/slider';
import React, { useEffect, useState } from 'react';
import {
  Modal, // Import Modal
  Pressable,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import Animated, {
  Easing,
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
import { ToolData, Tools } from '../constants/Tools';
import { ThemedText } from './ThemedText'; // Import ThemedText if needed for Modal title
import { ThemedView } from './ThemedView';

// Define the shape tools
const shapeTools = [
  Tools.LINE,
  Tools.CIRCLE,
  Tools.RECTANGLE,
  Tools.TRIANGLE,
  Tools.STAR,
];

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
  const collapsed = useSharedValue(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [shapeSelectorVisible, setShapeSelectorVisible] = useState(false); // State for shape selector modal
  const [initialColor, setInitialColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const selectedColor = useSharedValue(initialColor);

  // Toggle handler
  const toggleCollapse = () => {
    collapsed.value = !collapsed.value;
    setIsCollapsed(!isCollapsed);
  };

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
      height: withTiming(collapsed.value ? 0 : 100, {
        duration: 300,
        easing: Easing.out(Easing.quad),
      }),
      opacity: withTiming(collapsed.value ? 0 : 1, {
        duration: 300,
      }),
      overflow: 'hidden',
    };
  });

  // Effect to hide color picker when drawing starts
  useEffect(() => {
    if (isDrawing && (colorPickerVisible || shapeSelectorVisible)) {
      setColorPickerVisible(false);
      setShapeSelectorVisible(false); // Close shape selector too
    }
  }, [isDrawing, colorPickerVisible, shapeSelectorVisible]);

  const colorButtonStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: selectedColor.value,
      width: 50,
      height: 50,
      borderRadius: 50,
    };
  });

  const handleShapeSelect = (selectedShapeTool: Tools) => {
    onToolChange(selectedShapeTool);
    setShapeSelectorVisible(false);
  };

  // Determine if the current tool is one of the shapes
  const isShapeToolActive = shapeTools.includes(tool);

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
            {Object.entries(ToolData)
              .filter(([toolType]) => !shapeTools.includes(toolType as Tools)) // Filter out shape tools
              .map(([toolType, { iconComponent: IconComponent, iconName }]) => {
                const currentToolType = toolType as Tools;
                return (
                  <TouchableOpacity
                    key={toolType}
                    onPress={() => onToolChange(currentToolType)}
                    style={[
                      styles.button,
                      tool === currentToolType && styles.activeButton,
                    ]}
                  >
                    <IconComponent
                      name={iconName}
                      size={24}
                      color={tool === currentToolType ? 'white' : 'black'}
                    />
                  </TouchableOpacity>
                );
              })}

            {/* Combined Shapes Button */}
            <TouchableOpacity
              onPress={() => setShapeSelectorVisible(true)}
              style={[styles.button, isShapeToolActive && styles.activeButton]}
            >
              {/* Use the icon of the currently selected shape or a default */}
              {isShapeToolActive && ToolData[tool] ? (
                React.createElement(ToolData[tool].iconComponent, {
                  name: ToolData[tool].iconName,
                  size: 24,
                  color: 'white',
                })
              ) : (
                <MaterialCommunityIcons
                  name="shape-outline"
                  size={24}
                  color={'black'}
                />
              )}
            </TouchableOpacity>

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

      {/* Shape Selector Modal */}
      <Modal
        transparent={true}
        visible={shapeSelectorVisible}
        animationType="fade"
        onRequestClose={() => setShapeSelectorVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShapeSelectorVisible(false)} // Close on overlay press
        >
          <ThemedView style={styles.shapeSelectorModalContent}>
            <ThemedText style={styles.modalTitle}>Select Shape</ThemedText>
            <View style={styles.shapeSelectorGrid}>
              {shapeTools.map(shapeToolType => {
                const { iconComponent: IconComponent, iconName } =
                  ToolData[shapeToolType];
                return (
                  <TouchableOpacity
                    key={shapeToolType}
                    onPress={() => handleShapeSelect(shapeToolType)}
                    style={[
                      styles.shapeButton,
                      tool === shapeToolType && styles.activeShapeButton,
                    ]}
                  >
                    <IconComponent
                      name={iconName}
                      size={28} // Slightly larger icons in modal
                      color={tool === shapeToolType ? 'white' : 'black'}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </ThemedView>
        </Pressable>
      </Modal>
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
    backgroundColor: 'transparent', // Make container transparent
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
    // Use shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
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
    // Use shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.34,
    shadowRadius: 6.27,
    elevation: 10,
    position: 'absolute',
    bottom: 100, // Adjust position relative to toolbar
    right: 10,
    zIndex: 1,
  },
  panelStyle: {
    borderRadius: 16,
    // Use shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sliderStyle: {
    borderRadius: 20,
    marginTop: 20,
    // Use shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  previewTxtContainer: {
    paddingTop: 20,
    marginTop: 20,
    borderTopWidth: 1,
    borderColor: '#bebdbe',
  },
  // Styles for Shape Selector Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shapeSelectorModalContent: {
    borderRadius: 10,
    padding: 20,
    width: 'auto', // Adjust width based on content
    minWidth: 200,
    maxWidth: '80%',
    alignItems: 'center', // Center items horizontally
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  shapeSelectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap', // Allow items to wrap
    justifyContent: 'center', // Center items in the row
    gap: 15, // Spacing between buttons
  },
  shapeButton: {
    width: 60, // Slightly larger buttons for modal
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 10, // Less rounded for grid look
    elevation: 2,
    // Use shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  activeShapeButton: {
    backgroundColor: '#007AFF',
  },
});

export default Toolbar;