import { config } from './index.js';

export function origin(scope = 'platform', subdomain = '') {
  const prefix = config.URL_MODE === 'subdomain' && subdomain ? `${subdomain}.` : '';
  const port =
    config.NODE_ENV === 'production'
      ? ''
      : `:${scope === 'cms' ? config.CMS_PORT : scope === 'link' ? config.LINK_PORT : config.PORT}`;
  return `${config.URL_SCHEME}://${prefix}${config.BASE_DOMAIN}${port}`;
}

export const platformUrl = (path = '/') => `${origin()}${path}`;
export const cmsUrl = (path = '/') =>
  config.NODE_ENV === 'production' && config.URL_MODE === 'path'
    ? platformUrl(`/cms${path === '/' ? '' : path}`)
    : `${origin('cms', 'cms')}${path}`;
export function toolUrl(tool) {
  if (tool.external_url) return tool.external_url;
  if (config.URL_MODE === 'subdomain') return `${origin('link', tool.subdomain)}/`;
  return platformUrl(`/t/${encodeURIComponent(tool.subdomain)}`);
}

export function scopedUrl(scope, basePath, path = '/') {
  if (basePath) return platformUrl(`${basePath}${path === '/' ? '' : path}`);
  return `${origin(scope, scope === 'cms' ? 'cms' : scope === 'link' ? 'link' : '')}${path}`;
}
