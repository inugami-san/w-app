# Wenwen

Wenwen is an Expo / React Native wellness companion app focused on small daily tasks, journaling, and companion chat.

## Local Setup

1. Install dependencies.

   ```bash
   npm install
   ```

2. Create a local environment file if you want AI features.

   ```bash
   cp .env.example .env
   ```

3. Add a Gemini key to `.env`.

   ```bash
   EXPO_PUBLIC_GEMINI_API_KEY=your_key_here
   ```

4. Start Expo.

   ```bash
   npx expo start
   ```

## Useful Commands

```bash
npm run lint
npx tsc --noEmit
npx expo start -c
```

## Security Notes

- `.env` is intentionally ignored by git. Do not commit API keys.
- `EXPO_PUBLIC_GEMINI_API_KEY` is public in a client app. For production, move Gemini calls behind a backend proxy before shipping to users.
- Journal, task, and companion data are currently local-first and stored with AsyncStorage. This is convenient for MVP work, but it is not encrypted storage.
- Avoid placing medical, financial, legal, or highly sensitive data in local app storage until a stronger privacy model is implemented.

## Project Structure

```text
app/                 Expo Router screens
components/          Skia persona components and shared UI
src/components/      App-specific reusable components
src/services/        AI, notification, and review services
src/store/           Zustand stores
src/theme/           Shared app theme tokens
src/types/           Shared TypeScript types
src/utils/           Date and input helpers
docs/                Project documentation
specify/             Product constitution / source-of-truth docs
```
