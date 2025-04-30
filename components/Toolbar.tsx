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
  console.log('Toolbar Render - colorPickerVisible:', colorPickerVisible);
  const [shapeSelectorVisible, setShapeSelectorVisible] = useState(false); // State for shape selector modal
  const [initialColor, setInitialColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const selectedColor = useSharedValue(initialColor);

  // Toggle handler
  const toggleCollapse = () => {
    collapsed.value = !collapsed.value;
    setIsCollapsed(!isCollapsed);
  };

  // Animation style for the collapsible container
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
      height: withTiming(collapsed.value ? 0 : 'auto', {
        // Use 'auto' or a fixed height
        duration: 300,
        easing: Easing.out(Easing.quad),
      }),
      opacity: withTiming(collapsed.value ? 0 : 1, {
        duration: 300,
      }),
      overflow: 'hidden', // This clips the absolutely positioned picker if it's inside
    };
  });

  useEffect(() => {
    if (isDrawing && (colorPickerVisible || shapeSelectorVisible)) {
      setColorPickerVisible(false);
      setShapeSelectorVisible(false); // Close shape selector too
    }
  }, [isDrawing, colorPickerVisible, shapeSelectorVisible]);

  // Animated style for the color preview button
  const colorButtonStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: selectedColor.value,
      width: 50,
      height: 50,
      borderRadius: 50,
      borderWidth: 1, // Add border for visibility
      borderColor: colorScheme === 'dark' ? '#555' : '#ccc', // Border color
    };
  });

  // Handler for selecting a shape from the modal
  const handleShapeSelect = (selectedShapeTool: Tools) => {
    onToolChange(selectedShapeTool);
    setShapeSelectorVisible(false);
  };

  // Determine if the current tool is one of the shapes
  const isShapeToolActive = shapeTools.includes(tool);

  return (
    <>
      {/* Main container for the toolbar area */}
      <ThemedView style={styles.container}>
        {/* Toggle Button for collapsing */}
        <TouchableOpacity
          onPress={toggleCollapse}
          style={styles.toggleButton} // Use dedicated style
        >
          <Animated.View style={styles.toggleButtonInner}>
            {isCollapsed ? (
              <AntDesign name="up" size={24} color="black" />
            ) : (
              <AntDesign name="down" size={24} color="black" />
            )}
          </Animated.View>
        </TouchableOpacity>

        {/* Collapsible Area - Contains the tools, slider, etc. */}
        <Animated.View style={[styles.toolsContainerWrapper, collapsibleStyle]}>
          <View style={styles.toolsContainerContent}>
            {/* Map through non-shape tools */}
            {Object.entries(ToolData)
              .filter(([toolType]) => !shapeTools.includes(toolType as Tools))
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

            {/* Color Picker Toggle Button */}
            <Pressable
              onPress={() => {
                console.log('Color Picker Button Pressed!');
                setColorPickerVisible(prev => {
                  console.log(
                    'Setting colorPickerVisible from',
                    prev,
                    'to',
                    !prev
                  );
                  return !prev;
                });
              }}
            >
              <Animated.View style={colorButtonStyle} />
            </Pressable>

            {/* Stroke Width Slider */}
            <View style={styles.sliderContainer}>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={100}
                step={1}
                value={strokeWidth}
                onValueChange={setStrokeWidth} // Update local state continuously for smoother UI
                onSlidingComplete={value => {
                  onStrokeWidthChange(value); // Update parent state only on completion
                }}
                minimumTrackTintColor="#007AFF"
                thumbTintColor="#007AFF"
                maximumTrackTintColor="#D3D3D3"
              />
            </View>
          </View>
        </Animated.View>

        {/* --- COLOR PICKER RENDERED OUTSIDE COLLAPSIBLE VIEW --- */}
        {colorPickerVisible ? (
          <ColorPicker
            style={{
              ...styles.pickerContainer, // Uses absolute positioning
              backgroundColor: colorScheme === 'dark' ? '#333' : 'white',
            }}
            value={initialColor}
            sliderThickness={25}
            thumbSize={24}
            thumbShape="circle"
            onComplete={(color: ColorFormatsObject) => {
              'worklet';
              selectedColor.value = color.hex; // Update animated preview circle
            }}
            onCompleteJS={(color: ColorFormatsObject) => {
              console.log('ColorPicker onCompleteJS:', color.hex);
              setInitialColor(color.hex); // Update initial value for next open
              onColorChange(color.hex); // Update parent state
              // Optionally hide picker on completion:
              // setColorPickerVisible(false);
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
            {/* InputWidget might need adjustments or removal depending on need */}
            {/* <View style={styles.previewTxtContainer}>
              <InputWidget
                inputStyle={{ color: '#fff', paddingVertical: 2, borderColor: '#707070', fontSize: 12, marginLeft: 5 }}
                iconColor="#707070"
              />
            </View> */}
          </ColorPicker>
        ) : null}
        {/* --- END COLOR PICKER --- */}
      </ThemedView>

      {/* Shape Selector Modal (remains outside ThemedView) */}
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
                      size={28}
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

    width: 'auto',
    left: '50%',
    transform: [{ translateX: '-50%' }], // Center the toolbar horizontally
    position: 'absolute',
    bottom: '2%',
    justifyContent: 'center',
    backgroundColor: 'transparent', // Keep container transparent
    // overflow: 'visible', // Ensure container doesn't clip the absolutely positioned picker
  },
  toggleButton: {
    // Style for the up/down arrow button container
    position: 'absolute', // Position it relative to the container
    bottom: 80, // Adjust as needed to place above the toolbar content
    zIndex: 2, // Ensure it's above the collapsible content
    alignSelf: 'center',
  },
  toggleButtonInner: {
    // Style for the visual part of the toggle button
    padding: 10,
    backgroundColor: '#007AFF',
    borderRadius: 30,
  },
  // Wrapper for the collapsible content
  toolsContainerWrapper: {
    borderRadius: 12,
    backgroundColor: '#323336',
    position: 'relative', // Needed for overflow:hidden to work correctly
    marginTop: 0,
    marginRight: 'auto',
    marginBottom: 0,
    marginLeft: 'auto',
    width: 'auto', // Adjust width based on content
    alignSelf: 'center', // Center the wrapper
    // collapsibleStyle applies height, transform, opacity, and overflow: 'hidden'
  },
  // Content inside the collapsible wrapper
  toolsContainerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15, // Padding inside the content area
    gap: 8,
  },
  button: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 50,
    elevation: 3,
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
    justifyContent: 'center', // Center slider vertically if needed
    marginLeft: 10, // Add some space before slider
  },
  slider: {
    width: '100%',
    height: 40,
  },
  // Styles for the absolutely positioned Color Picker
  pickerContainer: {
    alignSelf: 'center',
    width: 300,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.34,
    shadowRadius: 6.27,
    elevation: 10,
    position: 'absolute', // Crucial for positioning outside the flow
    bottom: 100, // Position relative to the main container (adjust as needed)
    // You might need 'left' or 'right' depending on desired alignment
    alignSelf: 'center', // Center horizontally relative to the container
    zIndex: 100, // Ensure it's above other elements
  },
  panelStyle: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sliderStyle: {
    borderRadius: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  previewTxtContainer: {
    // Style for the InputWidget container if used
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
    width: 'auto',
    minWidth: 200,
    maxWidth: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  shapeSelectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 15,
  },
  shapeButton: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 10,
    elevation: 2,
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
