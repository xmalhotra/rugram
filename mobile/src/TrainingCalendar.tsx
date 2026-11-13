import { useMemo, useRef, type ComponentRef } from 'react';
import { ScrollView, View } from 'react-native';
import { trainingCalendar, type CalendarDay } from '../../shared/training-calendar';
import { Text } from './design/Text';
import { space, useTheme } from './design/theme';

const cell = 12;
const levelOpacity = [0, 0.3, 0.55, 0.8, 1];
const weekdayLabels = ['Mon', '', 'Wed', '', 'Fri', '', ''];

function dayLabel(day: CalendarDay) {
  const date = new Date(`${day.date}T12:00:00`);
  const when = date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  return day.count ? `${when}: ${day.count} workout${day.count === 1 ? '' : 's'}` : `${when}: no workout`;
}

/** A year of training, one square a day, darker on days with more finished workouts. Private to the member. */
export function TrainingCalendar({ finishedAt }: { finishedAt: readonly string[] | null }) {
  const { colors: C } = useTheme();
  const calendar = useMemo(() => trainingCalendar(finishedAt ?? [], Date.now()), [finishedAt]);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const square = (day: CalendarDay) => (
    <View
      key={day.date}
      accessible
      accessibilityLabel={dayLabel(day)}
      style={{
        width: cell,
        height: cell,
        borderRadius: 3,
        backgroundColor: day.future ? 'transparent' : day.level ? C.lime : C.line,
        opacity: day.future ? 1 : day.level ? levelOpacity[day.level] : 0.45,
      }}
    />
  );
  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Text accessibilityRole="header" variant="section" style={{ color: C.text }}>
          Training
        </Text>
        <Text variant="footnote" style={{ color: C.muted }}>
          {finishedAt == null
            ? ' '
            : `${calendar.total} workout${calendar.total === 1 ? '' : 's'} on ${calendar.activeDays} day${calendar.activeDays === 1 ? '' : 's'} this year`}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View style={{ paddingTop: space.md, gap: space.xs }}>
          {weekdayLabels.map((label, index) => (
            <Text key={index} variant="caption" style={{ height: cell, color: C.muted }}>
              {label}
            </Text>
          ))}
        </View>
        <ScrollView
          ref={scroll}
          horizontal
          showsHorizontalScrollIndicator={false}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
          accessibilityLabel="Training calendar, the last year"
        >
          <View style={{ flexDirection: 'row', gap: space.xs }}>
            {calendar.weeks.map(week => (
              <View key={week.days[0].date} style={{ gap: space.xs }}>
                {/* The month name overflows into the next columns, so it never widens its own. */}
                <View style={{ height: 13, width: cell, overflow: 'visible' }}>
                  {week.month ? (
                    <Text numberOfLines={1} variant="caption" style={{ position: 'absolute', left: 0, width: 32, color: C.muted }}>
                      {week.month}
                    </Text>
                  ) : null}
                </View>
                {week.days.map(square)}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
      <View
        accessible
        accessibilityLabel="Lighter squares are fewer workouts, darker are more"
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: space.xs }}
      >
        <Text variant="caption" style={{ color: C.muted }}>Less</Text>
        {levelOpacity.map((opacity, level) => (
          <View
            key={level}
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              backgroundColor: level ? C.lime : C.line,
              opacity: level ? opacity : 0.45,
            }}
          />
        ))}
        <Text variant="caption" style={{ color: C.muted }}>More</Text>
      </View>
    </View>
  );
}
