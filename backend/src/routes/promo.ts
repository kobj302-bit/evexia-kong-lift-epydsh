import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { App } from '../index.js';

interface RedeemPromoBody {
  code?: string;
}

const VALID_CODES = ['DXYZ7788foryoufree.co11111behavepleaseokay'];

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
          400: {
            description: 'Missing required field',
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: RedeemPromoBody }>, reply: FastifyReply) => {
      const { code } = request.body;

      app.logger.info({ code: code?.substring(0, 3) }, 'Promo redemption attempt');

      // Normalize and compare case-insensitively
      const normalizedCode = code.trim().toLowerCase();
      const isValid = VALID_CODES.some(validCode => validCode.toLowerCase() === normalizedCode);

      if (isValid) {
        app.logger.info({}, 'Valid promo code redeemed');
        return { valid: true };
      }

      app.logger.info({}, 'Invalid promo code attempt');
      return { valid: false, error: 'Invalid code' };
    }
  );
}
