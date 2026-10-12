import { AuthRequest } from '../types/AuthRequest.js';
import { Request, Response, NextFunction } from 'express';
import { db } from '../../src/db/index.js';
import { knowledgeTrees, treeNodes } from '../../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { logSessionAuthFailure } from '../utils/sessionAuthLog.js';
import { normalizePermissions } from '../../src/config/permissions.js';

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

export const requirePermission = (requiredPermissions: string | string[]) => {
  const required = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthRequest).user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Please log in.' });
    }

    try {
      const dbUser = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, user.id),
      });
      if (!dbUser) {
        return res.status(401).json({ error: 'Unauthorized: User not found.' });
      }
      if (dbUser.role === 'superadmin') return next();

      const role = await db.query.roles.findFirst({
        where: (roles, { eq }) => eq(roles.name, dbUser.role),
      });
      if (!role) {
        return res.status(403).json({ error: 'Forbidden: No permissions are assigned to this role.' });
      }

      let permissions: unknown;
      try {
        permissions = JSON.parse(role.permissions);
      } catch {
        return res.status(500).json({ error: 'Invalid role permissions configuration.' });
      }
      const assigned = normalizePermissions(
        Array.isArray(permissions) ? permissions.filter((item): item is string => typeof item === 'string') : [],
      ).filter(permission => permission !== 'all');
      if (!required.some(permission => assigned.includes(permission))) {
        return res.status(403).json({ error: 'Forbidden: You do not have the required permission.' });
      }
      return next();
    } catch (error) {
      console.error('Error checking role permissions:', error);
      return res.status(500).json({ error: 'Server error checking permissions.' });
    }
  };
};

export const requireTreePermission = async (req: Request, res: Response, next: NextFunction) => {
  const user = (req as AuthRequest).user;
  if (!user) return res.status(401).json({ error: 'Unauthorized: Please log in.' });

  try {
    const dbUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, user.id),
    });
    if (!dbUser) return res.status(401).json({ error: 'Unauthorized: User not found.' });
    if (dbUser.role === 'superadmin') {
      (req as Request & { allowedTreeTypes?: string[]; canReadAllTreeNodes?: boolean }).allowedTreeTypes =
        ['required', 'produced', 'research'];
      (req as Request & { allowedTreeTypes?: string[]; canReadAllTreeNodes?: boolean }).canReadAllTreeNodes = true;
      return next();
    }

    const role = await db.query.roles.findFirst({
      where: (roles, { eq }) => eq(roles.name, dbUser.role),
    });
    if (!role) return res.status(403).json({ error: 'Forbidden: No permissions are assigned to this role.' });

    let permissions: unknown;
    try {
      permissions = JSON.parse(role.permissions);
    } catch {
      return res.status(500).json({ error: 'Invalid role permissions configuration.' });
    }
    const assigned = normalizePermissions(
      Array.isArray(permissions) ? permissions.filter((item): item is string => typeof item === 'string') : [],
    ).filter(permission => permission !== 'all');
    const allowedTypes = [
      ...(assigned.includes('required-tree') || assigned.includes('gaps') || assigned.includes('outputs') ? ['required'] : []),
      ...(assigned.includes('produced-tree') || assigned.includes('gaps') || assigned.includes('outputs') ? ['produced'] : []),
      ...(assigned.includes('research') || assigned.includes('outputs') ? ['research'] : []),
    ];
    const requestState = req as Request & {
      allowedTreeTypes?: string[];
      canReadAllTreeNodes?: boolean;
    };
    requestState.allowedTreeTypes = allowedTypes;
    requestState.canReadAllTreeNodes = assigned.includes('issues');

    const typePermissions: Record<string, string> = {
      required: 'required-tree',
      produced: 'produced-tree',
      research: 'research',
    };
    const requestedType = typeof req.query.type === 'string'
      ? req.query.type
      : req.method === 'POST' && req.path === '/' && typeof req.body?.type === 'string'
        ? req.body.type
        : null;

    if (requestedType !== null) {
      const permission = typePermissions[requestedType];
      const allowed = permission
        ? assigned.includes(permission)
          || (requestedType !== 'research' && assigned.includes('gaps'))
          || assigned.includes('outputs')
        : false;
      if (!allowed) return res.status(403).json({ error: 'Forbidden: You do not have access to this tree type.' });
      return next();
    }

    if (req.path === '/nodes/leaves' || req.path === '/domain-nodes/all') {
      if (requestState.canReadAllTreeNodes || allowedTypes.length === 3) return next();
      return res.status(403).json({ error: 'Forbidden: You do not have access to all tree nodes.' });
    }

    const nodeMatch = req.path.match(/^\/nodes\/(\d+)(?:\/|$)/);
    if (nodeMatch) {
      const nodeId = Number(nodeMatch[1]);
      if (!Number.isSafeInteger(nodeId)) {
        return res.status(403).json({ error: 'Forbidden: Tree access could not be verified.' });
      }
      const node = await db.query.treeNodes.findFirst({
        columns: { treeId: true },
        where: eq(treeNodes.id, nodeId),
      });
      if (!node) return res.status(403).json({ error: 'Forbidden: Tree access could not be verified.' });
      const tree = await db.query.knowledgeTrees.findFirst({
        columns: { type: true },
        where: eq(knowledgeTrees.id, node.treeId),
      });
      if (!tree || !allowedTypes.includes(tree.type)) {
        return res.status(403).json({ error: 'Forbidden: You do not have access to this tree.' });
      }
      return next();
    }

    const treeMatch = req.path.match(/^\/(\d+)(?:\/|$)/);
    if (treeMatch) {
      const treeId = Number(treeMatch[1]);
      if (!Number.isSafeInteger(treeId)) {
        return res.status(403).json({ error: 'Forbidden: Tree access could not be verified.' });
      }
      const tree = await db.query.knowledgeTrees.findFirst({
        columns: { type: true },
        where: eq(knowledgeTrees.id, treeId),
      });
      if (!tree || !allowedTypes.includes(tree.type)) {
        return res.status(403).json({ error: 'Forbidden: You do not have access to this tree.' });
      }
      return next();
    }

    if (req.method === 'GET' && req.path === '/' && allowedTypes.length > 0) return next();
    return res.status(403).json({ error: 'Forbidden: Tree access could not be verified.' });
  } catch (error) {
    console.error('Error checking tree permissions:', error);
    return res.status(500).json({ error: 'Server error checking tree permissions.' });
  }
};

async function getAssignedPermissions(req: Request, res: Response): Promise<string[] | null> {
  const user = (req as AuthRequest).user;
  if (!user) {
    res.status(401).json({ error: 'Unauthorized: Please log in.' });
    return null;
  }
  const dbUser = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.id, user.id),
  });
  if (!dbUser) {
    res.status(401).json({ error: 'Unauthorized: User not found.' });
    return null;
  }
  if (dbUser.role === 'superadmin') return ['all'];

  const role = await db.query.roles.findFirst({
    where: (roles, { eq }) => eq(roles.name, dbUser.role),
  });
  if (!role) {
    res.status(403).json({ error: 'Forbidden: No permissions are assigned to this role.' });
    return null;
  }
  let permissions: unknown;
  try {
    permissions = JSON.parse(role.permissions);
  } catch {
    res.status(500).json({ error: 'Invalid role permissions configuration.' });
    return null;
  }
  return normalizePermissions(
    Array.isArray(permissions) ? permissions.filter((item): item is string => typeof item === 'string') : [],
  ).filter(permission => permission !== 'all');
}

function canAccessTreeType(permissions: string[], type: string): boolean {
  if (permissions.includes('all') || permissions.includes('outputs')) return true;
  if (type === 'required') return permissions.includes('required-tree') || permissions.includes('gaps');
  if (type === 'produced') return permissions.includes('produced-tree') || permissions.includes('gaps');
  if (type === 'research') return permissions.includes('research');
  return false;
}

export const requireOutputPermission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const permissions = await getAssignedPermissions(req, res);
    if (!permissions) return;
    if (permissions.includes('all')) return next();

    const treeMatch = req.path.match(/^\/tree\/(\d+)\/(?:graph|excel)$/);
    const researchMatch = req.path.match(/^\/research\/(\d+)\/excel$/);
    const gapsMatch = req.path.match(/^\/gaps\/(\d+)\/excel(?:-import)?$/);
    const requiredPermission = req.path === '/full-report'
      ? permissions.includes('outputs')
      : req.path === '/issues/excel'
        ? permissions.includes('issues') || permissions.includes('outputs')
        : gapsMatch
          ? permissions.includes('gaps') || permissions.includes('outputs')
          : researchMatch
            ? permissions.includes('research') || permissions.includes('outputs')
            : Boolean(treeMatch);
    if (!requiredPermission) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to access this output.' });
    }

    const matchedTreeId = treeMatch?.[1] || researchMatch?.[1] || gapsMatch?.[1];
    if (matchedTreeId) {
      const tree = await db.query.knowledgeTrees.findFirst({
        columns: { type: true },
        where: eq(knowledgeTrees.id, Number(matchedTreeId)),
      });
      if (!tree || !canAccessTreeType(permissions, tree.type)) {
        return res.status(403).json({ error: 'Forbidden: You do not have permission to export this tree.' });
      }
      if (gapsMatch && !permissions.includes('gaps') && !permissions.includes('outputs')) {
        return res.status(403).json({ error: 'Forbidden: You do not have permission to export gap analysis.' });
      }
    }
    return next();
  } catch (error) {
    console.error('Error checking output permissions:', error);
    return res.status(500).json({ error: 'Server error checking output permissions.' });
  }
};

export const requireMergePermission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const permissions = await getAssignedPermissions(req, res);
    if (!permissions) return;
    if (permissions.includes('all')) return next();

    const treeIds = req.method === 'POST' && req.path === '/trees'
      ? [req.body?.targetTreeId, req.body?.sourceTreeIdA, req.body?.sourceTreeIdB]
      : req.method === 'GET'
        ? [req.path.match(/^\/history\/(\d+)$/)?.[1]]
        : [];
    const ids = treeIds.map(value => Number(value));
    if (ids.length === 0 || ids.some(id => !Number.isSafeInteger(id) || id <= 0)) {
      return res.status(403).json({ error: 'Forbidden: Tree access could not be verified.' });
    }
    const trees = await Promise.all(ids.map(id => db.query.knowledgeTrees.findFirst({
      columns: { type: true },
      where: eq(knowledgeTrees.id, id),
    })));
    if (trees.some(tree => !tree || !canAccessTreeType(permissions, tree.type))) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to merge these trees.' });
    }
    return next();
  } catch (error) {
    console.error('Error checking merge permissions:', error);
    return res.status(500).json({ error: 'Server error checking merge permissions.' });
  }
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
