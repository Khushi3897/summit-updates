# Summit Updates

[Open the live demo](https://Khushi3897.github.io/summit-updates/)

Summit Updates helps retail managers follow up on important announcements without turning every update into another task for employees. Built for **Scenario 2: Important Employee Updates**, it is a phone-friendly prototype for Summit Retail Group's five stores and approximately 200 employees, many of whom work on the sales floor and rarely check company email.

The prototype completes one workflow: **a manager publishes to selected stores, an employee explicitly confirms reading an important update, and the manager sees the updated acknowledgment status.**

## The key product decision

Rachel, the store manager, needs to identify employees who have not confirmed important policy and safety updates. Alex, a sales associate, wants fewer interruptions and a clear sense of what matters.

I chose selective acknowledgment. **Requires acknowledgment** defaults on for Safety and Policy and off for General, and managers can override it. Employees see outstanding requests together in **Needs your confirmation**, while routine and confirmed announcements appear in **Recent updates**. There are no pop-ups or repeated prompts.

Only tapping **Confirm I've read this** records acknowledgment. Opening an announcement does not. This gives Rachel a concrete follow-up list without requiring Alex to confirm every routine message. A confirmation records a declaration of reading; it does not establish understanding or prove that an unconfirmed announcement went unread.

## Run it

Use Node.js 24.15.0 or a newer 24.x version.

From the project folder, install dependencies and start the development server:

```sh
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). If that port is busy, use the URL printed in the terminal.

Run the tests:

```sh
npm test
```

Build the app:

```sh
npm run build
```

## Demo walkthrough

I recorded a short demo covering the problem, the working flow, my assumptions, and what I would explore next. To reproduce the main workflow:

1. Open the header's three-dot menu and choose **Reset demo data**. This restores eight sample announcements and selects **Rachel Kim**, Bellevue's store manager.
2. As Rachel, open **Post an update**. Enter the title **Stockroom exit check** and the message **Before closing, check that the stockroom exit is clear. Report any obstruction to the manager on duty.** Select **Safety**. **Requires acknowledgment** turns on, and Rachel's audience is fixed to Summit Bellevue. Select **Publish update**; tracking shows **0 of 8 acknowledged**.
3. Switch **Viewing as** to **Alex Rivera**. Open **Stockroom exit check** under **Needs your confirmation**. Opening it leaves confirmation pending. Tap **Confirm I've read this** to see the confirmation timestamp; return to the feed to see the announcement in **Recent updates**.
4. Switch back to **Rachel Kim** and open that announcement. Tracking now shows **1 of 8 acknowledged**, with Alex under **Acknowledged** and seven employees under **Still pending**. **Needs follow-up** includes this update because confirmations remain outstanding.
5. Switch to **Maya Chen**, a Tacoma employee. She cannot see the Bellevue-only announcement and starts with **You're all caught up**. This demonstrates both audience targeting and the empty confirmation state.

For the wider manager view, switch to **Michael Torres**. He can publish to any combination of stores. The seeded return policy update shows **24 of 35 acknowledged**, grouped by store; Rachel sees **6 of 8 acknowledged** for the same update because her view covers Bellevue only.

## Assumptions I made

- **Store membership:** each employee belongs to exactly one store, making targeting predictable for this first version.
- **Manager scope:** Michael can publish and track across all five stores; Rachel can publish only to Bellevue and sees only Bellevue employees' status, including on company-wide updates. Managers are not announcement recipients.
- **Stable records:** recipients are fixed at publication, and published announcements cannot be edited or deleted. This preserves the message and audience associated with each confirmation.
- **Demo identities:** the sample models two managers and 35 employees across five stores, representing a slice of the approximately 200-person organization. **Viewing as** replaces login for demonstration purposes.
- **Importance:** category supplies a sensible acknowledgment default, while the manager makes the final decision for each announcement.

## What I left out on purpose

- **Questions and feedback:** a useful next workflow, deferred to first validate whether targeted updates and explicit confirmation solve the core communication problem.
- **Login and a shared backend:** mock identities and localStorage keep the prototype self-contained and easy to run.
- **Push notifications and automated reminders:** follow-up stays with the manager in this version, avoiding additional employee interruptions before learning what is useful.
- **Scheduling and post-publication editing:** publishing is immediate, and the confirmed message remains fixed.
- **AI-generated announcements:** AI helped build the prototype; generating announcement content is outside the selected workflow.

## Known limitation

Data is stored only in this browser using localStorage, so announcements and confirmations cannot be shared across devices. The role switcher demonstrates access rules, but it is not authentication or a production security boundary. Only mock employee data is used.

## Questions I'd ask Michael

- Which announcements truly need acknowledgment, and who should decide? This would help tune defaults without creating confirmation fatigue.
- Will employees use personal phones or shared store devices? This would shape identity, session handling, and access during a shift.
- What should a manager do when confirmation is still missing after several days? I would clarify the follow-up process before adding reminders.
- Does a policy change need proof of reading, a compliance audit trail, or a way to check understanding? These are different needs, and this prototype addresses explicit confirmation of reading.

## How I used Codex and checked its work

I used Codex as an implementation and review assistant, with the product constraints and acceptance criteria captured in `AGENTS.md`. The implementation keeps business rules in `src/lib`, separate from the React screens, so audience selection, confirmation behavior, validation, and manager counts can be checked independently of the interface. Codex also helped refine this README and check the walkthrough against the source code.

Verification focused on the ways the workflow could mislead a manager or frustrate an employee:

- Opening or reloading an update must never create an acknowledgment.
- Repeated confirmation clicks must create only one record.
- A Bellevue-only update must reach Alex and remain unavailable to Maya, including through a direct link.
- Rachel's counts and employee lists must stay scoped to Bellevue and agree with each other.
- Blank or overlong content must be rejected, and malformed saved data must recover without crashing.
- Publishing, confirming, switching identities, and reloading must preserve the expected state.

The current validation run passed **93 tests across five test files** with `npm test`. `npm run build` also passed the strict TypeScript check and production build. The UI tests use jsdom; they do not establish mobile layout or real-browser usability on their own.

## What I would validate next

I would put the prototype in front of a store manager and a sales associate to check whether they can publish, find, confirm, and follow up on an update without guidance. I would watch for confusion between an unconfirmed update and an unread one, and ask whether the acknowledgment defaults match real store communication. That feedback would guide the next iteration before expanding the feature set.
