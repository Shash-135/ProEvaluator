const { Octokit } = require('@octokit/rest');
const GitHubMetricsCache = require('../models/GitHubMetricsCache');
const Team = require('../models/Team');
const User = require('../models/User');
const { STALE_THRESHOLD_MS, SYNC_STATUS } = require('../constants');

class GitHubMetricsService {
  parseRepoUrl(repoUrl) {
    if (!repoUrl) return null;
    let clean = repoUrl.trim().replace(/\/$/, '');
    if (clean.endsWith('.git')) clean = clean.slice(0, -4);
    const parts = clean.split('/');
    if (parts.length >= 2) {
      return {
        owner: parts[parts.length - 2],
        repo: parts[parts.length - 1]
      };
    }
    return null;
  }

  getOctokitClient(userToken = null) {
    const token = userToken || process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;
    return new Octokit({
      auth: token || undefined
    });
  }

  async getTeamMetrics(teamId, force = false) {
    const team = await Team.findById(teamId).populate('members', 'name email githubUsername githubAccessToken');
    if (!team) throw new Error('Team not found');

    const parsed = this.parseRepoUrl(team.repoUrl);
    const now = new Date();

    // Prepare result array
    const studentMetrics = [];

    // Check cached records first if not forced
    const cachedRecords = await GitHubMetricsCache.find({ teamId: team._id });
    const cacheMap = new Map();
    cachedRecords.forEach((c) => cacheMap.set(c.studentId.toString(), c));

    let allFresh = true;
    if (!force) {
      for (const student of team.members) {
        const cached = cacheMap.get(student._id.toString());
        if (!cached || !cached.lastSyncedAt || now - new Date(cached.lastSyncedAt) > STALE_THRESHOLD_MS) {
          allFresh = false;
          break;
        }
      }
    } else {
      allFresh = false;
    }

    // If all cache rows are fresh and force is false, return cached directly
    if (allFresh && cachedRecords.length > 0) {
      return {
        teamId: team._id,
        repoUrl: team.repoUrl,
        fromCache: true,
        students: team.members.map((student) => {
          const c = cacheMap.get(student._id.toString());
          return {
            studentId: student._id,
            name: student.name,
            githubUsername: student.githubUsername,
            commitCount: c ? c.commitCount : 0,
            linesAdded: c ? c.linesAdded : 0,
            linesDeleted: c ? c.linesDeleted : 0,
            lastCommitAt: c ? c.lastCommitAt : null,
            lastSyncedAt: c ? c.lastSyncedAt : null,
            syncStatus: c ? c.syncStatus : SYNC_STATUS.OK,
            errorMessage: c ? c.errorMessage : ''
          };
        })
      };
    }

    if (!parsed) {
      // Return error state if repository URL is missing/invalid
      return {
        teamId: team._id,
        repoUrl: team.repoUrl,
        fromCache: false,
        error: 'Invalid or missing repository URL on team record.',
        students: team.members.map((s) => ({
          studentId: s._id,
          name: s.name,
          githubUsername: s.githubUsername,
          commitCount: 0,
          linesAdded: 0,
          linesDeleted: 0,
          syncStatus: SYNC_STATUS.ERROR,
          errorMessage: 'No repository URL provided.'
        }))
      };
    }

    // Attempt live fetch using Octokit
    const octokit = this.getOctokitClient();
    let contributorStatsMap = new Map();
    let isRateLimited = false;

    try {
      // 1. Fetch contributors statistics (single pre-aggregated API call)
      const res = await octokit.rest.repos.getContributorsStats({
        owner: parsed.owner,
        repo: parsed.repo
      });

      // Check GitHub Rate Limit headers
      const remaining = parseInt(res.headers['x-ratelimit-remaining'] || '999', 10);
      if (remaining < 50) {
        isRateLimited = true;
      }

      if (res.status === 200 && Array.isArray(res.data)) {
        for (const item of res.data) {
          if (item.author && item.author.login) {
            let totalAdded = 0;
            let totalDeleted = 0;
            if (Array.isArray(item.weeks)) {
              item.weeks.forEach((w) => {
                totalAdded += w.a || 0;
                totalDeleted += w.d || 0;
              });
            }
            contributorStatsMap.set(item.author.login.toLowerCase(), {
              commits: item.total || 0,
              linesAdded: totalAdded,
              linesDeleted: totalDeleted
            });
          }
        }
      }
    } catch (err) {
      console.warn(`[GitHubMetricsService] getContributorsStats fallback for ${parsed.owner}/${parsed.repo}: ${err.message}`);
    }

    // Process each student member
    for (const student of team.members) {
      const username = (student.githubUsername || '').toLowerCase();
      let commitCount = 0;
      let linesAdded = 0;
      let linesDeleted = 0;
      let status = isRateLimited ? SYNC_STATUS.RATE_LIMITED : SYNC_STATUS.OK;
      let errorMsg = isRateLimited ? 'GitHub API rate limit ceiling reached.' : '';

      if (username && contributorStatsMap.has(username)) {
        const stats = contributorStatsMap.get(username);
        commitCount = stats.commits;
        linesAdded = stats.linesAdded;
        linesDeleted = stats.linesDeleted;
      } else if (username && !isRateLimited) {
        // Fallback to per-author commit count query
        try {
          const commitsRes = await octokit.rest.repos.listCommits({
            owner: parsed.owner,
            repo: parsed.repo,
            author: username,
            per_page: 1
          });
          
          // Check pagination link header or total count length
          const linkHeader = commitsRes.headers.link;
          if (linkHeader && linkHeader.includes('rel="last"')) {
            const match = linkHeader.match(/page=(\d+)>; rel="last"/);
            if (match) commitCount = parseInt(match[1], 10);
          } else if (Array.isArray(commitsRes.data)) {
            commitCount = commitsRes.data.length;
          }
        } catch (e) {
          status = SYNC_STATUS.ERROR;
          errorMsg = e.message;
        }
      } else if (!username) {
        status = SYNC_STATUS.ERROR;
        errorMsg = 'Student has not linked a GitHub username.';
      }

      // Upsert into GitHubMetricsCache
      const updatedCache = await GitHubMetricsCache.findOneAndUpdate(
        { studentId: student._id, teamId: team._id },
        {
          studentId: student._id,
          teamId: team._id,
          repoUrl: team.repoUrl,
          commitCount,
          linesAdded,
          linesDeleted,
          lastSyncedAt: now,
          syncStatus: status,
          errorMessage: errorMsg
        },
        { upsert: true, new: true }
      );

      studentMetrics.push({
        studentId: student._id,
        name: student.name,
        githubUsername: student.githubUsername,
        commitCount,
        linesAdded,
        linesDeleted,
        lastSyncedAt: updatedCache.lastSyncedAt,
        syncStatus: status,
        errorMessage: errorMsg
      });
    }

    return {
      teamId: team._id,
      repoUrl: team.repoUrl,
      fromCache: false,
      students: studentMetrics
    };
  }
  async getStudentMetrics(studentId, force = false) {
    const student = await User.findById(studentId);
    if (!student) throw new Error('Student not found');
    
    const team = await Team.findOne({ members: studentId });
    if (!team) {
      return { hasTeam: false };
    }

    const parsed = this.parseRepoUrl(team.repoUrl);
    const now = new Date();

    const cached = await GitHubMetricsCache.findOne({ studentId: student._id, teamId: team._id });
    let isFresh = false;

    if (!force && cached && cached.lastSyncedAt && (now - new Date(cached.lastSyncedAt) <= STALE_THRESHOLD_MS)) {
      isFresh = true;
    }

    if (isFresh) {
      return {
        studentId: student._id,
        name: student.name,
        githubUsername: student.githubUsername,
        commitCount: cached.commitCount,
        linesAdded: cached.linesAdded,
        linesDeleted: cached.linesDeleted,
        lastSyncedAt: cached.lastSyncedAt,
        syncStatus: cached.syncStatus,
        errorMessage: cached.errorMessage,
        fromCache: true
      };
    }

    if (!parsed) {
      return {
        studentId: student._id,
        name: student.name,
        githubUsername: student.githubUsername,
        commitCount: 0,
        linesAdded: 0,
        linesDeleted: 0,
        syncStatus: SYNC_STATUS.ERROR,
        errorMessage: 'No repository URL provided.',
        fromCache: false
      };
    }

    const username = (student.githubUsername || '').toLowerCase();
    let commitCount = 0;
    let linesAdded = 0;
    let linesDeleted = 0;
    let status = SYNC_STATUS.OK;
    let errorMsg = '';

    if (!username) {
      status = SYNC_STATUS.ERROR;
      errorMsg = 'Student has not linked a GitHub username.';
    } else {
      try {
        const octokit = this.getOctokitClient();
        // Just fetch per-author commit count for speed/safety on single-student sync
        const commitsRes = await octokit.rest.repos.listCommits({
          owner: parsed.owner,
          repo: parsed.repo,
          author: username,
          per_page: 1
        });
        
        const remaining = parseInt(commitsRes.headers['x-ratelimit-remaining'] || '999', 10);
        if (remaining < 50) {
          status = SYNC_STATUS.RATE_LIMITED;
          errorMsg = 'GitHub API rate limit ceiling reached.';
        } else {
          const linkHeader = commitsRes.headers.link;
          if (linkHeader && linkHeader.includes('rel="last"')) {
            const match = linkHeader.match(/page=(\d+)>; rel="last"/);
            if (match) commitCount = parseInt(match[1], 10);
          } else if (Array.isArray(commitsRes.data)) {
            commitCount = commitsRes.data.length;
          }
        }
      } catch (e) {
        status = SYNC_STATUS.ERROR;
        errorMsg = e.message;
      }
    }

    const updatedCache = await GitHubMetricsCache.findOneAndUpdate(
      { studentId: student._id, teamId: team._id },
      {
        studentId: student._id,
        teamId: team._id,
        repoUrl: team.repoUrl,
        commitCount,
        linesAdded,
        linesDeleted, // listCommits doesn't provide linesAdded/Deleted cheaply, keeping it 0 for per-student single sync fallback
        lastSyncedAt: now,
        syncStatus: status,
        errorMessage: errorMsg
      },
      { upsert: true, new: true }
    );

    return {
      studentId: student._id,
      name: student.name,
      githubUsername: student.githubUsername,
      commitCount: updatedCache.commitCount,
      linesAdded: updatedCache.linesAdded,
      linesDeleted: updatedCache.linesDeleted,
      lastSyncedAt: updatedCache.lastSyncedAt,
      syncStatus: updatedCache.syncStatus,
      errorMessage: updatedCache.errorMessage,
      fromCache: false
    };
  }
}

module.exports = new GitHubMetricsService();
