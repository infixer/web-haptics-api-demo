# polyfill-web-haptics-api

A polyfill for the [Web Haptics API](https://github.com/WICG/web-haptics) —
`navigator.playHaptics(effect, intensity)`.

The proposal is at the early ideation stage (WICG proposal opened 2026-01-30,
Intent to Prototype filed on blink-dev). No browser ships it yet. This package
lets you write against the proposed API today and delete one import when they do.

```sh
npm i @infixer/polyfill-web-haptics-api
```

```js
import "@infixer/polyfill-web-haptics-api";

navigator.playHaptics("tick", 0.6);
```

That is the whole surface. If the browser already has `playHaptics`, the import
does nothing at all.

## The API it polyfills

```ts
navigator.playHaptics(effect: "hint" | "edge" | "tick" | "align", intensity?: number): undefined
```

| effect  | meaning                                                        |
| ------- | -------------------------------------------------------------- |
| `hint`  | something is interactive, or an action may follow               |
| `tick`  | a discrete change — a list step, a toggle                       |
| `align` | something locked into place                                     |
| `edge`  | you reached the end of a range or hit a limit                    |

`intensity` is 0–1 and defaults to 1. The call **always returns `undefined`**,
requires sticky user activation, and has no permission prompt. This polyfill
keeps all three properties, including the unhelpful-looking one: it never tells
you whether anything happened. See [Diagnostics](#diagnostics).

## How it actually vibrates anything

There is no single web API that produces haptics everywhere, so the polyfill
tries four, best first:

| # | backend      | mechanism                                             | where it works                    |
| - | ------------ | ----------------------------------------------------- | --------------------------------- |
| 1 | `vibrate`    | `navigator.vibrate` with a PWM-shaped pulse            | Chromium on Android               |
| 2 | `ios-switch` | clicks a hidden `<input type="checkbox" switch>`       | iOS Safari 17.4+                  |
| 3 | `gamepad`    | `GamepadHapticActuator.playEffect("dual-rumble", …)`   | any browser + a connected pad     |
| 4 | `simulator`  | a WebAudio click (**opt-in**) — not haptics            | anywhere, for development         |

Three of these deserve a note.

**PWM.** `navigator.vibrate` has no strength parameter: the motor is on or off.
Strength is faked by chopping the on-time into a 20 ms on/off train and varying
the duty cycle. Below two frames there is no room for a duty cycle, so short
effects scale their pulse width instead — a 12 ms pulse cannot be "60% strong",
only shorter.

**iOS.** Safari has never shipped the Vibration API. Toggling a `switch`
control, however, produces a real system haptic, so the polyfill clicks a hidden
one. It is a single fixed tap with no duration and no strength, which means
`hint`, `tick` and `align` feel *identical* on iOS; only `edge` differs, by
tapping twice. Design your feedback so it still reads when three of the four
effects collapse into one.

**Gamepad.** The quiet irony of web haptics: `playEffect()` takes an explicit
duration and magnitude, so a connected controller is the most precise haptic
output a browser has — and the only one that works on desktop at all.

## Options

```js
import { install } from "@infixer/polyfill-web-haptics-api/manual";

install({
  simulator: import.meta.env.DEV, // audible stand-in when nothing else works
  backend: "auto",                // or pin: "vibrate" | "ios-switch" | "gamepad" | "simulator"
});
```

The simulator is off by default. A page that starts clicking at the user because
their laptop has no motor is worse than a page that stays silent.

## Declarative haptics

The proposal also has a CSS form:

```css
button:active { scale: 0.95; @haptic align 0.8; }
```

**`@haptic` cannot be polyfilled.** Unknown at-rules are dropped during parsing,
so it never reaches the CSSOM and script cannot see it. This package offers a
custom-property stand-in instead, because custom properties do survive parsing:

```js
import { installCssHaptics } from "@infixer/polyfill-web-haptics-api/css";
installCssHaptics();
```

```css
button {
  --haptic-hover: hint 0.3;
  --haptic-active: align 0.8;
}
```

The state moves from the selector into the property name on purpose. The
proposal fires when a rule *starts matching*, and there is no general event for
that — reading `--haptic` at `pointerdown` and hoping `:active` has already been
applied is a race. Naming the state makes the value readable from the resting
state, at any time.

The cost is coverage: `hover`, `active`, `focus` and `checked` only. Anything
driven by `:has()`, container queries, media queries or class mutation needs the
imperative call. That gap is the honest argument for wanting this in the engine
rather than in a library.

## Diagnostics

`navigator.playHaptics` tells a page nothing — no capability query, no success
value. That is a deliberate anti-fingerprinting decision, and this polyfill
honours it.

But a polyfill knows exactly what it is doing internally, and an app that wants
to help a user get to a working setup needs that. It lives behind a separate
import so it can never leak into code meant to run against the native API:

```js
import { getDiagnostics, setBackend } from "@infixer/polyfill-web-haptics-api/debug";

getDiagnostics();
// { installed: true, native: false, active: "vibrate",
//   available: ["vibrate"], hasStickyActivation: true, ... }
```

**None of this is part of the Web Haptics API and none of it will be.**

## Feature detection does not work, and cannot

Nothing here — or in any web API — can tell you whether the user felt something.
The standing counter-example is Firefox for Android: since version 79 it has
`navigator.vibrate`, it returns `true`, and the motor never moves. Firefox for
desktop removed the API outright in 129.

It is worse than it looks. In March 2026 someone
[filed a bug against MDN's compat data](https://github.com/mdn/browser-compat-data/issues/29166)
reporting that `navigator.vibrate` now works on iOS Safari, having tested it
against a demo page and felt the phone buzz. It does not. What they felt was
that page's `<input switch>` fallback — trick #2 above. The issue was closed
without changing the data.

So the only reliable capability check is to play something and ask:

> Did you feel that? **[Yes] [Faintly] [Nothing]**

Which is what `getDiagnostics()` and `setBackend()` are for.

## Support matrix for `navigator.vibrate`

Per [MDN browser-compat-data](https://github.com/mdn/browser-compat-data):

| browser            | status                                                          |
| ------------------ | --------------------------------------------------------------- |
| Chrome / Edge      | 32+                                                             |
| Chrome for Android | 32+; needs a user gesture since 60; blocked in cross-origin iframes since 55 |
| Safari / iOS       | never                                                            |
| Firefox            | 16–128, **removed in 129**                                      |
| Firefox Android    | 79+ present but disabled — returns `true`, does nothing          |

The cross-origin iframe rule bites in practice: embed a haptics demo in a slide
deck and it will not vibrate. Open it in a real tab.

## License

MIT
