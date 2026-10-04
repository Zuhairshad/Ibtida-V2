# ibadah-lock (local Expo module)

App shielding for Ibadah Lock. Autolinked from `mobile/modules/` via `expo-module.config.json`;
the config plugin in `plugin/` is registered in `app.json`. Needs a development or EAS build:
in Expo Go the module is missing and every call is a no-op.

## JS API (`index.ts`)

| Call | Android | iOS / web / Expo Go |
| --- | --- | --- |
| `isSupported()` | `true` | `false` |
| `isPermissionGranted()` | Accessibility service switched on | `false` |
| `openPermissionSettings()` | opens Settings → Accessibility | no-op |
| `start({ packages, endsAt, returnUrl? })` | persists the session, returns `{ packages, shielding }` | `{ packages: [], shielding: false }` |
| `stop()` | clears the session | no-op |
| `getSession()` | running session `{ packages, endsAt, startedAt, blocked }` or `null` | `null` |
| `onBlockedAttempt(fn)` | `{ packageName, count, at }` per intercepted launch | subscription that never fires |

`endsAt` is epoch ms or `null` ("until goal completed"). `returnUrl` defaults to
`ibtida://focus-active`; the lock screen passes `ibtida://focus-active?goal=<id>&resume=1`.

## Android

- `IbadahLockAccessibilityService` listens for `TYPE_WINDOW_STATE_CHANGED` only, with
  `canRetrieveWindowContent="false"`: it sees which package opened a window, never the content.
- With no session running, it narrows its own `serviceInfo.packageNames` to Ibtida's package, so
  it receives no events from other apps. During a session it narrows it to exactly the session's packages.
- When a locked package comes to the foreground it starts `MainActivity` (singleTask) with
  `ACTION_VIEW ibtida://focus-active?...`. expo-router routes that to the lock screen, and
  `getId` on that route in `_layout.tsx` keeps it to a single instance. A service the system has
  bound is exempt from Android's background-activity-start limits.
- Each intercepted launch increments a counter in SharedPreferences (a 1.5 s debounce stops one
  launch counting several times) and is sent to JS as `onBlockedAttempt`.
- The session (`active`, `packages`, `endsAt`, `startedAt`, `blocked`, `returnUrl`) lives in
  SharedPreferences `ibadah_lock_session`, so it survives process death. The service checks `endsAt`
  on every event. A session with no end time expires after 6 hours, so a crash before `stop()`
  can't lock apps forever.
- These are never blocked, whatever JS passes: Ibtida itself, System UI, Settings, the default
  dialer and default SMS app (resolved at runtime), and a fixed list of phone, in-call, emergency,
  cell-broadcast and messaging packages (`Exempt` in `LockSession.kt`).

Known limits: picture-in-picture windows (for example YouTube PiP) don't raise a window-state
event, so they aren't intercepted. The user can switch the service off in Settings at any time
(by design). On Android 13+ a sideloaded APK may show the switch greyed out until the user opens
App info → ⋮ → **Allow restricted settings**. Google Play builds that use an AccessibilityService
for something other than accessibility need a prominent in-app disclosure (the setup card) and the
Play Console Accessibility API declaration. The service sets `isAccessibilityTool="false"`.

## iOS: what real shielding needs

The Swift module is a stub that reports unsupported, and JS doesn't load it on iOS. Real shielding
uses Screen Time APIs:

1. **Entitlement.** Request *Family Controls (Distribution)* for bundle id `app.ibtida`
   (and for each extension below) at
   https://developer.apple.com/contact/request/family-controls-distribution. Apple reviews the
   request by hand. Until it's approved, the entitlement works only in development builds on
   your own devices.
2. **Capability.** After approval, add `com.apple.developer.family-controls = true` to the app
   entitlements (`ios.entitlements` in `app.json`, or a config plugin) and enable the capability
   on the App ID. **It is deliberately not added yet:** a build with an entitlement the
   provisioning profile doesn't grant fails to sign.
3. **Authorization.** `AuthorizationCenter.shared.requestAuthorization(for: .individual)` (iOS 16+).
4. **App picker.** iOS doesn't expose bundle ids. The user picks apps in `FamilyActivityPicker`
   (SwiftUI). The selection's opaque `ApplicationToken`s are what get stored, so the
   `APPS` → package-id mapping doesn't apply on iOS.
5. **Shield.** `ManagedSettingsStore().shield.applications = tokens` on start, and
   `.clearAllSettings()` on stop. For timed locks that should end while Ibtida is closed, add a
   **DeviceActivityMonitor** app extension that clears the store at `endsAt`. An optional
   **ShieldConfiguration** extension can brand the shield screen. Each extension needs the same
   entitlement and an App Group shared with the app.
6. **Testing.** Only works on a physical device (not the simulator).

Once that's in place, implement the same JS contract in `ios/IbadahLockModule.swift`. `start`
would take the stored token selection instead of package ids. Then remove the
`Platform.OS === 'android'` guard in `index.ts`.
