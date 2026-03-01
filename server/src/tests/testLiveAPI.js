/**
 * LIVE API TEST - Check if achievements API returns correct data
 * Run this while the server is running to verify API response
 */

const API_URL = 'http://localhost:5000';
const TEST_EMAIL = 'gsribarath@gmail.com';
const TEST_PASSWORD = 'Qwerty@123';

async function testLiveAPI() {
  try {
    console.log('🧪 LIVE API TEST - Achievements Endpoint\n');
    console.log('='.repeat(60));
    
    // Step 1: Login to get token
    console.log('\n1️⃣ Logging in...');
    const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD })
    });
    
    if (!loginResponse.ok) {
      console.log('❌ Login failed:', loginResponse.status);
      process.exit(1);
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.data.token;
    console.log('✅ Login successful. Token obtained.');
    
    // Step 2: Fetch achievements
    console.log('\n2️⃣ Fetching achievements...');
    const timestamp = Date.now();
    const achievementsResponse = await fetch(`${API_URL}/api/achievements?_t=${timestamp}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    
    if (!achievementsResponse.ok) {
      console.log('❌ Achievements fetch failed:', achievementsResponse.status);
      process.exit(1);
    }
    
    const achievementsData = await achievementsResponse.json();
    
    // Step 3: Display results
    console.log('✅ Achievements fetched successfully\n');
    console.log('='.repeat(60));
    console.log('API RESPONSE:');
    console.log('='.repeat(60));
    
    const achievements = achievementsData.data.achievements;
    console.log(`\n📊 Total achievements returned: ${achievements.length}`);
    console.log(`📧 User email: ${achievementsData.data.userEmail}\n`);
    
    if (achievements.length === 0) {
      console.log('⚠️ No achievements returned from API');
    } else {
      console.log('Achievement details:');
      achievements.forEach((ach, i) => {
        console.log(`\n${i + 1}. ${ach.month}/${ach.year}`);
        console.log(`   Budget: ₹${ach.budgetAmount}`);
        console.log(`   Spent: ₹${ach.totalExpenses}`);
        console.log(`   Status: ${ach.status}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('VERIFICATION:');
    console.log('='.repeat(60));
    
    if (achievements.length === 1 && achievements[0].month === 1 && achievements[0].year === 2026) {
      console.log('\n✅ CORRECT! API returns only January 2026');
      console.log('✅ February 2026 is properly hidden');
      console.log('\n🎯 THE API IS WORKING CORRECTLY');
      console.log('💡 If frontend still shows 2 stars, please:');
      console.log('   1. Hard refresh (Ctrl+Shift+R)');
      console.log('   2. Clear browser cache');
      console.log('   3. Restart the dev server');
    } else {
      console.log('\n❌ INCORRECT! Expected only January 2026');
      console.log(`❌ Got ${achievements.length} achievement(s)`);
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testLiveAPI();
