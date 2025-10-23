const crypto = require('crypto');

// Simple CSRF protection middleware
// Generates and validates CSRF tokens

// Store tokens in memory (in production, use Redis)
const tokenStore = new Map();

// Clean up expired tokens every hour
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of tokenStore.entries()) {
    if (now - data.createdAt > 3600000) { // 1 hour
      tokenStore.delete(token);
    }
  }
}, 3600000);

// Generate CSRF token
function generateToken(sessionId) {
  const token = crypto.randomBytes(32).toString('hex');
  tokenStore.set(token, {
    sessionId,
    createdAt: Date.now()
  });
  return token;
}

// Validate CSRF token
function validateToken(token, sessionId) {
  if (!token || !sessionId) {
    return false;
  }

  const data = tokenStore.get(token);
  if (!data) {
    return false;
  }

  // Check if token matches session and not expired
  if (data.sessionId !== sessionId) {
    return false;
  }

  const age = Date.now() - data.createdAt;
  if (age > 3600000) { // 1 hour expiry
    tokenStore.delete(token);
    return false;
  }

  return true;
}

// Middleware to provide CSRF token
function csrfTokenMiddleware(req, res, next) {
  // Generate session ID if not exists
  if (!req.sessionID) {
    req.sessionID = crypto.randomBytes(16).toString('hex');
  }

  // Add method to generate token
  req.csrfToken = () => generateToken(req.sessionID);

  next();
}

// Middleware to validate CSRF token on state-changing requests
function csrfProtection(req, res, next) {
  // Skip for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip for certain routes (like public API endpoints)
  const publicRoutes = [
    '/api/applications',              // Simple form applications
    '/api/inquiries',                 // Simple form inquiries
    '/api/customers/applications',
    '/api/customers/inquiries',
    '/api/tracking/visit',
    '/api/auth/login',
    '/api/auth/register',
    '/api/admin/login'
  ];

  // Skip for authenticated Admin routes (already protected by JWT)
  const adminRoutes = [
    '/api/customers',                 // Admin customer management
    '/api/admin',                     // Admin routes
    '/api/tracking/stats'             // Admin stats
  ];

  if (publicRoutes.some(route => req.path.startsWith(route))) {
    return next();
  }

  // Skip CSRF for Admin routes that have JWT authentication
  if (adminRoutes.some(route => req.path.startsWith(route))) {
    return next();
  }

  // Get token from header or body
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionId = req.sessionID || req.headers['x-session-id'];

  if (!validateToken(token, sessionId)) {
    return res.status(403).json({
      status: 'error',
      message: 'Invalid CSRF token',
      code: 'CSRF_VALIDATION_FAILED'
    });
  }

  // Remove token after successful validation (one-time use)
  tokenStore.delete(token);

  next();
}

// Endpoint to get CSRF token
function getCsrfToken(req, res) {
  // Generate session ID if not exists
  if (!req.sessionID) {
    req.sessionID = crypto.randomBytes(16).toString('hex');
  }

  const token = generateToken(req.sessionID);

  res.json({
    status: 'success',
    data: {
      csrfToken: token,
      sessionId: req.sessionID
    }
  });
}

module.exports = {
  csrfTokenMiddleware,
  csrfProtection,
  getCsrfToken
};
