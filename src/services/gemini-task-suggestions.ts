import type { SuggestedTask, WellnessCategory } from '@/src/types/ai-task';
import { type GeminiErrorCallback, requestGeminiWithFallback } from '@/src/services/gemini-client';
import { buildWenwenPrompt } from '@/src/services/wenwen-persona';

const TARGET_SUGGESTION_COUNT = 5;
const MAX_GENERATION_ATTEMPTS = 4;

type TaskSuggestionOptions = {
  focusText?: string;
  onError?: GeminiErrorCallback;
};

const BASE_PROMPT = buildWenwenPrompt([
  'Task: Generate 5 simple, realistic tasks based on the selected wellness category and optional personal focus.',
  'Categories: Reduce stress, Build routines, Stay motivated, Improve focus, Sleep better, Boost mood, Get healthier, Get support.',
  '',
  'Task rules:',
  '- Each task must be easy to complete in 5-15 minutes.',
  '- Use clear action verbs and everyday language.',
  '- If a personal focus is provided, make at least 2 tasks directly related to that focus.',
  '- Example: personal focus "I want to study Japanese language" can become "Study Japanese for 10 Minutes".',
  '- Example: personal focus "I am planning on developing a project" can become "Work on Your Project for 10 Minutes".',
  '- Keep titles short, specific, and practical.',
  '- Avoid cute, therapy-like, sentimental, or vague wellness titles.',
  '- Use practical task names instead of wellness clichés.',
  '- No extreme advice.',
  '- Every task must be different from the others.',
  '- Decide if each task is suitable as a daily routine.',
  '- Set is_routine to true only when repeating it daily is realistic, safe, and low-pressure.',
  '- Set is_routine to false for one-time planning, errands, cleanup, decisions, or tasks tied only to tomorrow.',
  '- Set energy to "tiny", "medium", or "heavy". Prefer tiny or medium unless the task needs deeper focus.',
  '- Add a short reason explaining why this task may help based on the category or focus.',
  '- Do not number the tasks.',
  '- Do not prefix titles with numbers, bullets, dashes, or labels.',
  '- Return only valid JSON.',
  '',
  'JSON Format:',
  '[',
  '  {',
  '    "title": "Drink Water",',
  '    "optional_detail": "Drink one glass of water to refresh your body.",',
  '    "datetime_added": "",',
  '    "is_routine": true,',
  '    "energy": "tiny",',
  '    "reason": "Hydration is a small reset that is easy to complete."',
  '  }',
  ']',
]);

function extractJsonArray(text: string): string {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('AI did not return JSON output.');
  }
  return text.slice(start, end + 1);
}

function normalizeSuggestion(raw: unknown): SuggestedTask {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid AI response shape.');
  }

  const value = raw as Partial<SuggestedTask> & { is_routine?: unknown };
  const title = `${value.title ?? ''}`
    .trim()
    .replace(/^(task\s+\d+[\).:-]?\s*|\d+[\).:-]?\s*|[-•]\s*)/i, '')
    .trim();
  if (!title) {
    throw new Error('Generated task title is missing.');
  }

  const optionalDetail =
    `${value.optional_detail ?? ''}`
      .trim()
      .replace(/^(\d+[\).:-]?\s*|[-•]\s*)/i, '')
      .trim() || 'A 5-15 minute task.';
  const datetimeAdded = `${value.datetime_added ?? ''}`.trim() || new Date().toISOString();
  const routineValue = value.isRoutine ?? value.is_routine;
  const isRoutine =
    typeof routineValue === 'boolean'
      ? routineValue
      : inferRoutineCandidate(title, optionalDetail);
  const energy = normalizeEnergy(value.energy, title, optionalDetail);
  const reason = cleanReason(value.reason, title);

  return {
    title,
    optional_detail: optionalDetail,
    datetime_added: datetimeAdded,
    isRoutine,
    energy,
    reason,
  };
}

function normalizeEnergy(value: unknown, title: string, detail = ''): SuggestedTask['energy'] {
  const cleanValue = `${value ?? ''}`.trim().toLowerCase();
  if (cleanValue === 'tiny' || cleanValue === 'medium' || cleanValue === 'heavy') return cleanValue;

  const text = normalizeTitleForComparison(`${title} ${detail}`);
  if (/\b(5|two|one|drink|breathe|water|stand|write one|text one)\b/.test(text)) return 'tiny';
  if (/\b(plan|project|study|deep|clean|prepare|review)\b/.test(text)) return 'medium';
  return 'medium';
}

function cleanReason(value: unknown, title: string) {
  const reason = `${value ?? ''}`
    .replace(/\s+/g, ' ')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 130);

  return reason || `${title} is a small step that fits the selected focus.`;
}

function normalizeTitleForComparison(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalWord(word: string): string {
  let value = word;
  if (value.endsWith('ing') && value.length > 5) value = value.slice(0, -3);
  else if (value.endsWith('ed') && value.length > 4) value = value.slice(0, -2);
  else if (value.endsWith('es') && value.length > 4) value = value.slice(0, -2);
  else if (value.endsWith('s') && value.length > 3) value = value.slice(0, -1);
  return value;
}

function titleTokens(value: string): string[] {
  const stopWords = new Set(['a', 'an', 'the', 'to', 'for', 'of', 'and', 'in', 'on', 'at', 'my', 'your']);
  return normalizeTitleForComparison(value)
    .split(' ')
    .map(canonicalWord)
    .filter((token) => token && !stopWords.has(token));
}

function getJaccardSimilarity(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const left = new Set(a);
  const right = new Set(b);
  let overlap = 0;
  left.forEach((token) => {
    if (right.has(token)) overlap += 1;
  });
  const unionCount = new Set([...left, ...right]).size;
  return unionCount === 0 ? 0 : overlap / unionCount;
}

function areTitlesSimilar(leftTitle: string, rightTitle: string): boolean {
  const leftNormalized = normalizeTitleForComparison(leftTitle);
  const rightNormalized = normalizeTitleForComparison(rightTitle);

  if (!leftNormalized || !rightNormalized) return false;
  if (leftNormalized === rightNormalized) return true;
  if (
    (leftNormalized.length >= 8 && rightNormalized.includes(leftNormalized)) ||
    (rightNormalized.length >= 8 && leftNormalized.includes(rightNormalized))
  ) {
    return true;
  }

  const similarity = getJaccardSimilarity(titleTokens(leftTitle), titleTokens(rightTitle));
  return similarity >= 0.55;
}

function isUniqueTitle(title: string, existingTitles: string[]): boolean {
  return existingTitles.every((existing) => !areTitlesSimilar(title, existing));
}

function cleanFocusText(value = ''): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 140);
}

function toTitleCase(value: string): string {
  return value
    .split(' ')
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(' ');
}

function getFocusSubject(focusText: string): { subject: string; verb: string } {
  const raw = cleanFocusText(focusText);
  const lowered = raw.toLowerCase();

  if (lowered.includes('japanese')) {
    return { subject: 'Japanese', verb: 'Study' };
  }

  if (lowered.includes('project') || lowered.includes('develop')) {
    return { subject: 'Your Project', verb: 'Work on' };
  }

  const subject = raw
    .replace(/^(i\s+want\s+to|i\s+am\s+planning\s+on|i'm\s+planning\s+on|planning\s+on|i\s+need\s+to|i\s+would\s+like\s+to|i'm\s+focusing\s+on|focus\s+on)\s+/i, '')
    .replace(/^(study|learn|practice|develop|build|create|make|do|doing)\s+/i, '')
    .trim();

  const titleSubject = toTitleCase(subject || raw);
  const verb =
    /study|learn|language|practice/i.test(raw)
      ? 'Study'
      : /develop|build|project|create|make/i.test(raw)
        ? 'Work on'
        : 'Work on';

  return { subject: titleSubject || 'Your Focus', verb };
}

function inferRoutineCandidate(title: string, detail = ''): boolean {
  const text = normalizeTitleForComparison(`${title} ${detail}`);
  const oneOffWords = [
    'tomorrow',
    'calendar',
    'choose',
    'pick',
    'book',
    'buy',
    'pay',
    'submit',
    'send',
    'call',
    'clean one',
    'clear one',
    'tidy one',
    'prepare clothes',
  ];

  if (oneOffWords.some((word) => text.includes(word))) {
    return false;
  }

  const routineWords = [
    'water',
    'breathe',
    'breath',
    'stretch',
    'walk',
    'study',
    'practice',
    'read',
    'write',
    'journal',
    'focus',
    'timer',
    'move',
    'sleep',
    'sunlight',
  ];

  return routineWords.some((word) => text.includes(word));
}

function inferFocusRoutine(focusText: string, category: WellnessCategory): boolean {
  const text = normalizeTitleForComparison(focusText);

  if (/\b(buy|pay|submit|send|call|book|schedule|apply)\b/.test(text)) {
    return false;
  }

  if (category === 'Build routines' || category === 'Improve focus') {
    return true;
  }

  return /\b(study|learn|practice|language|read|write|project|develop|exercise|workout)\b/.test(text);
}

function buildFocusTaskSuggestions(
  category: WellnessCategory,
  focusText = ''
): Omit<SuggestedTask, 'datetime_added'>[] {
  const cleanFocus = cleanFocusText(focusText);
  if (!cleanFocus) return [];

  const { subject, verb } = getFocusSubject(cleanFocus);
  const subjectLower = subject.toLowerCase();
  const isRoutine = inferFocusRoutine(cleanFocus, category);

  return [
    {
      title: `${verb} ${subject} for 10 Minutes`,
      optional_detail: `Spend 10 minutes on ${subjectLower}, then stop at a clear point.`,
      isRoutine,
      energy: 'medium',
      reason: `This turns ${subjectLower} into a short, realistic focus block.`,
    },
    {
      title: `Write One Next Step for ${subject}`,
      optional_detail: `Write the next small action for ${subjectLower} before doing anything else.`,
      isRoutine: false,
      energy: 'tiny',
      reason: `A written next step makes ${subjectLower} easier to start.`,
    },
  ];
}

const LOCAL_TASK_SUGGESTIONS: Record<WellnessCategory, Omit<SuggestedTask, 'datetime_added'>[]> = {
  'Reduce stress': [
    { title: 'Breathe for Two Minutes', optional_detail: 'Pause and take slow breaths for two minutes.' },
    { title: 'Write One Worry', optional_detail: 'Write one worry down so it is not only in your head.' },
    { title: 'Step Outside', optional_detail: 'Stand outside or near a window for five minutes.' },
    { title: 'Tidy One Surface', optional_detail: 'Clear one desk, table, or counter for a calmer space.' },
    { title: 'Stretch Your Shoulders', optional_detail: 'Roll and stretch your shoulders for five minutes.' },
    { title: 'Listen to Calm Audio', optional_detail: 'Play one calming track or quiet sound for 5-10 minutes.' },
  ],
  'Build routines': [
    { title: "Set Tomorrow's First Step", optional_detail: 'Choose one simple task to start with tomorrow.' },
    { title: 'Prepare a Water Bottle', optional_detail: 'Fill a bottle or glass so it is ready when you need it.' },
    { title: 'Clear One Small Space', optional_detail: 'Reset one small area you use often.' },
    { title: 'Choose a Start Time', optional_detail: 'Pick a realistic time for one routine you want to keep.' },
    { title: 'Make a Short Checklist', optional_detail: 'Write three simple steps for one routine.' },
    { title: 'Place One Helpful Item', optional_detail: 'Put one item where it will be easy to use later.' },
  ],
  'Stay motivated': [
    { title: 'Finish One Easy Task', optional_detail: 'Choose one low-effort task and complete it first.' },
    { title: 'Review One Recent Win', optional_detail: 'Write down one thing you handled recently.' },
    { title: 'Start for Five Minutes', optional_detail: 'Work on one task for only five minutes.' },
    { title: "Name Today's Main Step", optional_detail: 'Write the single most useful step for today.' },
    { title: 'Make Progress Visible', optional_detail: 'Put your next step somewhere you can see it.' },
    { title: 'Set a Simple Reminder', optional_detail: 'Create one reminder for a task you want to remember.' },
  ],
  'Improve focus': [
    { title: 'Silence One Distraction', optional_detail: 'Turn off one notification or move one distraction away.' },
    { title: 'Set a 10-Minute Timer', optional_detail: 'Focus on one task until the timer ends.' },
    { title: 'Clear Your Desk', optional_detail: 'Move extra items away from your work area.' },
    { title: 'Write the Next Step', optional_detail: 'Write the next physical action before starting.' },
    { title: 'Close Extra Tabs', optional_detail: 'Close apps or browser tabs you do not need right now.' },
    { title: 'Put Your Phone Away', optional_detail: 'Place your phone out of reach for 10 minutes.' },
  ],
  'Sleep better': [
    { title: 'Dim the Lights', optional_detail: 'Lower bright lights for 10 minutes before bed.' },
    { title: "Prepare Tomorrow's Clothes", optional_detail: 'Pick or prepare clothes for tomorrow.' },
    { title: "Write Tomorrow's First Task", optional_detail: 'Write one task to start with tomorrow.' },
    { title: 'Stretch Before Bed', optional_detail: 'Do a simple 5-minute stretch before sleeping.' },
    { title: 'Move Your Phone Away', optional_detail: 'Put your phone away from the bed for tonight.' },
    { title: 'Make Water Ready', optional_detail: 'Place water nearby so your morning starts easier.' },
  ],
  'Boost mood': [
    { title: 'Play One Favorite Song', optional_detail: 'Listen to one song that usually lifts your mood.' },
    { title: 'Step Into Sunlight', optional_detail: 'Spend five minutes near sunlight or fresh air.' },
    { title: 'Message Someone Kind', optional_detail: 'Send a short message to someone who feels easy to talk to.' },
    { title: 'Write One Good Moment', optional_detail: 'Write one thing that was okay or good today.' },
    { title: 'Make a Warm Drink', optional_detail: 'Prepare tea, coffee, or another warm drink.' },
    { title: 'Do a Quick Reset', optional_detail: 'Wash your face, change clothes, or reset your space.' },
  ],
  'Get healthier': [
    { title: 'Drink Water', optional_detail: 'Drink one glass of water to refresh your body.' },
    { title: 'Take a Short Walk', optional_detail: 'Walk for 5-15 minutes, even if it is just nearby.' },
    { title: 'Stretch Briefly', optional_detail: 'Stretch your arms, legs, and back for five minutes.' },
    { title: 'Eat a Fruit or Vegetable', optional_detail: 'Have one fruit, vegetable, or simple nourishing snack.' },
    { title: 'Stand and Move', optional_detail: 'Stand up and move your body for five minutes.' },
    { title: 'Wash Your Face', optional_detail: 'Wash your face or freshen up for a quick reset.' },
  ],
  'Get support': [
    { title: 'Text One Trusted Person', optional_detail: 'Send one honest sentence to someone you trust.' },
    { title: 'Write What You Need', optional_detail: 'Write one thing that would help you today.' },
    { title: 'Choose One Helpful Resource', optional_detail: 'Save or open one resource that supports your next step.' },
    { title: 'Share One Honest Sentence', optional_detail: 'Tell someone one real thing about how today is going.' },
    { title: 'Plan a Check-In', optional_detail: 'Choose a time to check in with someone later.' },
    { title: 'Save a Support Contact', optional_detail: 'Add or confirm one contact you can reach when needed.' },
  ],
};

function withTimestamp(task: Omit<SuggestedTask, 'datetime_added'>): SuggestedTask {
  return {
    ...task,
    isRoutine: task.isRoutine ?? inferRoutineCandidate(task.title, task.optional_detail),
    energy: normalizeEnergy(task.energy, task.title, task.optional_detail),
    reason: cleanReason(task.reason, task.title),
    datetime_added: new Date().toISOString(),
  };
}

function buildFallbackTaskSuggestions(
  category: WellnessCategory,
  existingTitles: string[] = [],
  count = TARGET_SUGGESTION_COUNT,
  focusText = ''
): SuggestedTask[] {
  const pool = [
    ...buildFocusTaskSuggestions(category, focusText),
    ...LOCAL_TASK_SUGGESTIONS[category],
    ...Object.values(LOCAL_TASK_SUGGESTIONS).flat(),
  ];
  const accepted: SuggestedTask[] = [];
  const blockedTitles = [...existingTitles];

  pool.forEach((task) => {
    if (accepted.length >= count) return;
    if (!isUniqueTitle(task.title, blockedTitles)) return;
    if (!isUniqueTitle(task.title, accepted.map((item) => item.title))) return;
    accepted.push(withTimestamp(task));
  });

  return accepted.slice(0, count);
}

function buildPrompt(category: WellnessCategory, blockedTitles: string[], focusText = ''): string {
  const avoidLine =
    blockedTitles.length > 0
      ? `Avoid tasks that are same/similar to these: ${blockedTitles.map((item) => `"${item}"`).join(', ')}.`
      : '';
  const cleanFocus = cleanFocusText(focusText);
  const focusLine = cleanFocus ? `Personal focus: "${cleanFocus}".` : 'Personal focus: none provided.';

  return `${BASE_PROMPT}\n\nSelected wellness category: ${category}\n${focusLine}\n${avoidLine}`.trim();
}

async function requestGeminiSuggestions(
  category: WellnessCategory,
  blockedTitles: string[],
  focusText = '',
  onError?: GeminiErrorCallback
): Promise<SuggestedTask[]> {
  const prompt = buildPrompt(category, blockedTitles, focusText);

  return requestGeminiWithFallback({
    prompt,
    fallback: buildFallbackTaskSuggestions(category, blockedTitles, TARGET_SUGGESTION_COUNT, focusText),
    onError,
    generationConfig: {
      temperature: 0.7,
      responseMimeType: 'application/json',
    },
    parse: (rawText) => {
      const jsonText = extractJsonArray(rawText);
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) {
        throw new Error('AI response was not a task list.');
      }

      return parsed.map(normalizeSuggestion);
    },
  });
}

export async function generateGeminiTaskSuggestion(
  category: WellnessCategory,
  existingTitles: string[] = [],
  options?: TaskSuggestionOptions
): Promise<SuggestedTask> {
  const suggestions = await generateGeminiTaskSuggestions(category, existingTitles, options);
  return suggestions[0];
}

export async function generateGeminiTaskSuggestions(
  category: WellnessCategory,
  existingTitles: string[] = [],
  options?: TaskSuggestionOptions
): Promise<SuggestedTask[]> {
  const accepted: SuggestedTask[] = [];
  const blockedTitles = [...existingTitles];
  const focusText = cleanFocusText(options?.focusText);

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    if (accepted.length >= TARGET_SUGGESTION_COUNT) break;

    const results = await requestGeminiSuggestions(
      category,
      [...blockedTitles, ...accepted.map((item) => item.title)],
      focusText,
      options?.onError
    );

    results.forEach((candidate) => {
      if (accepted.length >= TARGET_SUGGESTION_COUNT) return;
      if (!isUniqueTitle(candidate.title, blockedTitles)) return;
      if (!isUniqueTitle(candidate.title, accepted.map((item) => item.title))) return;
      accepted.push(candidate);
    });
  }

  if (accepted.length < TARGET_SUGGESTION_COUNT) {
    const fallback = buildFallbackTaskSuggestions(
      category,
      [...blockedTitles, ...accepted.map((item) => item.title)],
      TARGET_SUGGESTION_COUNT - accepted.length,
      focusText
    );
    accepted.push(...fallback);
  }

  if (accepted.length === 0) {
    accepted.push(
      withTimestamp({
        title: 'Choose One Easy Step',
        optional_detail: 'Pick one realistic action you can finish in 5-10 minutes.',
        isRoutine: false,
      })
    );
  }

  return accepted.slice(0, TARGET_SUGGESTION_COUNT);
}
