# Wenwen Security Review

Last reviewed: 2026-05-20

## Current Status

This project is an Expo client app with local-first storage and direct Gemini API calls. The current implementation is acceptable for prototype and local-device testing, but it is not production-secure for public distribution without a backend layer.

## Findings

### High: Gemini API key is public in client builds

Expo client code cannot keep API keys secret. Any key used by the app can be extracted from a built app or intercepted at runtime.

Current mitigation:

- The app now reads only `EXPO_PUBLIC_GEMINI_API_KEY` to make the exposure explicit.
- `.env` remains ignored by git.
- Gemini failures are sanitized before surfacing to users.

Production recommendation:

- Move Gemini requests to a backend endpoint.
- Store the Gemini key only on the server.
- Add request authentication, rate limits, and abuse monitoring.

### High: Personal wellness data is stored in AsyncStorage

Tasks, journals, chat messages, summaries, and preferences are persisted locally using AsyncStorage. AsyncStorage is not encrypted storage.

Current mitigation:

- User input lengths are capped to limit accidental oversized local records.
- The README documents the privacy limitation.

Production recommendation:

- Use encrypted storage for sensitive records or encrypt records before persistence.
- Add a user-controlled data export/delete flow.
- Define retention rules for journals and companion memory.

### Medium: Image attachments are sent to Gemini when summaries are generated

Journal images can contain sensitive personal details.

Current mitigation:

- Unsupported image MIME types are normalized.
- Large image payloads are rejected before sending to Gemini.
- Prompt rules prevent identity, relationship, private trait, location, or health inference from images.

Production recommendation:

- Add an explicit user confirmation before sending an attached image to AI.
- Consider local-only image summaries or server-side redaction.

### Medium: AI prompts include user-generated content

Journal notes, chat messages, tasks, and companion memory are used as AI context.

Current mitigation:

- Companion memory is capped and opt-out is available in settings.
- Gemini prompt size is capped before requests are sent.
- Crisis messaging has a local fallback path.

Production recommendation:

- Add a privacy notice explaining what is sent to AI.
- Add a per-request "do not use app memory" option for companion chat.

## Checks Performed

- Searched for hardcoded API keys and secrets.
- Reviewed app config, environment handling, persistence stores, Gemini services, and image upload flow.
- Ran TypeScript and lint checks after hardening changes.

## Remaining Work

- Run dependency audit in an environment with `npm` and registry access.
- Add backend proxy before public release.
- Add encrypted persistence or record-level encryption for wellness data.
- Add privacy controls for clearing journal, chat, tasks, and companion memory.
