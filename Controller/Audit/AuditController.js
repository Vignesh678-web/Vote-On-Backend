const AuditLog = require('../../models/Audit/AuditLog');

// Utility to create a log entry
exports.logAction = async (action, module, details, performedBy, role, ipAddress = null) => {
  try {
    const log = new AuditLog({
      action,
      module,
      details,
      performedBy,
      role,
      ipAddress
    });
    await log.save();
  } catch (err) {
    console.error('Failed to save audit log:', err);
  }
};

// Fetch logs for admin view
exports.getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, module, action } = req.query;
    const query = {};
    if (module) query.module = module;
    if (action) query.action = action;

    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await AuditLog.countDocuments(query);

    res.json({
      logs,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalLogs: count
    });
  } catch (err) {
    console.error('getAuditLogs error:', err);
    res.status(500).json({ message: 'Server error fetching audit logs' });
  }
};
