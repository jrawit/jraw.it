import { Canvas, Path } from "@shopify/react-native-skia";
import { Stack, useLocalSearchParams } from "expo-router";
import { useColorScheme, Button, View } from "react-native";
import { useCanvas, Tools } from "../../hooks/useCanvas";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

type StrokeStyle = {
  color: string;
  strokeWidth: number;
  cap: "round" | "square" | "butt";
};

const toolData: Record<Tools, StrokeStyle> = {
  [Tools.PEN]: {
    color: "black",
    strokeWidth: 2,
    cap: "round",
  },
  [Tools.LINE]: {
    color: "black",
    strokeWidth: 2,
    cap: "round",
  },
  [Tools.HIGHLIGHTER]: {
    color: "rgba(255, 255, 0, 0.4)",
    strokeWidth: 10,
    cap: "square",
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
  } = useCanvas();

  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(5)
    .onStart((e) => handlePointerDown(e.x, e.y))
    .onChange((e) => handlePointerMove(e.x, e.y))
    .onEnd(handlePointerUp);

  return (
    <View style={{ flex: 1 }}>
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
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button
                title="Highlighter"
                onPress={() => setTool(Tools.HIGHLIGHTER)}
                color={tool === Tools.HIGHLIGHTER ? "green" : "gray"}
              />
              <Button
                title="Pen"
                onPress={() => setTool(Tools.PEN)}
                color={tool === Tools.PEN ? "green" : "gray"}
              />
              <Button
                title="Line"
                onPress={() => setTool(Tools.LINE)}
                color={tool === Tools.LINE ? "green" : "gray"}
              />
              <Button title="Undo" onPress={undo} />
              <Button title="Redo" onPress={redo} />
              <Button title="Clear" onPress={clear} />
            </View>
          ),
        }}
      />

      <GestureDetector gesture={pan}>
        <Canvas style={{ flex: 1 }}>
          {paths.map(({ path, tool }, index) => {
            const { color, strokeWidth, cap } = toolData[tool];
            return (
              <Path
                key={index}
                path={path}
                color={color}
                style="stroke"
                strokeWidth={strokeWidth}
                strokeJoin="round"
                strokeCap={cap}
              />
            );
          })}

          {currentPath &&
            (() => {
              const { color, strokeWidth, cap } = toolData[tool];
              return (
                <Path
                  path={currentPath}
                  color={color}
                  style="stroke"
                  strokeWidth={strokeWidth}
                  strokeJoin="round"
                  strokeCap={cap}
                />
              );
            })()}
        </Canvas>
      </GestureDetector>
    </View>
  );
}
