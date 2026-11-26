import { config } from '@docksite/config';
import { HttpError } from './http.js';

export function assertExternalProject(url) {
  if (!url) return;
  const parsed = new URL(url);
  if (
    parsed.hostname === config.BASE_DOMAIN ||
    parsed.hostname.endsWith('.' + config.BASE_DOMAIN)
  ) {
    throw new HttpError(
      422,
      'Use an independently hosted project URL, rather than a Docksite routing URL.',
    );
  }
}
