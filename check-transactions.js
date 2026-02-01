// Check all transactions for barathgobi2007@gmail.com
const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/finpal';

async function checkTransactions() {
  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    
    const user = await db.collection('users').findOne({ email: 'barathgobi2007@gmail.com' });
    
    if (!user) {
      console.log('User not found');
      process.exit(1);
    }
    
    console.log(`\n📊 ALL TRANSACTIONS FOR: ${user.email}\n`);
    console.log('='.repeat(70));
    
    const transactions = await db.collection('transactions').find({ 
      userId: user._id 
    }).sort({ date: -1 }).toArray();
    
    console.log(`\nTotal transactions: ${transactions.length}\n`);
    
    if (transactions.length === 0) {
      console.log('❌ NO TRANSACTIONS FOUND\n');
    } else {
      transactions.forEach((t, i) => {
        const date = new Date(t.date);
        console.log(`${i + 1}. ${t.description || 'No description'}`);
        console.log(`   Amount: ₹${t.amount}`);
        console.log(`   Type: ${t.type}`);
        console.log(`   Category: ${t.category || 'N/A'}`);
        console.log(`   Date: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
        console.log(`   Month/Year: ${date.getMonth() + 1}/${date.getFullYear()}`);
        console.log('');
      });
    }
    
    // Check budget
    const budget = await db.collection('budgets').findOne({ userId: user._id, isActive: true });
    console.log('='.repeat(70));
    console.log('\n💰 CURRENT BUDGET:');
    if (budget) {
      console.log(`   Amount: ₹${budget.totalBudget}`);
      console.log(`   Period: ${budget.period}`);
      console.log(`   Active: ${budget.isActive}`);
    } else {
      console.log('   NO ACTIVE BUDGET');
    }
    
    console.log('\n');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

checkTransactions();
