import { httpRouter } from 'convex/server';
import { revenueCatWebhook } from './payments';

const http = httpRouter();

http.route({
  path: '/revenuecat/webhook',
  method: 'POST',
  handler: revenueCatWebhook,
});

export default http;
