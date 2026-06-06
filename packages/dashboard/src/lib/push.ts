import { api } from '../api';

export function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * iOS only delivers Web Push to an installed PWA (Add to Home Screen),
 * iOS 16.4+. In a regular Safari tab push is unavailable.
 */
export function pushBlockedReason(): string | null {
  if (!isPushSupported()) return 'Браузер не поддерживает push-уведомления.';
  if (isIOS() && !isStandalone())
    return 'На iPhone сначала добавьте приложение на экран «Домой» (кнопка «Поделиться» → «На экран Домой»), затем включите уведомления внутри установленного приложения.';
  return null;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch {
    return null;
  }
}

export async function getActiveSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export async function enablePush(): Promise<void> {
  const reason = pushBlockedReason();
  if (reason) throw new Error(reason);

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Доступ к уведомлениям не предоставлен.');

  const { publicKey, enabled } = await api.getVapid();
  if (!enabled || !publicKey) throw new Error('Push не настроен на сервере (нет VAPID-ключей).');

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
  }
  await api.pushSubscribe(sub.toJSON());
}

export async function disablePush(): Promise<void> {
  const sub = await getActiveSubscription();
  if (sub) {
    await api.pushUnsubscribe(sub.endpoint).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  }
}
