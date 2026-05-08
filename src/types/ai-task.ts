export const WELLNESS_CATEGORIES = [
  'Feel calmer',
  'Build routines',
  'Stay motivated',
  'Improve focus',
  'Better sleep',
  'Boost mood',
  'Get healthier',
  'Feel supported',
] as const;

export type WellnessCategory = (typeof WELLNESS_CATEGORIES)[number];

export type SuggestedTask = {
  title: string;
  optional_detail: string;
  datetime_added: string;
};
