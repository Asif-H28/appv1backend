const NammaSambramaEnquiry = require('../models/NammaSambramaEnquiry');
const { serialize } = require('./nammasambramaCatalogController');

const VALID_STATUSES = ['new', 'contacted', 'closed'];

/**
 * POST /public/enquiries  (no auth — public booking form)
 */
exports.createEnquiry = async (req, res) => {
  try {
    const { contactName, contactPhone } = req.body;

    if (!contactName || !String(contactName).trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    // Public visitors may enter any reachable number, so this is a loose
    // sanity check rather than the strict admin-signup validation.
    const phoneDigits = String(contactPhone || '').replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      return res.status(400).json({ error: 'Enter a valid contact number' });
    }

    // Public input — never let a caller set status or timestamps
    const { id, _id, status, createdAt, updatedAt, ...payload } = req.body;

    const enquiry = await NammaSambramaEnquiry.create({
      ...payload,
      status: 'new'
    });

    res.status(201).json({
      message: 'Enquiry submitted successfully',
      enquiry: serialize(enquiry)
    });
  } catch (error) {
    console.error('createEnquiry error:', error);
    res.status(500).json({ error: 'Failed to submit enquiry' });
  }
};

/**
 * GET /admin/enquiries?status=new&page=1&limit=50  (protected)
 */
exports.listEnquiries = async (req, res) => {
  try {
    const { status } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));

    const filter = {};
    if (status && VALID_STATUSES.includes(status)) filter.status = status;

    const [enquiries, total] = await Promise.all([
      NammaSambramaEnquiry.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      NammaSambramaEnquiry.countDocuments(filter)
    ]);

    res.status(200).json({
      enquiries: enquiries.map(serialize),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('listEnquiries error:', error);
    res.status(500).json({ error: 'Failed to load enquiries' });
  }
};

/**
 * PATCH /admin/enquiries/:id/status  (protected)
 * Body: { status: 'new' | 'contacted' | 'closed' }
 */
exports.updateEnquiryStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const enquiry = await NammaSambramaEnquiry.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!enquiry) return res.status(404).json({ error: 'Enquiry not found' });

    res.status(200).json({ message: 'Status updated', enquiry: serialize(enquiry) });
  } catch (error) {
    console.error('updateEnquiryStatus error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
};

/**
 * DELETE /admin/enquiries/:id  (protected)
 */
exports.deleteEnquiry = async (req, res) => {
  try {
    const enquiry = await NammaSambramaEnquiry.findByIdAndDelete(req.params.id);
    if (!enquiry) return res.status(404).json({ error: 'Enquiry not found' });
    res.status(200).json({ message: 'Enquiry deleted', id: req.params.id });
  } catch (error) {
    console.error('deleteEnquiry error:', error);
    res.status(500).json({ error: 'Failed to delete enquiry' });
  }
};
