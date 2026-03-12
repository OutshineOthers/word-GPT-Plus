---
name: word-gpt-plus-maintainer
description: Maintains the Word GPT Plus repository, a Microsoft Word Office add-in built with Vue 3, Vite, TypeScript, Pinia, LangChain, and the Word JavaScript API. Use when modifying features, refactoring pages, adding AI providers or Word tools, fixing Word add-in build/runtime issues, writing teammate-facing install docs, or reviewing changes in this repo.
---
# Word GPT Plus Maintainer

> [!IMPORTANT]
> **Dual-IDE Sync**: This skill file is maintained in both `.cursor/skills/` (for Cursor) and `.agent/skills/` (for Antigravity). When updating one copy, always sync the other to keep them identical.

## Use This Skill When

Use this skill for work inside this repository when the task involves any of the following:

- changing chat, agent, provider, or session behavior
- adding or editing Word document tools
- modifying Word add-in install or sideload instructions
- debugging build, preview, or Word runtime issues
- reviewing maintainability or architectural fit of a change

## Project Defaults

- Treat this as a Word task pane add-in first, then as a Vue app.
- Keep page files focused on view orchestration. Prefer moving logic into `src/stores/`, `src/composables/`, `src/api/`, or `src/utils/`.
- Do not re-introduce large, page-local business logic into `src/pages/HomePage.vue` or `src/pages/SettingsPage.vue`.
- Prefer existing stores over new direct `localStorage` calls. If state is shared or persistent, put it in a Pinia store or the existing settings abstraction.
- Keep backward-compatibility re-export files working unless the task explicitly includes cleanup.

## Fast File Map

- Bootstrap: `src/main.ts`
- Main UI orchestration: `src/pages/HomePage.vue`, `src/pages/SettingsPage.vue`
- Shared state: `src/stores/sessionStore.ts`, `src/stores/toolPrefsStore.ts`, `src/stores/promptStore.ts`
- AI runtime: `src/api/providerRegistry.ts`, `src/api/chatService.ts`, `src/api/agentService.ts`, `src/api/types.ts`
- Checkpoint/session persistence: `src/api/checkpointRuntime.ts`, `src/api/checkpoints.ts`
- Reusable page logic: `src/composables/useMessageRenderer.ts`, `src/composables/useProviderConfig.ts`
- Word tools: `src/utils/wordTools/`
- Settings abstraction: `src/utils/settingForm.ts`, `src/utils/settingPreset.ts`
- User install guide: `docs/安装指南.md`
- Add-in manifests: `release/instant-use/manifest.xml`, `release/self-hosted/manifest.xml`
- Styling: `src/index.css` (Tailwind CSS v4 with `@tailwindcss/vite` plugin, custom theme tokens)

## Change Routing

### If the task is about session/thread behavior

Work in:
- `src/stores/sessionStore.ts`
- `src/api/checkpointRuntime.ts`
- `src/api/checkpoints.ts`

Do not solve thread persistence by page-local refs if the behavior should survive route changes.

### If the task is about provider/model behavior

Work in:
- `src/api/providerRegistry.ts`
- `src/api/types.ts`
- `src/composables/useProviderConfig.ts`
- `src/utils/settingPreset.ts`

If a new provider is added, update all four layers: settings, config building, runtime typing, and model creation.

### If the task is about Word document capabilities

Work in:
- `src/utils/wordTools/readTools.ts`
- `src/utils/wordTools/writeTools.ts`
- `src/utils/wordTools/formatTools.ts`
- `src/utils/wordTools/navigationTools.ts`
- `src/utils/wordTools/index.ts`

Add the tool to the right category file, then export it through `index.ts`. Keep the compatibility re-export in `src/utils/wordTools.ts` working.

### If the task is about prompts or tool preferences

Prefer:
- `src/stores/promptStore.ts`
- `src/stores/toolPrefsStore.ts`

### If the task is about teammate installation or Word sideloading

Start from:
- `docs/安装指南.md`
- `release/self-hosted/manifest.xml`
- `release/instant-use/manifest.xml`

## Validation Checklist

After substantive changes, run the smallest reasonable set below, and expand if the change touches broader behavior:

- `npx vitest run`
- `npx tsc --noEmit`
- `npx eslint .`
- `npx vite build`

For Word add-in runtime or install changes, also verify:

- the app loads at the manifest URL
- Word can still open the task pane
- if only frontend code changed, Word usually needs a panel reload, not full reinstallation

## Dev Server Notes

- Start the dev server: `npx vite --port 3000`
- The self-hosted manifest points to `http://localhost:3000`
- Vite HMR should auto-update on save; if it does not, **kill the dev server and restart it**
- After restarting the dev server, click "重新加载" (Reload) in the Word add-in panel to pick up the changes
- `yarn` is not installed globally; use `npx` commands instead

## Review Standard

When reviewing changes in this repo, prioritize:

1. session persistence regressions
2. provider/config mismatches across settings and runtime
3. Word tool safety and document mutation risks
4. reintroduction of `any`, page bloat, or scattered storage logic
5. missing validation for build/test/install flows

## Additional Reference

For deeper architecture and task-by-task guidance, read [reference.md](reference.md).