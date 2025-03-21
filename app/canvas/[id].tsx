import { PathData } from '@/hooks/useCanvas';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  Canvas,
  DashPathEffect,
  Path,
  Rect,
  Skia,
} from '@shopify/react-native-skia';
import { useKeyEvent } from 'expo-key-event';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { io } from 'socket.io-client';
import Toolbar from '../../components/Toolbar';
import { ToolData, Tools } from '../../constants/Tools';
import { useCanvas } from '../../hooks/useCanvas';
import { useImagePicker, CanvasImageComponent } from '../../hooks/useImagePicker';

export default function CanvasScreen() {
  const [socket, setSocket] = useState<any>(null);

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
    selectedItems,
    selectionBounds,
    panOffset,
    isPanning,
    setPaths,
  } = useCanvas();

  const [selectedColor, setSelectedColor] = useState<string>('black');
  
  const { keyEvent, startListening, stopListening } = useKeyEvent(false);

  const [clientId] = useState(
    () => `client_${Math.random().toString(36).substring(2, 9)}`
  );

  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (socket) {
      socket.emit(
        'joinRoom',
        { name: id },
        (response: { success: any; roomId: any; paths: any }) => {
          console.log('Room:', response);
          if (response.success) {
            let paths = response.paths;
            if (paths) {
              const newPaths = paths.map((path: any) => ({
                id: path.id,
                path: Skia.Path.MakeFromSVGString(path.path),
                tool: path.tool,
                strokeWidth: path.strokeWidth,
                fill: path.fill,
                color: path.color,
              }));
              // Update paths in the canvas
              setPaths(newPaths);
            } else {
              console.log('No paths received');
            }
          }
        }
      );

      socket.on('canvasData', (data: any) => {
        // Skip if this is our own update
        if (data.senderId === clientId) return;

        console.log('Received canvas data from:', data.senderId);

        try {
          // Set syncing flag to prevent emitting back
          setIsSyncing(true);

          const newPaths = data.paths.map((path: any) => ({
            id: path.id,
            path: Skia.Path.MakeFromSVGString(path.path),
            tool: path.tool,
            strokeWidth: path.strokeWidth,
            fill: path.fill,
            color: path.color,
          }));

          // Directly update the source of truth in useCanvas
          setPaths(newPaths);

          // Reset syncing flag after a short delay to ensure state updates complete
          setTimeout(() => setIsSyncing(false), 100);
        } catch (error) {
          console.error('Error processing canvas data:', error);
          setIsSyncing(false);
        }
      });
    }
  }, [socket]);

  const {
    images,
    selectedImage,
    pickImage,
    handleImageSelection,
    moveSelectedImage,
    resetImageSelection
  } = useImagePicker(socket, clientId, id, isSyncing, setIsSyncing, tool, panOffset);

  useEffect(() => {
    setSocket(io('http://localhost:3000/room'));

    startListening();
    return () => {
      // Implement leave room here
      socket?.emit('leaveRoom', { roomId: id });
      stopListening();
    };
  }, []);

  useEffect(() => {
    switch (keyEvent?.key) {
      case 'KeyZ':
        undo();
        break;
      case 'KeyY':
        redo();
        break;
      case 'Digit1':
        setTool(Tools.PEN);
        break;
      case 'Digit2':
        setTool(Tools.LINE);
        break;
      case 'Digit3':
        setTool(Tools.HIGHLIGHTER);
        break;
      case 'Digit4':
        setTool(Tools.ERASER);
        break;
      case 'Digit5':
        setTool(Tools.BUCKETFILL);
        break;
      case 'Digit6':
        setTool(Tools.CIRCLE);
        break;
      case 'Digit7':
        setTool(Tools.RECTANGLE);
        break;
      case 'Digit8':
        setTool(Tools.TRIANGLE);
        break;
      case 'Digit9':
        setTool(Tools.STAR);
        break;
      case 'Escape':
        setTool(Tools.PAN);
        break;
    }
  }, [keyEvent]);

  useEffect(() => {
    // Don't emit if we're currently syncing from a received update
    if (isSyncing || !socket) return;

    let svgPaths = paths.map((path: PathData) => ({
      id: path.id,
      path: path.path.toSVGString(),
      tool: path.tool,
      strokeWidth: path.strokeWidth,
      fill: path.fill,
      color: path.color,
    }));

    socket.emit('canvasData', {
      roomId: id,
      paths: svgPaths,
      senderId: clientId,
    });
  }, [paths, isSyncing, socket]);

  const tap = Gesture.Tap()
    .runOnJS(true)
    .onStart(e => handlePointerDown(e.x, e.y))
    .onEnd(e => handlePointerUp(e.x, e.y, selectedColor));

  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(5)
    .onStart(e => {
      // Check if we're touching an image when using SELECT tool
      const imageSelected = handleImageSelection(e.x, e.y);
      

      if (!imageSelected) {
        handlePointerDown(e.x, e.y);
      }
    })
    .onChange(e => {

      const imageMoved = moveSelectedImage(e.changeX, e.changeY);
      
      if (!imageMoved) {
        handlePointerMove(e.x, e.y);
      }
    })
    .onEnd(e => {
      // Reset image selection (only affects SELECT mode)
      resetImageSelection();
      
      handlePointerUp(e.x, e.y, selectedColor);
    });

    
    
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
        {images.map((img) => (
            <CanvasImageComponent 
              key={img.id} 
              image={img} 
              panOffset={panOffset} 
              isSelected={selectedImage?.id === img.id}
            />
          ))}
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
              origin={{ x: 0, y: 0 }}
              transform={
                panOffset
                  ? [{ translateX: panOffset.x }, { translateY: panOffset.y }]
                  : []
              }
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
              origin={{ x: 0, y: 0 }}
              transform={
                panOffset
                  ? [{ translateX: panOffset.x }, { translateY: panOffset.y }]
                  : []
              }
            >
              {tool == Tools.SELECT && <DashPathEffect intervals={[5, 5]} />}
            </Path>
          )}

          {selectionBounds.isValid && tool === Tools.SELECT && (
            <>
              
              <Rect
                  x={selectionBounds.minX + panOffset.x - 5}
                  y={selectionBounds.minY + panOffset.y - 5}
                  width={selectionBounds.width + 10}
                  height={selectionBounds.height + 10}
                  color="rgb(0, 102, 255)"
                  style="stroke"
                  strokeWidth={2}
                >
                  <DashPathEffect intervals={[5, 5]} />
                </Rect>
              <>
              
                <Rect
                  x={selectionBounds.minX - 8 + panOffset.x}
                  y={selectionBounds.minY - 8 + panOffset.y}
                  width={8}
                  height={8}
                  color="rgb(0, 102, 255)"
                />
                <Rect
                  x={selectionBounds.maxX + panOffset.x}
                  y={selectionBounds.minY - 8 + panOffset.y}
                  width={8}
                  height={8}
                  color="rgb(0, 102, 255)"
                />
                <Rect
                  x={selectionBounds.minX - 8 + panOffset.x}
                  y={selectionBounds.maxY + panOffset.y}
                  width={8}
                  height={8}
                  color="rgb(0, 102, 255)"
                />
                <Rect
                  x={selectionBounds.maxX + panOffset.x}
                  y={selectionBounds.maxY + panOffset.y}
                  width={8}
                  height={8}
                  color="rgb(0, 102, 255)"
                />

                {/* Update any other selection handles similarly */}
              </>

              {/* Mid-point handles for sides Will be implemented in future*/}
              {/* <Rect
                x={selectionBounds.minX + selectionBounds.width / 2 - 4}
                y={selectionBounds.minY - 8}
                width={8}
                height={8}
                color="rgb(0, 102, 255)"
              />
              <Rect
                x={selectionBounds.minX + selectionBounds.width / 2 - 4}
                y={selectionBounds.maxY}
                width={8}
                height={8}
                color="rgb(0, 102, 255)"
              />
              <Rect
                x={selectionBounds.minX - 8}
                y={selectionBounds.minY + selectionBounds.height / 2 - 4}
                width={8}
                height={8}
                color="rgb(0, 102, 255)"
              />
              <Rect
                x={selectionBounds.maxX}
                y={selectionBounds.minY + selectionBounds.height / 2 - 4}
                width={8}
                height={8}
                color="rgb(0, 102, 255)"
              /> */}

              {/* Rotation handle Will be implemented in the future */}
              {/* <Rect
                x={selectionBounds.minX + selectionBounds.width / 2 - 4}
                y={selectionBounds.minY - 25}
                width={8}
                height={8}
                color="rgb(0, 102, 255)"
              />
              <Path
                path={`M ${selectionBounds.minX + selectionBounds.width / 2} ${selectionBounds.minY - 8} L ${selectionBounds.minX + selectionBounds.width / 2} ${selectionBounds.minY - 17}`}
                color="rgb(0, 102, 255)"
                style="stroke"
                strokeWidth={2}
              /> */}
            </>
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
    
    {/* Add image upload button */}
    <TouchableOpacity onPress={pickImage} style={styles.controlButton}>
      <MaterialIcons name="image" size={24} color="black" />
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
