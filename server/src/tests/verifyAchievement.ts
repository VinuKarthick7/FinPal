import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from '../config/database';
import Achievement from '../models/Achievement';

async function verifyAchievement() {
  try {
    console.log('🔍 Connecting to database...');
    await connectDB();
    
    const achievement = await Achievement.findOne({
      email: 'gsribarath@gmail.com',
      month: 2,
      year: 2026
    });
    
    if (achievement) {
      console.log('\n✅ ACHIEVEMENT FOUND!\n');
      console.log('Details:');
      console.log(`Email: ${achievement.email}`);
      console.log(`Month/Year: ${achievement.month}/${achievement.year}`);
      console.log(`Budget: ₹${achievement.budgetAmount}`);
      console.log(`Spent: ₹${achievement.totalExpenses}`);
      console.log(`Savings: ₹${achievement.budgetAmount - achievement.totalExpenses}`);
      console.log(`Status: ${achievement.status}`);
      console.log(`Earned At: ${achievement.earnedAt}`);
      console.log(`Message: ${achievement.metadata?.message}`);
      console.log(`\n🎉 Achievement successfully saved in database!\n`);
    } else {
      console.log('\n❌ NO ACHIEVEMENT FOUND!\n');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyAchievement();
