import * as bcrypt from 'bcrypt';

const BCRYPT_PREFIXES = ['$2a$', '$2b$', '$2x$', '$2y$'];

export const isAuthMode = (): boolean => process.env.TEST_MODE === 'auth';

export const isTestLogin = (login: string): boolean => login.startsWith('TEST_');

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = Number.parseInt(process.env.CRYPT_SALT ?? '10', 10);

  return bcrypt.hash(password, Number.isNaN(saltRounds) ? 10 : saltRounds);
};

export const isPasswordMatch = async (rawPassword: string, storedPassword: string): Promise<boolean> => {
  if (BCRYPT_PREFIXES.some((prefix) => storedPassword.startsWith(prefix))) {
    return bcrypt.compare(rawPassword, storedPassword);
  }

  return rawPassword === storedPassword;
};
