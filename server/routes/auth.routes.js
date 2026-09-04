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
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/login', session: false }), authController.oauthCallback);

// GitHub OAuth
router.get('/github', passport.authenticate('github', { scope: ['user:email', 'repo'] }));
router.get('/github/callback', passport.authenticate('github', { failureRedirect: '/login', session: false }), authController.oauthCallback);

module.exports = router;
