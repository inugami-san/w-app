import type { CompanionDayEntry } from '@/src/types/companion';
import type { JournalEntry } from '@/src/types/journal';
import type { ProfileAchievement, ProfileStats } from '@/src/types/profile';
import type { TaskItem } from '@/src/types/task';
import { getLocalDateKey } from '@/src/utils/date';

type ProfileSource = {
  tasks: TaskItem[];
  journalEntries: Record<string, JournalEntry>;
  companionEntries: Record<string, CompanionDayEntry>;
  totalEnergyEarned: number;
};

function dateKeyFromIso(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return getLocalDateKey(date);
}

function hasJournalActivity(entry: JournalEntry) {
  return Boolean(
    entry.feelingNote.trim() ||
      entry.summaries.length > 0 ||
      entry.tasks.length > 0 ||
      entry.mood ||
      entry.feelingScale?.score !== undefined ||
      entry.image
  );
}

function hasCompanionActivity(entry: CompanionDayEntry) {
  return entry.messages.some((message) => message.role === 'user') || entry.summaries.length > 0;
}

function getCompletedTasks({ tasks, journalEntries }: ProfileSource) {
  const completedCurrentTasks = tasks.filter((task) => task.done);
  const completedArchivedTasks = Object.values(journalEntries).flatMap((entry) =>
    entry.tasks.filter((task) => task.done)
  );

  return [...completedCurrentTasks, ...completedArchivedTasks];
}

function clampProgress(value: number, goal: number) {
  return Math.max(0, Math.min(value, goal));
}

const TIER_NAMES = ['Locked', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Hardcore'] as const;

function createAchievement(
  input: Omit<
    ProfileAchievement,
    'unlocked' | 'progress' | 'goal' | 'totalProgress' | 'level' | 'maxLevel' | 'nextGoal' | 'tierName'
  > & {
    progress: number;
    goals: number[];
  }
): ProfileAchievement {
  const goals = input.goals.filter((goal) => goal > 0).sort((left, right) => left - right);
  const maxLevel = goals.length;
  const totalProgress = Math.max(0, input.progress);
  const level = goals.reduce((count, goal) => count + (totalProgress >= goal ? 1 : 0), 0);
  const nextGoal = goals[level] ?? null;
  const activeGoal = nextGoal ?? goals[goals.length - 1] ?? 1;

  return {
    id: input.id,
    title: input.title,
    detail: input.detail,
    icon: input.icon,
    totalProgress,
    progress: clampProgress(totalProgress, activeGoal),
    goal: activeGoal,
    level,
    maxLevel,
    nextGoal,
    tierName: TIER_NAMES[level] ?? 'Hardcore',
    unlocked: level > 0,
  };
}

export function buildProfileAchievements(source: ProfileSource): ProfileAchievement[] {
  const completedTasks = getCompletedTasks(source);
  const journalEntries = Object.values(source.journalEntries);
  const companionEntries = Object.values(source.companionEntries);
  const activeJournalEntries = journalEntries.filter(hasJournalActivity);
  const activeCompanionEntries = companionEntries.filter(hasCompanionActivity);
  const routineCompletions = completedTasks.filter((task) => task.isRoutine).length;
  const tinyCompletions = completedTasks.filter((task) => task.energy === 'tiny').length;
  const heavyCompletions = completedTasks.filter((task) => task.energy === 'heavy').length;
  const daysUsed = getDaysUsed(source);
  const daysWithTasksAndJournal = activeJournalEntries.filter((entry) =>
    entry.tasks.some((task) => task.done)
  ).length;

  return [
    createAchievement({
      id: 'steady-start',
      title: 'Steady Start',
      detail: 'Complete tasks across your days.',
      goals: [10, 25, 50, 100, 250],
      progress: completedTasks.length,
      icon: 'footsteps-outline',
    }),
    createAchievement({
      id: 'task-builder',
      title: 'Task Builder',
      detail: 'Build a long-term record of completed tasks.',
      goals: [50, 100, 250, 500, 1000],
      progress: completedTasks.length,
      icon: 'checkmark-done-outline',
    }),
    createAchievement({
      id: 'journal-practice',
      title: 'Journal Practice',
      detail: 'Record journal days over time.',
      goals: [14, 30, 60, 120, 365],
      progress: activeJournalEntries.length,
      icon: 'journal-outline',
    }),
    createAchievement({
      id: 'reflection-loop',
      title: 'Reflection Loop',
      detail: 'Complete tasks and capture them in journal days.',
      goals: [7, 14, 30, 60, 120],
      progress: daysWithTasksAndJournal,
      icon: 'sync-circle-outline',
    }),
    createAchievement({
      id: 'gentle-routine',
      title: 'Gentle Routine',
      detail: 'Complete routine tasks repeatedly.',
      goals: [21, 50, 100, 250, 500],
      progress: routineCompletions,
      icon: 'repeat-outline',
    }),
    createAchievement({
      id: 'small-steps',
      title: 'Small Steps',
      detail: 'Complete tiny tasks across your days.',
      goals: [30, 75, 150, 300, 600],
      progress: tinyCompletions,
      icon: 'leaf-outline',
    }),
    createAchievement({
      id: 'deep-work',
      title: 'Deep Work',
      detail: 'Complete heavy tasks over time.',
      goals: [10, 25, 50, 100, 250],
      progress: heavyCompletions,
      icon: 'barbell-outline',
    }),
    createAchievement({
      id: 'asked-for-support',
      title: 'Support Practice',
      detail: 'Use Companion on different days.',
      goals: [10, 25, 50, 100, 200],
      progress: activeCompanionEntries.length,
      icon: 'chatbubble-ellipses-outline',
    }),
    createAchievement({
      id: 'energy-builder',
      title: 'Energy Builder',
      detail: 'Earn Energy through completed tasks, journals, and companion chats.',
      goals: [10, 25, 50, 100, 250],
      progress: source.totalEnergyEarned,
      icon: 'flash-outline',
    }),
    createAchievement({
      id: 'came-back',
      title: 'Came Back Anyway',
      detail: 'Use Wenwen across different days.',
      goals: [30, 60, 120, 240, 365],
      progress: daysUsed,
      icon: 'sparkles-outline',
    }),
  ];
}

export function getDaysUsed({ tasks, journalEntries, companionEntries }: ProfileSource) {
  const dateKeys = new Set<string>();

  tasks.forEach((task) => {
    const createdDateKey = dateKeyFromIso(task.createdAt);
    const updatedDateKey = dateKeyFromIso(task.updatedAt);
    if (createdDateKey) dateKeys.add(createdDateKey);
    if (updatedDateKey) dateKeys.add(updatedDateKey);
  });

  Object.values(journalEntries).forEach((entry) => {
    if (hasJournalActivity(entry)) dateKeys.add(entry.dateKey);
  });

  Object.values(companionEntries).forEach((entry) => {
    if (hasCompanionActivity(entry)) dateKeys.add(entry.dateKey);
  });

  return dateKeys.size;
}

export function buildProfileStats(source: ProfileSource): ProfileStats {
  const achievements = buildProfileAchievements(source);

  return {
    totalTasksCompleted: getCompletedTasks(source).length,
    daysUsed: getDaysUsed(source),
    journalCount: Object.values(source.journalEntries).filter(hasJournalActivity).length,
    companionDays: Object.values(source.companionEntries).filter(hasCompanionActivity).length,
    achievementsUnlocked: achievements.filter((achievement) => achievement.unlocked).length,
    achievementsTotal: achievements.length,
  };
}
