import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { logger } from '../utils/logger';

/**
 * Security-focused validation middleware using Zod
 */

// ============================================================================
// COMMON VALIDATION SCHEMAS
// ============================================================================

// Password policy: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
export const passwordSchema = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
  .max(128, 'Le mot de passe ne peut pas dépasser 128 caractères')
  .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
  .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
  .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre')
  .regex(/[^a-zA-Z0-9]/, 'Le mot de passe doit contenir au moins un caractère spécial');

// Email validation
export const emailSchema = z
  .string()
  .email('Email invalide')
  .max(255, 'Email trop long')
  .transform((val) => val.toLowerCase().trim());

// Phone number validation (international format)
export const phoneSchema = z
  .string()
  .regex(/^\+?\d{7,15}$/, 'Numéro de téléphone invalide. Format: +261340000000')
  .transform((val) => val.trim());

// Session ID validation (prevent path traversal)
export const sessionIdSchema = z
  .string()
  .min(1, 'Session ID requis')
  .max(100, 'Session ID trop long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Session ID invalide');

// Pack ID validation
export const packIdSchema = z
  .string()
  .min(1, 'Pack ID requis')
  .max(50, 'Pack ID trop long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Pack ID invalide');

// URL validation for scraping
export const marketplaceUrlSchema = z
  .string()
  .url('URL invalide')
  .max(2048, 'URL trop longue')
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        const validDomains = [
          'facebook.com',
          'www.facebook.com',
          'm.facebook.com',
          'web.facebook.com',
          'linkedin.com',
          'www.linkedin.com',
        ];
        return validDomains.some((domain) => parsed.hostname === domain || parsed.hostname.endsWith('.' + domain));
      } catch {
        return false;
      }
    },
    { message: 'URL doit être une URL Facebook ou LinkedIn valide' }
  );

// Pagination validation
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

// ============================================================================
// AI MODEL SCHEMAS
// ============================================================================

export const preferredModelSchema = z.object({
  body: z.object({
    modelId: z.string()
      .min(1, 'Model ID requis')
      .max(100),
  }),
});

// ============================================================================
// AUTH SCHEMAS
// ============================================================================

export const registerSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: passwordSchema,
    confirm_password: z.string(),
    name: z.string().min(1).max(100).optional(),
    phone_number: phoneSchema,
  }).refine((data) => data.password === data.confirm_password, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirm_password'],
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string().min(1, 'Mot de passe requis').max(128),
  }),
});

export const resetPasswordRequestSchema = z.object({
  body: z.object({
    email: emailSchema,
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Token requis').max(256),
    password: passwordSchema,
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
    newPassword: passwordSchema,
  }),
});

// ============================================================================
// SCRAPING SCHEMAS
// ============================================================================

export const startScrapeSchema = z.object({
  body: z.object({
    url: marketplaceUrlSchema,
    sessionId: sessionIdSchema.optional(),
    packId: packIdSchema.optional(),
    resultsLimit: z.coerce.number().int().min(1).max(1000).optional().default(50),
    deepScrape: z.boolean().optional().default(false),
    getProfileUrls: z.boolean().optional().default(false),
  }),
});

export const getScrapeResultSchema = z.object({
  query: z.object({
    sessionId: sessionIdSchema,
  }),
});

// ============================================================================
// EXPORT SCHEMAS
// ============================================================================

export const exportDataSchema = z.object({
  query: z.object({
    sessionId: sessionIdSchema.optional(),
    session_id: sessionIdSchema.optional(),
    format: z.enum(['excel', 'csv']).default('excel'),
    token: z.string().max(1024).optional(),
  }).refine((data) => data.sessionId || data.session_id, {
    message: 'Session ID requis',
  }),
});

// ============================================================================
// PAYMENT SCHEMAS
// ============================================================================

export const createPaymentSchema = z.object({
  body: z.object({
    packId: packIdSchema,
    sessionId: z.string().max(100).optional(),
  }),
});

export const verifyPaymentSchema = z.object({
  query: z.object({
    sessionId: sessionIdSchema.optional(),
    session_id: sessionIdSchema.optional(),
  }).refine((data) => data.sessionId || data.session_id, {
    message: 'Session ID requis',
  }),
});

// ============================================================================
// ADMIN SCHEMAS
// ============================================================================

export const adminSearchSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    userId: z.coerce.number().int().positive().optional(),
  }),
});

export const adminUserSearchSchema = z.object({
  query: z.object({
    q: z.string().max(255).optional().default(''),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
});

export const adminCreditAdjustSchema = z.object({
  body: z.object({
    amount: z.number().refine((v) => v !== 0, 'amount must be non-zero'),
    reason: z.string().min(1, 'reason is required').max(500),
  }),
  params: z.object({
    userId: z.coerce.number().int().positive(),
  }),
});

export const adminUserStatusSchema = z.object({
  body: z.object({
    suspended: z.boolean(),
    reason: z.string().max(500).optional(),
  }),
  params: z.object({
    userId: z.coerce.number().int().positive(),
  }),
});

// ============================================================================
// VALIDATION MIDDLEWARE FACTORY
// ============================================================================

type ValidationTarget = 'body' | 'query' | 'params';

interface ValidationOptions {
  stripUnknown?: boolean;
}

/**
 * Creates a validation middleware for the given Zod schema
 */
export function validate<T extends ZodSchema>(
  schema: T,
  options: ValidationOptions = { stripUnknown: true }
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dataToValidate: Record<string, unknown> = {};
      
      // Check what the schema expects
      const schemaShape = (schema as any)._def?.shape?.();
      
      if (schemaShape?.body) {
        dataToValidate.body = req.body;
      }
      if (schemaShape?.query) {
        dataToValidate.query = req.query;
      }
      if (schemaShape?.params) {
        dataToValidate.params = req.params;
      }
      
      // If schema doesn't have body/query/params structure, validate body directly
      if (Object.keys(dataToValidate).length === 0) {
        dataToValidate.body = req.body;
      }

      const validated = await schema.parseAsync(dataToValidate);
      
      // Replace request data with validated/sanitized data
      if (validated.body) req.body = validated.body;
      if (validated.query) req.query = validated.query as any;
      if (validated.params) req.params = validated.params as any;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        
        logger.warn('Validation failed', { errors, path: req.path, method: req.method });
        
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors,
        });
      }
      
      logger.error('Unexpected validation error', error as Error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal validation error',
      });
    }
  };
}

/**
 * Simple validation for query parameters
 */
export function validateQuery<T extends ZodSchema>(schema: T) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.query);
      req.query = validated as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return res.status(400).json({
          status: 'error',
          message: 'Invalid query parameters',
          errors,
        });
      }
      next(error);
    }
  };
}

/**
 * Simple validation for body
 */
export function validateBody<T extends ZodSchema>(schema: T) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return res.status(400).json({
          status: 'error',
          message: 'Invalid request body',
          errors,
        });
      }
      next(error);
    }
  };
}

/**
 * Sanitize session ID to prevent path traversal
 */
export function sanitizeSessionId(sessionId: string): string {
  return sessionId.replace(/[^a-zA-Z0-9_-]/g, '');
}

/**
 * Mask email for logging (GDPR compliance)
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***@***';
  const maskedLocal = local.length > 2 
    ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
    : '***';
  return `${maskedLocal}@${domain}`;
}
