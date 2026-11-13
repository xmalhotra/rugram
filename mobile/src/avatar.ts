import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { API_URL, api } from './api';

/** Turns a relative `/api/mobile/avatar/...` URL into one the image view can load. */
export function avatarUri(url?: string | null) {
  if (!url) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return url;
  return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

/** Square JPEG, small enough to upload, plus the local file to show immediately. */
export async function pickAvatar() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Allow photo library access to choose a profile photo.');
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  if (picked.canceled || !picked.assets[0]) return null;
  const context = ImageManipulator.manipulate(picked.assets[0].uri);
  try {
    const image = await context.resize({ width: 320, height: 320 }).renderAsync();
    try {
      const saved = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG, base64: true });
      if (!saved.base64) throw new Error('Could not prepare that photo.');
      return { uri: saved.uri, base64: saved.base64 };
    } finally {
      image.release();
    }
  } finally {
    context.release();
  }
}

export function uploadAvatar(base64: string) {
  return api<{ avatarUrl: string }>('/api/mobile/avatar', { mime: 'image/jpeg', data: base64 });
}

export function removeAvatar() {
  return api<{ avatarUrl: null }>('/api/mobile/avatar', undefined, 'DELETE');
}
