import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { ToolData, Tools } from '../constants/Tools';
import { ThemedView } from './ThemedView';
import Slider from '@react-native-community/slider';

type ToolbarProps = {
  tool: Tools;
  setTool: (tool: Tools) => void;
  strokeWidth: number;
  setStrokeWidth: (strokeWidth: number) => void;
};

const Toolbar: React.FC<ToolbarProps> = ({
  tool,
  setTool,
  strokeWidth,
  setStrokeWidth,
}) => {
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
});

export default Toolbar;
