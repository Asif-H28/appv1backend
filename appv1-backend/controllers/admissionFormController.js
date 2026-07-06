const AdmissionForm = require('../models/AdmissionForm');
const Organization = require('../models/Organization');
const Teacher = require('../models/Teacher');
const { encrypt, decrypt } = require('../utils/cryptoUtil');

/**
 * Get Admission Form Template & Payment Settings
 * Fetches the custom form fields AND available payment options (UPI/Fees) for the frontend dropdowns.
 * Method: GET
 * Route: /api/admission-forms/template
 */
exports.getTemplate = async (req, res) => {
    try {
        const orgId = req.user.orgId;
        const org = await Organization.findOne({ orgId });

        if (!org) {
            return res.status(404).json({ success: false, message: 'Organization not found' });
        }

        // Decrypt UPI IDs
        const decryptedUpiIds = org.upiIds.map(item => ({
            _id: item._id,
            title: item.title,
            bankingName: item.bankingName,
            upiId: decrypt(item.upiId)
        }));

        // Fetch teachers
        const teachers = await Teacher.find({ orgId }).select('teacherId name');

        res.status(200).json({
            success: true,
            data: {
                admissionFormTemplate: org.admissionFormTemplate || [],
                upiIds: decryptedUpiIds,
                customFees: org.customFees || [],
                teachers: teachers
            }
        });
    } catch (error) {
        console.error('Error fetching admission form template:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

/**
 * Update Admission Form Template
 * Method: PUT
 * Route: /api/admission-forms/template
 */
exports.updateTemplate = async (req, res) => {
    try {
        const orgId = req.user.orgId;
        const { admissionFormTemplate } = req.body;

        if (!Array.isArray(admissionFormTemplate)) {
            return res.status(400).json({ success: false, message: 'admissionFormTemplate must be an array' });
        }

        const org = await Organization.findOneAndUpdate(
            { orgId },
            { $set: { admissionFormTemplate } },
            { new: true, runValidators: true }
        );

        if (!org) {
            return res.status(404).json({ success: false, message: 'Organization not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Template updated successfully',
            data: org.admissionFormTemplate
        });
    } catch (error) {
        console.error('Error updating template:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

/**
 * Create a new Admission Form Submission
 * Method: POST
 * Route: /api/admission-forms
 */
exports.createSubmission = async (req, res) => {
    try {
        const orgId = req.user.orgId;
        const formData = req.body;

        // Encrypt the upiId before saving
        if (formData.upiId) {
            formData.upiId = encrypt(formData.upiId);
        }

        const newForm = new AdmissionForm({
            ...formData,
            orgId,
            filledByUserId: req.user.adminId || req.user.userId || 'unknown',
            filledByRole: req.user.role || 'Admin'
        });

        await newForm.save();

        res.status(201).json({
            success: true,
            message: 'Admission form created successfully',
            data: newForm
        });
    } catch (error) {
        console.error('Error creating admission form:', error);
        res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
    }
};

/**
 * Get all Admission Form Submissions (Paginated & Searchable)
 * Method: GET
 * Route: /api/admission-forms?page=1&limit=10&search=john
 */
exports.getSubmissions = async (req, res) => {
    try {
        const orgId = req.user.orgId;
        
        // Pagination setup
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;

        // Search setup
        const search = req.query.search;
        let query = { orgId };

        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { phoneNumber: { $regex: search, $options: 'i' } }
            ];
        }

        const forms = await AdmissionForm.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await AdmissionForm.countDocuments(query);

        // Decrypt UPI IDs
        const decryptedForms = forms.map(form => {
            const formObj = form.toObject();
            if (formObj.upiId) {
                formObj.upiId = decrypt(formObj.upiId);
            }
            return formObj;
        });

        res.status(200).json({
            success: true,
            data: decryptedForms,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching admission forms:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

/**
 * Update an existing Admission Form Submission
 * Method: PUT
 * Route: /api/admission-forms/:id
 */
exports.updateSubmission = async (req, res) => {
    try {
        const orgId = req.user.orgId;
        const { id } = req.params;
        const updateData = req.body;

        // Ensure orgId isn't overwritten
        delete updateData.orgId;

        // Encrypt the upiId if it's being updated
        if (updateData.upiId) {
            updateData.upiId = encrypt(updateData.upiId);
        }

        const updatedForm = await AdmissionForm.findOneAndUpdate(
            { _id: id, orgId },
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedForm) {
            return res.status(404).json({ success: false, message: 'Admission form not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Admission form updated successfully'
        });
    } catch (error) {
        console.error('Error updating admission form:', error);
        res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
    }
};

/**
 * Delete an Admission Form Submission
 * Method: DELETE
 * Route: /api/admission-forms/:id
 */
exports.deleteSubmission = async (req, res) => {
    try {
        const orgId = req.user.orgId;
        const { id } = req.params;

        const deletedForm = await AdmissionForm.findOneAndDelete({ _id: id, orgId });

        if (!deletedForm) {
            return res.status(404).json({ success: false, message: 'Admission form not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Admission form deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting admission form:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

/**
 * Get Admission Form Status for Student Portal
 * Method: POST
 * Route: /api/admission-forms/status
 */
exports.getStudentAdmissionStatus = async (req, res) => {
    try {
        const { email, phoneNumber } = req.body;

        if (!email && !phoneNumber) {
            return res.status(400).json({
                success: false,
                message: 'Please provide either an email or a phone number'
            });
        }

        let admissionData = null;

        // 1. First check the email
        if (email) {
            admissionData = await AdmissionForm.findOne({
                email: { $regex: new RegExp(`^${email}$`, 'i') }
            });

            // If found by email, format and return immediately
            if (admissionData) {
                const responseData = admissionData.toObject();
                if (responseData.upiId) {
                    responseData.upiId = decrypt(responseData.upiId);
                }
                return res.status(200).json({ success: true, data: responseData });
            }
        }

        // 2. If not found by email (or email wasn't provided), check the phone number
        if (phoneNumber) {
            admissionData = await AdmissionForm.findOne({
                phoneNumber: phoneNumber
            });

            // If found by phone number, format and return immediately
            if (admissionData) {
                const responseData = admissionData.toObject();
                if (responseData.upiId) {
                    responseData.upiId = decrypt(responseData.upiId);
                }
                return res.status(200).json({ success: true, data: responseData });
            }
        }

        // 3. If neither query returned data
        return res.status(404).json({
            success: false,
            message: 'No admission record found for the provided details'
        });

    } catch (error) {
        console.error('Error fetching student admission status:', error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
