# Design spec — 8×3

## Product idea
A constrained daily rhythm: Sleep → Work → Tasks. Each next phase receives a full eight-hour window. Users cannot mark the running phase complete before its deadline.

## Interaction rule
1. Sleep starts in **Ready** state.
2. Marking Sleep complete starts Work's eight-hour countdown and locks Work's check button.
3. At Work's deadline the Work button becomes **Ready**. Marking it complete starts Tasks' countdown.
4. At Tasks' deadline the Tasks button becomes **Ready**. Marking it complete finishes the cycle.
5. A new cycle is explicit, preventing completed states from disappearing unexpectedly.

This resolves the ambiguous phrase “enable Tasks automatically after Work timer ends” in favor of the stricter and safer rule: the period whose timer has elapsed becomes checkable; the following timer begins only after explicit confirmation.

## Visual system
- Large editorial hero with a compact progress ring.
- Three oversized phase cards with distinct semantic accent colors.
- Sleep: violet; Work: warm orange; Tasks: green.
- Timer digits use tabular numerals for visual stability.
- Glass-like surfaces, restrained shadows, and high-radius cards.
- Light/dark themes via CSS custom properties.

## Accessibility
- Arabic RTL document semantics.
- Heading hierarchy and labelled regions.
- `role="timer"`, ARIA labels, focus-visible states, accessible confirmation dialog.
- `prefers-reduced-motion` disables transitions.
- Disabled states are not communicated by color alone.

## Timer reliability
The authoritative value is an absolute Unix timestamp (`endsAt`), persisted to localStorage. A Web Worker only drives UI refresh ticks. If the page is suspended, reloaded, or the device sleeps, the app recomputes remaining time from `Date.now()` rather than trusting missed intervals.

A browser/service worker cannot guarantee an exact alarm after the browser/OS fully terminates the app. Exact closed-app alerts require server push or a native wrapper; the included service worker improves notification handling while the browser context is available.
