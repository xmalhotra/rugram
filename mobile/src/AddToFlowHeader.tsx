import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Pressable } from 'react-native';
import { Text } from './design/Text';
import { useTheme } from './design/theme';

type Offer = { title: string; busy: boolean; onPress: () => void };

const RegisterContext = createContext<React.Dispatch<React.SetStateAction<Offer | null>> | null>(
  null,
);
const OfferContext = createContext<Offer | null>(null);

export function AddToFlowProvider({ children }: { children: React.ReactNode }) {
  const [offer, setOffer] = useState<Offer | null>(null);
  return (
    <RegisterContext.Provider value={setOffer}>
      <OfferContext.Provider value={offer}>{children}</OfferContext.Provider>
    </RegisterContext.Provider>
  );
}

/** Registers the visible card with the screen header. Returns true when that header is showing the button. */
export function useRegisterAddToFlow(offer: Offer | null) {
  const setOffer = useContext(RegisterContext);
  const press = useRef(offer?.onPress);
  press.current = offer?.onPress;
  const title = offer?.title ?? '';
  const busy = Boolean(offer?.busy);
  useEffect(() => {
    if (!setOffer) return;
    if (!title) {
      setOffer((current: Offer | null) => (current === null ? current : null));
      return;
    }
    setOffer((current: Offer | null) =>
      current?.title === title && current.busy === busy
        ? current
        : { title, busy, onPress: () => press.current?.() },
    );
  }, [setOffer, title, busy]);
  return setOffer != null;
}

export function AddToFlowHeaderButton() {
  const offer = useContext(OfferContext);
  const { colors: C } = useTheme();
  if (!offer) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Add ${offer.title} to a personal flow`}
      accessibilityState={{ disabled: offer.busy }}
      disabled={offer.busy}
      onPress={offer.onPress}
      style={({ pressed }) => ({
        minHeight: 36,
        justifyContent: 'center',
        paddingHorizontal: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.line,
        backgroundColor: C.card,
        opacity: offer.busy ? 0.4 : pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ color: C.text, fontWeight: '600', fontSize: 13 }}>＋ Add to Flow</Text>
    </Pressable>
  );
}
