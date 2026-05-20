import type { CompanionMessage } from '@/src/types/companion';
import { type GeminiErrorCallback, requestGeminiWithFallback } from '@/src/services/gemini-client';
import { buildWenwenPrompt } from '@/src/services/wenwen-persona';
import type { AvatarPersona } from '@/src/store/preferences-store';

const CRISIS_PATTERN = /\b(kill myself|suicide|self harm|self-harm|hurt myself|end my life|want to die)\b/i;

function isCrisisMessage(text: string) {
  return CRISIS_PATTERN.test(text);
}

function createFallbackCompanionReply(messages: CompanionMessage[], persona: AvatarPersona) {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.text.trim() ?? '';
  const lower = latestUserMessage.toLowerCase();
  const isCat = persona === 'cat';

  if (!latestUserMessage) {
    return isCat
      ? 'Say the messy part first. We can make it usable after.'
      : 'I’m here. You can write what happened today, or share the one thing that feels hardest to start.';
  }

  if (/\b(tired|exhausted|sleepy|drained|burned out|burnt out)\b/.test(lower)) {
    return isCat
      ? 'You are tired, so stop negotiating with the whole list. Pick what can wait, then do one small thing if you still have fuel.'
      : 'That sounds really draining. If you have a little capacity, one option is to pause for a minute, drink water, and choose what can wait.';
  }

  if (/\b(stress|stressed|anxious|overwhelmed|panic|worried|worry)\b/.test(lower)) {
    return isCat
      ? 'That is too many tabs open in your head. Name the one problem that actually needs action now; the rest can sit there and behave.'
      : 'That sounds like a lot to hold at once. You could start by naming the one thing that needs attention first, and let the rest stay parked for now.';
  }

  if (/\b(focus|distracted|procrastinat|stuck|confused)\b/.test(lower)) {
    return isCat
      ? 'Stuck is not a personality trait. Pick the smallest visible step and give it 10 minutes, then reassess.'
      : 'Being stuck can make everything feel bigger than it is. One option is to pick the smallest visible step and give it 10 minutes, not the whole day.';
  }

  if (/\b(sad|lonely|heavy|bad|down)\b/.test(lower)) {
    return isCat
      ? 'That sounds heavy. Do not try to repair the entire day in one move; pick one survivable action and count it.'
      : 'That sounds heavy. You do not have to fix the whole day right now; a small caring action for the next few minutes is enough.';
  }

  return isCat
    ? 'Connection is being rude. Your move: choose one thing that takes 5-10 minutes and make the day slightly less annoying.'
    : 'I’m having trouble connecting right now, but your note is still here. If it helps, choose one small next step that would take 5-10 minutes.';
}

export async function generateCompanionReply(
  messages: CompanionMessage[],
  options?: { onError?: GeminiErrorCallback; persona?: AvatarPersona; memoryContext?: string }
): Promise<string> {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.text ?? '';
  const persona = options?.persona ?? 'bot';

  if (isCrisisMessage(latestUserMessage)) {
    return [
      'That sounds urgent, and I am glad you said it here.',
      'Please contact emergency services or a trusted person near you right now.',
      'If you are in the U.S. or Canada, call or text 988 for immediate crisis support.',
    ].join(' ');
  }

  const history = messages
    .slice(-8)
    .map((message) => `${message.role === 'user' ? 'User' : 'Wenwen'}: ${message.text}`)
    .join('\n');

  const prompt = buildWenwenPrompt([
    'Task: Reply to the latest user message using the recent conversation.',
    persona === 'cat'
      ? [
          'Persona mode: Cat.',
          'Voice: blunt, dry, direct, slightly unimpressed, but never cruel.',
          'Tease the situation or avoidance pattern, not the user.',
          'Use short sentences. Less cushioning, more clarity.',
          'Do not use guilt, shame, threats, dependency language, or manipulative reverse psychology.',
          'If using a nudge, make it playful and transparent.',
        ].join('\n')
      : [
          'Persona mode: Bot Wenwen.',
          'Voice: warm, steady, practical, and emotionally safe.',
          'Prefer calm clarity over sarcasm.',
        ].join('\n'),
    'Response rules:',
    '- Reply in 2-4 short sentences.',
    '- Start by acknowledging the user naturally when they share emotion, stress, fatigue, confusion, or a problem.',
    '- Do not immediately correct, instruct, challenge, or analyze the user.',
    '- If useful, offer one concrete next action as an option, not a command.',
    '- If the user is making small talk, respond naturally without turning it into advice.',
    '- If the user asks for help choosing, planning, or deciding, give a simple answer with one next step.',
    '- Avoid sharp phrasing like "you need to", "just do", "that is wrong", "obviously", "calm down", or standalone "understood".',
    '- Do not scold, guilt, diagnose, moralize, or imply the user caused the problem.',
    '- Do not end every reply with a question.',
    '- Use at most one question, and only when it would genuinely help.',
    '- If memory context is provided, use it only when relevant to the latest message.',
    '- Do not list stored memories unless the user asks what you remember.',
    '- If referencing memory, keep it broad and allow correction.',
    '- Never make medical, mental health, personality, relationship, or identity claims from memory.',
    '',
    options?.memoryContext
      ? ['Memory context:', options.memoryContext].join('\n')
      : 'Memory context: None available.',
    '',
    'Recent conversation:',
    history,
  ]);

  const fallback = createFallbackCompanionReply(messages, persona);

  return requestGeminiWithFallback({
    prompt,
    fallback,
    onError: options?.onError,
    generationConfig: {
      temperature: 0.7,
    },
    parse: (rawText) => rawText.trim() || fallback,
  });
}
