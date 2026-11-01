import React, { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { Text } from './design/Text';
import type { HabitFlow, MobilePayload, Product } from '../../shared/mobile';
import { defaultSupplementDiscovery, topicProducts } from '../../shared/supplement-discovery';
import { supplementOrderNote, supplementPickCategories } from '../../shared/supplement-picks';
import { Button, Sheet } from './design/components';
import { useTheme } from './design/theme';
import { LearningContent } from './LearningContent';
import { browseProducts } from '../../shared/pick-catalog';
import { CategoryRail } from './CategoryRail';
import { HealthNote } from './OutboundLink';
import { SupplementProductDeck } from './SupplementProductDeck';

export function SupplementDiscovery({
  data,
  onBack,
  onPick,
  onFlow,
  onGuide,
  onLink,
}: {
  data: MobilePayload;
  onBack: () => void;
  onPick: (product: Product) => void;
  onFlow: (flow: HabitFlow) => void;
  onGuide: () => void;
  onLink: (url: string) => void;
}) {
  const { colors: C } = useTheme();
  const [topicId, setTopic] = useState<string | null>(null);
  const [information, setInformation] = useState(false);
  const categories = supplementPickCategories(
    data.library?.settings.supplementDiscovery ?? defaultSupplementDiscovery,
  );
  const topic = categories.find(item => item.id === topicId);
  const products = topic ? topicProducts(topic, browseProducts(data), 5) : [];
  const catalogue = browseProducts(data);
  const copy = { color: C.muted, fontSize: 15, lineHeight: 22 } as const;
  const select = (id: string) => {
    setTopic(id);
    setInformation(false);
  };
  return (
    <View style={{ gap: 18, backgroundColor: C.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Back to ${topic ? 'Supplement categories' : 'All categories'}`}
          onPress={() => {
            setInformation(false);
            if (topic) setTopic(null);
            else onBack();
          }}
          style={{ minHeight: 48, justifyContent: 'center' }}
        >
          <Text style={{ color: C.lime, fontSize: 17 }}>
            ← {topic ? 'Supplements' : 'All categories'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Supplement information"
          onPress={() => setInformation(true)}
          style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: C.muted, fontSize: 27 }}>ⓘ</Text>
        </Pressable>
      </View>
      {!topic ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {categories.map(item => {
            const preview = topicProducts(item, catalogue, 1)[0];
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={item.title}
                onPress={() => select(item.id)}
                style={({ pressed }) => ({
                  width: '47.5%',
                  minHeight: 156,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: C.line,
                  backgroundColor: C.card,
                  padding: 18,
                  justifyContent: 'center',
                  gap: 12,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                {preview?.imageUrl && (
                  <Image
                    source={{ uri: preview.imageUrl }}
                    resizeMode="contain"
                    accessibilityIgnoresInvertColors
                    style={{ height: 64, width: 64, borderRadius: 12, backgroundColor: C.photoMat }}
                  />
                )}
                <Text style={{ color: C.text, fontSize: 18, fontWeight: '600' }}>{item.title}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <>
          <CategoryRail
            compact
            items={categories.map(item => ({
              id: item.id,
              title: item.title,
              illustration: 'supplements',
            }))}
            selected={topic.id}
            onSelect={select}
            label="Supplement categories"
          />
          {products.length ? (
            <SupplementProductDeck
              key={topic.id}
              products={products}
              onPick={onPick}
              onLink={onLink}
            />
          ) : (
            <View
              style={{ minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 12 }}
            >
              <Text style={copy}>No products listed yet</Text>
            </View>
          )}
        </>
      )}
      {information && (
        <Sheet
          title={topic ? `${topic.title} · Information` : 'Supplement information'}
          onClose={() => setInformation(false)}
        >
          <View style={{ gap: 18, paddingVertical: 16 }}>
            <HealthNote />
            <Text style={copy}>{supplementOrderNote}</Text>
            {topic && (
              <>
                <Text style={copy}>{topic.consider}</Text>
                <Text style={copy}>{topic.foodFirst}</Text>
                {topic.guideId === 'magnesium' && (
                  <Button
                    title="Read the label guide →"
                    secondary
                    onPress={() => {
                      setInformation(false);
                      onGuide();
                    }}
                  />
                )}
                {topic.guideId !== 'magnesium' &&
                  data.library?.guides
                    .filter(guide => guide.id === topic.guideId)
                    .map(guide => <LearningContent key={guide.id} guide={guide} onLink={onLink} />)}
                {topic.flowIds
                  .flatMap(id => data.flows.filter(flow => flow.id === id))
                  .map(flow => (
                    <Button
                      key={flow.id}
                      title={`${flow.title} →`}
                      secondary
                      onPress={() => {
                        setInformation(false);
                        onFlow(flow);
                      }}
                    />
                  ))}
                <Text style={copy}>
                  Ingredient evidence does not establish brand quality or personal suitability.
                  Under 18, pregnant, breastfeeding, taking medicines or managing a health
                  condition? Get qualified advice first.
                </Text>
                {topic.sourceUrls.map(url => (
                  <Button
                    key={url}
                    title="Read the evidence ↗"
                    secondary
                    onPress={() => onLink(url)}
                  />
                ))}
              </>
            )}
          </View>
        </Sheet>
      )}
    </View>
  );
}
