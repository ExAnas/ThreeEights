# Functional test plan

## Core timing

| ID | Scenario | Expected result |
|---|---|---|
| T01 | Fresh install | Sleep is Ready; Work and Tasks are Locked. |
| T02 | Mark Sleep complete | Sleep becomes Done. Work timer starts at full duration. Work check is disabled. |
| T03 | Try to mark Work before deadline | Action is rejected by the reducer; no downstream state changes. |
| T04 | Reach Work deadline | Work shows `00:00:00`, becomes Ready, notification is emitted once. |
| T05 | Mark Work after deadline | Work becomes Done; Tasks timer starts. |
| T06 | Reach Tasks deadline and mark it | Cycle becomes complete; no active timer remains. |
| T07 | Start new cycle | All completion marks reset; Sleep becomes Ready; cycle number increments. |

## Persistence / background behavior

| ID | Scenario | Expected result |
|---|---|---|
| P01 | Reload while timer is running | Countdown resumes from `endsAt - Date.now()`, not from a stored remaining count. |
| P02 | Suspend device longer than deadline | On resume, current phase immediately becomes Ready. |
| P03 | Clear localStorage | App starts from a clean Cycle 1 state. |
| P04 | Corrupt stored JSON | Persistence loader ignores it and falls back to a clean state. |

## Undo / reset

| ID | Scenario | Expected result |
|---|---|---|
| U01 | Undo after Sleep completion | Work timer is cancelled; Sleep returns to Ready. |
| U02 | Undo after Work completion | Tasks timer is cancelled; Work returns to Ready; Sleep stays Done. |
| U03 | Undo after full cycle completion | Tasks returns to Ready; earlier phases remain Done. |
| U04 | Reset current cycle | Confirmation shown; marks/timer are cleared; cycle number stays unchanged. |

## Accessibility / UI

| ID | Scenario | Expected result |
|---|---|---|
| A01 | Keyboard-only navigation | All actions are reachable with visible focus. |
| A02 | Reduced motion enabled | Non-essential transitions are disabled. |
| A03 | Mobile width 320–430px | Cards stack vertically; controls remain usable without horizontal scrolling. |
| A04 | Dark mode | Contrast and semantic phase colors remain legible. |

## Sync API

| ID | Scenario | Expected result |
|---|---|---|
| S01 | Register then upload | JWT is received; state uploads successfully. |
| S02 | Login then download | Saved CycleState replaces local state on explicit user action. |
| S03 | Upload older `updatedAt` | Server returns `409` and does not overwrite the newer remote state. |
| S04 | Missing/expired token | Server returns `401`. |
