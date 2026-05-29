const express = require('express');
const router = express.Router();

const { createTicket, getTickets } = require('../controllers/supportTicketController');
const { upload } = require('../config/azureStorage');
const auth = require('../middleware/auth');
const checkOrgStatus = require('../middleware/checkOrgStatus');

// All support ticket APIs are private
router.use(auth);
router.use(checkOrgStatus);

// POST /api/support/issue
// Accepts multipart/form-data:
// - email, phoneNumber, description
// - images (up to 5 image files)
router.post('/issue', upload.array('images', 5), createTicket);

// GET /api/support/org/:orgId/tickets
// Query: ?all=true (admin only typically) to see all tickets, otherwise sees only user's tickets
router.get('/org/:orgId/tickets', getTickets);

module.exports = router;
