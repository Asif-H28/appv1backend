const TeacherReview = require('../models/TeacherReview');

// Create a review
exports.createReview = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const studentId = req.user.studentId || req.user.id || req.body.studentId;
    const { teacherId, studentName, title, description, rating, supportImage } = req.body;

    if (!teacherId || !studentName || !title || !description || !rating) {
      return res.status(400).json({ success: false, message: 'teacherId, studentName, title, description, and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    const newReview = new TeacherReview({
      orgId,
      teacherId,
      studentId,
      studentName,
      title,
      description,
      rating,
      supportImage: supportImage || null
    });

    await newReview.save();
    res.status(201).json({ success: true, data: newReview });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get reviews by teacher
exports.getTeacherReviews = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { teacherId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const query = { orgId, teacherId };
    const skip = (page - 1) * limit;

    const total = await TeacherReview.countDocuments(query);
    const reviews = await TeacherReview.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      data: reviews
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get reviews by student
exports.getStudentReviews = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { studentId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const query = { orgId, studentId };
    const skip = (page - 1) * limit;

    const total = await TeacherReview.countDocuments(query);
    const reviews = await TeacherReview.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      data: reviews
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update review
exports.updateReview = async (req, res) => {
  try {
    const { title, description, rating, supportImage } = req.body;
    let review = await TeacherReview.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    if (review.orgId !== req.user.orgId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (title) review.title = title;
    if (description) review.description = description;
    if (rating !== undefined) {
      if (rating < 1 || rating > 5) return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
      review.rating = rating;
    }
    if (supportImage !== undefined) review.supportImage = supportImage;

    await review.save();
    res.status(200).json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete review
exports.deleteReview = async (req, res) => {
  try {
    const review = await TeacherReview.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    if (review.orgId !== req.user.orgId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await TeacherReview.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
