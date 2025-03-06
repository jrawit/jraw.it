import { ThemedView } from "@/components/ThemedView";
import { Canvas, Path } from "@shopify/react-native-skia";
import { Stack, useLocalSearchParams } from "expo-router";
import { useColorScheme, Dimensions, Button, View } from "react-native";
import { useCanvas, Tools } from "../../hooks/useCanvas";

export default function CanvasScreen() {
  const { width } = Dimensions.get("window");
  const colorScheme = useColorScheme();
  const { id } = useLocalSearchParams();
  const { 
    paths, 
    currentPath,
    canvasRef,
    tool,
    setTool,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    undo,
    redo,
    clear
  } = useCanvas();

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: `Canvas ${id}`,
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button title="Highlighter" onPress={() => setTool(Tools.HIGHLIGHTER)} 
                color={tool === Tools.HIGHLIGHTER ? 'green' : 'gray'} />
              <Button title="Pen" onPress={() => setTool(Tools.PEN)} 
                color={tool === Tools.PEN ? 'green' : 'gray'} />
              <Button title="Line" onPress={() => setTool(Tools.LINE)} 
                color={tool === Tools.LINE ? 'green' : 'gray'} />
              <Button title="Undo" onPress={undo} />
              <Button title="Redo" onPress={redo} />
              <Button title="Clear" onPress={clear} />
            </View>
          ),
        }}
      />

      <div
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          touchAction: "none",
          position: "relative",
          backgroundColor: colorScheme === "dark" ? "#222" : "#fff"
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        
        <Canvas style={{ flex: 1 }}>
          {paths.map(({path, tool},index) => {
            let color = colorScheme === "dark" ? "white" : "black";
            let strokeWidth = 4;
            let cap : "butt" | "round" | "square" = "round";
            if (tool === Tools.HIGHLIGHTER) {
              color = "rgba(255, 255, 0, 0.4)"; // Transparent yellow
              cap = "square";
              strokeWidth = 20;
            } else {
              strokeWidth = 4;
            }

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

            {currentPath && (() => {
              let color = colorScheme === "dark" ? "white" : "black";
              let strokeWidth = 4;

              if (tool === Tools.HIGHLIGHTER) {
                color = "rgba(255, 255, 0, 0.4)";
                strokeWidth = 10;
              } 

              return (
                <Path
                path={currentPath}
                color={color}
                style="stroke"
                strokeWidth={strokeWidth}
                strokeJoin="round"
                strokeCap="round"
                />
              );
            })()}
          </Canvas>
      </div>
    </ThemedView>
  );
}