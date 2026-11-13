import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import { trustCopy, outboundHost } from '../../shared/trust';
import { affiliateSeller, purchaseDestination, sellerPriceLabel } from '../../shared/purchases';
import { checkedAgo } from '../../shared/format';
import { eventProvider } from '../../shared/event-discovery';
import { Button, Sheet } from './design/components';
import { Text } from './design/Text';
import { space, useTheme } from './design/theme';
import { useSession } from './session';
import { useToast } from './design/states';
import { api } from './api';
type Request = { url: string; resolve: (opened: boolean) => void };
const Context = createContext<((url: string) => Promise<boolean>) | null>(null);
export function OutboundProvider({ children }: { children: React.ReactNode }) {
  const { data } = useSession();
  const { colors: C } = useTheme();
  const toast = useToast();
  const [request, setRequest] = useState<Request | null>(null);
  const current = useRef<Request | null>(null);
  const [busy, setBusy] = useState(false);
  const open = useCallback(
    (url: string) =>
      new Promise<boolean>(resolve => {
        if (!outboundHost(url)) {
          toast({
            kind: 'error',
            message: 'This link is not available. Use a secure public website.',
          });
          resolve(false);
          return;
        }
        current.current?.resolve(false);
        const next = { url, resolve };
        current.current = next;
        setRequest(next);
      }),
    [toast],
  );
  const close = useCallback(() => {
    current.current?.resolve(false);
    current.current = null;
    setRequest(null);
  }, []);
  useEffect(() => close, [close]);
  useEffect(() => {
    if (!data) close();
  }, [data, close]);
  const products = data ? [...data.products, ...data.flowResources.products] : [];
  const option = request
    ? products
        .flatMap(item => item.purchaseOptions ?? [])
        .find(item => purchaseDestination(item) === request.url)
    : undefined;
  const event =
    request && data
      ? [...data.events, ...data.flowResources.events].find(
          item => item.registrationUrl === request.url,
        )
      : undefined;
  const affiliate = Boolean(option && affiliateSeller(option));
  const host = request ? outboundHost(request.url) : null;
  async function proceed() {
    const selected = current.current;
    if (!selected || busy) return;
    setBusy(true);
    try {
      await Linking.openURL(selected.url);
      void api('/api/mobile', {
        action: 'outbound-opened',
        host: outboundHost(selected.url),
        affiliate,
      }).catch(() => undefined);
      selected.resolve(true);
      if (current.current === selected) {
        current.current = null;
        setRequest(null);
      }
    } catch {
      toast({ message: 'Could not open this link. Please try again.', kind: 'error' });
    } finally {
      setBusy(false);
    }
  }
  return (
    <Context.Provider value={open}>
      {children}
      {request && host && (
        <Sheet title="Leaving Qram" onClose={close}>
          <View style={{ gap: space.md, paddingVertical: space.md }}>
            <Text variant="heading" style={{ color: C.text }}>{host}</Text>
            {event && (
              <Text style={{ color: C.muted }}>
                Registration happens on {eventProvider(request.url)}.
              </Text>
            )}
            {option && (
              <Text style={{ color: C.muted }}>
                {sellerPriceLabel(option)} · {checkedAgo(option.checkedAt)}. Confirm price and
                availability with the seller.
              </Text>
            )}
            {affiliate && <Text style={{ color: C.text }}>{trustCopy.affiliate}</Text>}
            <Text variant="caption" style={{ color: C.muted }}>
              {trustCopy.commercial}
            </Text>
            <Button
              title={busy ? 'Opening…' : `Continue to ${host} ↗`}
              disabled={busy}
              onPress={() => void proceed()}
            />
            <Button title="Cancel" secondary disabled={busy} onPress={close} />
          </View>
        </Sheet>
      )}
    </Context.Provider>
  );
}
export function useOutbound() {
  const value = useContext(Context);
  if (!value) throw new Error('OutboundProvider is required.');
  return value;
}
export function CommercialDisclosure() {
  const { colors: C } = useTheme();
  return (
    <Text variant="caption" style={{ color: C.muted }}>{trustCopy.commercial}</Text>
  );
}
export function HealthNote() {
  const { colors: C } = useTheme();
  return <Text variant="footnote" style={{ color: C.muted }}>{trustCopy.health}</Text>;
}
