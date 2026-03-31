const admin = require('../config/firebase');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Notification = require('../models/Notification');

const generateNotificationId = () =>
  `NTF_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

// ─────────────────────────────────────────────
// CORE SENDER
// ─────────────────────────────────────────────
const sendToTokens = async (tokens, title, body, data = {}) => {
  if (!tokens || tokens.length === 0) return { successCount: 0, failureCount: 0, failedTokens: [] };

  const result = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    ),
    android: {
      priority: 'high',
      notification: {
        channelId: 'high_importance_channel',
        sound: 'default'
      }
    },
    apns: {
      payload: {
        aps: { sound: 'default', badge: 1 }
      }
    }
  });

  const failedTokens = [];
  result.responses.forEach((resp, index) => {
    if (!resp.success) failedTokens.push(tokens[index]);
  });

  return {
    successCount: result.successCount,
    failureCount: result.failureCount,
    failedTokens
  };
};

// ─────────────────────────────────────────────
// CLEAN UP INVALID TOKENS (FCM rejected)
// ─────────────────────────────────────────────
const cleanInvalidTokens = async (failedTokens) => {
  if (!failedTokens || failedTokens.length === 0) return;
  await Student.updateMany(
    { fcmToken: { $in: failedTokens } },
    { $set: { fcmToken: null } }
  );
  await Teacher.updateMany(
    { fcmToken: { $in: failedTokens } },
    { $set: { fcmToken: null } }
  );
};

// ─────────────────────────────────────────────
// SAFE TOKEN FILTER — strips null/empty/undefined
// ─────────────────────────────────────────────
const filterValidTokens = (tokens) =>
  tokens.filter(t => t && typeof t === 'string' && t.trim() !== '');

// ─────────────────────────────────────────────
// NOTIFY ALL STUDENTS IN A CLASS
// ─────────────────────────────────────────────
const notifyClass = async ({ classId, orgId, title, body, type, sentBy, sentByName, data = {} }) => {
  const students = await Student.find(
    { classId, fcmToken: { $exists: true, $ne: null, $ne: '' } },  // ← guard empty string too
    'fcmToken'
  );

  const tokens = filterValidTokens(students.map(s => s.fcmToken));  // ← double safety filter

  if (tokens.length === 0) {
    // Still save notification record even if no tokens
    let notificationId = generateNotificationId();
    while (await Notification.findOne({ notificationId })) {
      notificationId = generateNotificationId();
    }
    await Notification.create({
      notificationId, title, body, type,
      sentBy, sentByName,
      targetRole: 'student',
      classId, orgId,
      totalSent: 0,
      totalFailed: 0,
      data
    });
    return { successCount: 0, failureCount: 0 };
  }

  const result = await sendToTokens(tokens, title, body, data);
  await cleanInvalidTokens(result.failedTokens);

  let notificationId = generateNotificationId();
  while (await Notification.findOne({ notificationId })) {
    notificationId = generateNotificationId();
  }

  await Notification.create({
    notificationId, title, body, type,
    sentBy, sentByName,
    targetRole: 'student',
    classId, orgId,
    totalSent: result.successCount,
    totalFailed: result.failureCount,
    data
  });

  return result;
};

// ─────────────────────────────────────────────
// NOTIFY SINGLE STUDENT
// ─────────────────────────────────────────────
const notifyStudent = async ({ studentId, orgId, classId, title, body, type, sentBy, sentByName, data = {} }) => {
  const student = await Student.findOne({ studentId }, 'fcmToken');

  // ✅ Guard: skip if no token or empty string
  if (!student || !student.fcmToken || student.fcmToken.trim() === '') {
    return { successCount: 0, failureCount: 0 };
  }

  const result = await sendToTokens([student.fcmToken], title, body, data);
  await cleanInvalidTokens(result.failedTokens);

  let notificationId = generateNotificationId();
  while (await Notification.findOne({ notificationId })) {
    notificationId = generateNotificationId();
  }

  await Notification.create({
    notificationId, title, body, type,
    sentBy, sentByName,
    targetRole: 'student',
    classId, orgId, studentId,
    totalSent: result.successCount,
    totalFailed: result.failureCount,
    data
  });

  return result;
};

// ─────────────────────────────────────────────
// NOTIFY ALL STUDENTS / TEACHERS IN ORG
// ─────────────────────────────────────────────
const notifyOrg = async ({ orgId, targetRole = 'student', title, body, type, sentBy, sentByName, data = {} }) => {
  let tokens = [];

  if (targetRole === 'student' || targetRole === 'all') {
    const students = await Student.find(
      { orgId, fcmToken: { $exists: true, $ne: null } },
      'fcmToken'
    );
    tokens.push(...students.map(s => s.fcmToken));
  }

  if (targetRole === 'teacher' || targetRole === 'all') {
    const teachers = await Teacher.find(
      { orgId, fcmToken: { $exists: true, $ne: null } },
      'fcmToken'
    );
    tokens.push(...teachers.map(t => t.fcmToken));
  }

  tokens = filterValidTokens(tokens);  // ← strip any empty strings

  const result = await sendToTokens(tokens, title, body, data);
  await cleanInvalidTokens(result.failedTokens);

  let notificationId = generateNotificationId();
  while (await Notification.findOne({ notificationId })) {
    notificationId = generateNotificationId();
  }

  await Notification.create({
    notificationId, title, body, type,
    sentBy, sentByName, targetRole,
    orgId,
    totalSent: result.successCount,
    totalFailed: result.failureCount,
    data
  });

  return result;
};

module.exports = { notifyClass, notifyStudent, notifyOrg };