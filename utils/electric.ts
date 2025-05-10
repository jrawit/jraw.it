import { matchBy } from '@electric-sql/experimental';

// ElectricSQL configuration
export const ELECTRIC_URL =
  process.env.EXPO_PUBLIC_ELECTRIC_URL || 'http://localhost:3000';

// Change these parameters according to your environment
export const envParams = {
  env: process.env.NODE_ENV || 'development',
  instanceName: 'jraw-it',
};

// A utility function to wait for a specific event in a stream
export async function waitForStreamEvent(
  stream: any,
  operations: string[],
  matcher: ReturnType<typeof matchBy>
): Promise<void> {
  if (!stream) return;

  return new Promise<void>(resolve => {
    const unsubscribe = stream.subscribe((event: any) => {
      if (operations.includes(event.operation) && matcher(event.value)) {
        unsubscribe();
        resolve();
      }
    });

    // Add a timeout to resolve the promise after 5 seconds
    setTimeout(() => {
      unsubscribe();
      resolve();
    }, 5000);
  });
}
