import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ToolData, Tools } from '@/constants/Tools';
import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Slider } from '@miblanchard/react-native-slider';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal, // Import Modal
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  useWindowDimensions,
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

const Toolbar: React.FC<ToolbarProps> = React.memo(
  ({
    tool,
    onToolChange,
    onStrokeWidthChange,
    onColorChange,
    isDrawing = false,
  }) => {
    const colorScheme = useColorScheme();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [colorPickerVisible, setColorPickerVisible] = useState(false);
    const [shapeSelectorVisible, setShapeSelectorVisible] = useState(false); // State for shape selector modal
    const [initialColor, setInitialColor] = useState('#000000');
    const [strokeWidth, setStrokeWidth] = useState(3);
    const selectedColor = useSharedValue(initialColor);
    const toggleButtonPosition = useSharedValue(140); // Starting position (matches original bottom: 70)
    const toolbarPosition = useSharedValue(0); // Initial position for the toolbar

    // Toggle handler
    const toggleCollapse = useCallback(() => {
      const nextIsCollapsed = !isCollapsed; // Calculate the next state
      setIsCollapsed(nextIsCollapsed);

      // Animate toolbar position based on the *next* state
      toolbarPosition.value = withTiming(nextIsCollapsed ? 145 : 0, {
        // Use nextIsCollapsed and increase the distance
        duration: 300,
        easing: Easing.out(Easing.quad),
      });

      // Animate button position based on the *next* state
      toggleButtonPosition.value = withTiming(nextIsCollapsed ? 0 : 140, {
        // Use nextIsCollapsed
        duration: 300,
        easing: Easing.out(Easing.quad),
      });
    }, [isCollapsed, toolbarPosition, toggleButtonPosition]);

    // Animation style for the collapsible container
    const collapsibleStyle = useAnimatedStyle(() => {
      return {
        transform: [
          { translateY: toolbarPosition.value }, // Move toolbar down when collapsed
        ],
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
        width: 42, // Match the new smaller button size
        height: 42, // Match the new smaller button size
        borderRadius: 42, // Keep it round
        borderWidth: 1, // Add border for visibility
        borderColor: colorScheme === 'dark' ? '#555' : '#ccc', // Border color
      };
    });

    // Animation style for the toggle button
    const toggleButtonStyle = useAnimatedStyle(() => {
      return {
        width: 42, // Match the new smaller button size
        height: 42, // Match the new smaller button size
        position: 'absolute',
        bottom: toggleButtonPosition.value,
        zIndex: 2,
        alignSelf: 'center',
      };
    });

    // Get screen width for responsive design
    const { width: screenWidth } = useWindowDimensions();

    // Handler for selecting a shape from the modal
    const handleShapeSelect = useCallback(
      (selectedShapeTool: Tools) => {
        onToolChange(selectedShapeTool);
        setShapeSelectorVisible(false);
      },
      [onToolChange]
    );

    // Determine if the current tool is one of the shapes
    const isShapeToolActive = useMemo(() => shapeTools.includes(tool), [tool]);

    // Memoize the non-shape tools list for better performance
    const nonShapeTools = useMemo(() => {
      return Object.entries(ToolData).filter(
        ([toolType]) => !shapeTools.includes(toolType as Tools)
      );
    }, []);

    return (
      <>
        {/* Main container for the toolbar area */}
        <ThemedView
          style={{ ...styles.container, maxWidth: screenWidth * 0.95 }}
        >
          {/* Toggle Button for collapsing - Outside the toolbar */}
          <Animated.View style={toggleButtonStyle}>
            <TouchableOpacity
              onPress={toggleCollapse}
              style={styles.toggleButtonTouchable}
            >
              <Animated.View style={styles.toggleButtonInner}>
                <AntDesign
                  name={isCollapsed ? 'up' : 'down'}
                  size={20}
                  color="black"
                />
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>

          {/* Collapsible Area */}
          <Animated.View
            style={[styles.toolsContainerWrapper, collapsibleStyle]}
          >
            {/* Stroke Width Slider - First Row */}
            <View style={styles.sliderRowContainer}>
              {/* Color Picker Toggle Button */}
              <Pressable
                onPress={useCallback(() => {
                  setColorPickerVisible(prev => !prev);
                }, [setColorPickerVisible])}
              >
                <Animated.View style={colorButtonStyle} />
              </Pressable>

              {/* Stroke Width Slider */}
              <View style={styles.sliderContainer}>
                <Slider
                  minimumValue={1}
                  maximumValue={100}
                  step={1}
                  value={strokeWidth}
                  onSlidingComplete={useCallback(
                    (value: number[]) => {
                      const newStrokeWidth = value[0];
                      setStrokeWidth(newStrokeWidth);
                      onStrokeWidthChange(newStrokeWidth);
                    },
                    [onStrokeWidthChange, setStrokeWidth]
                  )}
                  minimumTrackTintColor="#007AFF"
                  thumbTintColor="#007AFF"
                  maximumTrackTintColor="#D3D3D3"
                />
              </View>
            </View>

            {/* Tools ScrollView - Second Row */}
            <ScrollView
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.toolsScrollContent}
            >
              <View style={styles.toolsContainerContent}>
                {/* Map through non-shape tools */}
                {nonShapeTools.map(
                  ([toolType, { iconComponent: IconComponent, iconName }]) => {
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
                  }
                )}

                {/* Combined Shapes Button */}
                <TouchableOpacity
                  onPress={useCallback(
                    () => setShapeSelectorVisible(true),
                    [setShapeSelectorVisible]
                  )}
                  style={[
                    styles.button,
                    isShapeToolActive && styles.activeButton,
                  ]}
                >
                  {isShapeToolActive && tool in ToolData ? (
                    React.createElement(
                      ToolData[tool as keyof typeof ToolData].iconComponent,
                      {
                        name: ToolData[tool as keyof typeof ToolData].iconName,
                        size: 24,
                        color: 'white',
                      }
                    )
                  ) : (
                    <MaterialCommunityIcons
                      name="shape-outline"
                      size={24}
                      color={'black'}
                    />
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Animated.View>

          {/* --- COLOR PICKER RENDERED OUTSIDE COLLAPSIBLE VIEW --- */}
          {colorPickerVisible && (
            <View
              style={{
                ...styles.pickerContainer,
                backgroundColor: colorScheme === 'dark' ? '#333' : 'white',
              }}
            >
              <ColorPicker
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
                      color: colorScheme === 'dark' ? 'white' : 'black',
                      paddingVertical: 2,
                      borderColor: '#707070',
                      fontSize: 12,
                      marginLeft: 5,
                    }}
                    iconColor="#707070"
                  />
                </View>
              </ColorPicker>
            </View>
          )}
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
                  // Add type checking before accessing ToolData
                  if (!(shapeToolType in ToolData)) return null;

                  const { iconComponent: IconComponent, iconName } =
                    ToolData[shapeToolType as keyof typeof ToolData];
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
  }
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    position: 'absolute',
    bottom: '2%',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    left: '50%',
    transform: [{ translateX: '-50%' }],
  },
  toggleButtonTouchable: {
    width: 42, // Match the new smaller button size
    height: 42, // Match the new smaller button size
    backgroundColor: '#007AFF',
    borderRadius: 30,
    // Center the button
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleButtonInner: {
    backgroundColor: '#007AFF',
    borderRadius: 30,
  },
  toolsContainerWrapper: {
    borderRadius: 12,
    backgroundColor: '#323336',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  sliderRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  toolsContainerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10, // Reduced vertical padding
    paddingHorizontal: 10, // Reduced horizontal padding
    gap: 6, // Smaller gap between items
  },
  toolsScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 4,
  },
  button: {
    width: 42, // Smaller buttons
    height: 42, // Smaller buttons
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 42, // Keep it round
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    marginHorizontal: 3, // Reduced margin
  },
  activeButton: {
    backgroundColor: '#007AFF',
  },
  sliderContainer: {
    flex: 1, // Take up remaining space
    justifyContent: 'center',
    marginLeft: 5, // Reduced margin
    marginRight: 5, // Reduced margin
  },
  slider: {
    width: '100%',
    height: 40,
  },
  // Styles for the absolutely positioned Color Picker
  pickerContainer: {
    alignSelf: 'center',
    width: 300,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.34,
    shadowRadius: 6.27,
    elevation: 10,
    position: 'absolute',
    bottom: 140,
    zIndex: 100,
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
    padding: 15, // Reduced padding
    width: 'auto',
    minWidth: 200,
    maxWidth: '90%', // Increased percentage for smaller screens
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16, // Slightly smaller font
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  shapeSelectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10, // Reduced gap
  },
  shapeButton: {
    width: 50, // Smaller shape buttons
    height: 50, // Smaller shape buttons
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 8, // Reduced padding
    borderRadius: 8, // Slightly smaller border radius
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
