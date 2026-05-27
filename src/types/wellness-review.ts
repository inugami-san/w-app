import type { EvaluationFrequency, JournalTaskSnapshot, MoodKey } from '@/src/types/journal';
import type { CompanionMessage } from '@/src/types/companion';

export type WellnessReviewPeriodType = EvaluationFrequency;

export type WellnessReviewPeriod = {
  key: string;
  type: WellnessReviewPeriodType;
  title: string;
  label: string;
  startDateKey: string;
  endDateKey: string;
  dateKeys: string[];
};

export type WellnessReviewJournalInput = {
  dateKey: string;
  feelingNote: string;
  feelingScore?: number | null;
  mood?: MoodKey;
};

export type WellnessReviewCompanionInput = {
  dateKey: string;
  messages: CompanionMessage[];
};

export type WellnessReviewMovementInput = {
  stepCount: number | null;
  locationCount: number;
  locationLabels: string[];
};

export type WellnessReviewSource = {
  period: WellnessReviewPeriod;
  tasks: JournalTaskSnapshot[];
  journals: WellnessReviewJournalInput[];
  companionDays: WellnessReviewCompanionInput[];
  movement: WellnessReviewMovementInput;
};

export type WellnessReviewSummary = {
  id: string;
  periodKey: string;
  title: string;
  body: string;
  createdAt: string;
  taskCount: number;
  completedTaskCount: number;
  journalCount: number;
  companionMessageCount: number;
  stepCount?: number | null;
  locationCount?: number;
};
