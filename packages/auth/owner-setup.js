import { config } from '@docksite/config';

export function isDirectLocalSetup(req, settings = config) {
  if (
    settings.NODE_ENV !== 'development' ||
    settings.BASE_DOMAIN !== 'localhost' ||
    settings.TRUST_PROXY !== 0
  )
    return false;
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket?.remoteAddress)) return false;
  if (
    Object.keys(req.headers).some((name) => name === 'forwarded' || name.startsWith('x-forwarded-'))
  )
    return false;
  try {
    return new URL(`http://${req.headers.host}`).hostname === 'localhost';
  } catch {
    return false;
  }
}
