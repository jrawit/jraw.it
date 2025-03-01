import { ThemedView } from "@/components/ThemedView";
import { Canvas, notifyChange, Path, Skia } from "@shopify/react-native-skia";
import { Stack, useLocalSearchParams } from "expo-router";
import { Dimensions, useColorScheme } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { SharedValue, useDerivedValue, useSharedValue } from "react-native-reanimated";
import { Button } from "react-native";

// Helper function to deep copy paths
const copyPath = (path: Path) => Skia.Path.MakeFromSVGString(path.toSVGString())!;

export default function CanvasScreen() {
  const colorScheme = useColorScheme();
  const { id } = useLocalSearchParams();
  const { width, height } = Dimensions.get("window");

  const paths = useSharedValue<Path[]>([]);
  const pastPaths = useSharedValue<Path[]>([]);
  const currentPath = useSharedValue<Path | null>(null);
  const isDrawing = useSharedValue(false);

  const compositePath = useDerivedValue(() => {
    const newPath = Skia.Path.Make();
    // Add all persisted paths first
    paths.value.forEach(path => newPath.addPath(path));
    // Add current transient path last
    currentPath.value && newPath.addPath(currentPath.value);
    return newPath;
  });

  const tap = Gesture.Tap()
    .maxDuration(250)
    .onStart((e) => {
      if (!isDrawing.value) {
        // Clear redo stack
        pastPaths.value = [];
        
        const dotPath = Skia.Path.Make();
        dotPath.addCircle(e.x, e.y, 10);
        
        paths.value = [...paths.value, dotPath];
        notifyChange(paths);
      }
    });

  const pan = Gesture.Pan()
    .minDistance(5) // kad suveiktu pan reikia linija piest
    .onStart((e) => {
      // clear redo stack
      pastPaths.value = [];
      
      isDrawing.value = true;
      

      const path = Skia.Path.Make();
      path.moveTo(e.x, e.y);
      currentPath.value = path;
      notifyChange(currentPath);
    })
    .onChange((e) => {
      if (currentPath.value) {
        currentPath.value.lineTo(e.x, e.y);
        notifyChange(currentPath);
      }
    })
    .onEnd(() => {
      if (currentPath.value) {
 
        const persistedPath = copyPath(currentPath.value);
        paths.value = [...paths.value, persistedPath];
        currentPath.value = null;
        notifyChange(paths);
      }
      isDrawing.value = false;
    })
    .onFinalize(() => {
      isDrawing.value = false;
    });

  
  const combinedGestures = Gesture.Exclusive(
    pan,
    tap
  );

  const undo = () => {
    if (paths.value.length > 0) {
      // Store copy of last path in undo stack
      const lastPath = copyPath(paths.value[paths.value.length - 1]);
      pastPaths.value = [...pastPaths.value, lastPath];
      paths.value = paths.value.slice(0, -1);
      notifyChange(paths);
    }
  };

  const redo = () => {
    if (pastPaths.value.length > 0) {
      const lastUndone = copyPath(pastPaths.value[pastPaths.value.length - 1]);
      paths.value = [...paths.value, lastUndone];
      pastPaths.value = pastPaths.value.slice(0, -1);
      notifyChange(paths);
    }
  };

  return (
    <ThemedView>
      <Stack.Screen
        options={{
          title: `Canvas ${id}`,
          headerStyle: {
            backgroundColor: colorScheme === "dark" ? "black" : "white",
          },
          headerTintColor: colorScheme === "dark" ? "white" : "black",
          headerTitleStyle: {
            fontWeight: "bold",
          },
          headerRight: () => (
            <>
              <Button
                onPress={undo}
                title="Undo"
                color={colorScheme === "dark" ? "orange" : "black"}
              />
              <Button
                onPress={redo}
                title="Redo"
                color={colorScheme === "dark" ? "blue" : "black"}
              />
            </>
          ),
        }}
      />

      <GestureDetector gesture={combinedGestures}>
        <Canvas style={{ width, height }}>
          <Path
            path={compositePath}
            style="stroke"
            strokeWidth={20}
            strokeCap="round"
            strokeJoin="round"
            color={colorScheme === "dark" ? "white" : "black"}
          />
        </Canvas>
      </GestureDetector>
    </ThemedView>
  );
}