import { purchaseHost } from './purchases';
export const trustCopy = {
  commercial:
    'Some links may earn Qram a commission. Prices are seller snapshots; check dates are shown.',
  health:
    'General educational information, not personalised medical advice. Choose what suits you; ask a qualified professional about health conditions, medicines or pain.',
  affiliate: 'Affiliate link · Qram may earn a commission.',
} as const;
export function outboundHost(url: string) {
  return purchaseHost(url);
}
