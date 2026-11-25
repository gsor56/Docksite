import session from 'express-session';
import { config } from '@docksite/config';
import { findUser } from '@docksite/db/repositories/users';
import { SQLiteSessionStore } from './session-store.js';

export function authentication(scope) {
  const cms = scope === 'cms';
  const sharedDomain =
    config.NODE_ENV === 'production' && config.URL_MODE === 'subdomain' && !cms
      ? `.${config.BASE_DOMAIN}`
      : undefined;
  return [
    session({
      name: cms ? 'docksite.cms.sid' : 'docksite.sid',
      secret: cms ? config.CMS_SESSION_SECRET : config.SESSION_SECRET,
      store: new SQLiteSessionStore(cms ? 'cms' : 'public'),
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: config.URL_SCHEME === 'https',
        sameSite: 'lax',
        maxAge: config.SESSION_TTL_SECONDS * 1000,
        path: '/',
        domain: sharedDomain,
      },
    }),
    (req, res, next) => {
      req.user = req.session.userId ? findUser(req.session.userId) : null;
      if (req.user && !req.user.is_active) {
        delete req.session.userId;
        req.user = null;
      }
      res.locals.user = req.user;
      res.locals.flash = req.session.flash || null;
      delete req.session.flash;
      next();
    },
  ];
}
export const saveSession = (req) =>
  new Promise((resolve, reject) =>
    req.session.save((error) => (error ? reject(error) : resolve())),
  );
export const regenerateSession = (req) =>
  new Promise((resolve, reject) =>
    req.session.regenerate((error) => (error ? reject(error) : resolve())),
  );
