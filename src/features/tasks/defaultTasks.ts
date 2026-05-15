import type { TaskItem } from '@/src/types/task';

export function createDefaultTasks(now = new Date()): TaskItem[] {
  const createdAt = now.toISOString();

  return [
    {
      id: 'task-morning-checkin',
      title: 'Morning check-in',
      detail: 'Log mood and energy before 10:00 AM.',
      due: 'Today, 9:30 AM',
      done: false,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: 'task-water',
      title: 'Drink water',
      detail: 'Complete 8 glasses target for the day.',
      due: 'Today, 6:00 PM',
      done: false,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: 'task-breathing',
      title: 'Breathing exercise',
      detail: 'Do a 5-minute breathing exercise.',
      due: 'Today, 3:00 PM',
      done: false,
      createdAt,
      updatedAt: createdAt,
    },
  ];
}
