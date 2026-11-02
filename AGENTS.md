# Summit Updates: project rules for Codex

You are the engineer. I am the product manager. Follow this file exactly.

## How to work
1. Do ONLY the step I give you. Do not add features, pages, libraries, or "nice extras" that are not written here or in my step.
2. If something is unclear, choose the simplest option consistent with this file. Do not stop to ask me more than once; list your choices under ASSUMPTIONS in your reply.
3. All business rules live in src/lib as plain functions that never touch the screen or the browser. Screens only call these functions. Never copy a rule into a component.
4. After every step, run: npm test and npm run build. Paste the real results. If something fails, fix it. Never say "should work" without running it.
5. Allowed dependencies: react, react-dom, vite, typescript, @vitejs/plugin-react, vitest, @types/react, @types/react-dom. In the QA step you may also add jsdom and @testing-library/react. Nothing else (no router, no UI kit, no CSS framework, no state library).
6. End every reply with four headings: CHANGED (files), RAN (commands + results), ASSUMPTIONS, NOT DONE.

## Product
Summit Updates is a phone-friendly web app for Summit Retail Group (5 stores, about 200 employees; most work on the sales floor and rarely read email). Managers post announcements. Employees read the ones meant for them on their phones. Safety and policy updates can require an explicit confirmation. Managers can see who has confirmed and who has not.

## The two people who disagree (the main product decision)
- Rachel (Store Manager): "I need to identify who hasn't read important updates."
- Alex (Sales Associate): "I don't want another app constantly asking me to confirm things."
Resolution:
- Confirmation is required ONLY when the manager turns on "Requires acknowledgment". Default ON for Safety and Policy, OFF for General. The manager can change it.
- Employees are never interrupted: NO pop-ups, modals, blocking banners, or repeated prompts. One calm section at the top of the feed. Confirmation is one tap unless a manager has added the optional inline quick check.
- Confirming means "I confirm I read this", NOT "I understood this". Button text must say "Confirm I've read this".

## People
Stores (id: name): bellevue: Summit Bellevue; downtown: Summit Downtown Seattle; redmond: Summit Redmond; kirkland: Summit Kirkland; tacoma: Summit Tacoma.
Managers (they are NOT recipients of announcements):
- Michael Torres, Operations Manager. Can post to any stores or all 5. Sees every announcement and everyone's status.
- Rachel Kim, Store Manager of Summit Bellevue. Can post ONLY to Bellevue. Sees announcements whose audience includes Bellevue (including ones Michael posted), and in those sees ONLY Bellevue employees' status.
Employees: 20 total with realistic, varied names: four per store. Bellevue includes Alex Rivera; Tacoma includes Maya Chen. Each employee belongs to exactly one store.
Users and stores are fixed constants (not saved in the browser). There is no login: a "Viewing as" switcher in the header offers Michael Torres and Rachel Kim first, then all 20 employees grouped by store name, four per store. All employees remain in recipient counts and lists.

## Rules
R1 An announcement's audience is fixed when it is published: save recipientIds (the employees of the chosen stores at that moment).
R2 Published announcements cannot be edited or deleted.
R3 Opening or viewing an announcement NEVER acknowledges it. Only the confirm button does.
R4 One acknowledgment per employee per announcement. Confirming again does nothing and creates no second record.
R5 Only a recipient can acknowledge, and only if requiresAck is true. Otherwise return an error.
R6 Employee feed = announcements where the employee is in recipientIds, newest first. "Needs your confirmation" = those that require acknowledgment and are not yet acknowledged by this employee. Those appear ONLY in that top section. Everything else goes in "Recent updates".
R7 Managers: Michael sees all announcements. Rachel sees announcements whose audienceStoreIds include bellevue. For Rachel, recipient counts and lists include only Bellevue employees.
R8 Posting: Rachel's audience must be exactly bellevue. Michael may pick any non-empty set of stores ("All stores" = all 5).
R9 Validation (trim spaces first): title 1 to 80 characters; body 1 to 1000 characters; at least one store; category is safety, policy or general. Error texts: "Add a title.", "Add a message.", "Choose at least one store.", "Title is too long (80 max).", "Message is too long (1000 max)."
R10 Counts and lists always agree: acknowledgedCount equals the acknowledged list length; pendingCount equals the pending list length; together they equal total.
R11 Saving: localStorage key "summit-updates:v1" holding { version: 1, currentUserId, announcements, acknowledgments }. If the data is missing, corrupted, or the wrong version, silently rebuild the seed data. "Reset demo data" restores the seed and switches to Rachel.
R12 Seed data is built from a passed-in "now" date (dates are relative to now) so tests are predictable.
R13 Managers may optionally add one quick check to an update that requires acknowledgment. It is off by default, has one question (1–160 characters), exactly two distinct answer choices (1–120 characters each), a correct answer index (0 or 1), and a retry explanation (1–300 characters); trim text before validating. Employees answer inline with calm retry feedback. A correct answer enables the existing confirm button but NEVER acknowledges by itself. The acknowledgment action must reject missing or incorrect answers for checked updates. Turning acknowledgment off removes the draft check. Questions are fixed when published. The check reinforces one key detail and is not proof that the entire update was read or understood.

## Data model (TypeScript)
Category = "safety" | "policy" | "general"
QuickCheck { question: string, options: [string, string], correctOptionIndex: 0 | 1, explanation: string }
Announcement { id, title, body, category, requiresAck: boolean, quickCheck?: QuickCheck, audienceStoreIds: string[], recipientIds: string[], authorId, publishedAt: ISO string }
Acknowledgment { announcementId, userId, ackedAt: ISO string }

## Seed data (8 announcements)
Write realistic retail body text (2 to 5 sentences each). Acknowledgment times must be realistic and after the publish time.
1. "Revised closing safety procedure" | safety | ack required | Bellevue only | by Rachel | 2 days ago | 2 of 4 acknowledged; Alex Rivera has NOT. Includes the sample quick check: "Should you complete closing alone?", with "Yes" and "No, with another team member" (correct).
2. "Return policy change: receipt required for refunds over $50" | policy | ack required | all 5 stores | by Michael | 4 days ago | 15 of 20 acknowledged (3 of 4 in every store). Alex has acknowledged. Maya Chen has acknowledged.
3. "Holiday hours: Nov 27 to Jan 2" | general | no ack | all stores | by Michael | 1 day ago.
4. "New window display goes up Friday" | general | no ack | Bellevue and Downtown | by Michael | 3 days ago.
5. "Ladder and step-stool safety reminder" | safety | ack required | Redmond and Kirkland | by Michael | 5 days ago | 6 of 8 acknowledged.
6. "Break room refrigerator cleanout every Friday" | general | no ack | Tacoma only | by Michael | 6 days ago.
7. "Employee discount policy update" | policy | ack required | all stores | by Michael | 21 days ago | 18 of 20 acknowledged (the 2 pending are in different stores; neither is Alex or Maya).
8. "Fall promotion results and thank-you" | general | no ack | all stores | by Michael | 35 days ago.
Result: Alex has exactly 1 item needing confirmation (#1). Maya Chen (Tacoma) has 0, so she shows the "all caught up" empty state.

## Exact words to use in the UI
App name: Summit Updates. Switcher label: "Viewing as".
Employee: section titles "Needs your confirmation" and "Recent updates". Chips: "Confirmation needed", "Confirmed". Button: "Confirm I've read this" (while saving: "Saving…"). After: "Confirmed on <date and time>". Empty (nothing to confirm): title "You're all caught up", text "Nothing needs your confirmation right now." Empty (no updates): title "No updates yet", text "When your manager posts something for your store, it will show up here."
Manager: tabs "Updates" and "Post an update". Counts: "2 of 4 acknowledged", or "No acknowledgment required". Lists: "Acknowledged" and "Still pending". Filter: "Needs follow-up". Empty: "No updates yet" / "Post your first update to get started." Toggle label: "Requires acknowledgment". Toggle help: "Employees will be asked to tap “Confirm I've read this”. Best for safety and policy updates." Form note: "Published updates can't be edited. Recipients are fixed when you publish." Submit button: "Publish update".

## Design
One accent color (blue). Amber for "Confirmation needed", green for "Confirmed". Text contrast at least 4.5:1. Never rely on color alone: always a text label. System font, 16px base. Every button and tap target at least 44px tall. Design for 390px wide phones first; on desktop center the content, max 680px wide. No horizontal scrolling at 360px. Visible keyboard focus ring. Long titles wrap.

## Technical
Vite + React + TypeScript (strict) + plain CSS (src/styles.css) + Vitest. Navigation uses URL hash routes (#/, #/post, #/update/<id>) with a tiny custom hook. Do NOT install react-router (hash routes mean refresh and shared links never 404). State: one store module (src/lib/store.ts) with getState, subscribe and action functions, plus a React hook using useSyncExternalStore.
Folders: src/lib (types.ts, constants.ts, seed.ts, rules.ts, store.ts, useAppState.ts, *.test.ts), src/components, src/screens, src/App.tsx, src/main.tsx, src/styles.css.
Scripts: dev, build, test (vitest run), preview.
