const mongoose = require('mongoose');

const connectDB = async () => {
  const connUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pro_evaluator';
  try {
    const conn = await mongoose.connect(connUri);
    console.log(`[Database] MongoDB Connected: ${conn.connection.host} / ${conn.connection.name}`);
  } catch (error) {
    console.error(`[Database] MongoDB connection error: ${error.message}`);
    console.error('[Database] Tip: Make sure MONGODB_URI in your .env file is set to your MongoDB Atlas cluster URI.');
  }
};

module.exports = connectDB;
