const crypto = require('crypto');

// Stateless CSRF protection middleware using JWT-style signed tokens
// This approach works perfectly with serverless/edge functions (Vercel, AWS Lambda)
// No need for Redis or database storage

const CSRF_SECRET = process.env.CSRF_SECRET || 'your-csrf-secret-key-change-this';

// Generate stateless CSRF token
// Format: base64(sessionId + '.' + timestamp + '.' + signature)
function generateToken(sessionId) {
  const timestamp = Date.now().toString();
  const payload = `${sessionId}.${timestamp}`;

  // Create HMAC signature
  const signature = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(payload)
    .digest('hex');

  const token = Buffer.from(`${payload}.${signature}`).toString('base64');
  return token;
}

// Validate stateless CSRF token
function validateToken(token, sessionId) {
  if (!token || !sessionId) {
    return false;
  }

  try {
    // Decode token
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const parts = decoded.split('.');

    if (parts.length !== 3) {
      return false;
    }

    const [tokenSessionId, timestamp, signature] = parts;

    // Verify session ID matches
    if (tokenSessionId !== sessionId) {
      return false;
    }

    // Verify signature
    const payload = `${tokenSessionId}.${timestamp}`;
    const expectedSignature = crypto
      .createHmac('sha256', CSRF_SECRET)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      return false;
    }

    // Check expiration (1 hour)
    const age = Date.now() - parseInt(timestamp);
    if (age > 3600000) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
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

  // Token validated successfully - stateless tokens don't need removal
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
