import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Canvas, Path } from '@shopify/react-native-skia';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Toolbar from '../../components/Toolbar';
import { ToolData } from '../../constants/Tools';
import { useCanvas } from '../../hooks/useCanvas';

export default function CanvasScreen() {
  const colorScheme = useColorScheme();
  const { id } = useLocalSearchParams();
  const {
    paths,
    currentPath,
    tool,
    setTool,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    undo,
    redo,
    clear,
    strokeWidth,
    setStrokeWidth,
  } = useCanvas();

  const [selectedColor, setSelectedColor] = useState<string>('black');

  const tap = Gesture.Tap()
    .runOnJS(true)
    .onStart(e => handlePointerDown(e.x, e.y))
    .onEnd(e => handlePointerUp(e.x, e.y, selectedColor));

  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(5)
    .onStart(e => handlePointerDown(e.x, e.y))
    .onChange(e => handlePointerMove(e.x, e.y))
    .onEnd(e => handlePointerUp(e.x, e.y, selectedColor));

  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <Stack.Screen
        options={{
          title: `Canvas ${id}`,
          headerStyle: {
            backgroundColor: colorScheme === 'dark' ? 'black' : 'white',
          },
          headerTintColor: colorScheme === 'dark' ? 'white' : 'black',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
        <Canvas style={{ flex: 1 }}>
          {paths.map(({ path, tool, strokeWidth, fill, color }, index) => (
            <Path
              key={index}
              path={path}
              color={ToolData[tool].colorTransform(color)}
              style={fill ? 'fill' : 'stroke'}
              strokeWidth={ToolData[tool].sizeTransform(strokeWidth)}
              strokeJoin="round"
              strokeCap={ToolData[tool].cap}
              blendMode={ToolData[tool].blendMode}
            />
          ))}

          {currentPath && (
            <Path
              path={currentPath}
              color={ToolData[tool].colorTransform(selectedColor)}
              strokeWidth={ToolData[tool].sizeTransform(strokeWidth)}
              style={'stroke'}
              strokeJoin="round"
              strokeCap={ToolData[tool].cap}
              blendMode={ToolData[tool].blendMode}
            />
          )}
        </Canvas>
      </GestureDetector>

      <View style={styles.controlsContainer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity onPress={undo} style={styles.controlButton}>
            <MaterialIcons name="undo" size={24} color="black" />
          </TouchableOpacity>
          <TouchableOpacity onPress={redo} style={styles.controlButton}>
            <MaterialIcons name="redo" size={24} color="black" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={clear}
            style={[styles.controlButton, styles.clearButton]}
          >
            <FontAwesome name="trash" size={24} color="black" />
          </TouchableOpacity>
        </View>
        <Toolbar
          tool={tool}
          setTool={setTool}
          strokeWidth={strokeWidth}
          setStrokeWidth={setStrokeWidth}
          setColor={setSelectedColor}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  controlsContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    alignItems: 'center',
  },
  buttonRow: { flexDirection: 'row', marginBottom: 10 },
  controlButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 50,
    marginHorizontal: 5,
  },
  clearButton: { backgroundColor: '#FF3B30' },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignContent: 'center',
    backgroundColor: 'orange',
  },
});
