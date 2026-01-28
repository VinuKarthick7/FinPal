/**
 * Manual Achievement Test Script
 * 
 * This script allows you to manually test the achievement system
 * without waiting for the scheduled cron jobs.
 * 
 * Usage:
 * 1. Ensure server is running
 * 2. Make sure you have:
 *    - A user account with a monthly budget set
 *    - Some expenses recorded for the current month
 *    - Expenses should be <= budget to qualify for achievement
 * 3. Send POST request to check endpoint with your auth token
 */

import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Replace with your actual auth token
const AUTH_TOKEN = 'YOUR_AUTH_TOKEN_HERE';

async function testAchievementCheck() {
  try {
    console.log('🔍 Testing achievement check...\n');

    // Check current month's budget performance
    const response = await axios.post(
      `${API_URL}/achievements/check`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Response received:\n');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      if (response.data.data.isSuccess) {
        console.log('\n🎉 Congratulations! You earned an achievement!');
        console.log(`📊 Budget: ₹${response.data.data.achievement.budgetAmount}`);
        console.log(`💰 Spent: ₹${response.data.data.achievement.totalExpenses}`);
        console.log(`💚 Saved: ₹${response.data.data.achievement.metadata.savingsAmount}`);
        console.log(`✨ ${response.data.data.message}`);
      } else {
        console.log('\n❌ Budget exceeded this month');
        console.log(`📊 Budget: ₹${response.data.data.budgetAmount}`);
        console.log(`💰 Spent: ₹${response.data.data.totalExpenses}`);
        console.log(`📈 Utilization: ${response.data.data.budgetUtilization}%`);
      }
    }
  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

async function getAchievements() {
  try {
    console.log('\n📜 Fetching your achievements...\n');

    const response = await axios.get(`${API_URL}/achievements`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ Achievements:\n');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      const achievements = response.data.data.achievements;
      console.log(`\n⭐ Total achievements: ${achievements.length}`);
      achievements.forEach((ach: any) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        console.log(`  • ${months[ach.month - 1]} ${ach.year} - ₹${ach.totalExpenses}/₹${ach.budgetAmount}`);
      });
    }
  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

async function getStats() {
  try {
    console.log('\n📊 Fetching achievement stats...\n');

    const response = await axios.get(`${API_URL}/achievements/stats`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ Stats:\n');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Run tests
async function runTests() {
  console.log('🏆 Achievement System Test\n');
  console.log('================================\n');

  if (AUTH_TOKEN === 'YOUR_AUTH_TOKEN_HERE') {
    console.log('❌ Please set your AUTH_TOKEN in the script first!');
    console.log('   1. Login to FinPal');
    console.log('   2. Open browser DevTools > Application > Local Storage');
    console.log('   3. Copy the "token" value');
    console.log('   4. Replace AUTH_TOKEN in this script\n');
    return;
  }

  await testAchievementCheck();
  await getAchievements();
  await getStats();

  console.log('\n✅ Tests complete!\n');
}

// Execute
runTests();
