import { SetMetadata } from '@nestjs/common';
import { AuditAction } from '../constants/enums';

export const AUDIT_ACTION_KEY = 'auditAction';

export interface AuditMetadata {
  action: AuditAction;
  resource: string;
}

export const AuditedAction = (metadata: AuditMetadata) =>
  SetMetadata(AUDIT_ACTION_KEY, metadata);

