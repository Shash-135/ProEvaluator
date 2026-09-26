const express = require('express');
const passport = require('passport');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authenticate = require('../middleware/authenticate');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/refresh', authController.refresh);
router.get('/me', authenticate, authController.getMe);
router.get('/cohorts', authController.getPublicCohorts);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/complete-profile', authenticate, authController.completeProfile);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, user, info) => {
    if (err) {
      console.error("Google Auth Error:", err);
      return res.redirect('/login?error=auth_failed');
    }
    if (!user) {
      console.error("Google Auth Failed - No User:", info);
      return res.redirect('/login?error=no_user');
    }
    req.user = user;
    next();
  })(req, res, next);
}, authController.oauthCallback);

// GitHub OAuth
router.get('/github', passport.authenticate('github', { scope: ['user:email', 'repo'] }));
router.get('/github/callback', (req, res, next) => {
  passport.authenticate('github', { session: false }, (err, user, info) => {
    if (err) {
      console.error("GitHub Auth Error:", err);
      return res.redirect('/login?error=auth_failed');
    }
    if (!user) {
      console.error("GitHub Auth Failed - No User:", info);
      return res.redirect('/login?error=no_user');
    }
    req.user = user;
    next();
  })(req, res, next);
}, authController.oauthCallback);

module.exports = router;
