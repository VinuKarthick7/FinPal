import mongoose from 'mongoose';
import config from './index';

let isConnected = false;

export const connectDB = async (): Promise<void> => {
  if (isConnected) {
    console.log('✅ MongoDB already connected');
    return;
  }

  // Set mongoose options
  mongoose.set('strictQuery', true);

  try {
    const conn = await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 10000, // 10 second timeout
      socketTimeoutMS: 45000, // 45 second socket timeout
      maxPoolSize: 10,
      retryWrites: true,
    });
    
    isConnected = true;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    console.error('❌ MongoDB connection error:', error.message);
    console.log('');
    console.log('💡 To fix this, you need MongoDB running. Options:');
    console.log('   1. Install MongoDB locally: https://www.mongodb.com/try/download/community');
    console.log('   2. Use MongoDB Atlas (free): https://www.mongodb.com/cloud/atlas');
    console.log('   3. Update MONGODB_URI in server/.env with your connection string');
    console.log('');
    process.exit(1);
  }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.log('⚠️ MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err);
});

mongoose.connection.on('reconnected', () => {
  isConnected = true;
  console.log('✅ MongoDB reconnected');
});

export default connectDB;
