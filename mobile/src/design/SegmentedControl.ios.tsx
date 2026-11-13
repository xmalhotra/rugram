import React from 'react';
import { Host, Picker, Text } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  disabled as disable,
  pickerStyle,
  tag,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { hit, useTheme } from './theme';
export function SegmentedControl({
  options,
  value,
  onChange,
  disabled = false,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const { colors: C, scheme } = useTheme();
  return (
    <Host
      matchContents={{ vertical: true }}
      colorScheme={scheme}
      style={{ minHeight: hit, width: '100%' }}
    >
      <Picker
        selection={value}
        onSelectionChange={onChange}
        modifiers={[
          pickerStyle('segmented'),
          tint(C.lime),
          disable(disabled),
          accessibilityLabel('Choose a section'),
        ]}
      >
        {options.map(option => (
          <Text key={option.id} modifiers={[tag(option.id)]}>
            {option.label}
          </Text>
        ))}
      </Picker>
    </Host>
  );
}
