const githubMetricsService = require('../githubMetrics.service');

// Throttle tracking map: studentId (string) -> timestamp of last forced sync
const throttleMap = new Map();
const THROTTLE_WINDOW_MS = 60000;

class MetricsService {
  async getOwnMetrics(studentId, force = false) {
    if (force) {
      const lastForced = throttleMap.get(studentId.toString());
      if (lastForced && (Date.now() - lastForced) < THROTTLE_WINDOW_MS) {
        throw new Error('You can only force refresh metrics once per minute. Please try again later.');
      }
      throttleMap.set(studentId.toString(), Date.now());
    }

    return await githubMetricsService.getStudentMetrics(studentId, force);
  }
}

module.exports = new MetricsService();
