import { Canvas, Path } from '@shopify/react-native-skia';
import { Stack, useLocalSearchParams } from 'expo-router';
import {
  useColorScheme,
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useCanvas, Tools } from '../../hooks/useCanvas';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Toolbar from '../../components/Toolbar';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const toolData = {
  [Tools.PEN]: {
    color: 'black',
    cap: 'round' as const,
    blendMode: 'srcOver' as const,
  },
  [Tools.LINE]: {
    color: 'black',
    cap: 'round' as const,
    blendMode: 'srcOver' as const,
  },
  [Tools.HIGHLIGHTER]: {
    color: 'rgba(255, 255, 0, 0.4)',
    cap: 'square' as const,
    blendMode: 'srcOver' as const,
  },
  [Tools.ERASER]: {
    color: 'transparent',
    cap: 'round' as const,
    blendMode: 'clear' as const,
  },
};

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

  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(5)
    .onStart(e => handlePointerDown(e.x, e.y))
    .onChange(e => handlePointerMove(e.x, e.y))
    .onEnd(handlePointerUp);

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

      <GestureDetector gesture={pan}>
        <Canvas style={{ flex: 1 }}>
          {paths.map(({ path, tool, strokeWidth }, index) => (
            <Path
              key={index}
              path={path}
              color={toolData[tool].color}
              style="stroke"
              strokeWidth={strokeWidth}
              strokeJoin="round"
              strokeCap={toolData[tool].cap}
              blendMode={toolData[tool].blendMode}
            />
          ))}

          {currentPath && (
            <Path
              path={currentPath}
              color={toolData[tool].color}
              style="stroke"
              strokeWidth={strokeWidth}
              strokeJoin="round"
              strokeCap={toolData[tool].cap}
              blendMode={toolData[tool].blendMode}
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
});
