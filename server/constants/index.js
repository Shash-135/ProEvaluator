const ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  EXTERNAL: 'external',
  STUDENT: 'student'
};

const TEAM_STATUS = {
  FORMING: 'forming',
  ACTIVE: 'active',
  COMPLETED: 'completed'
};

const JOIN_REQUEST_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  EXPIRED: 'expired'
};

const MILESTONE_STATUS = {
  PENDING: 'pending',
  GRADED: 'graded'
};

const SYNC_STATUS = {
  OK: 'ok',
  RATE_LIMITED: 'rate_limited',
  ERROR: 'error'
};

const STALE_THRESHOLD_MS = 60 * 1000; // 1 minute (60s throttle limit)

module.exports = {
  ROLES,
  TEAM_STATUS,
  JOIN_REQUEST_STATUS,
  MILESTONE_STATUS,
  SYNC_STATUS,
  STALE_THRESHOLD_MS
};
