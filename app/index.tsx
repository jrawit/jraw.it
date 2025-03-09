import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Link, Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

export default function HomeScreen() {
  const colorScheme = useColorScheme();

  return (
    <ThemedView>
      <Stack.Screen
        options={{
          title: 'Home',
          headerStyle: {
            backgroundColor: colorScheme === 'dark' ? 'black' : 'white',
          },
          headerTintColor: colorScheme === 'dark' ? 'white' : 'black',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <Link
        href="/canvas/1"
        style={{ color: colorScheme === 'dark' ? 'white' : 'black' }}
      >
        Go to Canvas
      </Link>
    </ThemedView>
  );
}
