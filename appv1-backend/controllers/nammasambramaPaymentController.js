const NammaSambramaPayment = require('../models/NammaSambramaPayment');
const { uploadToAzure, deleteFromAzure, sharp } = require('../config/azureStorage');

const AZURE_FOLDER = 'nammasambrama/payment';

// Payment settings are org-wide: one shared record that every admin edits.
const SINGLETON = { singletonKey: 'default' };

/**
 * Shape a document for the frontend.
 */
function serialize(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  const { _id, __v, singletonKey, updatedByAdminId, ...rest } = obj;
  return { id: String(_id), ...rest };
}

/**
 * Load the one shared payment record.
 *
 * Falls back to the most recently updated legacy document (records written
 * before these settings became org-wide carry an `adminId` and no
 * `singletonKey`) and adopts it as the singleton, so an existing UPI ID and
 * QR image survive the switch instead of silently resetting to blank.
 */
async function findSettings() {
  const doc = await NammaSambramaPayment.findOne(SINGLETON);
  if (doc) return doc;

  // Prefer a legacy record that actually carries settings, so adoption never
  // promotes a blank row over one holding a real UPI ID or QR image.
  const legacy =
    (await NammaSambramaPayment
      .findOne({
        singletonKey: { $exists: false },
        $or: [
          { upiId: { $nin: ['', null] } },
          { qrImageUrl: { $nin: ['', null] } }
        ]
      })
      .sort({ updatedAt: -1 })) ||
    (await NammaSambramaPayment
      .findOne({ singletonKey: { $exists: false } })
      .sort({ updatedAt: -1 }));

  if (!legacy) return null;

  try {
    // Claim it atomically; a concurrent request may be adopting a different
    // legacy row at the same moment and the unique index lets only one win.
    const adopted = await NammaSambramaPayment.findOneAndUpdate(
      { _id: legacy._id, singletonKey: { $exists: false } },
      { $set: SINGLETON },
      { new: true }
    );
    return adopted || (await NammaSambramaPayment.findOne(SINGLETON)) || legacy;
  } catch (err) {
    // Duplicate key (11000): someone else won the race — use their record.
    if (err.code === 11000) {
      return (await NammaSambramaPayment.findOne(SINGLETON)) || legacy;
    }
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/* Admin endpoints (JWT required)                                      */
/* ------------------------------------------------------------------ */

/**
 * GET /admin/payment
 * Return the shared, org-wide payment settings.
 */
exports.getPaymentSettings = async (req, res) => {
  try {
    const doc = await findSettings();
    res.status(200).json({ payment: doc ? serialize(doc) : null });
  } catch (error) {
    console.error('getPaymentSettings error:', error);
    res.status(500).json({ error: 'Failed to load payment settings' });
  }
};

/**
 * PUT /admin/payment
 * Create-or-update the shared UPI ID, payee name, and optionally upload a
 * QR image. Any admin may edit these settings and they all edit the same
 * record. Accepts multipart/form-data with text fields `upiId`, `payeeName`
 * and an optional `file` field for the QR image.
 */
exports.upsertPaymentSettings = async (req, res) => {
  try {
    const { upiId, payeeName } = req.body;

    if (!upiId || !String(upiId).trim()) {
      return res.status(400).json({ error: 'UPI ID is required' });
    }

    const update = {
      upiId: String(upiId).trim(),
      payeeName: String(payeeName || '').trim(),
      updatedByAdminId: req.admin.adminId
    };

    // Handle QR image upload
    if (req.file) {
      // Delete the shared record's old QR image if one exists
      const existing = await findSettings();
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

    // Adopt any legacy per-admin record first so the upsert updates it
    // rather than creating a second, blank singleton alongside it.
    await findSettings();

    let doc;
    try {
      doc = await NammaSambramaPayment.findOneAndUpdate(
        SINGLETON,
        { $set: update, $setOnInsert: SINGLETON },
        { new: true, upsert: true, runValidators: true }
      );
    } catch (err) {
      // Duplicate key (11000): a concurrent request inserted the singleton
      // between our lookup and this upsert. It exists now, so update it.
      if (err.code !== 11000) throw err;
      doc = await NammaSambramaPayment.findOneAndUpdate(
        SINGLETON,
        { $set: update },
        { new: true, runValidators: true }
      );
    }

    res.status(200).json({ payment: serialize(doc) });
  } catch (error) {
    console.error('upsertPaymentSettings error:', error);
    res.status(500).json({ error: 'Failed to save payment settings' });
  }
};

/**
 * DELETE /admin/payment/qr
 * Remove the shared QR image from Azure and clear the image fields.
 */
exports.deletePaymentQr = async (req, res) => {
  try {
    const doc = await findSettings();
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
    doc.updatedByAdminId = req.admin.adminId;
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
 * Reads the same shared record the admin console edits, so what an admin
 * saves is exactly what the public site shows.
 */
exports.getPublicPayment = async (req, res) => {
  try {
    const doc = await findSettings();

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
