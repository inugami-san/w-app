export const WELLNESS_CATEGORIES = [
  'Reduce stress',
  'Build routines',
  'Stay motivated',
  'Improve focus',
  'Sleep better',
  'Boost mood',
  'Get healthier',
  'Get support',
] as const;

export type WellnessCategory = (typeof WELLNESS_CATEGORIES)[number];

export type SuggestedTask = {
  title: string;
  optional_detail: string;
  datetime_added: string;
  isRoutine?: boolean;
  energy?: 'tiny' | 'medium' | 'heavy';
  reason?: string;
};
