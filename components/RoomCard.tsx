import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Image, StyleSheet } from 'react-native';

interface RoomCardProps {
  title: string;
  edited: string;
  width: number;
  isDark: boolean;
}

export function RoomCard({ title, edited, width, isDark }: RoomCardProps) {
  return (
    <ThemedView
      style={[
        styles.card,
        {
          width: width,
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
      <ThemedText type="subtitle" style={styles.cardTitle}>
        {title}
      </ThemedText>
      <ThemedText type="default" style={styles.cardEdited}>
        Edited: {edited}
      </ThemedText>
      <ThemedView style={styles.cardActions}>
        <ThemedText type="link" style={styles.cardAction}>
          Delete
        </ThemedText>
        <ThemedText type="link" style={styles.cardAction}>
          Rename
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 8,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  cardImage: {
    width: '100%',
    height: 100,
    marginBottom: 12,
    borderRadius: 8,
  },
  cardTitle: {
    marginBottom: 4,
  },
  cardEdited: {
    fontSize: 14,
    marginBottom: 8,
  },
  cardActions: {
    flexDirection: 'row',
    marginTop: 10,
    width: '100%',
    justifyContent: 'space-around',
  },
  cardAction: {
    padding: 5,
  },
});
