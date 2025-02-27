import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Canvas, notifyChange, Path, Skia } from "@shopify/react-native-skia";
import { Stack, useLocalSearchParams } from "expo-router";
import { Dimensions, useColorScheme } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { SharedValue, useSharedValue } from "react-native-reanimated";

export default function CanvasScreen() {
  const colorScheme = useColorScheme();
  const { id } = useLocalSearchParams();

  const { width, height } = Dimensions.get("window");

  const currentPath = useSharedValue(Skia.Path.Make().moveTo(0, 0));

  const pan = Gesture.Pan()
    .averageTouches(true)
    .maxPointers(1)
    .onBegin((e) => {
      currentPath.value.moveTo(e.x, e.y);
      currentPath.value.lineTo(e.x, e.y);
      notifyChange(currentPath as unknown as SharedValue<unknown>);
    })
    .onChange((e) => {
      currentPath.value.lineTo(e.x, e.y);
      notifyChange(currentPath as unknown as SharedValue<unknown>);
    });

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
        }}
      />

      <GestureDetector gesture={pan}>
        <Canvas style={{ width, height }}>
          <Path
            path={currentPath}
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
