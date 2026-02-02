const express = require('express');
const router = express.Router();
const auditCtrl = require('../../Controller/Audit/AuditController');
const auth = require('../../middleware/auth');
const requireAdmin = require('../../middleware/requireAdmin');

// Only admins can view audit logs
router.get('/', auth, requireAdmin, auditCtrl.getAuditLogs);

module.exports = router;
