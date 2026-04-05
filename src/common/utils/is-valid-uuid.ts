import { validate as validateUuid } from 'uuid';

export const isValidUuid = (value: string): boolean => validateUuid(value);
