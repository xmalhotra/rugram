import React, { useState } from 'react';
import { Pressable, Share, TextInput, View } from 'react-native';
import { api } from './api';
import { useSession } from './session';
import { Button, Sheet } from './design/components';
import { useToast } from './design/states';
import { Text } from './design/Text';
import { useTheme } from './design/theme';
import { accountRetention } from '../../shared/account';

export function AccountPrivacy() {
  const { logout, setError, data } = useSession();
  const { colors: C } = useTheme();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  async function exportData() {
    setBusy(true);
    try {
      const value = await api<unknown>('/api/mobile/account');
      await Share.share({
        title: 'Qram account export',
        message: JSON.stringify(value, null, 2),
      });
    } catch (error) {
      toast({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Could not export. Try again.',
      });
    } finally {
      setBusy(false);
    }
  }
  async function erase() {
    setBusy(true);
    try {
      await api('/api/mobile/account', { confirm: 'DELETE' }, 'DELETE');
      // Account deletion has already revoked every server session.
      await logout();
      setError('Your account has been deleted.');
    } catch (error) {
      toast({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Could not delete account. Try again.',
      });
    } finally {
      setBusy(false);
    }
  }
  return (
    <View>
      <PressableRow
        title="Export data"
        disabled={busy}
        onPress={() => void exportData()}
      />
      <View style={{ height: 1, backgroundColor: C.line }} />
      <PressableRow
        title="Delete account"
        destructive
        disabled={busy}
        onPress={() => {
          setConfirmation('');
          setConfirming(true);
        }}
      />
        {confirming && (
          <Sheet title="Delete your account?" onClose={() => setConfirming(false)}>
            {data?.user.role === 'admin' ? (
              <Text style={{ color: C.muted }}>
                Transfer admin access and change this account to a member first.
              </Text>
            ) : (
              <View style={{ gap: 18 }}>
                <Text style={{ color: C.muted }}>
                  {accountRetention.publicContent} This cannot be undone. Export your data first.
                </Text>
                <Text style={{ color: C.text }}>Type DELETE to confirm</Text>
                <TextInput
                  accessibilityLabel="Type DELETE to confirm account deletion"
                  value={confirmation}
                  onChangeText={setConfirmation}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={6}
                  style={{
                    minHeight: 48,
                    borderWidth: 1,
                    borderColor: C.line,
                    borderRadius: 12,
                    padding: 14,
                    color: C.text,
                  }}
                />
                <Button
                  title="Delete permanently"
                  destructive
                  disabled={busy || confirmation !== 'DELETE'}
                  onPress={() => void erase()}
                />
                <Button
                  title="Keep account"
                  secondary
                  disabled={busy}
                  onPress={() => setConfirming(false)}
                />
              </View>
            )}
          </Sheet>
        )}
    </View>
  );
}

function PressableRow({
  title,
  onPress,
  disabled,
  destructive,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  const { colors: C } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        justifyContent: 'center',
        opacity: disabled ? 0.5 : pressed ? 0.6 : 1,
      })}
    >
      <Text style={{ color: destructive ? C.danger : C.text, fontSize: 16 }}>{title}</Text>
    </Pressable>
  );
}
