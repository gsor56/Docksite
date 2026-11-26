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
export function toolAliasUrl(tool) {
  if (config.URL_MODE === 'subdomain')
    return `${origin(tool.external_url ? 'platform' : 'link', tool.subdomain)}/`;
  return platformUrl(`/t/${encodeURIComponent(tool.subdomain)}`);
}
export const toolUrl = (tool) =>
  (config.URL_MODE === 'path' && tool.external_url) || toolAliasUrl(tool);

export function scopedUrl(scope, basePath, path = '/') {
  if (basePath) return platformUrl(`${basePath}${path === '/' ? '' : path}`);
  return `${origin(scope, scope === 'cms' ? 'cms' : scope === 'link' ? 'link' : '')}${path}`;
}
