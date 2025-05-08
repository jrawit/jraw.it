import PropertiesPanel from '@/components/PropertiesPanel';
import SelectionContextMenu from '@/components/SelectionContextMenu';
import SelectionOverlay from '@/components/SelectionOverlay';
import TextEditor from '@/components/TextEditor';
import { Circle } from '@/components/tools/Circle';
import { Image } from '@/components/tools/Image';
import { Line } from '@/components/tools/Line';
import { Path } from '@/components/tools/Path';
import { Rect } from '@/components/tools/Rectangle';
import { Star } from '@/components/tools/Star';
import { Text } from '@/components/tools/Text';
import { Triangle } from '@/components/tools/Triangle';
import { CanvasElements } from '@/constants/CanvasElement';
import { ToolData, Tools } from '@/constants/Tools';
import { CanvasElement, useCanvas } from '@/hooks/useCanvas';
import { useFontManager } from '@/hooks/useFontManager';
import {
  AlphaType,
  Canvas,
  ColorType,
  Fill,
  Group,
  SkImage,
} from '@shopify/react-native-skia';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

interface Background {
  color: string;
  texture: boolean;
  gridSize: number;
  textureOpacity: number;
}

export interface CanvasComponentHandle {
  getCanvasSize: () => { width: number; height: number };
  getElements: () => CanvasElement[];
  undo: () => void;
  redo: () => void;
  clear: () => void;
  addExternalElement: (element: CanvasElements.Any, tool: Tools) => void;
  modifyElement: (id: string, newElement: CanvasElements.Any) => void;
}

interface CanvasComponentProps {
  canvasRef: React.RefObject<any>;
  tool: Tools;
  strokeWidth: number;
  color: string;
  background: Background;
  elementsOffset: { x: number; y: number };
  setElementsOffset: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  onDrawingStateChange: (isDrawing: boolean) => void;
  isShiftDown: boolean;
  onEyeDropperColor?: (color: string) => void;
  zoomScale?: number; // Add zoom scale prop
}

const CanvasComponent = forwardRef<CanvasComponentHandle, CanvasComponentProps>(
  (props, ref) => {
    const {
      canvasRef,
      tool,
      strokeWidth,
      color,
      background: backgroundState,
      elementsOffset,
      setElementsOffset,
      onDrawingStateChange,
      isShiftDown,
      onEyeDropperColor,
      zoomScale = 1,
    } = props;

    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
    const [currentMovingElementOffset, setCurrentElementOffset] = useState<{
      x: number;
      y: number;
    }>({ x: 0, y: 0 });
    const [hoverPoint, setHoverPoint] = useState<{
      x: number;
      y: number;
    } | null>(null);
    const [highlighterAngle, setHighlighterAngle] = useState<number>(0);
    const [previousPoint, setPreviousPoint] = useState<{
      x: number;
      y: number;
    } | null>(null);
    const [pendingTextCreation, setPendingTextCreation] = useState<{
      position: { x: number; y: number };
      textElement: CanvasElements.Text;
    } | null>(null);

    const fontManager = useFontManager();

    // Function to transform canvas coordinates to screen coordinates
    const canvasToScreenCoords = useCallback(
      (canvasX: number, canvasY: number) => {
        const centerX = canvasSize.width / 2;
        const centerY = canvasSize.height / 2;

        // Step 1: Normalize coordinates to canvas center
        const normalizedX = canvasX - centerX;
        const normalizedY = canvasY - centerY;

        // Step 2: Apply zoom
        const zoomedX = normalizedX * zoomScale;
        const zoomedY = normalizedY * zoomScale;

        // Step 3: Move back from center
        const repositionedX = zoomedX + centerX;
        const repositionedY = zoomedY + centerY;

        // Step 4: Apply pan offset
        const finalX = repositionedX + elementsOffset.x;
        const finalY = repositionedY + elementsOffset.y;

        return { x: finalX, y: finalY };
      },
      [canvasSize, zoomScale, elementsOffset]
    );

    // Function to get the color of the element at specific coordinates
    const getPixelColorAt = useCallback(
      (x: number, y: number): string => {
        try {
          const image = canvasRef.current?.makeImageSnapshot() as SkImage;
          if (!image) {
            return color;
          }

          const pixel = image.readPixels(x, y, {
            width: 1,
            height: 1,
            colorType: ColorType.RGBA_8888,
            alphaType: AlphaType.Unpremul,
          });

          if (!pixel) {
            console.error('Failed to read pixel color');
            return color; // Return current color if pixel reading fails
          }

          const r = pixel[0];
          const g = pixel[1];
          const b = pixel[2];

          // Convert to hex color format
          const hexColor = `#${((1 << 24) + (r << 16) + (g << 8) + b)
            .toString(16)
            .slice(1)}`;
          return hexColor;
        } catch (error) {
          console.error('Error reading pixel color:', error);
          return color;
        }
      },
      [canvasRef, color]
    );

    const {
      elements,
      currentElement,
      selection,
      onStartInput,
      onMoveInput,
      onEndInput,
      undo,
      redo,
      clear,
      addExternalElement,
      modifyElement,
      deleteSelection,
      duplicateSelection,
    } = useCanvas({
      tool,
      strokeWidth,
      color,
      fontManager,
      isShiftDown,
    });

    useImperativeHandle(
      ref,
      () => ({
        getCanvasSize: () => canvasSize,
        getElements: () => elements,
        undo,
        redo,
        clear,
        addExternalElement,
        modifyElement,
      }),
      [
        canvasSize,
        elements,
        undo,
        redo,
        clear,
        addExternalElement,
        modifyElement,
      ]
    );

    // In case our tool changes, we need to finalize pending text creation
    useEffect(() => {
      if (
        pendingTextCreation &&
        tool !== Tools.TEXT &&
        pendingTextCreation.textElement.text.trim() // Check if text is not empty
      ) {
        addExternalElement(pendingTextCreation?.textElement, Tools.TEXT);
        setPendingTextCreation(null);
      }
      if (tool !== Tools.TEXT && pendingTextCreation) {
        setPendingTextCreation(null);
      }
    }, [tool, pendingTextCreation, addExternalElement]);

    const selectedCanvasElements = useMemo(() => {
      if (!selection || !selection.selected) {
        return [];
      }
      return elements.filter(element => selection.ids.includes(element.id));
    }, [elements, selection]);

    // Helper for coordinate adjustments - used in multiple gesture handlers
    const getAdjustedCoordinates = useCallback(
      (x: number, y: number) => {
        // Apply inverse of center-based transform to convert screen coords to canvas element coords
        const centerX = canvasSize.width / 2;
        const centerY = canvasSize.height / 2;

        // Step 1: Remove pan offset (inverse of step 4 in mainGroupTransform)
        const offsetX =
          elementsOffset.x +
          (tool === Tools.PAN ? currentMovingElementOffset.x : 0);
        const offsetY =
          elementsOffset.y +
          (tool === Tools.PAN ? currentMovingElementOffset.y : 0);
        const unpannedX = x - offsetX;
        const unpannedY = y - offsetY;

        // Step 2: Normalize to center (inverse of step 3 in mainGroupTransform)
        const normalizedX = unpannedX - centerX;
        const normalizedY = unpannedY - centerY;

        // Step 3: Remove zoom (inverse of step 2 in mainGroupTransform)
        const unzoomedX = normalizedX / zoomScale;
        const unzoomedY = normalizedY / zoomScale;

        // Step 4: Move back from center (inverse of step 1 in mainGroupTransform)
        const finalX = unzoomedX + centerX;
        const finalY = unzoomedY + centerY;

        return { x: finalX, y: finalY };
      },
      [elementsOffset, zoomScale, canvasSize, tool, currentMovingElementOffset]
    );

    const handleTapStart = useCallback(
      (e: { x: number; y: number }) => {
        const { x: adjustedX, y: adjustedY } = getAdjustedCoordinates(e.x, e.y);

        if (tool === Tools.EYEDROPPER) {
          const pickedColor = getPixelColorAt(e.x, e.y);
          if (onEyeDropperColor) {
            onEyeDropperColor(pickedColor);
          }
          return;
        }

        if (tool === Tools.TEXT) {
          if (pendingTextCreation) {
            return;
          }
          setPendingTextCreation({
            position: { x: adjustedX, y: adjustedY },
            textElement: {
              text: '',
              point: { x: adjustedX, y: adjustedY },
              fontSize: 20,
              fontFamily: 'Roboto',
              fontWeight: 'normal',
              fontStyle: 'normal',
              color,
            },
          });
        } else {
          onDrawingStateChange(true);
          onStartInput(adjustedX, adjustedY);
        }
      },
      [
        getAdjustedCoordinates,
        tool,
        getPixelColorAt,
        onEyeDropperColor,
        pendingTextCreation,
        color,
        onDrawingStateChange,
        onStartInput,
      ]
    );

    const handleTapEnd = useCallback(
      (e: { x: number; y: number }) => {
        if (tool !== Tools.TEXT) {
          const { x: adjustedX, y: adjustedY } = getAdjustedCoordinates(
            e.x,
            e.y
          );
          onEndInput(adjustedX, adjustedY);
          onDrawingStateChange(false);
        }
      },
      [getAdjustedCoordinates, tool, onEndInput, onDrawingStateChange]
    );

    const handlePanStart = useCallback(
      (e: { x: number; y: number }) => {
        setPreviousPoint(null);
        if (tool !== Tools.PAN) {
          const { x: adjustedX, y: adjustedY } = getAdjustedCoordinates(
            e.x,
            e.y
          );
          onDrawingStateChange(true);
          onStartInput(adjustedX, adjustedY);
        }
      },
      [getAdjustedCoordinates, tool, onDrawingStateChange, onStartInput]
    );

    const handlePanChange = useCallback(
      (e: {
        x: number;
        y: number;
        translationX: number;
        translationY: number;
      }) => {
        if (tool === Tools.PAN) {
          setCurrentElementOffset({
            x: e.translationX,
            y: e.translationY,
          });
        } else {
          const { x: adjustedX, y: adjustedY } = getAdjustedCoordinates(
            e.x,
            e.y
          );
          onMoveInput(adjustedX, adjustedY);
        }
      },
      [getAdjustedCoordinates, tool, onMoveInput]
    );

    const handlePanEnd = useCallback(
      (e: {
        x: number;
        y: number;
        translationX: number;
        translationY: number;
      }) => {
        setPreviousPoint(null);
        if (tool !== Tools.PAN) {
          const { x: adjustedX, y: adjustedY } = getAdjustedCoordinates(
            e.x,
            e.y
          );
          onDrawingStateChange(false);
          onEndInput(adjustedX, adjustedY);
        } else {
          setElementsOffset(prev => ({
            x: prev.x + e.translationX,
            y: prev.y + e.translationY,
          }));
          setCurrentElementOffset({ x: 0, y: 0 });
        }
      },
      [
        getAdjustedCoordinates,
        tool,
        onDrawingStateChange,
        onEndInput,
        setElementsOffset,
      ]
    );

    const handleTwoFingerPanChange = useCallback(
      (e: { translationX: number; translationY: number }) => {
        setCurrentElementOffset({
          x: e.translationX,
          y: e.translationY,
        });
      },
      []
    );

    const handleTwoFingerPanEnd = useCallback(
      (e: { translationX: number; translationY: number }) => {
        setElementsOffset(prev => ({
          x: prev.x + e.translationX,
          y: prev.y + e.translationY,
        }));
        setCurrentElementOffset({ x: 0, y: 0 });
      },
      [setElementsOffset]
    );

    const handleHoverBegin = useCallback(
      (e: { x: number; y: number }) => {
        const { x: adjustedX, y: adjustedY } = getAdjustedCoordinates(e.x, e.y);
        setPreviousPoint(null);
        setHoverPoint({ x: adjustedX, y: adjustedY });
      },
      [getAdjustedCoordinates]
    );

    const handleHoverChange = useCallback(
      (e: { x: number; y: number }) => {
        const { x: adjustedX, y: adjustedY } = getAdjustedCoordinates(e.x, e.y);

        setPreviousPoint(hoverPoint);
        if (tool === Tools.HIGHLIGHTER && previousPoint) {
          const dx = adjustedX - previousPoint.x;
          const dy = adjustedY - previousPoint.y;
          if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
            const angle = Math.atan2(dy, dx);
            setHighlighterAngle(angle);
          }
        }

        setHoverPoint({ x: adjustedX, y: adjustedY });
      },
      [getAdjustedCoordinates, hoverPoint, previousPoint, tool]
    );

    const handleHoverEnd = useCallback(() => {
      setHoverPoint(null);
      setPreviousPoint(null);
    }, []);

    const tap = useMemo(() => {
      return Gesture.Tap()
        .runOnJS(true)
        .onStart(handleTapStart)
        .onEnd(handleTapEnd);
    }, [handleTapStart, handleTapEnd]);

    const pan = useMemo(() => {
      return Gesture.Pan()
        .runOnJS(true)
        .minDistance(5)
        .onStart(handlePanStart)
        .onChange(handlePanChange)
        .onEnd(handlePanEnd);
    }, [handlePanStart, handlePanChange, handlePanEnd]);

    const twoFingerPan = useMemo(() => {
      return Gesture.Pan()
        .runOnJS(true)
        .minPointers(2)
        .onChange(handleTwoFingerPanChange)
        .onEnd(handleTwoFingerPanEnd);
    }, [handleTwoFingerPanChange, handleTwoFingerPanEnd]);

    const hover = useMemo(() => {
      return Gesture.Hover()
        .runOnJS(true)
        .onBegin(handleHoverBegin)
        .onChange(handleHoverChange)
        .onEnd(handleHoverEnd);
    }, [handleHoverBegin, handleHoverChange, handleHoverEnd]);

    const getElement = useCallback((canvasElement: CanvasElement) => {
      const { id, element, tool: elementTool } = canvasElement;
      switch (elementTool) {
        case Tools.PEN:
        case Tools.HIGHLIGHTER:
        case Tools.ERASER:
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
          console.warn(`Unhandled tool type: ${elementTool}`);
          return null;
      }
    }, []);

    const handleLayout = useCallback((event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      setCanvasSize({ width, height });
    }, []);

    // Memoize the transform for the Group components to prevent unnecessary re-renders
    const mainGroupTransform = useMemo(() => {
      return [
        { translate: [canvasSize.width / 2, canvasSize.height / 2] },
        { scale: zoomScale },
        { translate: [-canvasSize.width / 2, -canvasSize.height / 2] },
        {
          translate: [
            (elementsOffset.x +
              (tool === Tools.PAN ? currentMovingElementOffset.x : 0)) /
              zoomScale,
            (elementsOffset.y +
              (tool === Tools.PAN ? currentMovingElementOffset.y : 0)) /
              zoomScale,
          ],
        },
      ];
    }, [
      zoomScale,
      elementsOffset.x,
      elementsOffset.y,
      tool,
      currentMovingElementOffset.x,
      currentMovingElementOffset.y,
    ]);

    const textureGroupTransform = useMemo(() => {
      return [
        { scale: zoomScale },
        {
          translate: [
            elementsOffset.x +
              (tool === Tools.PAN ? currentMovingElementOffset.x : 0),
            elementsOffset.y +
              (tool === Tools.PAN ? currentMovingElementOffset.y : 0),
          ],
        },
      ];
    }, [
      zoomScale,
      elementsOffset.x,
      elementsOffset.y,
      tool,
      currentMovingElementOffset.x,
      currentMovingElementOffset.y,
    ]);

    // Memoize the rendered grid lines to prevent unnecessary recalculations
    const gridLines = useMemo(() => {
      if (
        !backgroundState.texture ||
        canvasSize.width <= 0 ||
        canvasSize.height <= 0
      ) {
        return [];
      }

      const { width: canvasWidth, height: canvasHeight } = canvasSize;
      const startY =
        Math.floor(
          (-elementsOffset.y - canvasHeight) / backgroundState.gridSize
        ) * backgroundState.gridSize;
      const endY =
        Math.ceil(
          (-elementsOffset.y + 2 * canvasHeight) / backgroundState.gridSize
        ) * backgroundState.gridSize;
      const startX =
        Math.floor(
          (-elementsOffset.x - canvasWidth) / backgroundState.gridSize
        ) * backgroundState.gridSize;
      const endX =
        Math.ceil(
          (-elementsOffset.x + 2 * canvasWidth) / backgroundState.gridSize
        ) * backgroundState.gridSize;

      const numHorizontalLines =
        Math.ceil((endY - startY) / backgroundState.gridSize) + 1;
      const numVerticalLines =
        Math.ceil((endX - startX) / backgroundState.gridSize) + 1;
      const lines = [];

      for (let i = 0; i < numHorizontalLines; i++) {
        const y = startY + i * backgroundState.gridSize;
        lines.push(
          <Line
            key={`h-${y}`}
            lineData={{
              startPoint: { x: startX - 5000, y: y },
              endPoint: { x: endX + 5000, y: y },
              strokeWidth: 1,
              strokeColor: `rgba(0,0,0,${backgroundState.textureOpacity})`,
            }}
          />
        );
      }

      for (let i = 0; i < numVerticalLines; i++) {
        const x = startX + i * backgroundState.gridSize;
        lines.push(
          <Line
            key={`v-${x}`}
            lineData={{
              startPoint: { x: x, y: startY - 5000 },
              endPoint: { x: x, y: endY + 5000 },
              strokeWidth: 1,
              strokeColor: `rgba(0,0,0,${backgroundState.textureOpacity})`,
            }}
          />
        );
      }

      return lines;
    }, [
      backgroundState.texture,
      backgroundState.gridSize,
      backgroundState.textureOpacity,
      canvasSize,
      elementsOffset.x,
      elementsOffset.y,
    ]);

    // Memoize the elements rendering to prevent unnecessary re-renders
    const renderedElements = useMemo(() => {
      return elements.map(element => getElement(element));
    }, [elements, getElement]);

    // Memoize hover cursors to prevent unnecessary re-renders
    const hoverCursor = useMemo(() => {
      if (!hoverPoint) return null;

      if ([Tools.PEN, Tools.ERASER].includes(tool)) {
        return (
          <Circle
            circleData={{
              center: hoverPoint,
              radiusX: strokeWidth / 2,
              radiusY: strokeWidth / 2,
              strokeWidth: 1,
              strokeColor: 'black',
            }}
          />
        );
      }

      if (tool === Tools.HIGHLIGHTER) {
        return (
          <Group
            transform={[
              { translateX: hoverPoint.x },
              { translateY: hoverPoint.y },
              { rotate: highlighterAngle },
              { translateX: -hoverPoint.x },
              { translateY: -hoverPoint.y },
            ]}
          >
            <Rect
              rectData={{
                point: {
                  x:
                    hoverPoint.x -
                    ToolData[Tools.HIGHLIGHTER].sizeTransform(strokeWidth) / 2,
                  y:
                    hoverPoint.y -
                    ToolData[Tools.HIGHLIGHTER].sizeTransform(strokeWidth) / 2,
                },
                width: ToolData[Tools.HIGHLIGHTER].sizeTransform(strokeWidth),
                height: ToolData[Tools.HIGHLIGHTER].sizeTransform(strokeWidth),
                strokeWidth: 1,
                strokeColor: 'black',
                fillColor: 'transparent',
              }}
            />
          </Group>
        );
      }

      return null;
    }, [hoverPoint, tool, strokeWidth, highlighterAngle]);

    // Calculate selection position properties
    const selectionProps = useMemo(() => {
      if (!selection) return null;

      // First normalize the selection to ensure positive width/height
      const normalizedSelectionData = {
        x: selection.width < 0 ? selection.x + selection.width : selection.x,
        y: selection.height < 0 ? selection.y + selection.height : selection.y,
        width: Math.abs(selection.width),
        height: Math.abs(selection.height),
        ids: selection.ids,
        selected: selection.selected,
      };

      // Apply the EXACT same center-based zoom transformation as the canvas elements
      // by using the same transform steps as mainGroupTransform
      const centerX = canvasSize.width / 2;
      const centerY = canvasSize.height / 2;

      // Step 1: Normalize selection coordinates to canvas center (same as mainGroupTransform step 1 & 3)
      const normalizedX = normalizedSelectionData.x - centerX;
      const normalizedY = normalizedSelectionData.y - centerY;

      // Step 2: Apply zoom (same as mainGroupTransform step 2)
      const zoomedX = normalizedX * zoomScale;
      const zoomedY = normalizedY * zoomScale;
      const zoomedWidth = normalizedSelectionData.width * zoomScale;
      const zoomedHeight = normalizedSelectionData.height * zoomScale;

      // Step 3: Move back from center (reverse of step 1)
      const repositionedX = zoomedX + centerX;
      const repositionedY = zoomedY + centerY;

      // Step 4: Apply pan offset (same as mainGroupTransform step 4)
      const offsetX =
        elementsOffset.x +
        (tool === Tools.PAN ? currentMovingElementOffset.x : 0);
      const offsetY =
        elementsOffset.y +
        (tool === Tools.PAN ? currentMovingElementOffset.y : 0);

      const finalX = repositionedX + offsetX;
      const finalY = repositionedY + offsetY;

      return {
        selection: {
          ...selection,
          x: finalX,
          y: finalY,
          width: zoomedWidth,
          height: zoomedHeight,
        },
        top: finalY,
        left: finalX,
        centerX: finalX + zoomedWidth / 2,
      };
    }, [
      selection,
      elementsOffset,
      currentMovingElementOffset,
      zoomScale,
      canvasSize,
      tool,
    ]);

    // Memoize combined gestures
    const combinedGestures = useMemo(() => {
      return Gesture.Exclusive(pan, tap, twoFingerPan, hover);
    }, [pan, tap, twoFingerPan, hover]);

    return (
      <>
        <GestureDetector gesture={combinedGestures}>
          <Canvas
            style={{ flex: 1, backgroundColor: backgroundState.color }}
            ref={canvasRef}
            onLayout={handleLayout}
          >
            <Fill color={backgroundState.color} />

            {backgroundState.texture &&
              canvasSize.width > 0 &&
              canvasSize.height > 0 && (
                <Group transform={textureGroupTransform as any}>
                  {gridLines}
                </Group>
              )}

            <Group transform={mainGroupTransform as any}>
              {renderedElements}
              {currentElement && getElement(currentElement)}
              {hoverCursor}
            </Group>
          </Canvas>
        </GestureDetector>

        {/* Selection Overlay */}
        {selectionProps && (
          <SelectionOverlay
            selection={selectionProps.selection}
            top={selectionProps.top}
            left={selectionProps.left}
          />
        )}

        {/* Selection Context Menu (Delete Button) */}
        {selectionProps &&
          selection?.width !== 0 &&
          selection?.height !== 0 &&
          selection?.selected && (
            <SelectionContextMenu
              top={selectionProps.top}
              left={selectionProps.centerX}
              onDelete={deleteSelection}
              onDuplicate={duplicateSelection}
            />
          )}

        {/* Pending Text Creation Editor */}
        {pendingTextCreation && tool === Tools.TEXT && (
          <TextEditor
            textElement={pendingTextCreation.textElement}
            position={canvasToScreenCoords(
              pendingTextCreation.position.x,
              pendingTextCreation.position.y
            )}
            scale={zoomScale}
            onBlur={() => setPendingTextCreation(null)}
            onCreate={updatedTextElement => {
              if (updatedTextElement.text.trim()) {
                // Use the complete updated text element with all formatting properties
                addExternalElement(updatedTextElement, Tools.TEXT);
              }
              setPendingTextCreation(null);
            }}
            onTextChange={updatedTextElement => {
              setPendingTextCreation(prev =>
                prev ? { ...prev, textElement: updatedTextElement } : null
              );
            }}
          />
        )}

        {/* Properties Panel */}
        {selection &&
          selection.width !== 0 &&
          selection.height !== 0 &&
          selection.selected && (
            <PropertiesPanel
              selectedElements={selectedCanvasElements}
              modifyElement={modifyElement}
            />
          )}
      </>
    );
  }
);

export default CanvasComponent;
