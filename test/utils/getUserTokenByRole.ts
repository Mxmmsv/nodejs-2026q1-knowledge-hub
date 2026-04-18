import { UserRole } from '@prisma/client';
import { authRoutes } from '../endpoints';
import promoteUserRole from './promoteUserRole';

const getUserTokenByRole = async (
  request,
  role: 'admin' | 'editor' | 'viewer',
  // kept for compatibility with existing RBAC specs; role promotion is DB-side now
  _adminHeaders?: Record<string, string>,
) => {
  const login = `TEST_RBAC_${role.toUpperCase()}_${Date.now()}`;
  const password = 'TestPass123!';

  // Create user via signup (defaults to viewer)
  const signupResponse = await request
    .post(authRoutes.signup)
    .set({ Accept: 'application/json' })
    .send({ login, password });

  const { id: userId } = signupResponse.body;

  if (!userId) {
    throw new Error(`Failed to create ${role} user`);
  }

  // Promote directly in DB instead of relying on PUT /user/:id role updates.
  if (role !== 'viewer') {
    const prismaRoleByDomainRole: Record<'admin' | 'editor' | 'viewer', UserRole> = {
      admin: UserRole.ADMIN,
      editor: UserRole.EDITOR,
      viewer: UserRole.VIEWER,
    };

    await promoteUserRole(userId, prismaRoleByDomainRole[role]);
  }

  // Login after promotion so the JWT payload carries the requested role
  const loginResponse = await request
    .post(authRoutes.login)
    .set({ Accept: 'application/json' })
    .send({ login, password });

  const { accessToken } = loginResponse.body;

  if (!accessToken) {
    throw new Error(`Failed to login as ${role} user`);
  }

  return {
    token: `Bearer ${accessToken}`,
    userId,
    login,
    role,
  };
};

export default getUserTokenByRole;
