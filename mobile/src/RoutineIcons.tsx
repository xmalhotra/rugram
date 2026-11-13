import Svg, { Circle, Path } from 'react-native-svg';
import type { RoutineCheckpoint, RoutineType } from '../../shared/routines';

const stroke = {
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none' as const,
};

/** A line icon for one part of the day. */
export function CheckpointIcon({
  checkpoint,
  color,
  size,
}: {
  checkpoint: RoutineCheckpoint;
  color: string;
  size: number;
}) {
  const line = { ...stroke, stroke: color };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {checkpoint === 'Wake up' && (
        <>
          <Path d="M3 18h18" {...line} />
          <Path d="M6 18a6 6 0 0 1 12 0" {...line} />
          <Path d="M12 4v2M5.5 10l1.5 1.2M18.5 10L17 11.2" {...line} />
        </>
      )}
      {checkpoint === 'Morning' && (
        <>
          <Path d="M5 9h8v5a3.5 3.5 0 0 1-3.5 3.5h-1A3.5 3.5 0 0 1 5 14z" {...line} />
          <Path d="M13 11h2.2a2 2 0 0 1 0 4H13" {...line} />
          <Path d="M8 6c.4.8.4.8 0 1.8M11 6c.4.8.4.8 0 1.8" {...line} />
        </>
      )}
      {checkpoint === 'Mid-morning' && (
        <>
          <Circle cx={12} cy={12} r={3.5} {...line} />
          <Path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6L18 18M18 6l-1.4 1.4M7.4 16.6L6 18" {...line} />
        </>
      )}
      {checkpoint === 'Lunch' && <Path d="M4 10h16c-.8 5-4 8-8 8s-7.2-3-8-8zM8 10c.8-2.5 2.2-4 4-4s3.2 1.5 4 4" {...line} />}
      {checkpoint === 'Afternoon' && (
        <>
          <Path d="M7 8h7v4a3 3 0 0 1-3 3H9a3 3 0 0 1-2-3z" {...line} />
          <Path d="M14 10h1.6a1.6 1.6 0 0 1 0 3.2H14" {...line} />
          <Path d="M6 18h12" {...line} />
        </>
      )}
      {checkpoint === 'Pre-workout' && <Path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12" {...line} />}
      {checkpoint === 'Post-workout' && (
        <>
          <Path d="M9 4h6v2h1v13a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V6h1z" {...line} />
          <Path d="M9 9h6" {...line} />
        </>
      )}
      {checkpoint === 'Dinner' && (
        <>
          <Circle cx={12} cy={13} r={6} {...line} />
          <Circle cx={12} cy={13} r={2.5} {...line} />
          <Path d="M8 4h.01M12 3h.01M16 4h.01" {...line} />
        </>
      )}
      {checkpoint === 'Before bed' && <Path d="M16 3.5A7.5 7.5 0 1 0 20 16 6 6 0 0 1 16 3.5z" {...line} />}
    </Svg>
  );
}

/** A small icon for Drink, Food, Supplement, or Habit. */
export function RoutineTypeIcon({ type, color, size }: { type: RoutineType; color: string; size: number }) {
  const line = { ...stroke, stroke: color };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {type === 'Drink' && <Path d="M8 3h8l-1 8a3 3 0 0 1-3 3 3 3 0 0 1-3-3zM12 14v5M9 21h6" {...line} />}
      {type === 'Food' && <Path d="M4 10h16c-.8 5-4 8-8 8s-7.2-3-8-8z" {...line} />}
      {type === 'Supplement' && <Path d="M8.5 8.5l7 7M9 7a4 4 0 0 1 5.6 5.6L9.6 17.6A4 4 0 0 1 4 12z" {...line} />}
      {type === 'Habit' && (
        <>
          <Circle cx={12} cy={12} r={8} {...line} />
          <Path d="M8 12.5l2.5 2.5L16 9.5" {...line} />
        </>
      )}
    </Svg>
  );
}
