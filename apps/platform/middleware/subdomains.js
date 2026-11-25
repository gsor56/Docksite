import { config } from '@docksite/config';
import { toolBySubdomain } from '@docksite/db/repositories/tools';

export function subdomainRouting(cms, shortener) {
  return (req, res, next) => {
    let host;
    const header = req.get('host');
    if (!header || !/^[a-z0-9.-]+(?::\d{1,5})?$/i.test(header))
      return res.status(400).send('Invalid Host header.');
    try {
      host = new URL(`http://${header}`).hostname.toLowerCase();
    } catch {
      return res.status(400).send('Invalid Host header.');
    }
    if (host === config.BASE_DOMAIN || host === `www.${config.BASE_DOMAIN}`) return next();
    const suffix = `.${config.BASE_DOMAIN}`;
    if (!host.endsWith(suffix)) {
      req.unknownSubdomain = true;
      return next();
    }
    const subdomain = host.slice(0, -suffix.length);
    if (subdomain === 'cms') {
      req.gatewaySubdomain = subdomain;
      return cms(req, res, next);
    }
    const tool = toolBySubdomain(subdomain);
    if (tool?.module_key === 'link-shortener') {
      req.gatewaySubdomain = subdomain;
      return shortener(req, res, next);
    }
    req.unknownSubdomain = true;
    next();
  };
}
