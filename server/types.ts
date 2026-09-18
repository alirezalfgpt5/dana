import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
    organizationLevel?: string;
    baseId?: number;
    unitId?: number;
  };
  file?: any;
}
