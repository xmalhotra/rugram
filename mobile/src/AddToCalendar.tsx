import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { CityEvent } from '../../shared/mobile';
import { eventCalendar } from '../../shared/calendar';
import { Button } from './design/components';
import { Text } from './design/Text';
import { space, useTheme } from './design/theme';
import { useToast } from './design/states';
export function AddToCalendar({ event }: { event: CityEvent }) {
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const { colors: C } = useTheme();
  const toast = useToast();
  async function share() {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    try {
      if (!(await Sharing.isAvailableAsync()))
        throw new Error('Calendar-file sharing is not available on this device.');
      const entry = eventCalendar(event);
      // One bounded, public-event-only cache file. No profile, token or guest data.
      const file = new File(Paths.cache, entry.filename);
      file.create({ overwrite: true });
      await file.write(entry.contents);
      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/calendar',
        UTI: 'com.apple.ical.ics',
        dialogTitle: 'Add event to your calendar',
      });
    } catch (error) {
      toast({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Could not share this calendar entry.',
      });
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  if (event.status !== 'published' || event.registrationStatus === 'Cancelled') return null;
  return (
    <View style={{ gap: space.xs }}>
      <Button
        title={busy ? 'Preparing calendar…' : 'Add to calendar'}
        secondary
        disabled={busy}
        onPress={() => void share()}
      />
      <Text variant="footnote" style={{ color: C.muted }}>
        Choose your calendar app or save the .ics file. This does not register you.
        {!event.dateOnly && !event.endsAt ? ' End time is not confirmed.' : ''}
      </Text>
    </View>
  );
}
