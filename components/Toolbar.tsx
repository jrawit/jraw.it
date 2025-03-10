import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { ToolData, Tools } from '../constants/Tools';
import { ThemedView } from './ThemedView';
import Slider from '@react-native-community/slider';
import ColorPicker, { ColorFormatsObject, colorKit, HSLSaturationSlider, HueSlider, LuminanceSlider, OpacitySlider, PreviewText, Swatches } from 'reanimated-color-picker';
import { useSharedValue } from 'react-native-reanimated';

type ToolbarProps = {
  tool: Tools;
  setTool: (tool: Tools) => void;
  strokeWidth: number;
  setStrokeWidth: (strokeWidth: number) => void;
  setColor: (color: string) => void;
};

const Toolbar: React.FC<ToolbarProps> = ({
  tool,
  setTool,
  strokeWidth,
  setStrokeWidth,
  setColor,
}) => {
  const customSwatches = new Array(6).fill('#fff').map(() => colorKit.randomRgbColor().hex());
  const selectedColor = useSharedValue(customSwatches[0]);
  const onColorSelect = (color: ColorFormatsObject) => {
      'worklet';
      selectedColor.value = color.hex;
      setColor(selectedColor.value);
    };
  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.toolsContainer}>
        {Object.entries(ToolData).map(
          ([toolType, { iconComponent: IconComponent, iconName }]) => {
            return (
              <TouchableOpacity
                key={toolType}
                onPress={() => setTool(toolType as Tools)}
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
      </ThemedView>
      {tool === Tools.PICKER ? (
              <ColorPicker
                    style={styles.pickerContainer}
                    value={selectedColor.value}
                    sliderThickness={25}
                    thumbSize={24}
                    thumbShape='circle'
                    onChange={onColorSelect}
                    adaptSpectrum
                    boundedThumb
                  >
                    <HueSlider style={styles.sliderStyle} />
      
                    <HSLSaturationSlider style={styles.sliderStyle} reverse />
      
                    <LuminanceSlider style={styles.sliderStyle} />
      
                    <OpacitySlider style={styles.sliderStyle} />
      
                    <Swatches style={styles.swatchesContainer} swatchStyle={styles.swatchStyle} colors={customSwatches} />
                    <View style={styles.previewTxtContainer}>
                      <PreviewText style={{ color: '#707070' }} colorFormat='hsla' />
                    </View>
                  </ColorPicker>) : null}

      <ThemedView style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={100}
          step={1}
          value={strokeWidth}
          onSlidingComplete={value => {
            setStrokeWidth(value);
          }}
          minimumTrackTintColor="#007AFF"
          thumbTintColor="#007AFF"
          maximumTrackTintColor="#D3D3D3"
        />
      </ThemedView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 15,
    borderRadius: 12,
    elevation: 5,
    alignItems: 'center',
    position: 'absolute',
    right: 10,
    top: 100,
  },
  toolsContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    marginVertical: 10,
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
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.34,
    shadowRadius: 6.27,

    elevation: 10,
    position: 'absolute',
    bottom: 70,
    right: 200,
    zIndex: 1,
  },
  sliderTitle: {
    color: '#000',
    fontWeight: 'bold',
    marginBottom: 5,
    paddingHorizontal: 4,
  },
  sliderStyle: {
    borderRadius: 20,
    marginBottom: 20,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
  swatchesContainer: {
    paddingTop: 20,
    marginTop: 20,
    borderTopWidth: 1,
    borderColor: '#bebdbe',
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: 10,
  },
  swatchStyle: {
    borderRadius: 20,
    height: 30,
    width: 30,
    margin: 0,
    marginBottom: 0,
    marginHorizontal: 0,
    marginVertical: 0,
  },
  openButton: {
    width: '100%',
    borderRadius: 20,
    paddingHorizontal: 40,
    paddingVertical: 10,
    backgroundColor: '#fff',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,

    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    bottom: 10,
    borderRadius: 20,
    paddingHorizontal: 40,
    paddingVertical: 10,
    alignSelf: 'center',
    backgroundColor: '#fff',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,

    elevation: 5,
  },
});

export default Toolbar;
