const mongoose = require('mongoose');
const nammasambramaConn = require('../config/nammasambrama_db');

const NammaSambramaPaymentSchema = new mongoose.Schema({
  // Payment settings are org-wide, not per-admin: there is exactly one
  // record and every admin reads and writes that same one. `singletonKey`
  // is pinned to 'default' and uniquely indexed so the upsert can never
  // create a second document, even under concurrent writes.
  singletonKey: {
    type: String,
    default: 'default',
    unique: true,
    index: true
  },
  // Audit only — which admin last saved these settings. Not a scoping key.
  updatedByAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NammaSambramaAdmin'
  },
  upiId: {
    type: String,
    trim: true,
    default: ''
  },
  payeeName: {
    type: String,
    trim: true,
    default: ''
  },
  qrImageUrl: {
    type: String,
    default: ''
  },
  qrImageId: {
    type: String,
    default: ''
  }
}, { timestamps: true });

const NammaSambramaPayment = nammasambramaConn.model(
  'NammaSambramaPayment',
  NammaSambramaPaymentSchema,
  'nammasambramapayments'
);

/**
 * One-time migration: these settings used to be scoped per admin via a
 * unique `adminId` index. That field is gone from the schema, so every
 * document now has no `adminId` — and a *unique* index over a missing field
 * treats them all as null and rejects the second one. Drop the stale index
 * so the singleton upsert isn't blocked by the old constraint.
 *
 * Safe to run on every boot: it no-ops once the index is gone.
 */
async function dropLegacyAdminIdIndex() {
  try {
    const indexes = await NammaSambramaPayment.collection.indexes();
    if (indexes.some((ix) => ix.name === 'adminId_1')) {
      await NammaSambramaPayment.collection.dropIndex('adminId_1');
      console.log('✅ Dropped legacy adminId_1 index on nammasambramapayments');
    }
  } catch (err) {
    // NamespaceNotFound (26) just means the collection does not exist yet.
    if (err.code !== 26) {
      console.warn('Could not drop legacy adminId_1 index:', err.message);
    }
  }
}

if (nammasambramaConn.readyState === 1) {
  dropLegacyAdminIdIndex();
} else {
  nammasambramaConn.once('connected', dropLegacyAdminIdIndex);
}

module.exports = NammaSambramaPayment;
