import PropertiesPanel from '@/components/PropertiesPanel';
import SelectionContextMenu from '@/components/SelectionContextMenu';
import SelectionOverlay from '@/components/SelectionOverlay';
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
import { Canvas, Fill, Group, SkiaDomView } from '@shopify/react-native-skia';
import React, {
  forwardRef,
  useCallback,
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
  canvasRef: React.RefObject<SkiaDomView>;
  tool: Tools;
  strokeWidth: number;
  color: string;
  background: Background;
  elementsOffset: { x: number; y: number };
  setElementsOffset: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  onTapText: (x: number, y: number) => void;
  onDrawingStateChange: (isDrawing: boolean) => void;
}

const CanvasComponent = forwardRef<CanvasComponentHandle, CanvasComponentProps>(
  (
    {
      canvasRef,
      tool,
      strokeWidth,
      color,
      background: backgroundState,
      elementsOffset,
      setElementsOffset,
      onTapText,
      onDrawingStateChange,
    },
    ref
  ) => {
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

    const fontManager = useFontManager();

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
    } = useCanvas({
      tool,
      strokeWidth,
      color,
      fontManager,
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

    const selectedCanvasElements = useMemo(() => {
      if (!selection || !selection.selected) {
        return [];
      }
      return elements.filter(element => selection.ids.includes(element.id));
    }, [elements, selection]);

    const tap = Gesture.Tap()
      .runOnJS(true)
      .onStart(e => {
        const adjustedX = e.x - elementsOffset.x;
        const adjustedY = e.y - elementsOffset.y;

        if (tool === Tools.TEXT) {
          onTapText(adjustedX, adjustedY);
        } else {
          onDrawingStateChange(true);
          onStartInput(adjustedX, adjustedY);
        }
      })
      .onEnd(e => {
        if (tool !== Tools.TEXT) {
          const adjustedX = e.x - elementsOffset.x;
          const adjustedY = e.y - elementsOffset.y;
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
          const adjustedX = e.x - elementsOffset.x;
          const adjustedY = e.y - elementsOffset.y;
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
          const adjustedX = e.x - elementsOffset.x;
          const adjustedY = e.y - elementsOffset.y;
          onMoveInput(adjustedX, adjustedY);
        }
      })
      .onEnd(e => {
        setPreviousPoint(null);
        if (tool !== Tools.PAN) {
          const adjustedX = e.x - elementsOffset.x;
          const adjustedY = e.y - elementsOffset.y;
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
        const adjustedX = e.x - elementsOffset.x;
        const adjustedY = e.y - elementsOffset.y;
        setPreviousPoint(null);
        setHoverPoint({ x: adjustedX, y: adjustedY });
      })
      .onChange(e => {
        const adjustedX = e.x - elementsOffset.x;
        const adjustedY = e.y - elementsOffset.y;

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
                        radius: strokeWidth / 2,
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
            />
          )}

        {/* Properties Panel (Right Side) */}
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
