import { Feather } from '@expo/vector-icons';
import React from 'react';
import {
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

interface SelectionContextMenuProps {
  top: number;
  left: number;
  onDelete: () => void;
  onDuplicate: () => void;
  style?: StyleProp<ViewStyle>;
}

const SelectionContextMenu: React.FC<SelectionContextMenuProps> = ({
  top,
  left,
  onDelete,
  onDuplicate,
  style,
}) => {
  return (
    <View
      style={[
        styles.container,
        {
          top: top,
          left: left,
          transform: [{ translateY: -60 }, { translateX: '-50%' }],
        },
        style,
      ]}
    >
      <TouchableOpacity
        style={styles.button}
        onPress={onDelete}
        activeOpacity={0.7}
      >
        <Feather name="trash-2" size={20} color="#DC2626" />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={onDuplicate}
        activeOpacity={0.7}
      >
        <Feather name="copy" size={24} color="black" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 10,
  },
  button: {
    padding: 6,
    borderRadius: 4,
    marginHorizontal: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SelectionContextMenu;
