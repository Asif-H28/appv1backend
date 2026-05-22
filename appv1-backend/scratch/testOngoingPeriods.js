require('dotenv').config();
const mongoose = require('mongoose');
const Classroom = require('../models/Classroom');
const Timetable = require('../models/Timetable');
const timetableController = require('../controllers/timetableController');

async function run() {
  const mongoUri = process.env.MONGODB_URI || "mongodb+srv://asif28072001_db_user:cewre0Cd4f9Onen6@cluster0.ozp2zdr.mongodb.net/appv1db?retryWrites=true&w=majority";
  console.log('🔍 MongoDB URI:', mongoUri.substring(0, 30) + '...');
  
  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('✅ Connected.');
  console.log('🔌 mongoose.connection.readyState:', mongoose.connection.readyState);
  console.log('🔌 Classroom model db readyState:', Classroom.db.readyState);

  const orgId = 'TEST_ORG_ONGOING_PERIODS';

  // Cleanup any old test data
  console.log('🧹 Preparing clean test state...');
  await Classroom.deleteMany({ orgId });
  await Timetable.deleteMany({ orgId });

  console.log('📝 Creating mock classrooms and timetables...');

  // Active classroom with timetable
  const activeClassWithTimetable = await Classroom.create({
    classId: 'TEST_CLASS_ACTIVE_WITH_TT',
    teacherId: 'TEST_TEACHER_1',
    orgId,
    className: 'Class 10-A',
    studentIds: [],
    isActive: true,
    academicYear: '2025-26'
  });

  // Active classroom without timetable
  const activeClassNoTimetable = await Classroom.create({
    classId: 'TEST_CLASS_ACTIVE_NO_TT',
    teacherId: 'TEST_TEACHER_2',
    orgId,
    className: 'Class 10-B',
    studentIds: [],
    isActive: true,
    academicYear: '2025-26'
  });

  // Inactive classroom
  const inactiveClass = await Classroom.create({
    classId: 'TEST_CLASS_INACTIVE',
    teacherId: 'TEST_TEACHER_3',
    orgId,
    className: 'Class 10-C',
    studentIds: [],
    isActive: false,
    academicYear: '2025-26'
  });

  // Create Timetable for Class 10-A
  const timetable = await Timetable.create({
    timetableId: 'TTB_TEST_ONGOING',
    classId: 'TEST_CLASS_ACTIVE_WITH_TT',
    orgId,
    className: 'Class 10-A',
    createdBy: 'TEST_TEACHER_1',
    createdByName: 'Teacher One',
    academicYear: '2025-26',
    slots: [
      {
        day: 'Monday',
        periodNumber: 1,
        startTime: '08:00',
        endTime: '09:00',
        subjectName: 'Mathematics',
        teacherName: 'Teacher One',
        teacherId: 'TEST_TEACHER_1',
        type: 'class'
      },
      {
        day: 'Monday',
        periodNumber: 2,
        startTime: '09:00',
        endTime: '10:00',
        subjectName: 'Science',
        teacherName: 'Teacher Two',
        teacherId: 'TEST_TEACHER_2',
        type: 'class'
      },
      {
        day: 'Monday',
        periodNumber: 3,
        startTime: '10:00',
        endTime: '10:30',
        subjectName: null,
        teacherName: null,
        teacherId: null,
        type: 'break'
      }
    ]
  });

  console.log('✅ Mock data created.');

  // Mock Request & Response Helper
  const mockRes = () => {
    const res = {};
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (data) => {
      res.jsonData = data;
      return res;
    };
    return res;
  };

  // Test Case 1: Custom day & time during Period 1
  console.log('\n--- Test Scenario 1: Monday at 08:30 (During Period 1) ---');
  let req = {
    params: { orgId },
    query: { day: 'Monday', time: '08:30' }
  };
  let res = mockRes();
  await timetableController.getOngoingPeriodsByOrg(req, res);
  console.log('Day:', res.jsonData.day);
  console.log('Time:', res.jsonData.time);
  console.log('Classrooms:', JSON.stringify(res.jsonData.classrooms, null, 2));

  // Test Case 2: Custom day & time during break
  console.log('\n--- Test Scenario 2: Monday at 10:15 (During Break) ---');
  req = {
    params: { orgId },
    query: { day: 'Monday', time: '10:15' }
  };
  res = mockRes();
  await timetableController.getOngoingPeriodsByOrg(req, res);
  console.log('Classrooms:', JSON.stringify(res.jsonData.classrooms, null, 2));

  // Test Case 3: Custom day & time with no ongoing period (outside hours)
  console.log('\n--- Test Scenario 3: Monday at 12:00 (No ongoing period) ---');
  req = {
    params: { orgId },
    query: { day: 'Monday', time: '12:00' }
  };
  res = mockRes();
  await timetableController.getOngoingPeriodsByOrg(req, res);
  console.log('Classrooms:', JSON.stringify(res.jsonData.classrooms, null, 2));

  // Test Case 4: Default day & time (calculating current IST time)
  console.log('\n--- Test Scenario 4: Current Real-Time (IST) ---');
  req = {
    params: { orgId },
    query: {}
  };
  res = mockRes();
  await timetableController.getOngoingPeriodsByOrg(req, res);
  console.log('Resolved Day in IST:', res.jsonData.day);
  console.log('Resolved Time in IST:', res.jsonData.time);
  console.log('Classrooms:', JSON.stringify(res.jsonData.classrooms, null, 2));

  // Cleanup
  console.log('\n🧹 Cleaning up test database records...');
  await Classroom.deleteMany({ orgId });
  await Timetable.deleteMany({ orgId });
  console.log('✅ Cleanup complete.');

  await mongoose.disconnect();
  console.log('👋 Disconnected.');
}

run().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
