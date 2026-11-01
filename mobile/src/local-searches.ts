import * as SecureStore from 'expo-secure-store';
const key = (userId: string) => `qram-search-${userId.replace(/[^a-zA-Z0-9_.-]/g, '')}`;
export async function loadSearches(userId: string): Promise<string[]> {
  try {
    const value = JSON.parse((await SecureStore.getItemAsync(key(userId))) ?? '[]');
    return Array.isArray(value)
      ? value
          .filter((item): item is string => typeof item === 'string' && item.length <= 80)
          .slice(0, 8)
      : [];
  } catch {
    return [];
  }
}
export async function saveSearches(userId: string, values: string[]) {
  await SecureStore.setItemAsync(key(userId), JSON.stringify(values.slice(0, 8)));
}
export async function clearSearches(userId: string) {
  await SecureStore.deleteItemAsync(key(userId));
}
