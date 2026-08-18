
import webpush from "npm:web-push";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") || "";

webpush.setVapidDetails(
  "mailto:admin@yourdomain.com",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  if (WEBHOOK_SECRET) {
    const provided = req.headers.get("x-webhook-secret");
    if (provided !== WEBHOOK_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  try {
    const payload = await req.json();

    // Supabase Database Webhook payload:
    // { type: "INSERT", table: "visitors", record: {...}, old_record: null }
    const visitor = payload.record || payload.new || payload;

    if (payload.type && payload.type !== "INSERT") {
      return Response.json({ ignored: true });
    }

    const visitorName =
      visitor.name ||
      visitor.full_name ||
      visitor.visitor_name ||
      "A visitor";

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/push_subscriptions?select=id,endpoint,subscription`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Could not load push subscriptions: ${response.status}`);
    }

    const subscriptions = await response.json();

    const message = JSON.stringify({
      title: "New Visitor Request",
      body: `${visitorName} has submitted a new visitor request.`,
      icon: "/assets/company-logo.png",
      badge: "/assets/company-logo.png",
      tag: "new-visitor-request",
      url: "/admin.html"
    });

    const results = await Promise.allSettled(
      subscriptions.map(async row => {
        try {
          await webpush.sendNotification(row.subscription, message);
          return { id: row.id, sent: true };
        } catch (error) {
          // 404/410 means the browser subscription is no longer valid.
          const statusCode = error?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await fetch(
              `${SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${row.id}`,
              {
                method: "DELETE",
                headers: {
                  apikey: SUPABASE_SERVICE_ROLE_KEY,
                  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
                }
              }
            );
          }
          throw error;
        }
      })
    );

    const sent = results.filter(r => r.status === "fulfilled").length;

    return Response.json({
      ok: true,
      sent,
      total: subscriptions.length
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { ok: false, error: String(error?.message || error) },
      { status: 500 }
    );
  }
});
