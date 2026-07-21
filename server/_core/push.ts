import webpush from "web-push";
import { ENV } from "./env";
import { deletePushSubscription, getPushSubscriptionsForUser } from "../db";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  if (!ENV.vapidPublicKey || !ENV.vapidPrivateKey || !ENV.vapidSubject) {
    throw new Error("VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT must be set to send push notifications");
  }
  webpush.setVapidDetails(ENV.vapidSubject, ENV.vapidPublicKey, ENV.vapidPrivateKey);
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Sends a push notification to every device a user has subscribed on.
 * Subscriptions that the push service reports as gone (410/404 — the user
 * uninstalled the PWA, cleared data, etc.) are deleted so future sweeps
 * don't keep retrying them.
 */
export async function sendPushToUser(userId: number, payload: PushPayload) {
  ensureConfigured();
  const subscriptions = await getPushSubscriptionsForUser(userId);
  if (subscriptions.length === 0) return;

  const body = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map(async sub => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await deletePushSubscription(sub.endpoint);
        } else {
          console.error(`[Push] Failed to send to user ${userId}:`, error);
        }
      }
    })
  );
}
