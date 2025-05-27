import CanvasComponent, {
  CanvasComponentHandle,
} from '@/components/CanvasComponent';
import ColorPickerModal from '@/components/ColorPickerModal';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { processImageForCanvas } from '@/hooks/tool-handlers';
import { useFontManager } from '@/hooks/useFontManager';
import { useMediaLibraryPermissions } from '@/hooks/useMediaLibraryPermissions';
import { API_URL, useAuthStore } from '@/utils/auth.store';
import { ELECTRIC_URL, envParams } from '@/utils/electric';
import { renderElementsOffscreen } from '@/utils/offscreenRenderer';
import { Row } from '@electric-sql/client/model';
import { useShape } from '@electric-sql/react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCanvasRef } from '@shopify/react-native-skia';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
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
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import Toolbar from '../../components/Toolbar';
import { Tools } from '../../constants/Tools';

// Define an interface for the background state
interface Background {
  color: string;
  texture: boolean;
  gridSize: number;
  textureOpacity: number;
}

// Define an interface for the Room shape
interface Room extends Row {
  id: string;
  name: string;
  owner_id: string;
  created_at: string; // Assuming string representation from ElectricSQL
  updated_at: string; // Assuming string representation from ElectricSQL
  // Add index signature for compatibility with ElectricSQL Row type
  [key: string]: any;
}

export default function CanvasScreen() {
  // Get the roomId from the URL /canvas/[id]/
  const { id: roomId } = useLocalSearchParams<{ id: string }>();
  const { token: authToken } = useAuthStore();

  // Subscribe to room data for real-time updates to the name
  const { data: roomData, isLoading: isRoomLoading } = useShape<Room>({
    url: `${ELECTRIC_URL}/v1/shape`,
    params: {
      table: 'rooms',
      where: `id = '${roomId}'`,
      ...envParams,
    },
  });

  const currentRoom = roomData?.[0];
  const [title, setTitle] = useState<string>(
    currentRoom?.name ?? roomId?.toString() ?? 'Untitled'
  );
  const [isTitleInputFocused, setIsTitleInputFocused] =
    useState<boolean>(false);
  const [isSubmittingTitle, setIsSubmittingTitle] = useState<boolean>(false);

  // Effect to update local title when roomData changes from ElectricSQL
  useEffect(() => {
    if (
      !isTitleInputFocused &&
      !isSubmittingTitle &&
      currentRoom &&
      currentRoom.name !== title
    ) {
      setTitle(currentRoom.name as string);
    }
  }, [currentRoom, title, isTitleInputFocused, isSubmittingTitle, setTitle]);

  console.log('CanvasScreen', roomId);

  const [tool, setTool] = useState<Tools>(Tools.PEN);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [isShiftDown, setIsShiftDown] = useState<boolean>(false); // <-- Add state for Shift key
  const [selectedEmoji, setSelectedEmoji] = useState<string>('😀'); // Add selectedEmoji state
  // Keybinds
  const { keyEvent, startListening, stopListening } = useKeyEvent(false);
  useEffect(() => {
    startListening();
    return () => stopListening();
  }, [startListening, stopListening]);

  const skiaCanvasRef = useCanvasRef();
  const canvasComponentRef = useRef<CanvasComponentHandle>(null);
  const canvasWrapperRef = useRef<any>(null);

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
          canvasComponentRef.current
            ?.undo()
            .catch(e => console.error('Error during undo:', e));
          break;
        case 'KeyY':
          canvasComponentRef.current
            ?.redo()
            .catch(e => console.error('Error during redo:', e));
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

  const [isMiddleMouseDown, setIsMiddleMouseDown] = useState<boolean>(false);
  const [lastPanPosition, setLastPanPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [elementsOffset, setElementsOffset] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });

  const colorScheme = useColorScheme();

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
      console.log('Saving image from web');
      if ('__TAURI_INTERNALS__' in window) {
        console.log('Saving image from Tauri');
        // Tauri-specific file saving
        const filePath = await save({
          filters: [
            {
              name: 'Images',
              extensions: ['png'],
            },
          ],
        });

        console.log('File path:', filePath);

        if (filePath) {
          const binaryData = Uint8Array.from(atob(base64), c =>
            c.charCodeAt(0)
          );
          await writeFile(filePath, binaryData);
          alert('Image saved successfully');
        }
        return;
      }

      const link = document.createElement('a');
      link.href = `data:image/png;base64,${base64}`;
      link.download = `jraw-canvas-${new Date().toISOString().slice(0, 10)}.png`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      alert('Image downloaded');
    } else {
      console.log('Saving image from mobile');
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
  const [zoomLevel, setZoomLevel] = useState(1); //initializes zoom level to 1
  const [isDropdownVisible, setIsDropdownVisible] = useState(false); // Add dropdown state
  const handleZoomIn = () => {
    setZoomLevel(Math.min(zoomLevel + 0.1, 2.5)); //max zoom level is 250%
  };
  const handleZoomOut = () => {
    setZoomLevel(Math.max(zoomLevel - 0.1, 0.1));
  };
  const handleZoomReset = () => {
    setZoomLevel(1); //resets zoom level to 100%
  };

  const handleCanvasZoomChange = useCallback(
    (newScale: number) => {
      setZoomLevel(newScale);
    },
    [setZoomLevel]
  );

  useEffect(() => {
    if (Platform.OS !== 'web' || !canvasWrapperRef.current) {
      return;
    }

    const canvasDiv = canvasWrapperRef.current as HTMLElement; // More specific type for web

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.ctrlKey) {
        // Pinch-to-zoom or Ctrl + Scroll
        const delta = event.deltaY;
        const scaleAmount = 1.05; // Factor for multiplicative zoom

        let newZoomLevel = zoomLevel;
        if (delta < 0) {
          // Zoom In (pinch out / scroll wheel up)
          newZoomLevel = zoomLevel * scaleAmount;
        } else if (delta > 0) {
          // Zoom Out (pinch in / scroll wheel down)
          newZoomLevel = zoomLevel / scaleAmount;
        }

        newZoomLevel = Math.max(0.1, Math.min(newZoomLevel, 2.5)); // Clamp zoom level

        if (newZoomLevel !== zoomLevel) {
          handleCanvasZoomChange(newZoomLevel);
        }
      } else {
        // Two-finger pan (comes as wheel events without ctrlKey on touchpads)
        const panSensitivity = 1; // Adjust sensitivity as needed
        const newOffsetX = elementsOffset.x - event.deltaX * panSensitivity;
        const newOffsetY = elementsOffset.y - event.deltaY * panSensitivity;
        // Here, we directly set elementsOffset, or we could adapt handleCanvasZoomChange
        // or create a new specific handler if pan should also affect zoom (which is not typical for this case)
        setElementsOffset({ x: newOffsetX, y: newOffsetY });
      }
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button === 1) {
        // Middle mouse button
        event.preventDefault();
        setIsMiddleMouseDown(true);
        setLastPanPosition({ x: event.clientX, y: event.clientY });
        canvasDiv.style.cursor = 'grabbing'; // Optional: change cursor
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (isMiddleMouseDown && lastPanPosition) {
        event.preventDefault();
        const deltaX = event.clientX - lastPanPosition.x;
        const deltaY = event.clientY - lastPanPosition.y;

        setElementsOffset(prevOffset => ({
          x: prevOffset.x + deltaX,
          y: prevOffset.y + deltaY,
        }));
        setLastPanPosition({ x: event.clientX, y: event.clientY });
      }
    };

    const handleMouseUp = (event: MouseEvent) => {
      if (event.button === 1 && isMiddleMouseDown) {
        // Middle mouse button
        event.preventDefault();
        setIsMiddleMouseDown(false);
        setLastPanPosition(null);
        canvasDiv.style.cursor = 'default'; // Optional: reset cursor
      }
    };

    // Add event listener with passive: false to allow preventDefault
    canvasDiv.addEventListener('wheel', handleWheel, { passive: false });
    canvasDiv.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove); // Listen on window for smoother panning
    window.addEventListener('mouseup', handleMouseUp); // Listen on window

    return () => {
      canvasDiv.removeEventListener('wheel', handleWheel);
      canvasDiv.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (canvasDiv) {
        canvasDiv.style.cursor = 'default'; // Ensure cursor is reset on unmount
      }
    };
  }, [
    zoomLevel,
    elementsOffset,
    handleCanvasZoomChange,
    setElementsOffset,
    isMiddleMouseDown,
    lastPanPosition,
  ]); // Dependencies

  const updateColorFromEyeDropper = useCallback(
    (pickedColor: string) => {
      // Pass the picked color to the appropriate state or callback
      setSelectedColor(pickedColor);

      // If eye dropper was active, switch back to the previous tool
      if (tool === Tools.EYEDROPPER) {
        setTool(Tools.PEN);
      }
    },
    [setSelectedColor, tool, setTool]
  );

  const updateRoomNameAPI = useCallback(
    async (newName: string) => {
      if (!roomId || !newName.trim()) {
        console.warn('Room ID or new name is missing, skipping update.');
        return;
      }
      // Prevent API call if the name hasn't changed from the synced version
      // relative to the currentRoom state at the time of this function call.
      if (currentRoom && newName.trim() === currentRoom.name) {
        console.log('Room name has not changed, skipping update.');
        return;
      }

      const originalNameFromServer = currentRoom?.name as string | undefined;
      setIsSubmittingTitle(true);

      try {
        const response = await fetch(`${API_URL}/room/${roomId}/name`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({ name: newName.trim() }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`API Error (${response.status}): ${errorText}`);
          if (originalNameFromServer !== undefined) {
            setTitle(originalNameFromServer);
          } else {
            // Fallback if there was no known server name (e.g. initial load error)
            setTitle(roomId?.toString() ?? 'Untitled');
          }
          throw new Error(
            `API error: ${response.status} ${response.statusText}`
          );
        }
        // On successful API call, the local `title` is already the optimistic newName.
        // ElectricSQL will sync, and the useEffect might align it if there was any discrepancy,
        // but typically currentRoom.name will become newName.
        console.log('Room name updated successfully via API.');
      } catch (error) {
        console.error('Failed to update room name:', error);
        // Revert to original server name on any error if it was known
        if (originalNameFromServer !== undefined) {
          setTitle(originalNameFromServer);
        } else {
          setTitle(roomId?.toString() ?? 'Untitled');
        }
      } finally {
        setIsSubmittingTitle(false);
      }
    },
    [roomId, authToken, currentRoom, setTitle, setIsSubmittingTitle] // Added setIsSubmittingTitle
  );

  const handleEmojiChange = useCallback((emoji: string) => {
    setSelectedEmoji(emoji);
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <TextInput
              value={title}
              onChangeText={setTitle}
              onFocus={() => setIsTitleInputFocused(true)}
              onBlur={() => {
                const currentTitleOnBlur = title; // Capture the optimistic title
                setIsTitleInputFocused(false);
                updateRoomNameAPI(currentTitleOnBlur);
              }}
              onEndEditing={() => {
                // onEndEditing can also trigger the update.
                // Ensure isTitleInputFocused is false if this is the primary submission action.
                // However, onBlur will likely handle most cases.
                setIsTitleInputFocused(false); // Ensure focus state is correct
                updateRoomNameAPI(title);
              }}
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
      <View
        ref={canvasWrapperRef}
        style={{ flex: 1, overflow: 'hidden' }} // Added a wrapper View for event handling
      >
        <CanvasComponent
          zoomScale={zoomLevel}
          ref={canvasComponentRef}
          canvasRef={skiaCanvasRef}
          tool={tool}
          strokeWidth={strokeWidth}
          color={color}
          background={background}
          elementsOffset={elementsOffset}
          setElementsOffset={setElementsOffset} // For one-finger pan and direct manipulation in CanvasComponent
          onDrawingStateChange={setIsDrawing}
          isShiftDown={isShiftDown}
          onEyeDropperColor={updateColorFromEyeDropper}
          roomId={roomId?.toString() ?? ''}
          onZoomChange={handleCanvasZoomChange} // Pass the new callback here
          selectedEmoji={selectedEmoji} // Pass selectedEmoji
        />
      </View>

      <View style={styles.controlsContainer}>
        <View style={styles.buttonRow}>
          {/*Zoom tool buttons */}
          <View style={styles.zoomButtons}>
            <TouchableOpacity
              onPress={handleZoomIn}
              style={styles.controlButton}
            >
              <MaterialIcons name="zoom-in" size={24} color="black" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleZoomReset}>
              <Text>{Math.round(zoomLevel * 100)}%</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleZoomOut}
              style={styles.controlButton}
            >
              <MaterialIcons name="zoom-out" size={24} color="black" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={() =>
              canvasComponentRef.current
                ?.undo()
                .catch(e => console.error('Error during undo:', e))
            }
            style={styles.controlButton}
          >
            <MaterialIcons name="undo" size={24} color="black" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              canvasComponentRef.current
                ?.redo()
                .catch(e => console.error('Error during redo:', e))
            }
            style={styles.controlButton}
          >
            <MaterialIcons name="redo" size={24} color="black" />
          </TouchableOpacity>

          {/* Mobile: Show dropdown menu button */}
          {Platform.OS !== 'web' ? (
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                onPress={() => setIsDropdownVisible(!isDropdownVisible)}
                style={[styles.controlButton, styles.dropdownButton]}
              >
                <MaterialIcons name="more-vert" size={24} color="black" />
              </TouchableOpacity>

              {/* Dropdown Menu */}
              {isDropdownVisible && (
                <View style={styles.dropdownMenu}>
                  <TouchableOpacity
                    onPress={() => {
                      pickImage();
                      setIsDropdownVisible(false);
                    }}
                    style={styles.dropdownItem}
                  >
                    <MaterialIcons name="image" size={20} color="black" />
                    <Text style={styles.dropdownText}>Add Image</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      saveCanvasAsImage();
                      setIsDropdownVisible(false);
                    }}
                    style={styles.dropdownItem}
                  >
                    <MaterialIcons name="save" size={20} color="black" />
                    <Text style={styles.dropdownText}>Save Canvas</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setBackgroundColorPickerVisible(true);
                      setIsDropdownVisible(false);
                    }}
                    style={styles.dropdownItem}
                  >
                    <MaterialCommunityIcons
                      name="format-color-fill"
                      size={20}
                      color="black"
                    />
                    <Text style={styles.dropdownText}>Background</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      canvasComponentRef.current
                        ?.clear()
                        .catch(e => console.error('Error during clear:', e));
                      setIsDropdownVisible(false);
                    }}
                    style={[styles.dropdownItem, styles.clearDropdownItem]}
                  >
                    <FontAwesome name="trash" size={20} color="#FF3B30" />
                    <Text
                      style={[styles.dropdownText, styles.clearDropdownText]}
                    >
                      Clear Canvas
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            /* Web: Show all buttons as before */
            <>
              <TouchableOpacity
                onPress={pickImage}
                style={styles.controlButton}
              >
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
                onPress={() =>
                  canvasComponentRef.current
                    ?.clear()
                    .catch(e => console.error('Error during clear:', e))
                }
                style={[styles.controlButton, styles.clearButton]}
              >
                <FontAwesome name="trash" size={24} color="black" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Close dropdown when tapping outside */}
      {isDropdownVisible && Platform.OS !== 'web' && (
        <TouchableOpacity
          style={styles.dropdownOverlay}
          onPress={() => setIsDropdownVisible(false)}
          activeOpacity={1}
        />
      )}

      <Toolbar
        tool={tool}
        onToolChange={(newTool: Tools) => {
          setTool(newTool);
        }}
        onStrokeWidthChange={setStrokeWidth}
        onColorChange={setSelectedColor}
        isDrawing={isDrawing}
        color={color}
        onEmojiChange={handleEmojiChange} // Pass handleEmojiChange
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
        onSelectBackground={background => {
          setBackground(background);
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
  dropdownContainer: {
    position: 'relative',
  },
  dropdownButton: {
    backgroundColor: 'white',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 55,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 150,
    zIndex: 1000,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownText: {
    marginLeft: 10,
    fontSize: 14,
    color: 'black',
  },
  clearDropdownItem: {
    borderBottomWidth: 0,
  },
  clearDropdownText: {
    color: '#FF3B30',
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
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
  zoomButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 50,
  },
});
