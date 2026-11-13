import { formatDate } from '../../shared/format';
import { LearningContent } from './LearningContent';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './design/Text';
import type { CityEvent, HabitFlow, MobilePayload, Product } from '../../shared/mobile';
import { eventsForFlow, eventCost, eventDates, picksForHabit } from '../../shared/flow-connections';
import { eventProvider } from '../../shared/event-discovery';
import { Badge, Button, Card, Field, SectionHeader } from './design/components';
import { hit, space, useTheme } from './design/theme';
import { WorkoutJourney } from './WorkoutJourney';
import { MagnesiumGuide } from './MagnesiumGuide';
import { GymSupportGuide } from './GymSupportGuide';
import type { SupportKind } from '../../shared/gym-supports';
import { Disclosure } from './Disclosure';
import { FlowIllustration } from './FlowIllustration';
import { FlowHomeAction } from './FlowHomeAction';
import { HealthNote } from './OutboundLink';
import { HabitToggle } from './design/components';
import { todaySteps } from '../../shared/today';
import { AnimalMovementDeck } from './AnimalMovementDeck';
import { VisualFlowInformation } from './VisualFlowInformation';
import { resolveVisualFlow } from '../../shared/visual-flows';
import { AnimalStoryEntry } from './AnimalMovementStory';
import { animalMovementFlowId } from '../../shared/animal-movements';
import { gymTechnique } from '../../shared/gym-techniques';
import { GymTechniqueNotes } from './GymTechniqueNotes';
import { nutritionIdea } from '../../shared/nutrition-ideas';
import { techResource } from '../../shared/tech-resources';
import { TechResourceCard } from './TechResourceCard';
import { NutritionIdeaNotes } from './NutritionIdeaNotes';

export function FlowDetails(props: React.ComponentProps<typeof FlowReferenceDetails>) {
  const { flow, data } = props;
  const resolved = resolveVisualFlow(flow, data.flows);
  const resource = techResource(flow.id);
  if (resource)
    return (
      <TechResourceCard
        resource={resource}
        added={data.profile.flowIds.includes(flow.id)}
        busy={props.busy}
        onAdd={props.onToggle}
        onHome={props.onHome}
        onRemove={props.onRemove}
        onLink={props.onLink}
      />
    );
  const deck = (
    <AnimalMovementDeck
      key={flow.id}
      flow={resolved.flow}
      library={resolved.cards}
      added={data.profile.flowIds.includes(flow.id)}
      busy={props.busy}
      onAdd={props.onToggle}
      onHome={props.onHome}
      onRemove={props.onRemove}
      onLink={props.onLink}
      onAddCard={props.onAddCard}
      onIndexChange={props.onIndexChange}
      aside={
        flow.id === animalMovementFlowId ? (
          <AnimalStoryEntry inline onLink={props.onLink} />
        ) : undefined
      }
      renderInformation={(card, onClose) => (
        <VisualFlowInformation card={card} onClose={onClose}>
          {nutritionIdea(card.id) ? (
            <NutritionIdeaNotes
              cardId={card.id}
              sourceFlowId={card.visualCard?.sourceFlowId}
              onLink={props.onLink}
            />
          ) : gymTechnique(card.id) ? (
            <GymTechniqueNotes cardId={card.id} onLink={props.onLink} />
          ) : (
            <FlowReferenceDetails {...props} />
          )}
        </VisualFlowInformation>
      )}
    />
  );
  return deck;
}
function FlowReferenceDetails({
  flow,
  data,
  busy,
  onToggle,
  onHome,
  onRemove,
  onAvailable,
  onPick,
  onEvent,
  onLink,
  onComplete,
}: {
  flow: HabitFlow;
  data: MobilePayload;
  busy: boolean;
  onToggle: () => void;
  onHome: () => void;
  onRemove: () => void;
  onAvailable: (id: SupportKind, enabled: boolean) => void;
  onPick: (product: Product) => void;
  onEvent: (event: CityEvent) => void;
  onLink: (url: string) => void;
  onComplete: (id: string, enabled: boolean) => void;
  onAddCard?: (card: HabitFlow) => void;
  onIndexChange?: (index: number) => void;
}) {
  const { colors: C } = useTheme();
  const [budget, setBudget] = useState('1000');
  const isAdded = data.profile.flowIds.includes(flow.id);
  function saveAvailability(id: SupportKind, enabled: boolean) {
    if (isAdded && !busy) onAvailable(id, enabled);
  }
  const text = { color: C.muted } as const;
  const heading = {
    color: C.text,
    marginTop: space.ms,
  } as const;
  const candidates = [
    ...new Map(
      [...data.products, ...(data.flowResources?.products ?? [])].map(product => [
        product.id,
        product,
      ]),
    ).values(),
  ];
  const events = eventsForFlow(
    [
      ...new Map(
        [...data.events, ...(data.flowResources?.events ?? [])].map(event => [event.id, event]),
      ).values(),
    ],
    flow,
  );
  const maxBudget = budget.trim() === '' ? Infinity : Number(budget);
  return (
    <>
      {flow.area !== 'Tech' && <HealthNote />}
      <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
        <FlowIllustration flow={flow} />
        <View style={{ flex: 1, minWidth: 0, gap: space.sm }}>
          <Badge>{flow.goal}</Badge>
          <Text variant="callout" style={text}>{flow.milestone ?? flow.description}</Text>
        </View>
      </View>
      <FlowHomeAction
        added={isAdded}
        busy={busy}
        onAdd={onToggle}
        onHome={onHome}
        onRemove={onRemove}
      />
      {!isAdded && (
        <Text variant="footnote" style={text}>
          Preview only. Add this flow to make it yours.
        </Text>
      )}
      {flow.milestone && (
        <Disclosure title="About this flow">
          <Text variant="callout" style={text}>{flow.description}</Text>
        </Disclosure>
      )}
      {flow.guideId === 'magnesium' && (
        <Disclosure title="Understand magnesium">
          <MagnesiumGuide onLink={onLink} />
        </Disclosure>
      )}
      {flow.guideId === 'gym-supports' && (
        <Disclosure title="Find the right support">
          <GymSupportGuide
            data={data}
            busy={busy}
            readOnly={!isAdded}
            onAvailable={saveAvailability}
            onPick={onPick}
            onLink={onLink}
          />
        </Disclosure>
      )}
      {flow.recipe && (
        <>
          <Text variant="section" style={heading}>Ingredients</Text>
          {flow.recipe.ingredients.map(ingredient => (
            <Text key={ingredient} style={text}>
              • {ingredient}
            </Text>
          ))}
          <Text variant="section" style={heading}>How to put it together</Text>
          {flow.recipe.method.map((step, index) => (
            <Text key={step} style={text}>
              {index + 1}. {step}
            </Text>
          ))}
          <Badge>{flow.recipe.note}</Badge>
        </>
      )}
      {flow.rhythm && !flow.workout && <Badge>{flow.rhythm} · at your pace</Badge>}
      {flow.workout && <WorkoutJourney key={flow.id} flow={flow} data={data} onLink={onLink} />}
      {!flow.workout && (
        <View style={{ marginTop: space.ms }}>
          <SectionHeader title="Small steps" />
        </View>
      )}
      {!flow.workout &&
        flow.steps.map((step, index) => (
          <Disclosure
            key={step.id}
            title={`${index + 1}. ${step.title}`}
            initiallyOpen={index === 0}
          >
            <Text variant="callout" style={text}>{step.cue}</Text>
            <Badge>{step.duration}</Badge>
            {isAdded && (
              <HabitToggle
                title="Done today"
                detail={step.title}
                checked={todaySteps(
                  [flow],
                  data.profile,
                  new Date(),
                  Intl.DateTimeFormat().resolvedOptions().timeZone,
                ).some(item => item.stepId === `${flow.id}:${step.id}` && item.done)}
                disabled={busy}
                onChange={enabled => onComplete(`${flow.id}:${step.id}`, enabled)}
              />
            )}
            {step.pickContext && flow.guideId !== 'gym-supports' && (
              <Disclosure title={step.pickContext.label}>
                <Card>
                  <Text variant="callout" style={text}>Optional ideas. No purchase needed.</Text>
                  <Badge>Pack prices shown. Shipping and checkout charges may apply.</Badge>
                  <Field
                    label="Optional maximum pack budget (INR)"
                    value={budget}
                    onChange={setBudget}
                    numeric
                  />
                  {picksForHabit(
                    candidates,
                    step.pickContext.useCase,
                    Number.isFinite(maxBudget) ? maxBudget : Infinity,
                  ).map(product => (
                    <Pressable
                      key={product.id}
                      accessibilityRole="button"
                      accessibilityLabel={`View ${product.title} in Picks`}
                      onPress={() => onPick(product)}
                      style={{
                        minHeight: hit,
                        paddingVertical: space.ms,
                        borderTopWidth: StyleSheet.hairlineWidth,
                        borderColor: C.line,
                        gap: space.sm,
                      }}
                    >
                      <Text variant="headline" style={{ color: C.text }}>
                        {product.title}
                      </Text>
                      <Text variant="callout" style={text}>{product.packLabel ?? 'Compare seller options'}</Text>
                      <Badge>
                        {product.demo
                          ? 'Illustrative demo listing'
                          : 'Seller prices in Pick details'}
                      </Badge>
                      <Text variant="callout" style={{ color: C.lime }}>View pick details →</Text>
                    </Pressable>
                  ))}
                  {picksForHabit(
                    candidates,
                    step.pickContext.useCase,
                    Number.isFinite(maxBudget) ? maxBudget : Infinity,
                  ).length === 0 && (
                    <Text variant="callout" style={text}>
                      No published matching picks in this budget. Raise or clear the limit; you can
                      still follow the habit without a purchase.
                    </Text>
                  )}
                </Card>
              </Disclosure>
            )}
          </Disclosure>
        ))}
      {flow.eventContext && (
        <>
          <View style={{ marginTop: space.ms }}>
            <SectionHeader
              title={`Upcoming ${flow.eventContext.topic} ${flow.eventContext.country === 'IN' ? 'in India' : 'events'}`}
            />
          </View>
          <Text variant="callout" style={text}>
            Related to this flow, across cities. Dates and availability can change; registration
            happens with the organiser.
          </Text>
          {events.map(event => (
            <Card key={event.id}>
              <Text variant="section" style={heading}>{event.title}</Text>
              <Text variant="callout" style={text}>
                {eventDates(event)} · {event.city}
              </Text>
              <Text variant="callout" style={text}>{event.venue}</Text>
              <Badge>{event.registrationStatus ?? 'Check provider'}</Badge>
              <Text variant="callout" style={text}>{eventCost(event)}</Text>
              {event.feeNote && <Text variant="callout" style={text}>{event.feeNote}</Text>}
              {event.scheduleNote && <Text variant="callout" style={text}>{event.scheduleNote}</Text>}
              {event.checkedAt && (
                <Badge>
                  Source checked {formatDate(new Date(event.checkedAt))} · not a live feed
                </Badge>
              )}
              <Button
                title={
                  event.registrationMode === 'approval'
                    ? 'View event & request to join'
                    : event.registrationStatus === 'Tickets coming soon'
                      ? 'View official announcement ↗'
                      : `Registration on ${eventProvider(event.registrationUrl!)} ↗`
                }
                secondary
                onPress={() => onEvent(event)}
              />
              {event.sourceUrl && event.sourceUrl !== event.registrationUrl && (
                <Button
                  title="Official event information ↗"
                  secondary
                  onPress={() => onLink(event.sourceUrl!)}
                />
              )}
            </Card>
          ))}
          {events.length === 0 && (
            <Text variant="callout" style={text}>
              No published upcoming events are connected yet. Check the official event directory for
              the latest announcements.
            </Text>
          )}
        </>
      )}
      {flow.guideId &&
        data.library?.guides
          .filter(guide => guide.id === flow.guideId)
          .map(guide => (
            <Disclosure key={guide.id} title="Reading & references">
              <LearningContent guide={guide} onLink={onLink} />
            </Disclosure>
          ))}
      {isAdded && flow.review && !flow.workout && (
        <Disclosure title="How’s it going?">
          <Text variant="callout" style={text}>{flow.review}</Text>
        </Disclosure>
      )}
      {flow.guidance && !flow.workout && <Text variant="callout" style={text}>{flow.guidance}</Text>}
      {Boolean(flow.sources?.length) && (
        <Disclosure title="Sources & background">
          <Text variant="callout" style={text}>Background reading, not a guarantee of results.</Text>
          {flow.sources?.map(source => (
            <Button
              key={source.url}
              title={`${source.title} ↗`}
              secondary
              onPress={() => onLink(source.url)}
            />
          ))}
        </Disclosure>
      )}
    </>
  );
}
