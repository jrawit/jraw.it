import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Image, StyleSheet, TouchableOpacity } from 'react-native';

interface RoomCardProps {
  title: string;
  edited: string;
  width: number;
  isDark: boolean;
  onPress?: () => void;
  onDelete?: () => void;
  onRename?: () => void;
}

export function RoomCard({
  title,
  edited,
  width,
  isDark,
  onPress,
  onDelete,
  onRename,
}: RoomCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={{ width: width, margin: 8 }} // Ensure margin is on the outer TouchableOpacity
    >
      <ThemedView
        style={[
          styles.card, // Ensure no margin here
          {
            width: '100%', // Card itself takes full width of its container (TouchableOpacity)
            shadowColor: isDark ? '#000' : '#888',
          },
        ]}
        lightColor="#ffffff"
        darkColor="#262626"
      >
        <Image
          source={{ uri: 'https://via.placeholder.com/150' }}
          style={styles.cardImage}
        />
        <ThemedText
          type="subtitle"
          style={styles.cardTitle}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {title}
        </ThemedText>
        <ThemedText type="default" style={styles.cardEdited}>
          Edited: {edited}
        </ThemedText>
        <ThemedView
          style={[
            styles.cardActions,
            { borderTopColor: isDark ? '#444' : '#ddd' }, // Apply theme-dependent border color here
          ]}
        >
          <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
            <ThemedText type="link" style={styles.cardAction}>
              Delete
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity onPress={onRename} style={styles.actionButton}>
            <ThemedText type="link" style={styles.cardAction}>
              Rename
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    // margin: 8, // Ensure margin is REMOVED from here
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5, // for Android shadow
  },
  cardImage: {
    width: '100%',
    height: 100,
    marginBottom: 12,
    borderRadius: 8,
  },
  cardTitle: {
    marginBottom: 4,
    textAlign: 'center', // Center the title
  },
  cardEdited: {
    fontSize: 14,
    marginBottom: 12, // Increased margin
  },
  cardActions: {
    flexDirection: 'row',
    marginTop: 'auto', // Push actions to the bottom
    width: '100%',
    justifyContent: 'space-evenly', // Distribute space evenly
    paddingTop: 10, // Add some padding on top of actions
    borderTopWidth: 1,
    // borderTopColor is now applied dynamically above
  },
  cardAction: {
    paddingHorizontal: 10, // Add horizontal padding
    paddingVertical: 5,
  },
  actionButton: {
    // Removed padding here, as it's now in cardAction
    // Add flex to allow buttons to share space if needed, or set fixed widths
  },
});
