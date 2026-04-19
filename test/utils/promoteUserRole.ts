import { UserRole } from '@prisma/client';
import prisma from '../lib/prisma';

const promoteUserRole = async (userId: string, role: UserRole): Promise<void> => {
  await prisma.user.update({
    where: { id: userId },
    data: { role },
  });
};

export default promoteUserRole;
