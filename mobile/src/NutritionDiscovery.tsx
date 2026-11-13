import React from 'react';
import type { HabitFlow } from '../../shared/mobile';
import type { NutritionPath } from '../../shared/admin-content';
import { focusOptions } from '../../shared/focus';
import { FlowSections } from './FlowSections';

/** Nutrition uses the same single sticky rail and continuous page as every category. */
export function NutritionDiscovery({
  paths,
  library,
  ownedIds,
  onSelect,
  onBack,
  busy = false,
}: {
  paths?: NutritionPath[];
  library: HabitFlow[];
  ownedIds: string[];
  onSelect: (flow: HabitFlow) => void;
  onBack: () => void;
  busy?: boolean;
}) {
  const options = focusOptions.map(option => ({ ...option, flowIds: [...option.flowIds] }));
  return (
    <FlowSections
      title="Nutrition"
      topics={options.filter(option => option.id === 'nutrition')}
      options={options}
      library={library}
      nutritionPaths={paths}
      ownedIds={ownedIds}
      busy={busy}
      onBack={onBack}
      onSelect={flow => onSelect(flow)}
    />
  );
}
