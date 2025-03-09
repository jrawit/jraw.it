import React, { useState } from "react";
import { Canvas, Path } from "@shopify/react-native-skia";
import { Stack, useLocalSearchParams } from "expo-router";
import { useColorScheme, View, TouchableOpacity, StyleSheet } from "react-native";
import { useCanvas, Tools } from "../../hooks/useCanvas";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Toolbar from "../../components/Toolbar";
import UndoIcon from "../../assets/icons/undo.svg";
import RedoIcon from "../../assets/icons/redo.svg";
import TrashIcon from "../../assets/icons/trash.svg";
import { Colors } from "../../constants/Colors";

const toolData = {
  [Tools.PEN]: { 
    color: "black", 
    cap: "round" as const, 
    blendMode: "srcOver" as const 
  },
  [Tools.LINE]: { 
    color: "black", 
    cap: "round" as const, 
    blendMode: "srcOver" as const 
  },
  [Tools.HIGHLIGHTER]: { 
    color: "rgba(255, 255, 0, 0.4)", 
    cap: "round" as const, 
    blendMode: "srcOver" as const 
  },
  [Tools.ERASER]: { 
    color: "transparent", 
    cap: "round" as const, 
    blendMode: "clear" as const 
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
    .onStart((e) => handlePointerDown(e.x, e.y))
    .onChange((e) => handlePointerMove(e.x, e.y))
    .onEnd(handlePointerUp);

  return (
    <View style={{ flex: 1, flexDirection: "row" }}>
      <Stack.Screen options={{ title: `Canvas ${id}` }} />

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
            <UndoIcon width={24} height={24} fill="black" />
          </TouchableOpacity>
          <TouchableOpacity onPress={redo} style={styles.controlButton}>
            <RedoIcon width={24} height={24} fill="black" />
          </TouchableOpacity>
          <TouchableOpacity onPress={clear} style={[styles.controlButton, styles.clearButton]}>
            <TrashIcon width={24} height={24} fill="white" />
          </TouchableOpacity>
        </View>
        <Toolbar tool={tool} setTool={setTool} strokeWidth={strokeWidth} setStrokeWidth={setStrokeWidth} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  controlsContainer: { position: "absolute", top: 10, right: 10, alignItems: "center" },
  buttonRow: { flexDirection: "row", marginBottom: 10 },
  controlButton: { backgroundColor: "white", padding: 12, borderRadius: 50, marginHorizontal: 5 },
  clearButton: { backgroundColor: "#FF3B30" },
});