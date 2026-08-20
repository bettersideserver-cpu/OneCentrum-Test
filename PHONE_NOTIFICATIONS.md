# Phone notifications with sound (iPhone + Android)

## What you got

New / changed files:

    manifest.json                 (new - makes the admin panel installable)
    assets/icon-192.png           (new)
    assets/icon-512.png           (new)
    assets/apple-touch-icon.png   (new)
    admin.html                    (updated)
    service-worker.js             (updated)

In Settings -> Notifications there is now a **Phone Notifications** row with an
**"Enable On This Device"** button and a status line. Every phone (and every
browser) must tap that button once.

## Hard requirements

1. **HTTPS.** Push does not work on `http://`. `localhost` is fine only for
   desktop testing.
2. **The Supabase push pipeline must be deployed** — this is what sends the
   notification when the admin app is closed:
   - run `push_subscriptions.sql` in the Supabase SQL editor
   - `supabase functions deploy notify-new-visitor`
   - set the function secrets `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
     `WEBHOOK_SECRET`
   - Database -> Webhooks -> new webhook on `public.visitors`, event INSERT,
     URL `https://<project>.supabase.co/functions/v1/notify-new-visitor`
   Full steps are in `WEB_PUSH_SETUP.md`. The VAPID public key already in
   `admin.html` must be the same pair you set on the function.
3. **The admin must be signed in** on the phone — the subscription is stored
   against the logged-in user.

## iPhone / iPad (iOS 16.4 or newer)

iOS refuses Web Push to a normal Safari tab. It only works for a home-screen
app:

1. Open the admin URL in **Safari** (not Chrome, not in-app browsers).
2. Share -> **Add to Home Screen** -> Add.
3. Open the app **from the home screen icon**.
4. Log in, go to Settings -> Notifications -> **Enable On This Device**.
5. Tap **Allow** on the iOS prompt. A test notification appears immediately.

If the status line says "add this page to your Home Screen first", you are
still in the Safari tab.

Notes:
- iOS plays the standard notification sound. A website cannot ship its own
  ringtone — that is an OS restriction, not a bug.
- Make sure the phone is not in Silent / Focus mode, and that
  Settings -> Notifications -> Admin -> Sounds is on.
- Deleting the home-screen app deletes the subscription.

## Android (Chrome)

1. Open the admin URL in Chrome.
2. Optional but recommended: menu -> **Add to Home screen / Install app**.
3. Log in, Settings -> Notifications -> **Enable On This Device** -> Allow.
4. Keep Chrome's battery setting on **Unrestricted**
   (Android Settings -> Apps -> Chrome -> Battery), otherwise Android can
   delay notifications when the phone is idle.

Android plays the system notification sound and vibrates.

## Desktop Chrome

Same button. Chrome may be closed — as long as it is allowed to run in the
background (Chrome Settings -> System -> "Continue running background apps
when Google Chrome is closed"), the notification still arrives.

## How to verify it works

1. Enable on the phone, then check Supabase -> Table editor ->
   `push_subscriptions` has a row for that device.
2. Close the admin app completely.
3. Submit a visitor request from the public site.
4. The phone should ring within a few seconds.

If nothing arrives, open Supabase -> Edge Functions -> `notify-new-visitor` ->
Logs. `{"ok":true,"sent":1}` means the push left the server, so the problem is
on the phone (permission, silent mode, battery restriction). `sent: 0` means no
subscription rows were readable — recheck steps 2 and 3 above.
