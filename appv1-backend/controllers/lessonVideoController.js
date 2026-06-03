const LessonVideo = require('../models/LessonVideo');

// Store YouTube Video Link
exports.addLessonVideo = async (req, res) => {
  try {
    let { 
      url, title, videoType, classId, className, 
      subjectId, lessonId, teacherId, teacherName, orgId 
    } = req.body;

    // AUTOMATIC FALLBACK: Use token info if frontend sends empty strings
    teacherId = teacherId || (req.user && (req.user.teacherId || req.user.adminId || req.user.studentId || req.user.userId)) || "";
    orgId = orgId || (req.user && req.user.orgId) || "";
    teacherName = teacherName || "Admin/Support"; // Fallback for teacherName

    // Check if the user role is student, they shouldn't be able to add a video
    if (req.user && req.user.role === 'student') {
      return res.status(403).json({ error: 'Students are not allowed to add videos' });
    }

    if (!url || !classId || !teacherId || !orgId) {
      return res.status(400).json({ error: 'url, classId, teacherId, and orgId are required' });
    }

    const type = videoType || 'lesson';

    if (type === 'lesson') {
      if (!subjectId || !lessonId) {
        return res.status(400).json({ error: 'subjectId and lessonId are required for lesson videos' });
      }
    }

    const newVideo = new LessonVideo({
      url,
      title,
      videoType: type,
      classId,
      className,
      subjectId,
      lessonId,
      teacherId,
      teacherName,
      orgId
    });

    await newVideo.save();

    res.status(201).json({ success: true, message: 'Video link saved successfully', video: newVideo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get Videos (can be filtered by org, classId, subjectId, lessonId, videoType)
exports.getLessonVideos = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { classId, subjectId, lessonId, videoType } = req.query;

    const filter = { orgId };
    if (classId) filter.classId = classId;
    if (subjectId) filter.subjectId = subjectId;
    if (lessonId) filter.lessonId = lessonId;
    if (videoType) filter.videoType = videoType;

    const videos = await LessonVideo.find(filter).sort({ createdAt: -1 });

    res.json({ success: true, count: videos.length, videos });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a Video
exports.deleteLessonVideo = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user && req.user.role === 'student') {
      return res.status(403).json({ error: 'Students are not allowed to delete videos' });
    }

    const video = await LessonVideo.findById(id);
    if (!video) return res.status(404).json({ error: 'Video not found' });

    await LessonVideo.findByIdAndDelete(id);

    res.json({ success: true, message: 'Video deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
