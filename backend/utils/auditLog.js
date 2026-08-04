import AuditLog from '../models/AuditLog.js';

export async function recordAudit({ userId, action, entityType, entityId, tenderId, metadata }) {
  return AuditLog.create({
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    tender_id: tenderId ?? null,
    metadata: metadata ?? null,
  });
}
