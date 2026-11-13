import React from 'react';
import { View } from 'react-native';
import { space } from './design/theme';
import type { HabitFlow, MobilePayload, Product } from '../../shared/mobile';
import type { CreditCard } from '../../shared/credit-cards';
import { SupplementDiscovery } from './SupplementDiscovery';
import { creditCards } from '../../shared/credit-cards';
import { SavedPicks } from './SavedPicks';
import { CardCatalog } from './CardCatalog';
type PicksBrowserProps = {
  data: MobilePayload;
  busy: boolean;
  onCardChange: (input: unknown) => Promise<boolean>;
  onPick: (product: Product) => void;
  onCard: (card: CreditCard) => void;
  onFlow: (flow: HabitFlow) => void;
  onGuide: (guide: 'magnesium' | 'equipment') => void;
  onLink: (url: string) => void;
  /** Chosen in the top bar: your saved picks first, then products, supplements. */
  section: 'yours' | 'products' | 'supplements';
  /** Opens the Supplements tab from an empty Yours. */
  onBrowse: () => void;
  /** Opens Products so a held-card list can add another card. */
  onAddCard: () => void;
};
export function PicksBrowser(props: PicksBrowserProps) {
  return (
    <View style={props.section === 'products' ? { flex: 1 } : { gap: space.md }}>
      {/* The top bar already names the tab, so no page title repeats it. */}
      {props.section === 'yours' ? (
        <SavedPicks
          data={props.data}
          onPick={props.onPick}
          onCard={props.onCard}
          onBrowse={props.onBrowse}
          onAddCard={props.onAddCard}
        />
      ) : props.section === 'supplements' ? (
        <SupplementDiscovery
          data={props.data}
          onPick={props.onPick}
          onLink={props.onLink}
          onFlow={props.onFlow}
        />
      ) : (
        <CardCatalog
          cards={props.data.library?.cards ?? creditCards}
          onCard={props.onCard}
          onLink={props.onLink}
        />
      )}
    </View>
  );
}
