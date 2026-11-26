import { Router } from 'express';
import { config } from '@docksite/config';
import { platformUrl } from '@docksite/config/urls';
import { authControllers } from './controllers.js';
import { formLimit } from './rate-limit.js';

export function authRouter(scope) {
  const router = Router();
  const controller = authControllers(scope);
  router.get('/login', controller.loginPage);
  router.post('/login', formLimit(config.LOGIN_RATE_MAX), controller.login);
  router.post('/logout', controller.logout);
  if (scope === 'cms') {
    router.get('/register', (req, res) => res.redirect(platformUrl('/register')));
    router.post('/register', (req, res) => res.redirect(303, platformUrl('/register')));
  } else {
    router.get('/register', controller.registerPage);
    router.post('/register', formLimit(config.REGISTER_RATE_MAX), controller.register);
  }
  if (scope === 'platform' || scope === 'cms') {
    router.get('/setup', controller.setupPage);
    router.post('/setup', formLimit(config.REGISTER_RATE_MAX), controller.setup);
  }
  return router;
}
