import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from '../config/database';
import Achievement from '../models/Achievement';
import { User } from '../models/User';
import mongoose from 'mongoose';

async function debugAchievement() {
  try {
    console.log('🔍 Connecting to database...');
    await connectDB();
    
    const email = 'gsribarath@gmail.com';
    
    //Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found!');
      process.exit(1);
    }
    
    console.log('\n📊 USER INFO:');
    console.log(`Email: ${user.email}`);
    console.log(`User ID: ${user._id}`);
    console.log(`User ID type: ${typeof user._id}`);
    console.log(`User ID as string: ${user._id.toString()}`);
    console.log('');
    
    // Find achievement    
    const achievement = await Achievement.findOne({
      month: 2,
      year: 2026
    });
    
    if (!achievement) {
      console.log('❌ No achievement found!');
      process.exit(1);
    }
    
    console.log('🏆 ACHIEVEMENT INFO:');
    console.log(`Achievement ID: ${achievement._id}`);
    console.log(`User ID in achievement: ${achievement.userId}`);
    console.log(`User ID type: ${typeof achievement.userId}`);
    console.log(`Status: ${achievement.status}`);
    console.log(`Visible to User: ${achievement.visibleToUser}`);
    console.log(`Login Count: ${achievement.loginCountAfterAward}`);
    console.log('');
    
    // Test different query methods
    console.log('🔍 TESTING QUERIES:');
    console.log('');
    
    // Query 1: Direct userId match
    const q1 = await Achievement.find({ userId: user._id });
    console.log(`Query 1 (userId:_id): Found ${q1.length} results`);
    
    // Query 2: userId with new ObjectId
    const q2 = await Achievement.find({ userId: new mongoose.Types.ObjectId(user._id.toString()) });
    console.log(`Query 2 (new ObjectId): Found ${q2.length} results`);
    
   // Query 3: Full query with all conditions
    const q3 = await Achievement.find({
      userId: user._id,
      status: 'finalized',
      visibleToUser: false
    });
    console.log(`Query 3 (full conditions with _id): Found ${q3.length} results`);
    
    // Query 4: Full query with ObjectId
    const q4 = await Achievement.find({
      userId: new mongoose.Types.ObjectId(user._id.toString()),
      status: 'finalized',
      visibleToUser: false
    });
    console.log(`Query 4 (full conditions with new ObjectId): Found ${q4.length} results`);
    
    // Show all achievements for this user
    const allAchs = await Achievement.find({ userId: user._id });
    console.log(`\nAll achievements for user: ${allAchs.length}`);
    allAchs.forEach((ach, idx) => {
      console.log(`\n  ${idx + 1}. Month: ${ach.month}/${ach.year}`);
      console.log(`     Status: ${ach.status}`);
      console.log(`     visibleToUser: ${ach.visibleToUser} (${typeof ach.visibleToUser})`);
      console.log(`     loginCountAfterAward: ${ach.loginCountAfterAward}`);
    });
    
    // Query 5: Check what values are actually in the achievement
    console.log('');
    console.log('🔍 ACHIEVEMENT VALUES:');
    console.log(`achievement.userId === user._id: ${achievement.userId.equals(user._id)}`);
    console.log(`achievement.status  === 'finalized': ${achievement.status === 'finalized'}`);
    console.log(`achievement.visibleToUser === false: ${achievement.visibleToUser === false}`);
    console.log(`achievement.visibleToUser type: ${typeof achievement.visibleToUser}`);
    console.log(`achievement.visibleToUser value: ${achievement.visibleToUser}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugAchievement();
