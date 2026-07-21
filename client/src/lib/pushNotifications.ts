// Camada fina sobre as Web APIs de push do navegador — não chama tRPC
// diretamente (o hook `trpc.notifications.*` só funciona dentro de
// componentes React); quem usa este módulo é responsável por enviar o
// resultado de `requestPushSubscription` pro servidor via `notifications.subscribe`.

export function isPushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(Array.from(rawData, c => c.charCodeAt(0)));
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/**
 * Pede permissão de notificação (se ainda não concedida) e assina o push
 * manager do service worker. Retorna os dados prontos pra enviar pro
 * servidor via `trpc.notifications.subscribe`.
 */
export async function requestPushSubscription(vapidPublicKey: string): Promise<PushSubscriptionData> {
  if (!isPushSupported()) {
    throw new Error("Notificações push não são suportadas neste navegador.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Permissão de notificação negada.");
  }

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    }));

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Falha ao gerar a inscrição de push.");
  }

  return { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } };
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

/** Cancela a inscrição local (browser) — quem chama ainda precisa avisar o servidor via `notifications.unsubscribe`. */
export async function removePushSubscription(): Promise<string | null> {
  const sub = await getExistingPushSubscription();
  if (!sub) return null;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  return endpoint;
}
