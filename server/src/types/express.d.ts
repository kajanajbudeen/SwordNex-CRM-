import { UserRole } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  globalRole: UserRole;
}

export interface OrganizationMembership {
  id: string;
  organizationId: string;
  role: UserRole;
  title?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      organizationId?: string;
      membership?: OrganizationMembership;
    }
  }
}
