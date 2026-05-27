import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

export type ProfileAchievement = {
  id: string;
  title: string;
  detail: string;
  unlocked: boolean;
  progress: number;
  goal: number;
  totalProgress: number;
  level: number;
  maxLevel: number;
  nextGoal: number | null;
  tierName: string;
  icon: ComponentProps<typeof Ionicons>['name'];
};

export type ProfileStats = {
  totalTasksCompleted: number;
  daysUsed: number;
  journalCount: number;
  companionDays: number;
  achievementsUnlocked: number;
  achievementsTotal: number;
};
