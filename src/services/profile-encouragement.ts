import { requestGeminiWithFallback } from '@/src/services/gemini-client';
import type { ProfileAchievement, ProfileStats } from '@/src/types/profile';

type ProfileEncouragementInput = {
  displayName?: string;
  stats: ProfileStats;
  achievements: ProfileAchievement[];
};

export function createFallbackProfileEncouragement({ displayName, stats, achievements }: ProfileEncouragementInput) {
  const name = displayName?.trim() || 'Friend';
  const unlocked = achievements.filter((achievement) => achievement.unlocked);
  const nextAchievement = achievements.find((achievement) => !achievement.unlocked);

  if (stats.totalTasksCompleted === 0 && stats.journalCount === 0) {
    return `${name}, your profile is ready. Start with one task or one journal note and Wenwen will begin noticing your patterns.`;
  }

  if (unlocked.length > 0) {
    return `${name}, Wenwen noticed ${stats.totalTasksCompleted} completed task${stats.totalTasksCompleted === 1 ? '' : 's'} and ${stats.journalCount} journal day${stats.journalCount === 1 ? '' : 's'}. Keep the next step small enough to finish.`;
  }

  if (nextAchievement) {
    return `${name}, you are close to ${nextAchievement.title}. One steady action today is enough to move the record forward.`;
  }

  return `${name}, your progress shows up in small, repeatable actions. Keep choosing the next realistic step.`;
}

function parseEncouragement(text: string) {
  const cleaned = text
    .replace(/^["']|["']$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220);

  if (!cleaned) {
    throw new Error('AI encouragement was empty.');
  }

  return cleaned;
}

export function generateProfileEncouragement(input: ProfileEncouragementInput) {
  const unlocked = input.achievements
    .filter((achievement) => achievement.unlocked)
    .map((achievement) => `${achievement.title} ${achievement.level}/${achievement.maxLevel} stars`)
    .join(', ') || 'none yet';
  const inProgress = input.achievements
    .filter((achievement) => achievement.nextGoal)
    .slice(0, 3)
    .map((achievement) => `${achievement.title} ${achievement.progress}/${achievement.goal} toward ${achievement.tierName === 'Locked' ? 'Bronze' : 'next star'}`)
    .join(', ');

  const prompt = [
    'Write one warm, concrete encouraging note for a wellness task app profile.',
    'Tone: grounded, not sentimental, not childish, no hashtags, no emojis.',
    'Length: 1-2 sentences, maximum 35 words.',
    'Mention one real stat or pattern if useful.',
    '',
    `Name: ${input.displayName?.trim() || 'Friend'}`,
    `Completed tasks: ${input.stats.totalTasksCompleted}`,
    `Days used: ${input.stats.daysUsed}`,
    `Journal days: ${input.stats.journalCount}`,
    `Companion days: ${input.stats.companionDays}`,
    `Unlocked achievements: ${unlocked}`,
    `Achievements in progress: ${inProgress || 'none'}`,
  ].join('\n');

  return requestGeminiWithFallback({
    prompt,
    fallback: createFallbackProfileEncouragement(input),
    parse: parseEncouragement,
    generationConfig: {
      temperature: 0.75,
    },
    timeoutMs: 9000,
  });
}
