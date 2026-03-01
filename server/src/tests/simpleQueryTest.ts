import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from '../config/database';
import Achievement from '../models/Achievement';
import { User } from '../models/User';
import mongoose from 'mongoose';

async function simpleQueryTest() {
  try {
    console.log('🔍 Connecting to database...');
    await connectDB();
    
    const email = 'gsribarath@gmail.com';
    
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found!');
      process.exit(1);
    }
    
    console.log(`Testing queries for user: ${user._id}\n`);
    
    // Try simplest query first
    console.log('1. Find by visibleToUser only:');
    const r1 = await Achievement.find({ visibleToUser: false });
    console.log(`   Found: ${r1.length} (across all users)`);
    
    console.log('\n2. Find by userId and visibleToUser:');
    const r2 = await Achievement.find({ 
      userId: user._id,
      visibleToUser: false 
    });
    console.log(`   Found: ${r2.length}`);
    r2.forEach(ach => {
      console.log(`   - ${ach.month}/${ach.year} - status: ${ach.status}`);
    });
    
    console.log('\n3. Find by userId and status:');
    const r3 = await Achievement.find({ 
      userId: user._id,
      status: 'finalized'
    });
    console.log(`   Found: ${r3.length}`);
    r3.forEach(ach => {
      console.log(`   - ${ach.month}/${ach.year} - visible: ${ach.visibleToUser}`);
    });
    
    console.log('\n4. Find by userId, status AND visibleToUser (the failing query):');
    const r4 = await Achievement.find({ 
      userId: user._id,
      status: 'finalized',
      visibleToUser: false
    });
    console.log(`   Found: ${r4.length}`);
    
    console.log('\n5. Try status $in:');
    const r5 = await Achievement.find({
      userId: user._id,
      status: { $in: ['finalized'] },
      visibleToUser: false
    });
    console.log(`   Found: ${r5.length}`);
    
    console.log('\n6. Try explicit false check:');
    const r6 = await Achievement.find({
      userId: user._id,
      status: 'finalized',
      visibleToUser: { $eq: false }
    });
    console.log(`   Found: ${r6.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

simpleQueryTest();
