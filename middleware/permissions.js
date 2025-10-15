const { authenticateAdmin } = require('./auth');

// 权限检查中间件
const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    // 首先验证用户是否已认证
    authenticateAdmin(req, res, (err) => {
      if (err) return next(err);
      
      const user = req.user;
      
      // Superadmin 拥有所有权限
      if (user.role === 'superadmin' || user.userId === 'legacy-admin') {
        return next();
      }
      
      // 检查具体权限
      if (user.permissions && user.permissions[requiredPermission]) {
        return next();
      }
      
      // 权限不足
      return res.status(403).json({
        status: 'error',
        message: `Insufficient permissions. Required: ${requiredPermission}`,
        code: 'PERMISSION_DENIED'
      });
    });
  };
};

// 角色检查中间件
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    authenticateAdmin(req, res, (err) => {
      if (err) return next(err);
      
      const user = req.user;
      
      // Legacy admin 视为 superadmin
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

// 具体权限检查函数
const permissions = {
  // 查看权限
  canView: (req, res, next) => checkPermission('canView')(req, res, next),
  
  // 编辑权限
  canEdit: (req, res, next) => checkPermission('canEdit')(req, res, next),
  
  // 删除权限
  canDelete: (req, res, next) => checkPermission('canDelete')(req, res, next),
  
  // 创建用户权限
  canCreateUsers: (req, res, next) => checkPermission('canCreateUsers')(req, res, next),
  
  // 管理设置权限
  canManageSettings: (req, res, next) => checkPermission('canManageSettings')(req, res, next),
  
  // 角色检查
  requireSuperadmin: (req, res, next) => requireRole(['superadmin'])(req, res, next),
  requireAdminOrSuperadmin: (req, res, next) => requireRole(['admin', 'superadmin'])(req, res, next),
  requireViewerOrAbove: (req, res, next) => requireRole(['viewer', 'admin', 'superadmin'])(req, res, next)
};

module.exports = {
  checkPermission,
  requireRole,
  permissions
};
