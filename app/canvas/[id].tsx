import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Circle } from '@/components/tools/Circle';
import { Image } from '@/components/tools/Image';
import { Line } from '@/components/tools/Line';
import { Path } from '@/components/tools/Path';
import { Rect } from '@/components/tools/Rectangle';
import { Star } from '@/components/tools/Star';
import { Text } from '@/components/tools/Text';
import { Triangle } from '@/components/tools/Triangle';
import { CanvasElements } from '@/constants/CanvasElement';
import { processImageForCanvas } from '@/hooks/tool-handlers';
import { CanvasElement } from '@/hooks/useCanvas';
import { useMediaLibraryPermissions } from '@/hooks/useMediaLibraryPermissions';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  Canvas,
  Group,
  Paint,
  RoundedRect,
  Rect as SkRect,
  useCanvasRef,
} from '@shopify/react-native-skia';
import * as ImagePicker from 'expo-image-picker';
import { useKeyEvent } from 'expo-key-event';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { io } from 'socket.io-client';
import Toolbar from '../../components/Toolbar';
import { ToolData, Tools } from '../../constants/Tools';
import { useCanvas } from '../../hooks/useCanvas';

export default function CanvasScreen() {
  const [socket, setSocket] = useState<any>(null);
  const [tool, setTool] = useState<Tools>(Tools.PEN);
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [selectedColor, setSelectedColor] = useState<string>('black');
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const [textModalVisible, setTextModalVisible] = useState<boolean>(false);
  const [textInputValue, setTextInputValue] = useState<string>('');
  const [textPosition, setTextPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  const [elementsOffset, setElementsOffset] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });
  const [currentElementOffset, setCurrentElementOffset] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });

  const colorScheme = useColorScheme();
  const { id } = useLocalSearchParams();
  const ref = useCanvasRef();

  const {
    elements,
    currentElement,
    onStartInput,
    onMoveInput,
    onEndInput,
    undo,
    redo,
    clear,
    addExternalElement,
    modifyElements,
    selection,
  } = useCanvas({
    tool,
    strokeWidth,
    color: selectedColor,
  });

  const { keyEvent, startListening, stopListening } = useKeyEvent(false);

  const {
    isPermissionModalVisible,
    isPermanentlyDenied,
    requestPermission,
    openSettings,
    hidePermissionModal,
  } = useMediaLibraryPermissions();

  useEffect(() => {
    setSocket(io('http://localhost:3000/room'));

    startListening();
    return () => {
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
      case 'KeyT':
        setTool(Tools.TEXT);
        break;
      case 'Escape':
        setTool(Tools.PAN);
        break;
    }
  }, [keyEvent]);

  const tap = Gesture.Tap()
    .runOnJS(true)
    .onStart(e => {
      const adjustedX = e.x - elementsOffset.x;
      const adjustedY = e.y - elementsOffset.y;

      if (tool === Tools.TEXT) {
        setTextPosition({ x: adjustedX, y: adjustedY });
        setTextModalVisible(true);
      } else {
        onStartInput(adjustedX, adjustedY);
      }
    })
    .onEnd(e => {
      if (tool !== Tools.TEXT) {
        const adjustedX = e.x - elementsOffset.x;
        const adjustedY = e.y - elementsOffset.y;
        onEndInput(adjustedX, adjustedY);
      }
    });

  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(5)
    .onStart(e => {
      if (tool !== Tools.PAN) {
        const adjustedX = e.x - elementsOffset.x;
        const adjustedY = e.y - elementsOffset.y;
        onStartInput(adjustedX, adjustedY);
      }
    })
    .onChange(e => {
      if (tool === Tools.PAN) {
        setCurrentElementOffset({
          x: e.translationX,
          y: e.translationY,
        });
      } else {
        const adjustedX = e.x - elementsOffset.x;
        const adjustedY = e.y - elementsOffset.y;
        onMoveInput(adjustedX, adjustedY);
      }
    })
    .onEnd(e => {
      if (tool !== Tools.PAN) {
        const adjustedX = e.x - elementsOffset.x;
        const adjustedY = e.y - elementsOffset.y;
        onEndInput(adjustedX, adjustedY);
      } else {
        setElementsOffset(prev => ({
          x: prev.x + e.translationX,
          y: prev.y + e.translationY,
        }));
        setCurrentElementOffset({ x: 0, y: 0 });
      }
    });

  // For mobile devices, two-finger pan gesture
  const twoFingerPan = Gesture.Pan()
    .runOnJS(true)
    .minPointers(2) // Requires at least 2 fingers
    .onChange(e => {
      // Always pan when using two fingers, regardless of selected tool
      setCurrentElementOffset({
        x: e.translationX,
        y: e.translationY,
      });
    })
    .onEnd(e => {
      setElementsOffset(prev => ({
        x: prev.x + e.translationX,
        y: prev.y + e.translationY,
      }));
      setCurrentElementOffset({ x: 0, y: 0 });
    });

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
              // Update paths in the canvas
              // setPaths(newPaths);
            } else {
              console.log('No paths received');
            }
          }
        }
      );
    }
  }, [socket]);

  const pickImage = useCallback(async () => {
    const status = await requestPermission();
    if (status !== 'granted') return;

    // Initial image selection with low quality
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: false,
      quality: 0.7,
      exif: false,
      base64: false,
    });

    if (!result.canceled) {
      try {
        // Get original dimensions
        const imageAsset = result.assets[0];
        const imageWidth = imageAsset.width || 100;
        const imageHeight = imageAsset.height || 100;

        const { width: finalWidth, height: finalHeight } =
          processImageForCanvas(
            imageWidth,
            imageHeight,
            canvasSize.width || 300,
            canvasSize.height || 300
          );

        // Center the image on the visible portion of the canvas
        const centerX = (canvasSize.width - finalWidth) / 2 - elementsOffset.x;
        const centerY =
          (canvasSize.height - finalHeight) / 2 - elementsOffset.y;

        const imageElement = {
          uri: imageAsset.uri,
          point: { x: centerX, y: centerY },
          width: finalWidth,
          height: finalHeight,
        };

        addExternalElement(imageElement, Tools.IMAGE);
      } catch (error) {
        console.error('Error processing image:', error);
      }
    }
  }, [canvasSize, elementsOffset, addExternalElement, requestPermission]);

  const onTextSubmit = useCallback(() => {
    if (textInputValue.trim()) {
      const textElement = {
        text: textInputValue,
        point: textPosition,
        fontFamily: 'Roboto',
        fontSize: strokeWidth,
        color: selectedColor,
      };

      addExternalElement(textElement, Tools.TEXT);
    }

    setTextModalVisible(false);
    setTextInputValue('');
  }, [
    textInputValue,
    textPosition,
    strokeWidth,
    selectedColor,
    addExternalElement,
  ]);

  const getElement = useCallback(
    (canvasElement: CanvasElement) => {
      const { id, element, tool } = canvasElement;
      switch (tool) {
        case Tools.PEN:
        case Tools.HIGHLIGHTER:
        case Tools.ERASER:
          (element as CanvasElements.Path).capStyle = ToolData[tool].cap;
          (element as CanvasElements.Path).blendMode = ToolData[tool].blendMode;
          (element as CanvasElements.Path).strokeWidth =
            ToolData[tool].sizeTransform(strokeWidth);
          (element as CanvasElements.Path).strokeColor =
            ToolData[tool].colorTransform(selectedColor);
          return <Path key={id} pathData={element as CanvasElements.Path} />;
        case Tools.LINE:
          return <Line key={id} lineData={element as CanvasElements.Line} />;
        case Tools.RECTANGLE:
          return (
            <Rect key={id} rectData={element as CanvasElements.Rectangle} />
          );
        case Tools.CIRCLE:
          return (
            <Circle key={id} circleData={element as CanvasElements.Circle} />
          );
        case Tools.TRIANGLE:
          return (
            <Triangle
              key={id}
              triangleData={element as CanvasElements.Triangle}
            />
          );
        case Tools.STAR:
          return <Star key={id} starData={element as CanvasElements.Star} />;
        case Tools.TEXT:
          return <Text key={id} textData={element as CanvasElements.Text} />;
        case Tools.IMAGE:
          return <Image key={id} imageData={element as CanvasElements.Image} />;
        default:
          console.warn(`Unhandled tool type: ${tool}`);
          return null;
      }
    },
    [strokeWidth, selectedColor]
  );

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
      <GestureDetector gesture={Gesture.Exclusive(pan, tap, twoFingerPan)}>
        <Canvas
          style={{ flex: 1 }}
          ref={ref}
          onLayout={event => {
            const { width, height } = event.nativeEvent.layout;
            setCanvasSize({ width, height });
          }}
        >
          <Group
            transform={[
              {
                translate: [
                  elementsOffset.x +
                    (tool === Tools.PAN ? currentElementOffset.x : 0),
                  elementsOffset.y +
                    (tool === Tools.PAN ? currentElementOffset.y : 0),
                ],
              },
            ]}
          >
            {useMemo(
              () =>
                elements.map((canvasElement: CanvasElement) =>
                  getElement(canvasElement)
                ),
              [elements]
            )}

            {currentElement && getElement(currentElement)}

            {selection && selection.width !== 0 && selection.height !== 0 && (
              <>
                {/* Selection area with multiple Paint layers */}
                <SkRect
                  x={selection.x}
                  y={selection.y}
                  width={selection.width}
                  height={selection.height}
                  style="stroke"
                >
                  {/* Background fill */}
                  <Paint color="rgba(0, 134, 223, 0.1)" />

                  {/* Dashed border */}
                  <Paint
                    color="rgba(0, 134, 223, 0.8)"
                    style="stroke"
                    strokeWidth={1.5}
                  />
                </SkRect>

                {/* Corner handles */}
                {[
                  { x: selection.x, y: selection.y }, // top-left
                  { x: selection.x + selection.width, y: selection.y }, // top-right
                  { x: selection.x, y: selection.y + selection.height }, // bottom-left
                  {
                    x: selection.x + selection.width,
                    y: selection.y + selection.height,
                  }, // bottom-right
                ].map((point, i) => (
                  <RoundedRect
                    key={`handle-${i}`}
                    x={point.x - 4}
                    y={point.y - 4}
                    width={8}
                    height={8}
                    r={2}
                  >
                    <Paint color="white" />
                    <Paint
                      color="rgba(0, 134, 223, 1)"
                      style="stroke"
                      strokeWidth={1}
                    />
                  </RoundedRect>
                ))}
              </>
            )}
          </Group>
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
          <TouchableOpacity onPress={pickImage} style={styles.controlButton}>
            <MaterialIcons name="image" size={24} color="black" />
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

      {/* Text input modal */}
      <Modal
        transparent={true}
        visible={textModalVisible}
        animationType="fade"
        onRequestClose={() => {
          setTextModalVisible(false);
          setTextInputValue('');
        }}
      >
        <ThemedView style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Add Text</ThemedText>
            <TextInput
              style={[
                styles.textInput,
                {
                  color: colorScheme === 'dark' ? '#fff' : '#000',
                  backgroundColor: colorScheme === 'dark' ? '#333' : '#fff',
                  borderColor: colorScheme === 'dark' ? '#555' : '#ccc',
                },
              ]}
              value={textInputValue}
              onChangeText={setTextInputValue}
              placeholder="Enter text here"
              placeholderTextColor={colorScheme === 'dark' ? '#aaa' : '#666'}
              autoFocus={true}
              multiline={true}
              maxLength={500}
            />
            <ThemedView style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => {
                  setTextModalVisible(false);
                  setTextInputValue('');
                }}
                style={[
                  styles.modalButton,
                  styles.cancelButton,
                  {
                    backgroundColor: colorScheme === 'dark' ? '#444' : '#ccc',
                  },
                ]}
              >
                <ThemedText style={styles.buttonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onTextSubmit}
                style={[styles.modalButton, styles.addButton]}
              >
                <ThemedText style={styles.buttonText}>Add Text</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>
        </ThemedView>
      </Modal>

      {/* Updated Permissions modal */}
      <Modal
        transparent={true}
        visible={isPermissionModalVisible}
        animationType="fade"
        onRequestClose={hidePermissionModal}
      >
        <ThemedView style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>
              Permission Required
            </ThemedText>
            <ThemedText style={styles.modalText}>
              {isPermanentlyDenied
                ? "You've denied image library access. Please enable it in your device settings to upload images."
                : 'We need access to your photo library to upload images.'}
            </ThemedText>
            <ThemedView style={styles.modalButtons}>
              <TouchableOpacity
                onPress={hidePermissionModal}
                style={[
                  styles.modalButton,
                  styles.cancelButton,
                  {
                    backgroundColor: colorScheme === 'dark' ? '#444' : '#ccc',
                  },
                ]}
              >
                <ThemedText style={styles.buttonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={isPermanentlyDenied ? openSettings : requestPermission}
                style={[styles.modalButton, styles.addButton]}
              >
                <ThemedText style={styles.buttonText}>
                  {isPermanentlyDenied ? 'Open Settings' : 'Allow Access'}
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>
        </ThemedView>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    minHeight: 100,
    fontSize: 16,
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ccc',
  },
  addButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    fontWeight: 'bold',
    color: 'white',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
});
