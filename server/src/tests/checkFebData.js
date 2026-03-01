const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/finpal').then(async () => {
  const userId = new mongoose.Types.ObjectId('69745a7b249a568708ef9cf7');
  const start = new Date(2026, 1, 1); // Feb 1
  const end = new Date(2026, 2, 0, 23, 59, 59); // Feb 28

  // Count ALL transactions with 'user' field
  const allTxUser = await mongoose.connection.db.collection('transactions').find({
    user: userId, date: { $gte: start, $lte: end }
  }).toArray();
  console.log('Transactions with user field:', allTxUser.length);

  const expenses1 = allTxUser.filter(t => t.type === 'expense');
  const income1 = allTxUser.filter(t => t.type === 'income');
  console.log('  Expenses:', expenses1.length, '| Total:', expenses1.reduce((s,t) => s + t.amount, 0).toFixed(2));
  console.log('  Income:', income1.length, '| Total:', income1.reduce((s,t) => s + t.amount, 0).toFixed(2));

  // Count ALL transactions with 'userId' field  
  const allTxUserId = await mongoose.connection.db.collection('transactions').find({
    userId: userId, date: { $gte: start, $lte: end }
  }).toArray();
  console.log('\nTransactions with userId field:', allTxUserId.length);

  // Count ALL Feb transactions regardless of user field
  const allTxNoFilter = await mongoose.connection.db.collection('transactions').find({
    date: { $gte: start, $lte: end }
  }).toArray();
  console.log('\nALL Feb transactions (no user filter):', allTxNoFilter.length);

  // Show all transactions sorted by date
  console.log('\n=== ALL FEB TRANSACTIONS (user field) ===');
  allTxUser.sort((a,b) => new Date(a.date) - new Date(b.date));
  allTxUser.forEach((t, i) => {
    console.log(`${i+1}. ${t.type} | ${t.description || t.title || 'N/A'} | Rs.${t.amount} | ${new Date(t.date).toLocaleDateString()} | ${t.category || 'N/A'}`);
  });

  // Check if there are transactions with string userId instead of ObjectId
  const stringUserTx = await mongoose.connection.db.collection('transactions').find({
    user: '69745a7b249a568708ef9cf7', date: { $gte: start, $lte: end }
  }).toArray();
  console.log('\nTransactions with STRING user field:', stringUserTx.length);

  mongoose.disconnect();
});
