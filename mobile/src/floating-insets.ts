import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActiveRun } from './active-run';
import { layout, size, space } from './design/theme';

/** Height of the run bar docked above the tab bar while a workout is open elsewhere. */
export const RUN_BAR_HEIGHT = size.button + space.xs;

/**
 * The space a scrolling tab screen leaves at its end so nothing sits under the floating layers:
 * the tab bar (already inside the bottom safe-area inset on tab screens) and, while a workout is
 * running elsewhere, the run bar above it. Rule: docs/design-consistency.md, section 2.6.
 */
export function useFloatingInsets() {
  const insets = useSafeAreaInsets();
  const { run, screenOpen } = useActiveRun();
  const runBar = run && !screenOpen ? RUN_BAR_HEIGHT + space.sm : 0;
  return {
    /** Where the run bar's bottom edge sits, measured from the screen's bottom. */
    runBarBottom: insets.bottom + space.sm,
    runBarShowing: runBar > 0,
    /** Padding for the end of a scrolling page. */
    bottom: insets.bottom + runBar + layout.section,
  };
}
