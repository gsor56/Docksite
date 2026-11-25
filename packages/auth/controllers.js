import bcrypt from 'bcrypt';
import { z } from 'zod';
import { config } from '@docksite/config';
import { db } from '@docksite/db';
import { insertUser, loginUser, ownerExists } from '@docksite/db/repositories/users';
import { recordEvent } from '@docksite/db/repositories/analytics';
import { recordActivity } from '@docksite/db/repositories/activity';
import { parse, registerSchema, loginSchema } from '@docksite/utils/validation';
import { HttpError } from '@docksite/utils/http';
import { regenerateSession, saveSession } from './index.js';

const dummyHash = await bcrypt.hash('invalid-credential-comparison', 12);
async function signIn(req, user) {
  await regenerateSession(req);
  req.session.userId = user.id;
  await saveSession(req);
}
export function authControllers(scope) {
  return {
    loginPage: (req, res) => res.render('auth/login', { title: 'Login', scope }),
    registerPage: (req, res) => res.render('auth/register', { title: 'Create account', scope }),
    setupPage: (req, res) => {
      if (ownerExists() || !config.SETUP_TOKEN) throw new HttpError(404, 'Page not found.');
      res.render('auth/setup', { title: 'Owner setup' });
    },
    setup: async (req, res) => {
      if (ownerExists() || !config.SETUP_TOKEN) throw new HttpError(404, 'Page not found.');
      const token = parse(z.string().min(32).max(200), req.body.setup_token);
      const { timingSafeEqual } = await import('node:crypto');
      if (
        Buffer.byteLength(token) !== Buffer.byteLength(config.SETUP_TOKEN) ||
        !timingSafeEqual(Buffer.from(token), Buffer.from(config.SETUP_TOKEN))
      )
        throw new HttpError(403, 'Invalid setup token.');
      const data = parse(registerSchema, req.body);
      const passwordHash = await bcrypt.hash(data.password, 12);
      const user = db.transaction(() => {
        if (ownerExists()) throw new HttpError(409, 'An owner already exists.');
        const created = insertUser({ ...data, passwordHash, role: 'owner' });
        recordActivity(created.id, 'owner.setup', 'user', created.id);
        return created;
      })();
      await signIn(req, user);
      res.redirect(`${res.locals.basePath}/dashboard`);
    },
    register: async (req, res) => {
      if (!ownerExists())
        throw new HttpError(
          403,
          'The platform owner must complete setup before registration opens.',
        );
      const data = parse(registerSchema, req.body);
      const passwordHash = await bcrypt.hash(data.password, 12);
      const user = db.transaction(() => {
        const created = insertUser({ ...data, passwordHash });
        recordEvent(null, created.id, 'signup');
        return created;
      })();
      await signIn(req, user);
      res.redirect(`${res.locals.basePath}/dashboard`);
    },
    login: async (req, res) => {
      const data = parse(loginSchema, req.body);
      const user = loginUser(data.email);
      const valid = await bcrypt.compare(data.password, user?.password_hash || dummyHash);
      if (
        !valid ||
        !user?.is_active ||
        (scope === 'cms' && !['owner', 'admin', 'contributor'].includes(user.role))
      )
        throw new HttpError(401, 'Email or password is incorrect.');
      await signIn(req, user);
      if (scope === 'cms') recordActivity(user.id, 'cms.login', 'user', user.id);
      res.redirect(`${res.locals.basePath}/dashboard`);
    },
    logout: async (req, res) => {
      await new Promise((resolve, reject) =>
        req.session.destroy((error) => (error ? reject(error) : resolve())),
      );
      res.clearCookie(scope === 'cms' ? 'docksite.cms.sid' : 'docksite.sid', {
        path: '/',
        domain:
          config.NODE_ENV === 'production' && config.URL_MODE === 'subdomain' && scope !== 'cms'
            ? `.${config.BASE_DOMAIN}`
            : undefined,
      });
      res.redirect(`${res.locals.basePath}/login`);
    },
  };
}
