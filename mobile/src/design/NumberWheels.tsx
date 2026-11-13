import { useEffect, useRef } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fieldRole, parseClock, type Field } from '../../../shared/training';
import { Text } from './Text';
import { useTheme } from './theme';

const ROW = 44;
const WHEEL_HEIGHT = ROW * 5;

const plateStep = new Set(['barbell', 'smith', 'machine', 'cable']);
const singleStep = new Set(['dumbbell', 'kettlebell']);

export type NumberWheelProps = {
  values: number[];
  value: number;
  onChange: (value: number) => void;
  unit: string;
  format?: (value: number) => string;
  accessibilityLabel: string;
};

export function formatWheelNumber(value: number) {
  const rounded = Math.round(value * 1000) / 1000;
  return rounded === 0 ? '0' : String(rounded);
}

function same(left: number, right: number) {
  return Math.abs(left - right) < 1e-6;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Inclusive range. `current` is inserted when it falls off the step or outside the range. */
export function wheelValues(min: number, max: number, step: number, current: number | null) {
  const count = Math.max(0, Math.round((max - min) / step));
  const values: number[] = [];
  for (let index = 0; index <= count; index += 1) {
    const next = Math.round((min + index * step) * 1000) / 1000;
    if (next > max + 1e-6) break;
    values.push(next);
  }
  if (current != null && Number.isFinite(current)) {
    const rounded = Math.round(current * 1000) / 1000;
    if (!values.some(item => same(item, rounded))) {
      values.push(rounded);
      values.sort((left, right) => left - right);
    }
  }
  return values;
}

export function weightStepKg(equipment?: string) {
  const kind = (equipment ?? '').toLowerCase();
  if (plateStep.has(kind)) return 2.5;
  if (singleStep.has(kind)) return 1;
  return 0.5;
}

function readNumber(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

function readSeconds(text: string) {
  const parsed = parseClock(text);
  if (parsed != null) return parsed;
  const value = Number(text);
  if (Number.isFinite(value) && value >= 0) return Math.round(value);
  return 0;
}

function isKilometres(unit?: string) {
  const kind = (unit ?? '').trim().toLowerCase();
  return kind === 'km' || kind === 'kilometre' || kind === 'kilometres' || kind === 'kilometer' || kind === 'kilometers';
}

function distanceUnit(unit?: string) {
  if (isKilometres(unit)) return 'km';
  const kind = (unit ?? '').trim().toLowerCase();
  if (!kind || kind === 'm' || kind === 'metre' || kind === 'metres' || kind === 'meter' || kind === 'meters') return 'm';
  return (unit ?? '').trim();
}

export function fieldUnit(field: Field) {
  if (field.input === 'duration') return 'sec';
  if (field.input === 'distance') return distanceUnit(field.unit);
  return field.unit;
}

export function isWheelField(field: Field) {
  if (field.input === 'duration' || field.input === 'distance') return true;
  const role = fieldRole(field);
  return role === 'weight' || role === 'reps';
}

export function adjustLabel(setNumber: number, name: string, value: string, unit?: string) {
  const shown = value.trim();
  if (!shown) return `Set ${setNumber} ${name}, adjust`;
  const withUnit = unit && !shown.includes(':') && unit.toLowerCase() !== name.toLowerCase() ? `${shown} ${unit}` : shown;
  return `Set ${setNumber} ${name}, ${withUnit}, adjust`;
}

function writeNumber(text: string, onChange: (text: string) => void, next: number) {
  const formatted = formatWheelNumber(next);
  if (formatted === text.trim()) return;
  onChange(formatted);
}

export function weightColumn(equipment: string | undefined, text: string, onChange: (text: string) => void, accessibilityLabel: string): NumberWheelProps {
  const current = readNumber(text);
  return {
    values: wheelValues(0, 300, weightStepKg(equipment), current),
    value: current ?? 0,
    unit: 'kg',
    accessibilityLabel,
    onChange: next => writeNumber(text, onChange, next),
  };
}

export function repsColumn(text: string, onChange: (text: string) => void, accessibilityLabel: string): NumberWheelProps {
  const current = readNumber(text);
  return {
    values: wheelValues(0, 60, 1, current),
    value: current ?? 0,
    unit: 'reps',
    accessibilityLabel,
    onChange: next => writeNumber(text, onChange, next),
  };
}

export function durationColumns(text: string, onChange: (text: string) => void, accessibilityLabel: string): NumberWheelProps[] {
  const total = readSeconds(text);
  const minute = Math.floor(total / 60);
  const second = total % 60;
  const write = (nextMinute: number, nextSecond: number) => {
    const formatted = String(nextMinute * 60 + nextSecond);
    if (formatted === text.trim()) return;
    onChange(formatted);
  };
  return [
    {
      values: wheelValues(0, 59, 1, minute),
      value: minute,
      unit: 'min',
      accessibilityLabel: `${accessibilityLabel} minutes`,
      onChange: next => write(next, second),
    },
    {
      values: wheelValues(0, 55, 5, second),
      value: second,
      unit: 'sec',
      accessibilityLabel: `${accessibilityLabel} seconds`,
      onChange: next => write(minute, next),
    },
  ];
}

export function distanceColumn(unit: string | undefined, text: string, onChange: (text: string) => void, accessibilityLabel: string): NumberWheelProps {
  const current = readNumber(text);
  const kilometres = isKilometres(unit);
  return {
    values: kilometres ? wheelValues(0, 100, 0.5, current) : wheelValues(0, 10_000, 50, current),
    value: current ?? 0,
    unit: distanceUnit(unit),
    accessibilityLabel,
    onChange: next => writeNumber(text, onChange, next),
  };
}

export function fieldColumns(fields: Field[], text: Record<string, string>, onText: (key: string, value: string) => void, equipment?: string) {
  const columns: NumberWheelProps[] = [];
  for (const field of fields) {
    if (!isWheelField(field)) continue;
    const current = text[field.key] ?? '';
    const write = (value: string) => onText(field.key, value);
    if (field.input === 'duration') columns.push(...durationColumns(current, write, field.label));
    else if (field.input === 'distance') columns.push(distanceColumn(field.unit, current, write, field.label));
    else if (fieldRole(field) === 'weight') columns.push(weightColumn(equipment, current, write, field.label));
    else columns.push(repsColumn(current, write, field.label));
  }
  return columns;
}

function bandColor(scheme: 'light' | 'dark') {
  return scheme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(120,120,128,0.16)';
}

function withValue(values: number[], value: number) {
  if (values.some(item => same(item, value))) return values;
  return [...values, value].sort((left, right) => left - right);
}

export function NumberWheel({ values, value, onChange, unit, format = formatWheelNumber, accessibilityLabel }: NumberWheelProps) {
  const { colors: C, scheme } = useTheme();
  const options = withValue(values, value);
  const selected = options.find(item => same(item, value)) ?? options[0] ?? 0;
  const index = Math.max(0, options.findIndex(item => same(item, selected)));
  const listRef = useRef<ScrollViewInstance>(null);
  const contentOffset = useRef({ x: 0, y: index * ROW });
  const emitted = useRef(selected);
  const internal = useRef(false);
  const positioned = useRef(false);
  const programmatic = useRef(false);
  if (!internal.current) emitted.current = selected;

  useEffect(() => {
    if (Platform.OS === 'ios') return;
    if (internal.current) {
      internal.current = false;
      positioned.current = true;
      return;
    }
    programmatic.current = true;
    listRef.current?.scrollTo({ y: index * ROW, animated: false });
    const timer = setTimeout(() => {
      programmatic.current = false;
      positioned.current = true;
    }, 80);
    return () => clearTimeout(timer);
  }, [index]);

  const choose = (next: number) => {
    if (!Number.isFinite(next) || same(next, emitted.current)) return;
    emitted.current = next;
    if (Platform.OS !== 'ios') internal.current = true;
    onChange(next);
  };

  const settle = (offsetY: number) => {
    if (!positioned.current || programmatic.current) return;
    const next = options[clamp(Math.round(offsetY / ROW), 0, options.length - 1)];
    if (next != null) choose(next);
  };

  const label = accessibilityLabel.toLowerCase().includes(unit.toLowerCase()) ? accessibilityLabel : `${accessibilityLabel}, ${unit}`;
  const unitLabel = (
    <Text accessible={false} style={{ width: 40, color: C.text, fontSize: 16, fontWeight: '600' }}>
      {unit}
    </Text>
  );

  if (Platform.OS === 'ios') {
    return (
      <View style={{ flex: 1, maxWidth: 240, height: WHEEL_HEIGHT, flexDirection: 'row', alignItems: 'center' }}>
        <Picker
          selectedValue={String(selected)}
          onValueChange={item => choose(Number(item))}
          accessibilityLabel={label}
          selectionColor={bandColor(scheme)}
          style={{ flex: 1, height: WHEEL_HEIGHT, backgroundColor: 'transparent' }}
          itemStyle={{ fontSize: 22, color: C.text, height: WHEEL_HEIGHT }}
        >
          {options.map(item => (
            <Picker.Item key={format(item)} label={format(item)} value={String(item)} color={C.text} />
          ))}
        </Picker>
        {unitLabel}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, maxWidth: 240, height: WHEEL_HEIGHT, flexDirection: 'row', alignItems: 'center' }}>
      <ScrollView
        ref={listRef}
        accessibilityLabel={label}
        style={{ flex: 1, height: WHEEL_HEIGHT }}
        showsVerticalScrollIndicator={false}
        snapToInterval={ROW}
        disableIntervalMomentum
        decelerationRate="fast"
        scrollEventThrottle={32}
        nestedScrollEnabled
        contentOffset={contentOffset.current}
        contentContainerStyle={{ paddingVertical: (WHEEL_HEIGHT - ROW) / 2 }}
        onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => settle(event.nativeEvent.contentOffset.y)}
        onScrollEndDrag={event => settle(event.nativeEvent.contentOffset.y)}
        onMomentumScrollEnd={event => settle(event.nativeEvent.contentOffset.y)}
      >
        {options.map(item => {
          const active = same(item, selected);
          return (
            <View key={format(item)} style={{ height: ROW, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 22, fontWeight: active ? '700' : '500', color: active ? C.text : C.muted }}>{format(item)}</Text>
            </View>
          );
        })}
      </ScrollView>
      {unitLabel}
    </View>
  );
}

export function WheelSheet({
  title,
  columns,
  onDone,
  onClose,
  onType,
}: {
  title: string;
  columns: NumberWheelProps[];
  onDone: () => void;
  onClose: () => void;
  onType?: () => void;
}) {
  const { colors: C, scheme } = useTheme();
  const inset = useSafeAreaInsets().bottom;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} />
      <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: Math.max(inset, 12) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 8 }}>
          {onType ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Type with the keyboard" onPress={onType} style={{ minWidth: 72, minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}>
              <Text style={{ color: C.text, fontSize: 17 }}>Type</Text>
            </Pressable>
          ) : (
            <View style={{ width: 72 }} />
          )}
          <Text accessibilityRole="header" numberOfLines={1} style={{ flex: 1, textAlign: 'center', color: C.text, fontSize: 17, fontWeight: '600' }}>
            {title}
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Done" onPress={onDone} style={{ minWidth: 72, minHeight: 44, justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 8 }}>
            <Text style={{ color: C.lime, fontSize: 17, fontWeight: '600' }}>Done</Text>
          </Pressable>
        </View>
        <View style={{ height: WHEEL_HEIGHT, marginTop: 4 }}>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 16,
              right: 16,
              top: (WHEEL_HEIGHT - ROW) / 2,
              height: ROW,
              borderRadius: 10,
              backgroundColor: bandColor(scheme),
            }}
          />
          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 }}>
            {columns.map((column, index) => (
              <NumberWheel key={`${column.accessibilityLabel}-${index}`} {...column} />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** The wheels on the page, under the row. The page around them stays visible and can still scroll. */
export function InlineWheels({ columns }: { columns: NumberWheelProps[] }) {
  const { scheme } = useTheme();
  if (!columns.length) return null;
  return (
    <View style={{ height: WHEEL_HEIGHT, marginTop: 4 }}>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: (WHEEL_HEIGHT - ROW) / 2,
          height: ROW,
          borderRadius: 10,
          backgroundColor: bandColor(scheme),
        }}
      />
      <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
        {columns.map((column, index) => (
          <NumberWheel key={`${column.accessibilityLabel}-${index}`} {...column} />
        ))}
      </View>
    </View>
  );
}

/** The same box as the old number field: a press opens the wheel, and Type falls back to the keyboard. */
export function WheelEntry({
  value,
  placeholder,
  placeholderTextColor,
  focused,
  typing,
  onPress,
  onChangeText,
  onTypingEnd,
  accessibilityLabel,
  keyboardType,
  selectTextOnFocus,
  style,
}: {
  value: string;
  placeholder?: string;
  placeholderTextColor: string;
  focused: boolean;
  typing: boolean;
  onPress: () => void;
  onChangeText: (value: string) => void;
  onTypingEnd: () => void;
  accessibilityLabel: string;
  keyboardType: 'number-pad' | 'decimal-pad';
  selectTextOnFocus?: boolean;
  style: StyleProp<TextStyle>;
}) {
  const { colors: C } = useTheme();
  const appearance = focused ? [style, { borderWidth: 1, borderColor: C.lime }] : style;
  if (typing) {
    return (
      <TextInput
        autoFocus
        value={value}
        onChangeText={onChangeText}
        onBlur={onTypingEnd}
        keyboardType={keyboardType}
        selectTextOnFocus={selectTextOnFocus}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        accessibilityLabel={accessibilityLabel}
        style={appearance}
      />
    );
  }
  const flat = StyleSheet.flatten(appearance) ?? {};
  const shown = value.trim() ? value : (placeholder ?? '');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: focused }}
      onPress={onPress}
      style={[
        appearance,
        {
          justifyContent: 'center',
          alignItems: flat.textAlign === 'center' ? 'center' : 'flex-start',
        },
      ]}
    >
      <Text
        variant="numeric"
        numberOfLines={1}
        style={{ color: value.trim() ? flat.color : placeholderTextColor, fontSize: flat.fontSize, fontWeight: flat.fontWeight, textAlign: flat.textAlign }}
      >
        {shown}
      </Text>
    </Pressable>
  );
}
