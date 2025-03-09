import React from "react"; 
import { View, TouchableOpacity, StyleSheet } from "react-native";
import Slider from "@react-native-community/slider";
import PenIcon from "../assets/icons/pen.svg";
import LineIcon from "../assets/icons/line.svg";
import HighlighterIcon from "../assets/icons/highlighter.svg";
import EraserIcon from "../assets/icons/eraser.svg";
import { Tools } from "../hooks/useCanvas";

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
    <View style={styles.container}>
      <View style={styles.toolsContainer}>
        <TouchableOpacity
          onPress={() => setTool(Tools.PEN)}
          style={[styles.button, tool === Tools.PEN && styles.activeButton]}
        >
          <PenIcon width={24} height={24} fill={tool === Tools.PEN ? "white" : "black"} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setTool(Tools.LINE)}
          style={[styles.button, tool === Tools.LINE && styles.activeButton]}
        >
          <LineIcon width={24} height={24} fill={tool === Tools.LINE ? "white" : "black"} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setTool(Tools.HIGHLIGHTER)}
          style={[styles.button, tool === Tools.HIGHLIGHTER && styles.activeButton]}
        >
          <HighlighterIcon width={24} height={24} fill={tool === Tools.HIGHLIGHTER ? "white" : "black"} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setTool(Tools.ERASER)}
          style={[styles.button, tool === Tools.ERASER && styles.activeButton]}
        >
          <EraserIcon width={24} height={24} fill={tool === Tools.ERASER ? "white" : "black"} />
        </TouchableOpacity>
      </View>

      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={100}
          step={1}
          value={strokeWidth}
          onValueChange={setStrokeWidth}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f8f8f8",
    padding: 15,
    borderRadius: 12,
    elevation: 5,
    alignItems: "center",
    position: "absolute",
    right: 10,
    top: 100,
  },
  toolsContainer: {
    flexDirection: "column",
    alignItems: "center",
    marginVertical: 10,
  },
  button: {
    backgroundColor: "white",
    padding: 14,
    borderRadius: 50,
    marginVertical: 5,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  activeButton: {
    backgroundColor: "#007AFF",
  },
  sliderContainer: {
    width: 120,
    marginVertical: 10,
  },
  slider: {
    width: "100%",
    height: 40,
  },
});

export default Toolbar;