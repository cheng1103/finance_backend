const { authenticateAdmin } = require('./auth');

const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    authenticateAdmin(req, res, (err) => {
      if (err) {
        return next(err);
      }

      const user = req.user;

      if (user.role === 'superadmin' || user.userId === 'legacy-admin') {
        return next();
      }

      if (user.permissions && user.permissions[requiredPermission]) {
        return next();
      }

      return res.status(403).json({
        status: 'error',
        message: `Insufficient permissions. Required: ${requiredPermission}`,
        code: 'PERMISSION_DENIED'
      });
    });
  };
};

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    authenticateAdmin(req, res, (err) => {
      if (err) {
        return next(err);
      }

      const user = req.user;

      if (user.userId === 'legacy-admin') {
        return next();
      }

      if (allowedRoles.includes(user.role)) {
        return next();
      }

      return res.status(403).json({
        status: 'error',
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
        code: 'ROLE_DENIED'
      });
    });
  };
};

const permissions = {
  canView: (req, res, next) => checkPermission('canView')(req, res, next),
  canEdit: (req, res, next) => checkPermission('canEdit')(req, res, next),
  canDelete: (req, res, next) => checkPermission('canDelete')(req, res, next),
  canCreateUsers: (req, res, next) => checkPermission('canCreateUsers')(req, res, next),
  canManageSettings: (req, res, next) => checkPermission('canManageSettings')(req, res, next),
  requireSuperadmin: (req, res, next) => requireRole(['superadmin'])(req, res, next),
  requireAdminOrSuperadmin: (req, res, next) => requireRole(['admin', 'superadmin'])(req, res, next),
  requireViewerOrAbove: (req, res, next) => requireRole(['viewer', 'admin', 'superadmin'])(req, res, next)
};

module.exports = {
  checkPermission,
  requireRole,
  permissions
};

