import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, useWindowDimensions, View } from 'react-native';
import type { FlowSeries, SeriesItemKind } from '../../shared/flow-series';
import { localDate } from '../../shared/flow-habits';
import {
  comparePredictions,
  planAddingFlow,
  planFromSeries,
  planHasFlow,
  predictBodyFlow,
  type BodyPlan,
  type PlannedFlow,
  type PredictedArea,
  type PredictionMember,
} from '../../shared/predicted-body-flow';
import { setsFromCards } from '../../shared/series-impact';
import { api } from './api';
import { BodyPicture } from './BodyMap';
import { useCustomflows } from './customflows';
import { SectionHeader } from './design/components';
import { ReasonLine } from './design/states';
import { Text } from './design/Text';
import { space, useTheme } from './design/theme';
import { useFlowMember } from './flow-member';
import { peekFlowSeries } from './flow-series';

const emptyPlan: BodyPlan = { days: [] };

function useSeriesList(anchor: string) {
  const [series, setSeries] = useState<FlowSeries[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    peekFlowSeries(anchor, anchor)
      .then(bundle => {
        if (live) setSeries(bundle.series);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [anchor]);
  return { series, failed };
}

function usePredictionMember(): PredictionMember {
  const { member } = useFlowMember();
  const customflows = useCustomflows();
  return useMemo(
    () => ({
      level: member.level,
      ...(member.priorities?.length ? { priorities: member.priorities } : {}),
      customflows,
    }),
    [customflows, member.level, member.priorities],
  );
}

function communitySignature(plans: readonly BodyPlan[]) {
  const keys = new Set<string>();
  for (const plan of plans) {
    for (const day of plan.days) {
      for (const flow of day.flows) {
        if (flow.kind !== 'community' || flow.items?.length) continue;
        keys.add(`${flow.id}\t${flow.version ?? ''}`);
      }
    }
  }
  return [...keys].sort().join('\n');
}

function useCommunityItems(plans: readonly BodyPlan[]) {
  const signature = communitySignature(plans);
  const [items, setItems] = useState<Record<string, { exerciseId: string; sets: number }[]>>({});
  useEffect(() => {
    if (!signature) return;
    let live = true;
    const rows = signature.split('\n').map(line => {
      const split = line.indexOf('\t');
      const id = line.slice(0, split);
      const versionText = line.slice(split + 1);
      return { id, version: versionText ? Number(versionText) : undefined };
    });
    Promise.all(
      rows.map(async row => {
        try {
          const sets = await communitySets(row.id, row.version);
          return [`community:${row.id}`, sets] as const;
        } catch {
          return [`community:${row.id}`, []] as const;
        }
      }),
    )
      .then(found => {
        if (live) setItems(Object.fromEntries(found));
      })
      .catch(() => {
        if (live) setItems({});
      });
    return () => {
      live = false;
    };
  }, [signature]);
  return items;
}

async function communitySets(id: string, version?: number) {
  const result = await api<{
    flow: { cards: { cardId: string }[]; version: number };
    versions: { version: number; cards: { cardId: string }[] }[];
  }>(`/api/mobile/community?id=${encodeURIComponent(id)}`);
  const pinned = version != null ? result.versions.find(row => row.version === version) : undefined;
  return setsFromCards(pinned?.cards ?? result.flow.cards);
}

function stamp(plan: BodyPlan, fetched: Record<string, { exerciseId: string; sets: number }[]>): BodyPlan {
  return {
    days: plan.days.map(day => ({
      flows: day.flows.map(flow => {
        const extra = fetched[`${flow.kind}:${flow.id}`];
        if (!extra?.length || flow.items?.length) return flow;
        return { ...flow, items: extra };
      }),
    })),
  };
}

function withKnown(plan: BodyPlan, known: PlannedFlow | null): BodyPlan {
  if (!known?.items?.length) return plan;
  return {
    days: plan.days.map(day => ({
      flows: day.flows.map(flow =>
        flow.kind === known.kind && flow.id === known.id && !flow.items?.length ? { ...flow, items: known.items } : flow,
      ),
    })),
  };
}

function PredictionLoading({ title }: { title: string }) {
  const { colors: C } = useTheme();
  return (
    <View style={{ alignSelf: 'stretch', gap: space.ms }}>
      <SectionHeader title={title} />
      <ActivityIndicator accessibilityLabel="Loading your Map flow" color={C.lime} />
    </View>
  );
}

/**
 * The predicted figure. One picture, or before and after.
 * Areas come from `predictBodyFlow`, which paints planned sets as worked steps.
 */
export function PredictedBodyFlow({
  title,
  before,
  after,
  lines,
}: {
  title: string;
  before?: readonly PredictedArea[];
  after: readonly PredictedArea[];
  lines: readonly string[];
}) {
  const { colors: C } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [measured, setMeasured] = useState(0);
  const pair = Boolean(before);
  const available = measured > 0 ? measured : Math.max(160, windowWidth - 64);
  const figureWidth = pair ? Math.max(120, Math.floor((available - 12) / 2)) : Math.min(220, available);
  const shown = lines.length ? lines : ['Nothing changes'];
  return (
    <View onLayout={event => setMeasured(event.nativeEvent.layout.width)} style={{ alignSelf: 'stretch', gap: space.ms }}>
      <SectionHeader title={title} />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.ms }}>
        {before ? (
          <View style={{ flex: 1, alignItems: 'center', gap: space.xs }}>
            <Text variant="footnote" style={{ color: C.muted }}>Before</Text>
            <BodyPicture areas={before} width={figureWidth} />
          </View>
        ) : null}
        <View style={{ flex: pair ? 1 : undefined, alignItems: 'center', gap: space.xs }}>
          {pair ? <Text variant="footnote" style={{ color: C.muted }}>After</Text> : null}
          <BodyPicture areas={after} width={figureWidth} />
        </View>
      </View>
      <View accessible accessibilityLabel={shown.join('. ')} style={{ gap: space.xxs }}>
        {shown.map((line, index) => (
          <View key={`${line}-${index}`} importantForAccessibility="no-hide-descendants">
            <ReasonLine>{line}</ReasonLine>
          </View>
        ))}
      </View>
    </View>
  );
}

/** "What this adds to your Map flow" on a flow's page. */
export function MapFlowAddition({
  flowId,
  kind = 'flow',
  items,
}: {
  flowId: string;
  kind?: SeriesItemKind;
  items?: readonly { exerciseId: string; sets: number }[];
}) {
  const anchor = localDate(new Date());
  const { series, failed } = useSeriesList(anchor);
  const who = usePredictionMember();
  const ready = series !== null || failed;
  const flow = useMemo<PlannedFlow>(
    () => ({ id: flowId, kind, ...(items?.length ? { items } : {}) }),
    [flowId, items, kind],
  );
  const current = ready ? planFromSeries(series ?? [], anchor) : emptyPlan;
  const already = ready && planHasFlow(current, flow);
  const next = already ? current : ready ? planAddingFlow(current, flow) : emptyPlan;
  const fetched = useCommunityItems([current, next]);
  if (!ready) return <PredictionLoading title="What this adds to your Map flow" />;
  const beforePicture = predictBodyFlow(stamp(current, fetched), who);
  const afterPicture = predictBodyFlow(stamp(already ? current : next, fetched), who);
  const lines = [
    ...(failed ? ['Could not load the rest of your Map flow.'] : []),
    ...(already ? ['Already in your Map flow'] : comparePredictions(beforePicture, afterPicture)),
  ];
  return <PredictedBodyFlow title="What this adds to your Map flow" after={afterPicture} lines={lines} />;
}

/** Before and after on the series sheet, when adding or removing a flow. */
export function SeriesPlanChange({
  mode,
  draft,
  removeId,
  items,
}: {
  mode: 'add' | 'remove';
  draft: FlowSeries;
  removeId?: string;
  items?: readonly { exerciseId: string; sets: number }[];
}) {
  const anchor = localDate(new Date());
  const { series, failed } = useSeriesList(anchor);
  const who = usePredictionMember();
  const ready = series !== null || failed;
  const known = useMemo<PlannedFlow>(
    () => ({
      id: draft.itemId,
      kind: draft.itemKind,
      ...(draft.version != null ? { version: draft.version } : {}),
      ...(items?.length ? { items } : {}),
    }),
    [draft.itemId, draft.itemKind, draft.version, items],
  );
  const saved = series ?? [];
  const beforePlan = ready ? withKnown(planFromSeries(saved, anchor), known) : emptyPlan;
  const afterSource =
    mode === 'remove'
      ? saved.filter(item => item.id !== removeId)
      : [...saved.filter(item => item.id !== draft.id), draft];
  const afterPlan = ready ? withKnown(planFromSeries(afterSource, anchor), mode === 'add' ? known : null) : emptyPlan;
  const fetched = useCommunityItems([beforePlan, afterPlan]);
  const title = mode === 'remove' ? 'If you remove this' : 'If you add this';
  if (!ready) return <PredictionLoading title={title} />;
  const before = predictBodyFlow(stamp(beforePlan, fetched), who);
  const after = predictBodyFlow(stamp(afterPlan, fetched), who);
  const lines = [
    ...(failed ? ['Could not load the rest of your Map flow.'] : []),
    ...comparePredictions(before, after),
  ];
  return <PredictedBodyFlow title={title} before={before} after={after} lines={lines} />;
}
