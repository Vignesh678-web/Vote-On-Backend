const mongoose = require("mongoose");

const connectDB = async() => {

  try {
    await mongoose.connect(process.env.MONGO_URL);
    
    console.log("MongoDB Connected");
    
    // Log db connection as system event (Delayed slightly to ensure models are ready)
    setTimeout(async () => {
      try {
        const { logAction } = require('../Controller/Audit/AuditController');
        await logAction(
          'DATABASE_CONNECTED',
          'SYSTEM',
          'Primary database cluster handshake successful',
          'DB_CLIENT',
          'system'
        );
      } catch (err) {
        // Silently fail as the logger itself needs DB
      }
    }, 1000);
  } catch (error) {
    console.error("MongoDB error",error);
    process.exit(1);
  }
};

module.exports = connectDB;