import { formatDate } from '../../shared/format';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from './design/Text';
import type { MobilePayload, Product } from '../../shared/mobile';
import { gymSupports, supportSources, type SupportKind } from '../../shared/gym-supports';
import { picksForHabit } from '../../shared/flow-connections';
import { Badge, Button, Card, Field, HabitToggle } from './design/components';
import { useTheme } from './design/theme';
import { EquipmentThumbnail } from './EquipmentThumbnail';
import { HealthNote } from './OutboundLink';

export function GymSupportGuide({
  data,
  busy,
  readOnly = false,
  onAvailable,
  onPick,
  onLink,
}: {
  data: MobilePayload;
  busy: boolean;
  readOnly?: boolean;
  onAvailable: (id: SupportKind, enabled: boolean) => void;
  onPick: (product: Product) => void;
  onLink: (url: string) => void;
}) {
  const { colors: C } = useTheme();
  const [kind, setKind] = useState<SupportKind | null>(null);
  const [view, setView] = useState<'learn' | 'picks'>('learn');
  const [budget, setBudget] = useState('');
  const guide = data.library?.guides.find(guide => guide.id === 'gym-supports');
  const item = gymSupports.find(support => support.id === kind);
  const products = [
    ...new Map(
      [...data.products, ...data.flowResources.products].map(product => [product.id, product]),
    ).values(),
  ];
  const limit = budget.trim() === '' ? Infinity : Number(budget);
  const matches = item && limit >= 0 ? picksForHabit(products, item.id, limit) : [];
  const text = { color: C.muted, fontSize: 16, lineHeight: 24 } as const;
  const heading = { color: C.text, fontSize: 22, fontWeight: '600', lineHeight: 29 } as const;
  return (
    <View style={{ gap: 16 }}>
      <HealthNote />
      {!item ? (
        <>
          <Text accessibilityRole="header" style={heading}>
            Choose the tool. Understand the job.
          </Text>
          <Text style={text}>
            Equipment has no gender. Using it—or choosing not to—is not a measure of toughness.
            Start with what the session calls for.
          </Text>
          {gymSupports.map(support => (
            <Pressable
              key={support.id}
              accessibilityRole="button"
              accessibilityLabel={`Learn about ${support.title}`}
              onPress={() => {
                setKind(support.id);
                setView('learn');
              }}
            >
              <Card>
                <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                  <EquipmentThumbnail kind={support.id} />
                  <View style={{ flex: 1 }}>
                    <Text style={heading}>{support.title}</Text>
                    <Text style={text}>
                      {guide?.sections
                        .find(section => section.id === support.id)
                        ?.body.split('\n')[0] ??
                        (!data.library ? support.purpose : 'Open the current learning entry.')}
                    </Text>
                  </View>
                </View>
                <Badge>
                  {data.profile.availableSupportIds?.includes(support.id)
                    ? 'YOU HAVE ACCESS'
                    : 'OPTIONAL · NOT A REQUIRED KIT'}
                </Badge>
                <Text style={{ color: C.lime, fontSize: 16 }}>Understand & compare →</Text>
              </Card>
            </Pressable>
          ))}
        </>
      ) : (
        <>
          <Button
            title={view === 'picks' ? '← Back to the equipment guide' : '← Equipment categories'}
            secondary
            onPress={() => {
              if (view === 'picks') setView('learn');
              else setKind(null);
            }}
          />
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <EquipmentThumbnail kind={item.id} />
            <Text style={[heading, { flex: 1 }]}>{item.title}</Text>
          </View>
          {view === 'learn' ? (
            <>
              {guide?.sections.find(section => section.id === item.id) && (
                <Card>
                  <Text style={heading}>
                    {guide.sections.find(section => section.id === item.id)!.title}
                  </Text>
                  <Text style={text}>
                    {guide.sections.find(section => section.id === item.id)!.body}
                  </Text>
                  <Button
                    title="Read current source ↗"
                    secondary
                    onPress={() =>
                      onLink(guide.sections.find(section => section.id === item.id)!.sourceUrl)
                    }
                  />
                </Card>
              )}
              {!data.library && (
                <>
                  <Card>
                    <Badge>WHAT IT DOES</Badge>
                    <Text style={text}>{item.purpose}</Text>
                    <Text style={text}>{item.context}</Text>
                    <Text style={text}>{item.notFor}</Text>
                  </Card>
                </>
              )}
              {!readOnly && (
                <HabitToggle
                  title="Available at my gym / in my kit"
                  detail="Save access to this equipment type. This does not mark a workout done, record a purchase or tell you to use it."
                  checked={Boolean(data.profile.availableSupportIds?.includes(item.id))}
                  disabled={busy}
                  onChange={enabled => {
                    if (!readOnly && !busy) onAvailable(item.id, enabled);
                  }}
                />
              )}
              {!data.library && (
                <>
                  <Text accessibilityRole="header" style={heading}>
                    {item.id === 'lifting-belt'
                      ? '10 mm or 13 mm? More than a number.'
                      : 'What should I compare?'}
                  </Text>
                  {item.id === 'lifting-belt' && (
                    <Card>
                      <View style={{ flexDirection: 'row', gap: 18 }}>
                        {[10, 13].map(thickness => (
                          <View
                            key={thickness}
                            style={{ flex: 1, gap: 12, justifyContent: 'flex-end' }}
                          >
                            <Text style={heading}>{thickness} mm</Text>
                            <View
                              style={{
                                height: thickness * 2,
                                borderRadius: 4,
                                backgroundColor: C.lime,
                              }}
                            />
                          </View>
                        ))}
                      </View>
                      <Badge>
                        Thickness illustration—not actual size, a strength score or a safety
                        ranking. Width and fit are separate.
                      </Badge>
                    </Card>
                  )}
                  {item.compare.map((point, index) => (
                    <Card key={point}>
                      <Badge>COMPARE {index + 1}</Badge>
                      <Text style={text}>{point}</Text>
                    </Card>
                  ))}
                  {item.sourceIds.map(id => (
                    <Button
                      key={id}
                      title={`${supportSources[id].title} ↗`}
                      secondary
                      onPress={() => onLink(supportSources[id].url)}
                    />
                  ))}
                </>
              )}
              <Badge>
                Manufacturer descriptions explain products; they are not independent proof of safety
                or superiority.
              </Badge>
              <Button
                title={`See ${item.title.toLowerCase()} in Picks`}
                onPress={() => setView('picks')}
              />
            </>
          ) : (
            <>
              <Text style={text}>
                These are the same central Picks records, filtered to this equipment type. Seller
                prices are snapshots, not a live stock feed or delivered-cost quote.
              </Text>
              <Field
                label="Optional maximum item price (INR)"
                value={budget}
                onChange={setBudget}
                numeric
              />
              {matches.map(product => (
                <Card key={product.id}>
                  <Badge>
                    {product.tier} · {product.packLabel}
                  </Badge>
                  <Text style={heading}>{product.title}</Text>
                  <Text style={text}>{product.summary}</Text>
                  <Badge>
                    Seller snapshot · {formatDate(new Date(product.checkedAt))} · shipping /
                    checkout extras may apply
                  </Badge>
                  <Button title="Open Pick details" secondary onPress={() => onPick(product)} />
                </Card>
              ))}
              {matches.length === 0 && (
                <Card>
                  <Text style={text}>
                    No published matching products within this limit. Clear or change the budget;
                    you can still use the guide without buying anything.
                  </Text>
                </Card>
              )}
              <Badge>
                Initial catalogue only—not every available brand or a best-buy ranking. Price tier
                is not an evidence score.
              </Badge>
            </>
          )}
        </>
      )}
      <Text style={text}>
        A lifting belt is not a medical back brace; sleeves are not medical knee braces. Do not use
        equipment to push through pain. Get qualified advice for injuries or health concerns,
        including blood-pressure or cardiovascular conditions before belt use.
      </Text>
    </View>
  );
}
