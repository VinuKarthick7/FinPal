import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from '../config/database';
import Achievement from '../models/Achievement';

async function forceUpdate() {
  try {
    await connectDB();
    
    console.log('Forcing update of all achievements...');
    
    const result = await Achievement.updateMany(
      {}, // All documents
      { 
        $set: { 
          loginCountAfterAward: 0, 
          visibleToUser: false,
          firstLoginAfterAward: null
        } 
      }
    );
    
    console.log(`Modified: ${result.modifiedCount} documents`);
    console.log(`Matched: ${result.matchedCount} documents`);
    
    // Verify
    const count = await Achievement.countDocuments({ visibleToUser: false });
    console.log(`Verification: ${count} achievements now have visibleToUser=false`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

forceUpdate();
