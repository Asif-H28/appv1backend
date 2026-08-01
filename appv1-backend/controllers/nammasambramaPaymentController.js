const NammaSambramaPayment = require('../models/NammaSambramaPayment');
const { uploadToAzure, deleteFromAzure, sharp } = require('../config/azureStorage');

const AZURE_FOLDER = 'nammasambrama/payment';

/**
 * Shape a document for the frontend.
 */
function serialize(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  const { _id, __v, adminId, ...rest } = obj;
  return { id: String(_id), ...rest };
}

/* ------------------------------------------------------------------ */
/* Admin endpoints (JWT required)                                      */
/* ------------------------------------------------------------------ */

/**
 * GET /admin/payment
 * Return the current admin's saved payment settings.
 */
exports.getPaymentSettings = async (req, res) => {
  try {
    const doc = await NammaSambramaPayment.findOne({ adminId: req.admin.adminId });
    res.status(200).json({ payment: doc ? serialize(doc) : null });
  } catch (error) {
    console.error('getPaymentSettings error:', error);
    res.status(500).json({ error: 'Failed to load payment settings' });
  }
};

/**
 * PUT /admin/payment
 * Create-or-update UPI ID, payee name, and optionally upload a QR image.
 * Accepts multipart/form-data with text fields `upiId`, `payeeName` and
 * an optional `file` field for the QR image.
 */
exports.upsertPaymentSettings = async (req, res) => {
  try {
    const { upiId, payeeName } = req.body;

    if (!upiId || !String(upiId).trim()) {
      return res.status(400).json({ error: 'UPI ID is required' });
    }

    const update = {
      upiId: String(upiId).trim(),
      payeeName: String(payeeName || '').trim()
    };

    // Handle QR image upload
    if (req.file) {
      // Delete old QR image if one exists
      const existing = await NammaSambramaPayment.findOne({ adminId: req.admin.adminId });
      if (existing && existing.qrImageId) {
        try {
          await deleteFromAzure(existing.qrImageId);
        } catch (delErr) {
          console.warn('Failed to delete old QR image:', delErr.message);
        }
      }

      // Optimize the image with sharp before uploading
      const optimized = await sharp(req.file.buffer)
        .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
        .png({ quality: 90 })
        .toBuffer();

      const { url, publicId } = await uploadToAzure(
        optimized,
        req.file.originalname.replace(/\.[^.]+$/, '.png'),
        'image/png',
        AZURE_FOLDER
      );

      update.qrImageUrl = url;
      update.qrImageId = publicId;
    }

    const doc = await NammaSambramaPayment.findOneAndUpdate(
      { adminId: req.admin.adminId },
      { $set: update, $setOnInsert: { adminId: req.admin.adminId } },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({ payment: serialize(doc) });
  } catch (error) {
    console.error('upsertPaymentSettings error:', error);
    res.status(500).json({ error: 'Failed to save payment settings' });
  }
};

/**
 * DELETE /admin/payment/qr
 * Remove the QR image from Azure and clear the image fields.
 */
exports.deletePaymentQr = async (req, res) => {
  try {
    const doc = await NammaSambramaPayment.findOne({ adminId: req.admin.adminId });
    if (!doc) {
      return res.status(404).json({ error: 'No payment settings found' });
    }

    if (doc.qrImageId) {
      try {
        await deleteFromAzure(doc.qrImageId);
      } catch (delErr) {
        console.warn('Failed to delete QR image from Azure:', delErr.message);
      }
    }

    doc.qrImageUrl = '';
    doc.qrImageId = '';
    await doc.save();

    res.status(200).json({ payment: serialize(doc) });
  } catch (error) {
    console.error('deletePaymentQr error:', error);
    res.status(500).json({ error: 'Failed to delete QR image' });
  }
};

/* ------------------------------------------------------------------ */
/* Public endpoint (no auth)                                           */
/* ------------------------------------------------------------------ */

/**
 * GET /public/payment
 * Return UPI ID, QR image URL, and payee name for the public site.
 * Returns the first (most recently updated) payment record.
 */
exports.getPublicPayment = async (req, res) => {
  try {
    const doc = await NammaSambramaPayment.findOne().sort({ updatedAt: -1 });

    if (!doc || (!doc.upiId && !doc.qrImageUrl)) {
      return res.status(200).json({ payment: null });
    }

    res.status(200).json({
      payment: {
        upiId: doc.upiId,
        qrImageUrl: doc.qrImageUrl,
        payeeName: doc.payeeName
      }
    });
  } catch (error) {
    console.error('getPublicPayment error:', error);
    res.status(500).json({ error: 'Failed to load payment info' });
  }
};
