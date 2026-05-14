import type { TaskItem } from '@/src/types/task';

export type EvaluationFrequency = 'daily' | 'every3days' | 'weekly';

export type MoodKey = 'calm' | 'okay' | 'tired' | 'anxious' | 'heavy' | 'hopeful';

export type MoodOption = {
  key: MoodKey;
  label: string;
};

export type JournalTaskSnapshot = Pick<TaskItem, 'id' | 'title' | 'detail' | 'done'>;

export type JournalSummary = {
  id: string;
  dateKey: string;
  title: string;
  body: string;
  createdAt: string;
  tasks: JournalTaskSnapshot[];
  feelingNote: string;
  mood?: MoodKey;
};

export type JournalEntry = {
  dateKey: string;
  feelingNote: string;
  mood?: MoodKey;
  updatedAt: string;
  tasks: JournalTaskSnapshot[];
  summaries: JournalSummary[];
};
