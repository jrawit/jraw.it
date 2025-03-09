import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Tools } from '../hooks/useCanvas';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Entypo from '@expo/vector-icons/build/Entypo';
import Slider from '@react-native-community/slider';
import { ThemedView } from './ThemedView';

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
        <TouchableOpacity
          onPress={() => setTool(Tools.PEN)}
          style={[styles.button, tool === Tools.PEN && styles.activeButton]}
        >
          <FontAwesome5
            name="pen"
            size={24}
            color={tool == Tools.PEN ? 'white' : 'black'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setTool(Tools.LINE)}
          style={[styles.button, tool === Tools.LINE && styles.activeButton]}
        >
          <MaterialCommunityIcons
            name="vector-line"
            size={24}
            color={tool === Tools.LINE ? 'white' : 'black'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setTool(Tools.HIGHLIGHTER)}
          style={[
            styles.button,
            tool === Tools.HIGHLIGHTER && styles.activeButton,
          ]}
        >
          <FontAwesome5
            name="highlighter"
            size={24}
            color={tool === Tools.HIGHLIGHTER ? 'white' : 'black'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setTool(Tools.ERASER)}
          style={[styles.button, tool === Tools.ERASER && styles.activeButton]}
        >
          <Entypo
            name="eraser"
            size={24}
            color={tool === Tools.ERASER ? 'white' : 'black'}
          />
        </TouchableOpacity>
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
