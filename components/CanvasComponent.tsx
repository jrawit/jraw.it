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

  zoomScale: number;

  onEyeDropperColor?: (color: string) => void;
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

      zoomScale,

      onEyeDropperColor,
    } = props;

    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

    const [currentElementOffset, setCurrentElementOffset] = useState<{
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

    // Function to get the color of the element at specific coordinates

    const getPixelColorAt = (x: number, y: number): string => {
      const image = canvasRef.current.makeImageSnapshot() as SkImage;

      console.log('Image: ', image);

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
    };

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

    useImperativeHandle(ref, () => ({
      getCanvasSize: () => canvasSize,

      getElements: () => elements,

      undo,

      redo,

      clear,

      addExternalElement,

      modifyElement,
    }));

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

    const cx = canvasSize.width / 2;

    const cy = canvasSize.height / 2;

    const tap = Gesture.Tap()

      .runOnJS(true)

      .onStart(e => {
        const adjustedX = (e.x - elementsOffset.x - cx) / zoomScale + cx;

        const adjustedY = (e.y - elementsOffset.y - cy) / zoomScale + cy;

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
      })

      .onEnd(e => {
        if (tool !== Tools.TEXT) {
          const adjustedX = (e.x - elementsOffset.x - cx) / zoomScale + cx;

          const adjustedY = (e.y - elementsOffset.y - cy) / zoomScale + cy;

          onEndInput(adjustedX, adjustedY);

          onDrawingStateChange(false);
        }
      });

    const pan = Gesture.Pan()

      .runOnJS(true)

      .minDistance(5)

      .onStart(e => {
        setPreviousPoint(null);

        if (tool !== Tools.PAN) {
          const adjustedX = (e.x - elementsOffset.x - cx) / zoomScale + cx;

          const adjustedY = (e.y - elementsOffset.y - cy) / zoomScale + cy;

          onDrawingStateChange(true);

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
          const adjustedX = (e.x - elementsOffset.x - cx) / zoomScale + cx;

          const adjustedY = (e.y - elementsOffset.y - cy) / zoomScale + cy;

          onMoveInput(adjustedX, adjustedY);
        }
      })

      .onEnd(e => {
        setPreviousPoint(null);

        if (tool !== Tools.PAN) {
          const adjustedX = (e.x - elementsOffset.x - cx) / zoomScale + cx;

          const adjustedY = (e.y - elementsOffset.y - cy) / zoomScale + cy;

          onDrawingStateChange(false);

          onEndInput(adjustedX, adjustedY);
        } else {
          setElementsOffset(prev => ({
            x: prev.x + e.translationX,

            y: prev.y + e.translationY,
          }));

          setCurrentElementOffset({ x: 0, y: 0 });
        }
      });

    const twoFingerPan = Gesture.Pan()

      .runOnJS(true)

      .minPointers(2)

      .onChange(e => {
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

    const hover = Gesture.Hover()

      .runOnJS(true)

      .onBegin(e => {
        const adjustedX =
          (e.x - elementsOffset.x - currentElementOffset.x - cx) / zoomScale +
          cx;

        const adjustedY =
          (e.y - elementsOffset.y - currentElementOffset.y - cy) / zoomScale +
          cy;

        setPreviousPoint(null);

        setPreviousPoint(null);

        setHoverPoint({ x: adjustedX, y: adjustedY });
      })

      .onChange(e => {
        const adjustedX =
          (e.x - elementsOffset.x - currentElementOffset.x - cx) / zoomScale +
          cx;

        const adjustedY =
          (e.y - elementsOffset.y - currentElementOffset.y - cy) / zoomScale +
          cy;

        setPreviousPoint(null);

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
      })

      .onEnd(() => {
        setHoverPoint(null);

        setPreviousPoint(null);
      });

    useEffect(() => {
      console.log('Elements: ', elements);
    }, [elements]);

    const getElement = useCallback(
      (canvasElement: CanvasElement) => {
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
            return (
              <Image key={id} imageData={element as CanvasElements.Image} />
            );

          default:
            console.warn(`Unhandled tool type: ${elementTool}`);

            return null;
        }
      },

      [strokeWidth, color]
    );

    const handleLayout = useCallback((event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;

      setCanvasSize({ width, height });
    }, []);

    return (
      <>
        <GestureDetector
          gesture={Gesture.Exclusive(pan, tap, twoFingerPan, hover)}
        >
          <Canvas
            style={{ flex: 1, backgroundColor: backgroundState.color }}
            ref={canvasRef}
            onLayout={handleLayout}
          >
            <Fill color={backgroundState.color} />

            {backgroundState.texture &&
              canvasSize.width > 0 &&
              canvasSize.height > 0 && (
                <Group
                  transform={[
                    { translateX: cx },

                    { translateY: cy },

                    { scale: zoomScale },

                    { translateX: -cx },

                    { translateY: -cy },

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
                  {(() => {
                    const { width: canvasWidth, height: canvasHeight } =
                      canvasSize;

                    const startY =
                      Math.floor(
                        (-elementsOffset.y - canvasHeight) /
                          backgroundState.gridSize
                      ) * backgroundState.gridSize;

                    const endY =
                      Math.ceil(
                        (-elementsOffset.y + 2 * canvasHeight) /
                          backgroundState.gridSize
                      ) * backgroundState.gridSize;

                    const startX =
                      Math.floor(
                        (-elementsOffset.x - canvasWidth) /
                          backgroundState.gridSize
                      ) * backgroundState.gridSize;

                    const endX =
                      Math.ceil(
                        (-elementsOffset.x + 2 * canvasWidth) /
                          backgroundState.gridSize
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
                  })()}
                </Group>
              )}

            <Group
              transform={[
                { translateX: cx },

                { translateY: cy },

                { scale: zoomScale },

                { translateX: -cx },

                { translateY: -cy },

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
                () => elements.map(element => getElement(element)),

                [elements, getElement]
              )}

              {currentElement && getElement(currentElement)}

              {hoverPoint && (
                <>
                  {[Tools.PEN, Tools.ERASER].includes(tool) && (
                    <Circle
                      circleData={{
                        center: hoverPoint,

                        radiusX: strokeWidth / 2,

                        radiusY: strokeWidth / 2,

                        strokeWidth: 1,

                        strokeColor: 'black',
                      }}
                    />
                  )}

                  {tool === Tools.HIGHLIGHTER && (
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
                              ToolData[Tools.HIGHLIGHTER].sizeTransform(
                                strokeWidth
                              ) /
                                2,

                            y:
                              hoverPoint.y -
                              ToolData[Tools.HIGHLIGHTER].sizeTransform(
                                strokeWidth
                              ) /
                                2,
                          },

                          width:
                            ToolData[Tools.HIGHLIGHTER].sizeTransform(
                              strokeWidth
                            ),

                          height:
                            ToolData[Tools.HIGHLIGHTER].sizeTransform(
                              strokeWidth
                            ),

                          strokeWidth: 1,

                          strokeColor: 'black',

                          fillColor: 'transparent',
                        }}
                      />
                    </Group>
                  )}
                </>
              )}
            </Group>
          </Canvas>
        </GestureDetector>

        {/* Selection Overlay */}

        <SelectionOverlay
          selection={selection}
          elementsOffset={elementsOffset}
          currentElementOffset={currentElementOffset}
          tool={tool}
        />

        {/* Selection Context Menu (Delete Button) */}

        {selection &&
          selection.width !== 0 &&
          selection.height !== 0 &&
          selection.selected && (
            <SelectionContextMenu
              top={selection.y + elementsOffset.y + currentElementOffset.y}
              left={
                selection.x +
                selection.width / 2 +
                elementsOffset.x +
                currentElementOffset.x
              }
              onDelete={deleteSelection}
              onDuplicate={duplicateSelection}
            />
          )}

        {/* Pending Text Creation Editor */}

        {pendingTextCreation && tool === Tools.TEXT && (
          <TextEditor
            textElement={pendingTextCreation.textElement}
            position={{
              x: pendingTextCreation.position.x + elementsOffset.x,

              y: pendingTextCreation.position.y + elementsOffset.y,
            }}
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
