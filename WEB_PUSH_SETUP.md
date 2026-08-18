
# OneCentrum Web Push Notifications

This package adds TRUE web push notifications so the admin can receive a visitor-request notification
even when the admin page is closed and the admin shortcut is sitting on the phone home screen.

## Architecture

Visitor inserts row into `public.visitors`
        ↓
Supabase Database Webhook
        ↓
Edge Function `notify-new-visitor`
        ↓
Web Push
        ↓
service-worker.js
        ↓
Phone/desktop system notification

## Important

This cannot work from `admin.html` alone. The service worker and Edge Function must be deployed,
and VAPID keys must be configured.

## 1. Generate VAPID keys

On a computer with Node.js:

    npx web-push generate-vapid-keys

Save:
- publicKey
- privateKey

## 2. Put the public key in admin.html

Open `admin.html` and find:

    const VAPID_PUBLIC_KEY = "REPLACE_WITH_YOUR_VAPID_PUBLIC_KEY";

Replace the placeholder with the generated public key.

## 3. Run the SQL

Open Supabase → SQL Editor.

Run:

    push_subscriptions.sql

This creates the table that stores each admin browser/device subscription.

## 4. Deploy the Edge Function

Put this folder into your Supabase functions project:

    supabase/functions/notify-new-visitor/index.ts

Deploy:

    supabase functions deploy notify-new-visitor

## 5. Set Edge Function secrets

Set:

    VAPID_PUBLIC_KEY
    VAPID_PRIVATE_KEY
    WEBHOOK_SECRET

Also make sure the function has:
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY

Those are normally available to Supabase Edge Functions.

## 6. Create a Database Webhook

In Supabase:

Database → Webhooks → Create webhook

Configure:

    Name: notify-new-visitor
    Table: public.visitors
    Events: INSERT
    URL:
    https://YOUR_PROJECT_REF.supabase.co/functions/v1/notify-new-visitor

If you set WEBHOOK_SECRET, add a custom header:

    x-webhook-secret: YOUR_SECRET

## 7. HTTPS requirement

The live admin site must be HTTPS.

localhost is okay for development, but a normal HTTP website cannot register a production service worker/push subscription.

## 8. Install on the phone

Open the HTTPS admin URL in the phone browser.

Allow notifications.

Use "Add to Home Screen".

Open the home-screen app once so the service worker registers.

After that, closing the app/page does NOT remove the push subscription.

## 9. Test

1. Open the admin home-screen app once.
2. Allow notification permission.
3. Confirm `push_subscriptions` has a row in Supabase.
4. Close the admin app/page.
5. Submit a new visitor request.
6. The phone should receive a system notification.

## Sound

The operating system controls the sound/vibration of a push notification.
The JavaScript bell sound in the open admin page remains available for the in-page notification.

For a closed app, do not rely on JavaScript AudioContext.
Use the phone's notification channel/system notification settings.
