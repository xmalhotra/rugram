import { useState } from 'react';
import { QramScreen } from '../App';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Avatar, useToast } from '../src/design/states';
import { Text } from '../src/design/Text';
import { radius, useTheme } from '../src/design/theme';
import { useSession } from '../src/session';
import { avatarUri, pickAvatar, removeAvatar, uploadAvatar } from '../src/avatar';

/** Round profile photo. Shown at the top of You, including this pushed screen. */
export function ProfileAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const { colors: C } = useTheme();
  const toast = useToast();
  const { refresh, setData } = useSession();
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const [uploading, setUploading] = useState(false);
  const shown = localUri ?? (hidden ? null : avatarUri(avatarUrl));
  const hasPhoto = Boolean(shown);

  async function choose() {
    try {
      const picked = await pickAvatar();
      if (!picked) return;
      setHidden(false);
      setLocalUri(picked.uri);
      setUploading(true);
      const uploaded = await uploadAvatar(picked.base64);
      setData(current =>
        current ? { ...current, user: { ...current.user, avatarUrl: uploaded.avatarUrl } } : current,
      );
      await refresh();
      setLocalUri(null);
      toast({ message: 'Profile photo updated', kind: 'success' });
    } catch (error) {
      setLocalUri(null);
      toast({
        message: error instanceof Error ? error.message : 'Could not update your photo.',
        kind: 'error',
      });
    } finally {
      setUploading(false);
    }
  }

  async function remove() {
    setLocalUri(null);
    setHidden(true);
    setUploading(true);
    try {
      await removeAvatar();
      setData(current => (current ? { ...current, user: { ...current.user, avatarUrl: null } } : current));
      await refresh();
      setHidden(false);
      toast({ message: 'Profile photo removed', kind: 'success' });
    } catch (error) {
      setHidden(false);
      toast({
        message: error instanceof Error ? error.message : 'Could not remove your photo.',
        kind: 'error',
      });
    } finally {
      setUploading(false);
    }
  }

  function openMenu() {
    if (uploading) return;
    const choosePhoto = () => void choose();
    const removePhoto = () => void remove();
    if (Platform.OS === 'ios') {
      const options = hasPhoto ? ['Choose photo', 'Remove photo', 'Cancel'] : ['Choose photo', 'Cancel'];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: hasPhoto ? 1 : undefined,
        },
        index => {
          if (index === 0) choosePhoto();
          else if (hasPhoto && index === 1) removePhoto();
        },
      );
      return;
    }
    Alert.alert('Profile photo', undefined, [
      { text: 'Choose photo', onPress: choosePhoto },
      ...(hasPhoto
        ? [{ text: 'Remove photo', style: 'destructive' as const, onPress: removePhoto }]
        : []),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hasPhoto ? 'Change profile photo' : 'Add profile photo'}
      accessibilityState={{ busy: uploading }}
      onPress={openMenu}
      style={{ width: 88, height: 88 }}
    >
      <Avatar name={name} uri={shown} size={88} />
      {uploading && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: radius.pill,
              backgroundColor: 'rgba(0,0,0,0.35)',
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
        >
          <ActivityIndicator color={C.lime} />
        </View>
      )}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: 28,
          height: 28,
          borderRadius: radius.pill,
          backgroundColor: C.lime,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {Platform.OS === 'ios' ? (
          <SymbolView name="camera.fill" tintColor={C.onAccent} style={{ width: 14, height: 14 }} />
        ) : (
          <Text variant="subhead" style={{ color: C.onAccent }}>✎</Text>
        )}
      </View>
    </Pressable>
  );
}

export default function ProfileScreen() {
  return <QramScreen tab="You" pushed />;
}
