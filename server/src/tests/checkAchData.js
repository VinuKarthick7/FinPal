const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/finpal').then(async () => {
  const ach = await mongoose.connection.db.collection('achievements').findOne({
    email: 'gsribarath@gmail.com', month: 2, year: 2026
  });
  console.log('Feb achievement totalExpenses:', ach.totalExpenses);
  console.log('Feb achievement budgetAmount:', ach.budgetAmount);
  console.log('Feb achievement earnedAt:', ach.earnedAt);

  const txs = await mongoose.connection.db.collection('transactions').find({
    user: new mongoose.Types.ObjectId('69745a7b249a568708ef9cf7'),
    type: 'expense',
    date: { $gte: new Date(2026, 1, 1), $lte: new Date(2026, 2, 0, 23, 59, 59) }
  }).toArray();
  
  console.log('Actual Feb expense total:', txs.reduce((s, t) => s + t.amount, 0).toFixed(2));
  console.log('Actual Feb expense count:', txs.length);
  console.log('Match:', ach.totalExpenses === parseFloat(txs.reduce((s, t) => s + t.amount, 0).toFixed(2)));
  
  mongoose.disconnect();
});
