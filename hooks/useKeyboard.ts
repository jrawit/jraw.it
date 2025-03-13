import { useEffect } from 'react';
import { Platform } from 'react-native';

type KeyboardProps = {
  undo: () => void;
  redo: () => void;
  setTool: (tool: string) => void;
};

export const useKeyboard = ({ undo, redo, setTool }: KeyboardProps) => {
  useEffect(() => {
    let subscription: { remove: () => void } | undefined;

    // Mobile handller
    //KEYBOARD ON MOBILE NEEDS TESTING!!!!
    const handleMobileKeyPress = (keyEvent: any) => {
      const isCtrlOrCmd = keyEvent.pressedKeys?.some(
        (key: string) => key.includes('CTRL_') || key.includes('META_')
      );
      const pressedKey = keyEvent.key?.toLowerCase();

      handleKeyPress(pressedKey, isCtrlOrCmd, false);
    };

    // Web handler
    const handleWebKeyPress = (e: KeyboardEvent) => {
      handleKeyPress(e.key.toLowerCase(), e.ctrlKey || e.metaKey, e.shiftKey);
      e.preventDefault();
    };

    // Unified key handler
    const handleKeyPress = (
      key: string,
      isCtrlOrCmd: boolean,
      shiftKey: boolean
    ) => {
      if (isCtrlOrCmd) {
        if (key === 'z') undo();
        if (key === 'y') redo();
        return;
      }

      switch (key) {
        case '1':
          setTool('pen');
          break;
        case '2':
          setTool('line');
          break;
        case '3':
          setTool('highlighter');
          break;
        case '4':
          setTool('eraser');
          break;
        case '5':
          setTool('bucketfill');
          break;
        case '6':
          setTool('circle');
          break;
        case '7':
          setTool('rectangle');
          break;
        case '8':
          setTool('triangle');
          break;
        case '9':
          setTool('star');
          break;
      }
    };

    // Setup listeners
    if (Platform.OS !== 'web') {
      subscription = KeyEvent.onKeyDownListener(handleMobileKeyPress);
    } else {
      window.addEventListener('keydown', handleWebKeyPress);
    }

    return () => {
      subscription?.remove();
      if (Platform.OS === 'web') {
        window.removeEventListener('keydown', handleWebKeyPress);
      }
    };
  }, [undo, redo, setTool]);
};
