import type { TaskItem } from '@/src/types/task';

export type EvaluationFrequency = 'daily' | 'every3days' | 'weekly';

export type MoodKey = 'calm' | 'okay' | 'tired' | 'anxious' | 'heavy' | 'hopeful';

export type MoodOption = {
  key: MoodKey;
  label: string;
};

export type JournalDailyContext = {
  sleep?: 'low' | 'okay' | 'rested';
  outside?: boolean;
  movement?: boolean;
};

export type JournalFeelingScale = {
  score: number | null;
  checkedAt: string;
};

export type JournalTaskSnapshot = Pick<TaskItem, 'id' | 'title' | 'detail' | 'done' | 'isRoutine'>;

export type JournalSummary = {
  id: string;
  dateKey: string;
  title: string;
  body: string;
  createdAt: string;
  tasks: JournalTaskSnapshot[];
  feelingNote: string;
  dailyContext?: JournalDailyContext;
  feelingScore?: number | null;
  mood?: MoodKey;
};

export type JournalEntry = {
  dateKey: string;
  feelingNote: string;
  dailyContext?: JournalDailyContext;
  feelingScale?: JournalFeelingScale;
  mood?: MoodKey;
  updatedAt: string;
  tasks: JournalTaskSnapshot[];
  summaries: JournalSummary[];
};
