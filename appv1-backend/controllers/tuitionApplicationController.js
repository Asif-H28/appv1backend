const TuitionApplication = require('../models/TuitionApplication');
const Organization = require('../models/Organization');
const Teacher = require('../models/Teacher');
const { encrypt, decrypt } = require('../utils/cryptoUtil');

/**
 * Create a new Tuition Application (Public for Customer)
 * Method: POST
 * Route: /api/tuition-applications
 */
exports.createApplication = async (req, res) => {
    try {
        const { orgId } = req.body;
        if (!orgId) {
            return res.status(400).json({ success: false, message: 'orgId is required' });
        }

        const newApplication = new TuitionApplication(req.body);
        await newApplication.save();

        res.status(201).json({
            success: true,
            message: 'Tuition application submitted successfully',
            data: newApplication
        });
    } catch (error) {
        console.error('Error creating tuition application:', error);
        res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
    }
};

/**
 * Get all Tuition Applications (Admin)
 * Method: GET
 * Route: /api/tuition-applications?page=1&limit=10&search=john
 */
exports.getApplications = async (req, res) => {
    try {
        const orgId = req.user.orgId;
        
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;
        const search = req.query.search;

        let query = { orgId };
        if (search) {
            query.$or = [
                { studentName: { $regex: search, $options: 'i' } },
                { contactNumber: { $regex: search, $options: 'i' } },
                { parentOrGuardianName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        if (req.query.status === 'pending') {
            query.feeAmount = null;
            query.upiId = null;
            query.tutorId = null;
            query.tutorName = null;
        }

        const applications = await TuitionApplication.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await TuitionApplication.countDocuments(query);

        // Decrypt UPI IDs
        const decryptedApplications = applications.map(app => {
            const appObj = app.toObject();
            if (appObj.upiId) {
                try {
                    appObj.upiId = decrypt(appObj.upiId);
                } catch (e) {
                    console.error('Error decrypting UPI ID', e);
                }
            }
            return appObj;
        });

        // Fetch organization settings for the dropdowns
        const org = await Organization.findOne({ orgId });
        let upiIds = [];
        let customFees = [];
        if (org) {
            upiIds = (org.upiIds || []).map(item => ({
                _id: item._id,
                title: item.title,
                bankingName: item.bankingName,
                upiId: decrypt(item.upiId)
            }));
            customFees = org.customFees || [];
        }

        // Fetch teachers for the dropdown
        const teachers = await Teacher.find({ orgId }).select('teacherId name');

        res.status(200).json({
            success: true,
            data: decryptedApplications,
            settings: {
                upiIds,
                customFees,
                teachers
            },
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching tuition applications:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

/**
 * Review/Update a Tuition Application (Admin adds Fee, UPI, Tutor)
 * Method: PUT
 * Route: /api/tuition-applications/:id/review
 */
exports.reviewApplication = async (req, res) => {
    try {
        const orgId = req.user.orgId;
        const { id } = req.params;
        const { feeAmount, upiId, tutorId, tutorName } = req.body;

        const updateData = {};
        if (feeAmount !== undefined) updateData.feeAmount = feeAmount;
        if (upiId) updateData.upiId = encrypt(upiId);
        if (tutorId) updateData.tutorId = tutorId;
        if (tutorName) updateData.tutorName = tutorName;

        const updatedApplication = await TuitionApplication.findOneAndUpdate(
            { _id: id, orgId },
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedApplication) {
            return res.status(404).json({ success: false, message: 'Tuition application not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Tuition application reviewed and updated successfully',
            data: updatedApplication
        });
    } catch (error) {
        console.error('Error updating tuition application:', error);
        res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
    }
};

/**
 * Get Student's Tuition Application (Public for Customer)
 * Method: POST
 * Route: /api/tuition-applications/status
 */
exports.getStudentApplication = async (req, res) => {
    try {
        const { contactNumber, applicationId, orgId } = req.body;

        if (!contactNumber && !applicationId) {
            return res.status(400).json({
                success: false,
                message: 'Please provide either a contact number or an application ID'
            });
        }

        let query = {};
        if (orgId) {
            query.orgId = orgId;
        }

        if (applicationId) {
            query._id = applicationId;
        } else if (contactNumber) {
            query.contactNumber = contactNumber;
        }

        // Get the latest application if searching by contact number
        const application = await TuitionApplication.findOne(query).sort({ createdAt: -1 });

        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'No tuition application found for the provided details'
            });
        }

        const responseData = application.toObject();
        if (responseData.upiId) {
            try {
                responseData.upiId = decrypt(responseData.upiId);
            } catch (e) {
                console.error('Error decrypting UPI ID', e);
            }
        }

        res.status(200).json({
            success: true,
            data: responseData
        });
    } catch (error) {
        console.error('Error fetching student tuition application:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

/**
 * Delete a Tuition Application (Admin)
 * Method: DELETE
 * Route: /api/tuition-applications/:id
 */
exports.deleteApplication = async (req, res) => {
    try {
        const orgId = req.user.orgId;
        const { id } = req.params;

        const deletedApplication = await TuitionApplication.findOneAndDelete({ _id: id, orgId });

        if (!deletedApplication) {
            return res.status(404).json({ success: false, message: 'Tuition application not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Tuition application deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting tuition application:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

/**
 * Update Dropdown Settings (Admin)
 * Updates UPI IDs and Custom Fees for the organization.
 * Method: PUT
 * Route: /api/tuition-applications/settings
 */
exports.updateSettings = async (req, res) => {
    try {
        const orgId = req.user.orgId;
        const { upiIds, customFees } = req.body;

        const updateData = {};

        if (upiIds && Array.isArray(upiIds)) {
            // Encrypt all new upiIds
            updateData.upiIds = upiIds.map(item => ({
                ...item,
                upiId: encrypt(item.upiId)
            }));
        }

        if (customFees && Array.isArray(customFees)) {
            updateData.customFees = customFees;
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ success: false, message: 'No valid data to update' });
        }

        const org = await Organization.findOneAndUpdate(
            { orgId },
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!org) {
            return res.status(404).json({ success: false, message: 'Organization not found' });
        }

        // Return the updated, decrypted list
        const updatedUpiIds = (org.upiIds || []).map(item => ({
            _id: item._id,
            title: item.title,
            bankingName: item.bankingName,
            upiId: decrypt(item.upiId)
        }));

        res.status(200).json({
            success: true,
            message: 'Settings updated successfully',
            data: {
                upiIds: updatedUpiIds,
                customFees: org.customFees || []
            }
        });
    } catch (error) {
        console.error('Error updating tuition settings:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
