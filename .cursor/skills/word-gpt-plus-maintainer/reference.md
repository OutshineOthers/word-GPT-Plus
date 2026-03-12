# Word GPT Plus Reference

> [!IMPORTANT]
> **Dual-IDE Sync**: This reference file is maintained in both `.cursor/skills/` (for Cursor) and `.agent/skills/` (for Antigravity). When updating one copy, always sync the other to keep them identical.

## Repository Identity

This repository is a Microsoft Word Office add-in. It runs as a task pane web app inside Word, not as a normal standalone web product. That means changes must respect both the Vue frontend architecture and Word add-in constraints such as manifests, `Office.onReady`, WebView2, and sideload workflows.

## Current Architecture

### 1. App bootstrap

- `src/main.ts` mounts Vue only after `window.Office.onReady()`.
- Pinia, router, i18n, and global error tracking are registered here.
- If startup fails in Word, inspect bootstrap and Word host readiness first.

### 2. Page layer

- `src/pages/HomePage.vue` is the main task pane workflow.
- `src/pages/SettingsPage.vue` manages provider settings, prompts, and tool toggles.
- Pages should compose stores/composables/services rather than become a dumping ground for logic.

### 3. Shared state

- `src/stores/sessionStore.ts`
  - owns `threadId`, `mode`, `history`, loading state, abort control, checkpoint selection
  - handles restoring and switching thread history
- `src/stores/toolPrefsStore.ts`
  - owns enabled Word tools and general tools
- `src/stores/promptStore.ts`
  - owns saved prompts, prompt selection, and custom system prompt

If a feature needs persistence across route changes or task pane reloads, the store layer is the first place to look.

### 4. Settings abstraction

- `src/utils/settingPreset.ts` declares setting definitions, defaults, storage keys, custom getters, and custom save handlers.
- `src/utils/settingForm.ts` creates a settings ref from those presets.
- Settings still use a local-storage-backed abstraction. Do not create unrelated new storage patterns unless the refactor explicitly targets this layer.

### 5. AI runtime

- `src/api/providerRegistry.ts`
  - central provider factory registry for OpenAI, Azure, Gemini, Groq, and Ollama
- `src/api/chatService.ts`
  - chat flow execution
- `src/api/agentService.ts`
  - agent flow execution and tool callbacks
- `src/api/types.ts`
  - provider and agent option types
- `src/api/union.ts`
  - compatibility re-export layer; keep working unless intentionally removing legacy imports

When adding a provider or changing provider configuration, update the runtime factory, types, and UI config mapping together.

### 6. Checkpoint persistence

- `src/api/checkpoints.ts` implements the IndexedDB-backed LangGraph saver
- `src/api/checkpointRuntime.ts` exposes the shared singleton checkpointer

Do not paper over checkpoint bugs with page-local hacks. Session and checkpoint issues belong here or in `sessionStore`.

### 7. Word tool system

Word tools are split by capability:

- `src/utils/wordTools/readTools.ts`
- `src/utils/wordTools/writeTools.ts`
- `src/utils/wordTools/formatTools.ts`
- `src/utils/wordTools/navigationTools.ts`
- `src/utils/wordTools/index.ts`
- `src/utils/wordTools.ts` is a compatibility re-export only

Use the narrowest file that matches the capability. If a new tool both reads and mutates, categorize it by primary purpose and document the choice in code if unclear.

### 8. Reusable UI logic

- `src/composables/useMessageRenderer.ts`
  - extracts plain text from LangChain messages and handles `<think>` block rendering
- `src/composables/useProviderConfig.ts`
  - builds provider config from settings

If a page gains reusable parsing, configuration, or orchestration logic, extract a composable instead of growing the page.

### 9. Styling (Tailwind CSS v4)

- `src/index.css` imports Tailwind via `@import 'tailwindcss'` and defines the full design system
- Uses `@tailwindcss/vite` plugin (v4.1.18) — no `tailwind.config.js` needed
- Custom theme tokens defined in `@theme {}` block: colors, shadows, radius, transitions, breakpoints
- Light/dark theme via CSS custom properties on `:root` / `.dark` / `[data-theme='dark']`
- Custom utility `no-scrollbar` defined via `@utility`

When adding styles, use the existing theme tokens (e.g., `bg-surface`, `text-main`, `border-border`) rather than hardcoded values.

### 10. Install and deployment docs

- `docs/安装指南.md` is the teammate-facing install guide
- `release/instant-use/manifest.xml` targets the hosted/public flow
- `release/self-hosted/manifest.xml` targets local or internal server hosting

For self-hosted support, the manifest URL values must match the actual served app URL.

## Preferred Modification Patterns

### Add a new Word tool

1. Choose the correct file under `src/utils/wordTools/`
2. Define the tool schema and executor
3. Export via `src/utils/wordTools/index.ts`
4. If the tool should be user-toggleable, ensure the name is included in `src/stores/toolPrefsStore.ts`
5. Verify agent mode still streams correctly

### Add a new provider or model family

1. Extend `src/api/types.ts`
2. Register model creation in `src/api/providerRegistry.ts`
3. Add UI config mapping in `src/composables/useProviderConfig.ts`
4. Add settings in `src/utils/settingPreset.ts`
5. Surface the settings in `src/pages/SettingsPage.vue`
6. Validate in both chat and agent modes

### Change chat or agent behavior

1. Check whether the behavior belongs in page orchestration, store state, or runtime service
2. Keep transport/runtime logic in `src/api/`
3. Keep persisted session state in `src/stores/sessionStore.ts`
4. Avoid duplicating stream assembly or message mutation logic across pages

### Change install or deployment behavior

1. Update `docs/安装指南.md` if the teammate workflow changed
2. Update the relevant manifest file if URLs or metadata changed
3. If the runtime URL changed, verify Word add-in loading manually
4. If the change only affects the frontend bundle, prefer telling users to rebuild and reload the add-in rather than reinstalling it

## Build, Test, and Debug Workflow

Default commands (use `npx` — `yarn` is not installed globally):

- install: `npm install`
- dev server: `npx vite --port 3000`
- build: `npx vite build`
- tests: `npx vitest run`
- typecheck: `npx tsc --noEmit`
- lint: `npx eslint .`

Suggested validation depth:

- utility/composable change: tests + build
- store/api change: tests + typecheck + build
- broad refactor: tests + typecheck + lint + build
- Word manifest/install change: build + manual Word verification

## Word Update Workflow

When the plugin is already installed in Word:

1. rebuild the frontend (or ensure dev server is running)
2. ensure the app is still being served at the manifest URL (`http://localhost:3000`)
3. reload the task pane in Word (右键加载项 → 重新加载)
4. only reinstall from shared folder if the manifest/catalog setup changed
5. if Vite HMR stops working, kill the dev server process and restart with `npx vite --port 3000`

This matters because reinstalling is slower and usually unnecessary for normal frontend updates.

## Common Pitfalls

- Adding direct `localStorage` writes for shared state instead of using stores
- Putting provider logic back into pages instead of `src/api/` plus composables
- Editing `src/api/union.ts` as if it were the primary implementation layer
- Adding a new Word tool but forgetting to include it in the toggleable tool list
- Changing manifest URLs without updating teammate documentation
- Fixing Word runtime issues without considering Word host startup via `Office.onReady`
- Using `overflow-hidden` on containers with hover effects that use `translate` — this clips the animated elements
- Styling `::-webkit-scrollbar` pseudo-elements in Vue `<style scoped>` or even component-level `<style>` blocks — these are Shadow DOM pseudo-elements and will not match Vue's scoped data attributes. Scrollbar overrides **must** go in `src/index.css` alongside the global scrollbar rules

## Review Checklist

When asked to review code in this repository, check for:

- broken session persistence or lost `threadId`
- provider settings that do not match runtime wiring
- Word API mutations that can damage document content unexpectedly
- page files regaining too much business logic
- missing build/test verification after architecture-touching changes
- add-in installation docs drifting from the actual manifest or runtime flow
