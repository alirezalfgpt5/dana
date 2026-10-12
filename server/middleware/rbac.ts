import { AuthRequest } from '../types/AuthRequest.js';
import { Request, Response, NextFunction } from 'express';
import { db } from '../../src/db/index.js';
import { logSessionAuthFailure } from '../utils/sessionAuthLog.js';

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  if (!(req as AuthRequest).user) {
    const authFailureReason = (req as Request & { authFailureReason?: string }).authFailureReason;
    await logSessionAuthFailure(req, authFailureReason || 'authentication_required_but_user_missing', {
      authorizationHeaderPresent: Boolean(req.headers.authorization),
    });
    return res.status(401).json({ error: 'Unauthorized: Please log in.' });
  }
  next();
};

export const requireRole = (roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthRequest).user;
    
    if (!user) {
      await logSessionAuthFailure(req, 'role_check_without_authenticated_user', {
        authorizationHeaderPresent: Boolean(req.headers.authorization),
      });
      return res.status(401).json({ error: 'Unauthorized: Please log in.' });
    }
    
    // Check DB for latest role instead of trusting JWT payload implicitly
    try {
      const dbUser = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, user.id)
      });
      
      if (!dbUser) {
        await logSessionAuthFailure(req, 'authenticated_user_not_found', {
          authorizationHeaderPresent: Boolean(req.headers.authorization),
        });
        return res.status(401).json({ error: 'Unauthorized: User not found.' });
      }

      const currentRole = dbUser.role;

      if (currentRole === 'superadmin') {
        return next();
      }
      
      if (roles.length > 0 && !roles.includes(currentRole)) {
        return res.status(403).json({ error: 'Forbidden: You do not have the required permissions.' });
      }
      
      next();
    } catch (err) {
      return res.status(500).json({ error: 'Server error checking role' });
    }
  };
};

export const requireOrgLevel = (levels: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthRequest).user;
    
    if (!user) {
      const authFailureReason = (req as Request & { authFailureReason?: string }).authFailureReason;
      await logSessionAuthFailure(req, authFailureReason || 'organization_check_without_authenticated_user', {
        authorizationHeaderPresent: Boolean(req.headers.authorization),
      });
      return res.status(401).json({ error: 'Unauthorized: Please log in.' });
    }
    
    if (user.role === 'superadmin') {
      return next();
    }
    
    if (levels.length > 0 && (!user.organizationLevel || !levels.includes(user.organizationLevel))) {
      return res.status(403).json({ error: 'Forbidden: Organization level not sufficient.' });
    }
    
    next();
  };
};
