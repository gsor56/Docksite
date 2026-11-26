import { rateLimit } from 'express-rate-limit';
import { config } from '@docksite/config';

export const formLimit = (limit) =>
  rateLimit({
    windowMs: config.AUTH_RATE_WINDOW_SECONDS * 1000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).set('X-Robots-Tag', 'noindex, follow');
      res.locals.noindex = true;
      if (req.path.startsWith('/api/'))
        return res.json({ error: 'Too many requests. Try again later.' });
      return res.render('errors/403', {
        title: 'Too many requests',
        error: 'Too many requests. Try again later.',
      });
    },
  });
