import CanvasComponent, {
  CanvasComponentHandle,
} from '@/components/CanvasComponent';
import ColorPickerModal from '@/components/ColorPickerModal';
import { TextModal } from '@/components/TextModal';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { CanvasElements } from '@/constants/CanvasElement';
import { processImageForCanvas } from '@/hooks/tool-handlers';
import { useFontManager } from '@/hooks/useFontManager';
import { useMediaLibraryPermissions } from '@/hooks/useMediaLibraryPermissions';
import { renderElementsOffscreen } from '@/utils/offscreenRenderer';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCanvasRef } from '@shopify/react-native-skia';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useKeyEvent } from 'expo-key-event';
import * as MediaLibrary from 'expo-media-library';
import { Stack, useLocalSearchParams } from 'expo-router';
import { cloneDeep } from 'lodash';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { io } from 'socket.io-client';
import Toolbar from '../../components/Toolbar';
import { Tools } from '../../constants/Tools';

// Define an interface for the background state
interface Background {
  color: string;
  texture: boolean;
  gridSize: number;
  textureOpacity: number;
}

export default function CanvasScreen() {
  const [socket, setSocket] = useState<any>(null);
  const [tool, setTool] = useState<Tools>(Tools.PEN);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [isShiftDown, setIsShiftDown] = useState<boolean>(false); // <-- Add state for Shift key
  // Keybinds
  const { keyEvent, startListening, stopListening } = useKeyEvent(false);
  useEffect(() => {
    startListening();
    return () => stopListening();
  }, [startListening, stopListening]);

  const skiaCanvasRef = useCanvasRef();
  const canvasComponentRef = useRef<CanvasComponentHandle>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        setIsShiftDown(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        setIsShiftDown(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      setIsShiftDown(false);
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        setIsShiftDown(true);
        // console.log('Web Shift Down');
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        setIsShiftDown(false);
        // console.log('Web Shift Up');
      }
    };

    // Add listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Cleanup listeners on component unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      // Reset shift state on cleanup just in case
      setIsShiftDown(false);
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      const shiftIsCurrentlyPressed = !!(
        keyEvent &&
        (keyEvent.key === 'ShiftLeft' || keyEvent.key === 'ShiftRight')
      );
      if (shiftIsCurrentlyPressed !== isShiftDown) {
        setIsShiftDown(shiftIsCurrentlyPressed);
      }
    }

    if (
      keyEvent &&
      keyEvent.key !== 'ShiftLeft' &&
      keyEvent.key !== 'ShiftRight'
    ) {
      switch (keyEvent.key) {
        case 'KeyZ':
          canvasComponentRef.current?.undo();
          break;
        case 'KeyY':
          canvasComponentRef.current?.redo();
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
    }
  }, [keyEvent, setTool, canvasComponentRef, isShiftDown]);

  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [color, setSelectedColor] = useState<string>('#000000');

  const [textModalVisible, setTextModalVisible] = useState<boolean>(false);
  const [textPosition, setTextPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  const [elementsOffset, setElementsOffset] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });

  const colorScheme = useColorScheme();

  const { id } = useLocalSearchParams();

  const [title, setTitle] = useState(id?.toString() ?? '');

  const {
    isPermissionModalVisible,
    isPermanentlyDenied,
    requestPermission,
    openSettings,
    hidePermissionModal,
  } = useMediaLibraryPermissions();

  const [backgroundColorPickerVisible, setBackgroundColorPickerVisible] =
    useState<boolean>(false);

  const [background, setBackground] = useState<Background>({
    color: '#F2F2F2',
    texture: false,
    gridSize: 20,
    textureOpacity: 0.1,
  });

  useEffect(() => {
    setSocket(io('http://localhost:3000/room'));

    return () => {
      socket?.emit('leaveRoom', { roomId: id });
    };
  }, []);

  const fontManager = useFontManager();

  const saveCanvasAsImage = useCallback(async () => {
    if (!skiaCanvasRef.current) {
      throw new Error('Canvas reference is not available');
    }

    let image;

    let elements = cloneDeep(canvasComponentRef.current?.getElements() ?? []);
    if (!elements) {
      console.warn('No elements found on canvas. Capturing empty canvas.');
      image = skiaCanvasRef?.current?.makeImageSnapshot();
    } else {
      console.log('FontManager', fontManager);

      image = await renderElementsOffscreen(
        elements,
        fontManager,
        10,
        background.color
      );
    }

    if (!image) {
      throw new Error('Failed to create image snapshot');
    }

    const base64 = image.encodeToBase64();
    if (!base64) {
      throw new Error('Failed to encode image to base64');
    }
    if (Platform.OS === 'web') {
      const link = document.createElement('a');
      link.href = `data:image/png;base64,${base64}`;
      link.download = `jraw-canvas-${new Date().toISOString().slice(0, 10)}.png`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      alert('Image downloaded');
    } else {
      const status = await requestPermission();
      if (status !== 'granted') {
        alert('Permission denied. Cannot save image.');
        return;
      }

      const fileName = `jraw-canvas-${new Date().getTime()}.png`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await MediaLibrary.saveToLibraryAsync(fileUri);

      await FileSystem.deleteAsync(fileUri, { idempotent: true });

      alert('Image saved to gallery');
    }

    console.log('Image saved successfully');
  }, [skiaCanvasRef, requestPermission]);

  const pickImage = useCallback(async () => {
    const size = canvasComponentRef.current?.getCanvasSize();
    if (!size || size.width === 0 || size.height === 0) {
      console.warn('Canvas size not available via ref yet.');
      return;
    }
    const { width: canvasWidth, height: canvasHeight } = size;

    const status = await requestPermission();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: false,
      quality: 0.7,
      exif: false,
      base64: false,
    });

    if (!result.canceled) {
      try {
        const imageAsset = result.assets[0];
        const imageWidth = imageAsset.width || 100;
        const imageHeight = imageAsset.height || 100;

        const { width: finalWidth, height: finalHeight } =
          processImageForCanvas(
            imageWidth,
            imageHeight,
            canvasWidth || 300,
            canvasHeight || 300
          );

        const centerX = (canvasWidth - finalWidth) / 2 - elementsOffset.x;
        const centerY = (canvasHeight - finalHeight) / 2 - elementsOffset.y;

        const imageElement = {
          uri: imageAsset.uri,
          point: { x: centerX, y: centerY },
          width: finalWidth,
          height: finalHeight,
        };

        canvasComponentRef.current?.addExternalElement(
          imageElement,
          Tools.IMAGE
        );
      } catch (error) {
        console.error('Error processing image:', error);
      }
    }
  }, [elementsOffset, requestPermission]);

  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <TextInput
              value={title}
              onChangeText={setTitle}
              style={[
                styles.headerTitleInput,
                { color: colorScheme === 'dark' ? 'white' : 'black' },
              ]}
              placeholder="Untitled Canvas"
              placeholderTextColor={colorScheme === 'dark' ? '#888' : '#aaa'}
            />
          ),
          headerStyle: {
            backgroundColor: colorScheme === 'dark' ? 'black' : 'white',
          },
          headerTintColor: colorScheme === 'dark' ? 'white' : 'black',
        }}
      />
      <CanvasComponent
        ref={canvasComponentRef}
        canvasRef={skiaCanvasRef}
        tool={tool}
        strokeWidth={strokeWidth}
        color={color}
        background={background}
        elementsOffset={elementsOffset}
        setElementsOffset={setElementsOffset}
        onTapText={(x: number, y: number) => {
          setTextPosition({ x, y });
          setTextModalVisible(true);
        }}
        onDrawingStateChange={setIsDrawing}
        isShiftDown={isShiftDown}
      />

      <View style={styles.controlsContainer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            onPress={() => canvasComponentRef.current?.undo()}
            style={styles.controlButton}
          >
            <MaterialIcons name="undo" size={24} color="black" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => canvasComponentRef.current?.redo()}
            style={styles.controlButton}
          >
            <MaterialIcons name="redo" size={24} color="black" />
          </TouchableOpacity>
          <TouchableOpacity onPress={pickImage} style={styles.controlButton}>
            <MaterialIcons name="image" size={24} color="black" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={saveCanvasAsImage}
            style={styles.controlButton}
          >
            <MaterialIcons name="save" size={24} color="black" />
          </TouchableOpacity>
          <TouchableOpacity
            // Open the color picker modal
            onPress={() => setBackgroundColorPickerVisible(true)}
            style={styles.controlButton}
          >
            <MaterialCommunityIcons
              name="format-color-fill"
              size={24}
              color="black"
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => canvasComponentRef.current?.clear()}
            style={[styles.controlButton, styles.clearButton]}
          >
            <FontAwesome name="trash" size={24} color="black" />
          </TouchableOpacity>
        </View>
      </View>
      <Toolbar
        tool={tool}
        onToolChange={(newTool: Tools) => {
          setTool(newTool);
        }}
        onStrokeWidthChange={setStrokeWidth}
        onColorChange={setSelectedColor}
        isDrawing={isDrawing}
      />
      <TextModal
        visible={textModalVisible}
        position={textPosition}
        onCancel={() => setTextModalVisible(false)}
        onSubmit={(textElement: CanvasElements.Text) => {
          canvasComponentRef.current?.addExternalElement(
            textElement,
            Tools.TEXT
          );
          setTextModalVisible(false);
        }}
        initialText={{
          color: color,
          fontSize: 20,
        }}
      />

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

      <ColorPickerModal
        visible={backgroundColorPickerVisible}
        initialBackground={background}
        onSelectBackground={(newBackground: Background) => {
          setBackground(newBackground);
          setBackgroundColorPickerVisible(false);
        }}
        onCancel={() => setBackgroundColorPickerVisible(false)}
      />
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
  backButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderRadius: 50,
    marginHorizontal: 5,
  },
  headerTitleInput: {
    fontSize: 17,
    fontWeight: 'bold',
    flex: 1,
    marginHorizontal: 10,
    borderWidth: 0,
    padding: 0,
    ...(Platform.OS === 'web' && {
      outline: 'none',
    }),
  },
});
