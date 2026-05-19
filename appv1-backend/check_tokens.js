const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const mongoUri = process.env.MONGODB_URI || "mongodb+srv://asif28072001_db_user:cewre0Cd4f9Onen6@cluster0.ozp2zdr.mongodb.net/appv1db?retryWrites=true&w=majority";

mongoose.connect(mongoUri)
  .then(async () => {
    console.log("Connected to MongoDB");
    const db = mongoose.connection.db;
    
    console.log("\n=== RECENT NOTIFICATION RECORDS ===");
    const notifications = await db.collection('notifications')
      .find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();
    
    if (notifications.length === 0) {
      console.log("No notifications found in database.");
    } else {
      notifications.forEach(n => {
        console.log(`- [${n.createdAt}] ID: ${n.notificationId} | Title: "${n.title}" | Role: ${n.targetRole} | Sent: ${n.totalSent} | Failed: ${n.totalFailed}`);
      });
    }

    process.exit(0);
  })
  .catch(err => {
    console.error("Error connecting:", err);
    process.exit(1);
  });
