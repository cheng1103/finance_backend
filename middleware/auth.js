const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AdminUser = require('../models/AdminUser');

// Verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Access denied, please provide a valid access token'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'User does not exist'
      });
    }

    // Check user status
    if (!user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Account has been disabled'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid access token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Access token has expired'
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Authentication failed'
    });
  }
};

// Optional authentication (for endpoints that don't require mandatory login)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Optional authentication failure doesn't block request, just doesn't set user info
    next();
  }
};

// Require admin role (for admin-only routes)
const requireAdmin = (req, res, next) => {
  // Check if user is authenticated
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  // Check if user has admin role
  // For admin routes, check the decoded JWT directly (from admin login)
  if (req.user.role === 'admin' || req.user.username === 'admin') {
    return next();
  }

  // Otherwise, deny access
  return res.status(403).json({
    status: 'error',
    message: 'Admin access required. This operation is restricted to administrators only.',
    code: 'FORBIDDEN_ADMIN_ONLY'
  });
};

// Enhanced admin authentication for AdminUser model
const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Admin authentication required'
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if it's a legacy admin token (from old system)
    if (decoded.id === 'legacy-admin' || decoded.username === 'admin') {
      // Legacy admin authentication
      req.user = {
        userId: 'legacy-admin',
        id: 'legacy-admin',
        username: 'admin',
        role: 'superadmin',
        permissions: {
          canView: true,
          canEdit: true,
          canDelete: true,
          canCreateUsers: true,
          canManageSettings: true
        },
        fullName: 'System Administrator',
        email: 'admin@system.local'
      };
      return next();
    }

    // Check if it's an admin token
    if (!['superadmin', 'admin', 'viewer'].includes(decoded.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Admin access required'
      });
    }

    // Find admin user in database
    const adminUser = await AdminUser.findById(decoded.userId).select('-password');
    
    if (!adminUser) {
      return res.status(401).json({
        status: 'error',
        message: 'Admin user not found'
      });
    }

    // Check if admin user is active
    if (!adminUser.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Admin account is disabled'
      });
    }

    // Check if account is locked
    if (adminUser.isLocked) {
      return res.status(401).json({
        status: 'error',
        message: 'Admin account is temporarily locked due to multiple failed login attempts'
      });
    }

    req.user = {
      userId: adminUser._id,
      id: adminUser._id, // For backward compatibility
      username: adminUser.username,
      role: adminUser.role,
      permissions: adminUser.permissions,
      fullName: adminUser.fullName,
      email: adminUser.email
    };

    next();
  } catch (error) {
    console.error('Admin authentication error:', error.message);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid admin token'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Admin token has expired, please log in again'
      });
    }

    return res.status(500).json({
      status: 'error',
      message: 'Admin authentication failed'
    });
  }
};

module.exports = {
  authenticate,
  optionalAuth,
  requireAdmin,
  authenticateAdmin
};
