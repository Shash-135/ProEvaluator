const { ROLES } = require('../constants');

const PERMISSIONS = {
  [ROLES.ADMIN]: [
    'cohort:create',
    'cohort:read',
    'cohort:update',
    'batch:create',
    'batch:read',
    'batch:update',
    'batch:archive',
    'milestone:manage',
    'milestone:reconcile',
    'milestone:read',
    'team:oversight',
    'team:assign_teacher',
    'team:dissolve',
    'team:move_member',
    'team:override_status',
    'team:update_repo',
    'user:manage',
    'user:promote',
    'user:soft_delete',
    'user:update_github',
    'evaluator:pair',
    'reports:view',
    'logs:view',
    'grading:read'
  ],
  [ROLES.TEACHER]: [
    'cohort:read',
    'batch:read',
    'milestone:read',
    'team:read_assigned',
    'team:view_own',
    'team:update_repo',
    'grading:write',
    'grading:read',
    'milestone:grade_own',
    'metrics:view_own',
    'metrics:refresh_own',
    'reports:view_own_workload'
  ],
  [ROLES.EXTERNAL]: [
    'cohort:read',
    'batch:read',
    'milestone:read',
    'team:read_linked',
    'team:view_own',
    'grading:read',
    'milestone:grade_external',
    'metrics:view_own'
  ],
  [ROLES.STUDENT]: [
    'cohort:read',
    'batch:read',
    'milestone:read_own',
    'team:read_own',
    'team:update_repo',
    'join_request:send',
    'join_request:respond',
    'team:join_request',
    'team:view_self',
    'milestone:view_self',
    'metrics:view_self',
    'metrics:refresh_self',
    'profile:update_self'
  ]
};

const hasPermission = (role, action) => {
  if (!role || !action) return false;
  const roleActions = PERMISSIONS[role] || [];
  return roleActions.includes(action);
};

module.exports = {
  PERMISSIONS,
  hasPermission
};
