import { events, eventTotals } from '@docksite/db/repositories/analytics';
import { activityList } from '@docksite/db/repositories/activity';
export const analytics = (req, res) =>
  res.render('analytics', { title: 'Analytics', events: events(), totals: eventTotals() });
export const activity = (req, res) =>
  res.render('activity', { title: 'Activity log', entries: activityList() });
