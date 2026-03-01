import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from '../config/database';
import Achievement from '../models/Achievement';

async function emergencyFix() {
  try {
    await connectDB();
    console.log('✅ Connected\n');

    const email = 'gsribarath@gmail.com';
    
    // Check current state
    const all = await Achievement.find({ email }).sort({ year: 1, month: 1 });
    
    console.log('CURRENT STATE:');
    all.forEach(a => {
      console.log(`${a.month}/${a.year}: visible=${a.visibleToUser}, count=${a.loginCountAfterAward}`);
    });
    
    // Force fix February
    const result = await Achievement.updateOne(
      { email, month: 2, year: 2026 },
      { $set: { visibleToUser: false, loginCountAfterAward: 0 } }
    );
    
    console.log(`\nFixed: ${result.modifiedCount} achievement(s)`);
    
    // Verify
    const after = await Achievement.find({ email }).sort({ year: 1, month: 1 });
    console.log('\nAFTER FIX:');
    after.forEach(a => {
      console.log(`${a.month}/${a.year}: visible=${a.visibleToUser}, count=${a.loginCountAfterAward}`);
    });
    
    const visible = await Achievement.countDocuments({ email, visibleToUser: true });
    console.log(`\n✅ Total visible: ${visible} (should be 1 for January only)`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

emergencyFix();
