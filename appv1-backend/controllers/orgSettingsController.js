const Organization = require('../models/Organization');
const { encrypt, decrypt } = require('../utils/cryptoUtil');

/**
 * Get Payment Settings (UPI IDs and Custom Fees)
 * Method: GET
 * Route: /api/org/settings/payment
 */
exports.getPaymentSettings = async (req, res) => {
    try {
        const orgId = req.user.orgId;
        const org = await Organization.findOne({ orgId });

        if (!org) {
            return res.status(404).json({ success: false, message: 'Organization not found' });
        }

        // Decrypt UPI IDs before sending to client
        const decryptedUpiIds = org.upiIds.map(item => ({
            _id: item._id,
            title: item.title,
            bankingName: item.bankingName,
            upiId: decrypt(item.upiId)
        }));

        res.status(200).json({
            success: true,
            data: {
                upiIds: decryptedUpiIds,
                customFees: org.customFees
            }
        });
    } catch (error) {
        console.error('Error fetching payment settings:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

/**
 * Update Payment Settings (UPI IDs and Custom Fees)
 * Method: PUT
 * Route: /api/org/settings/payment
 * Body: { upiIds: [{title, upiId}], customFees: [{title, amount}] }
 */
exports.updatePaymentSettings = async (req, res) => {
    try {
        const orgId = req.user.orgId;
        const { upiIds, customFees } = req.body;

        const updateData = {};

        // Process and encrypt UPI IDs
        if (Array.isArray(upiIds)) {
            updateData.upiIds = upiIds.map(item => {
                if (!item.title || !item.upiId || !item.bankingName) {
                    throw new Error('Title, Banking Name, and UPI ID are required for each entry');
                }
                return {
                    title: item.title,
                    bankingName: item.bankingName,
                    upiId: encrypt(item.upiId) // Encrypt before storing
                };
            });
        }

        // Process Custom Fees
        if (Array.isArray(customFees)) {
            updateData.customFees = customFees.map(item => {
                if (!item.title || item.amount === undefined) {
                    throw new Error('Title and amount are required for each custom fee');
                }
                return {
                    title: item.title,
                    amount: Number(item.amount)
                };
            });
        }

        const org = await Organization.findOneAndUpdate(
            { orgId },
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!org) {
            return res.status(404).json({ success: false, message: 'Organization not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Payment settings updated successfully'
        });
    } catch (error) {
        console.error('Error updating payment settings:', error);
        if (error.message.includes('required for each')) {
            return res.status(400).json({ success: false, error: error.message });
        }
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

/**
 * Get General Org Settings
 * Method: GET
 * Route: /api/org/settings
 */
exports.getOrgSettings = async (req, res) => {
    try {
        const orgId = req.user.orgId;
        const OrgSettings = require('../models/OrgSettings');
        
        let settings = await OrgSettings.findOne({ orgId });
        if (!settings) {
            settings = await OrgSettings.create({ orgId });
        }

        res.status(200).json({ success: true, data: settings });
    } catch (error) {
        console.error('Error fetching org settings:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

/**
 * Update General Org Settings
 * Method: PUT
 * Route: /api/org/settings
 */
exports.updateOrgSettings = async (req, res) => {
    try {
        const orgId = req.user.orgId;
        const { tutorCheckInRestrictionTime } = req.body;
        const OrgSettings = require('../models/OrgSettings');

        const updateData = {};
        
        if (tutorCheckInRestrictionTime !== undefined) {
            if (tutorCheckInRestrictionTime && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(tutorCheckInRestrictionTime)) {
                return res.status(400).json({ success: false, message: 'Invalid time format. Use HH:mm in 24-hour format.' });
            }
            updateData.tutorCheckInRestrictionTime = tutorCheckInRestrictionTime;
        }

        const settings = await OrgSettings.findOneAndUpdate(
            { orgId },
            { $set: updateData },
            { new: true, upsert: true }
        );

        res.status(200).json({ success: true, message: 'Organization settings updated successfully', data: settings });
    } catch (error) {
        console.error('Error updating org settings:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
