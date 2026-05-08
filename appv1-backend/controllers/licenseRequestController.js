const LicenseRequest = require('../models/LicenseRequest');

/**
 * @desc    Submit a new license key request
 * @route   POST /api/license-request
 * @access  Public
 */
exports.submitRequest = async (req, res) => {
  try {
    const {
      fullName,
      workEmail,
      phoneNumber,
      role,
      schoolName,
      cityTown,
      studentCount,
      additionalNotes
    } = req.body;

    // Validate required fields
    if (!fullName || !workEmail || !phoneNumber || !role || !schoolName || !cityTown || !studentCount) {
      return res.status(400).json({
        success: false,
        message: 'All fields except additional notes are required'
      });
    }

    const newRequest = await LicenseRequest.create({
      fullName,
      workEmail,
      phoneNumber,
      role,
      schoolName,
      cityTown,
      studentCount,
      additionalNotes
    });

    res.status(201).json({
      success: true,
      message: 'License request submitted successfully. Our team will contact you within 24 hours.',
      data: newRequest
    });
  } catch (error) {
    console.error('Error submitting license request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit request',
      error: error.message
    });
  }
};

/**
 * @desc    Get all license requests (for Super Admin)
 * @route   GET /api/license-request
 * @access  Private (Super Admin)
 */
exports.getRequests = async (req, res) => {
  try {
    const requests = await LicenseRequest.find().sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    console.error('Error fetching license requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch requests',
      error: error.message
    });
  }
};

/**
 * @desc    Update license request status
 * @route   PATCH /api/license-request/:id
 * @access  Private (Super Admin)
 */
exports.updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, requestReviewed } = req.body;

    const updatedRequest = await LicenseRequest.findByIdAndUpdate(
      id,
      { status, requestReviewed },
      { new: true, runValidators: true }
    );

    if (!updatedRequest) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Request updated successfully',
      data: updatedRequest
    });
  } catch (error) {
    console.error('Error updating license request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update request',
      error: error.message
    });
  }
};
