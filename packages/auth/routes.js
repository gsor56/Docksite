import { Router } from 'express';
import { config } from '@docksite/config';
import { authControllers } from './controllers.js';
import { formLimit } from './rate-limit.js';

export function authRouter(scope) {
  const router = Router();
  const controller = authControllers(scope);
  router.get('/login', controller.loginPage);
  router.post('/login', formLimit(config.LOGIN_RATE_MAX), controller.login);
  router.post('/logout', controller.logout);
  router.get('/register', controller.registerPage);
  router.post('/register', formLimit(config.REGISTER_RATE_MAX), controller.register);
  if (scope === 'platform' || scope === 'cms') {
    router.get('/setup', controller.setupPage);
    router.post('/setup', formLimit(config.REGISTER_RATE_MAX), controller.setup);
  }
  return router;
}
