import { getCurrentTimestamp } from './get-current-timestamp';

export interface AuditTimestamps {
  createdAt: number;
  updatedAt: number;
}

export const createAuditTimestamps = (): AuditTimestamps => {
  const timestamp = getCurrentTimestamp();

  return {
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};
