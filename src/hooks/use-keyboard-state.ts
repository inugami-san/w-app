import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

type KeyboardState = {
  height: number;
  isVisible: boolean;
};

export function useKeyboardState(): KeyboardState {
  const [keyboardState, setKeyboardState] = useState<KeyboardState>({ height: 0, isVisible: false });

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardState({ height: event.endCoordinates.height, isVisible: true });
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardState({ height: 0, isVisible: false });
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return keyboardState;
}
