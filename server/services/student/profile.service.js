const User = require('../../models/User');

class ProfileService {
  async getProfile(studentId) {
    const user = await User.findById(studentId);
    if (!user) throw new Error('Student not found');
    return user;
  }

  async updateGithubUsername(studentId, githubUsername) {
    if (!githubUsername || typeof githubUsername !== 'string') {
      throw new Error('GitHub username is required');
    }

    const trimmed = githubUsername.trim();
    
    // GitHub username format validation: alphanumeric + hyphens, no leading/trailing hyphen, <= 39 chars
    const githubUsernameRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;
    if (!githubUsernameRegex.test(trimmed)) {
      throw new Error('Invalid GitHub username format');
    }

    const user = await User.findById(studentId);
    if (!user) throw new Error('Student not found');

    user.githubUsername = trimmed;
    await user.save();

    return user;
  }
}

module.exports = new ProfileService();
