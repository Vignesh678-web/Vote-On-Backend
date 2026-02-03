module.exports = (req, res, next) => {
  if (!req.user) {
    console.error(`[ACL] DENIED: No user in request for ${req.method} ${req.originalUrl}`);
    return res.status(401).json({ message: 'Unauthorized: No session found' });
  }

  const allowedRoles = ['admin', 'teacher', 'returning_officer'];
  if (!allowedRoles.includes(req.user.role)) {
    console.warn(`[ACL] REJECTED: User ${req.user.id} has role '${req.user.role}', but administrative access is required.`);
    return res.status(403).json({ 
      success: false,
      message: `Access Denied: Administrative privileges required. Your current role is '${req.user.role}'.`,
      debug: {
        userId: req.user.id,
        currentRole: req.user.role,
        requiredRole: 'admin/teacher',
        url: req.originalUrl,
        method: req.method
      }
    });
  }
  
  next();
};
