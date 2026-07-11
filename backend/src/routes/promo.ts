import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { App } from '../index.js';

interface RedeemPromoBody {
  code: string;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory rate limiting map: IP -> { count, resetAt }
const rateLimitMap = new Map<string, RateLimitEntry>();

export function registerPromoRoutes(app: App, fastify: FastifyInstance) {
  fastify.post<{ Body: RedeemPromoBody }>(
    '/api/promo/redeem',
    {
      schema: {
        description: 'Redeem a promo code',
        tags: ['promo'],
        body: {
          type: 'object',
          required: ['code'],
          properties: {
            code: { type: 'string' },
          },
        },
        response: {
          200: {
            description: 'Promo code validation result',
            type: 'object',
            properties: {
              valid: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: RedeemPromoBody }>, reply: FastifyReply) => {
      const { code } = request.body;

      // Get IP address
      const ip = request.ip || (request.headers['x-forwarded-for'] as string) || 'unknown';

      app.logger.info({ ip, code: code?.substring(0, 3) }, 'Promo redemption attempt');

      // Check and update rate limit
      const now = Date.now();
      let rateLimitEntry = rateLimitMap.get(ip);

      // Reset if past the reset time
      if (rateLimitEntry && now > rateLimitEntry.resetAt) {
        rateLimitEntry = undefined;
      }

      // Initialize or use existing entry
      if (!rateLimitEntry) {
        rateLimitEntry = { count: 0, resetAt: now + 3600000 }; // 1 hour from now
      }

      // Check if rate limit exceeded
      if (rateLimitEntry.count >= 5) {
        app.logger.warn({ ip }, 'Rate limit exceeded for promo redemption');
        return { valid: false, error: 'Too many attempts. Please try again later.' };
      }

      // Increment count
      rateLimitEntry.count += 1;
      rateLimitMap.set(ip, rateLimitEntry);

      // Validate promo code
      const validCode = (process.env.PROMO_CODE || 'DXYZFGHERTDS33oneseventeen').toUpperCase();
      const providedCode = code.trim().toUpperCase();

      if (providedCode === validCode) {
        app.logger.info({ ip }, 'Valid promo code redeemed');
        return { valid: true };
      }

      app.logger.info({ ip }, 'Invalid promo code attempt');
      return { valid: false, error: 'Invalid or expired code' };
    }
  );
}
