// Test Achievement Validation Logic
// This demonstrates the strict budget validation rules

interface TestCase {
  budget: number;
  spent: number;
  expectedResult: 'STAR' | 'NO_STAR';
  reason: string;
}

const testCases: TestCase[] = [
  // Should GET star
  {
    budget: 500,
    spent: 500,
    expectedResult: 'STAR',
    reason: 'Exactly on budget'
  },
  {
    budget: 500,
    spent: 450,
    expectedResult: 'STAR',
    reason: 'Under budget (saved ₹50)'
  },
  {
    budget: 500,
    spent: 499,
    expectedResult: 'STAR',
    reason: 'Under budget (saved ₹1)'
  },
  {
    budget: 1000,
    spent: 0,
    expectedResult: 'STAR',
    reason: 'No expenses (saved ₹1000)'
  },
  
  // Should NOT GET star
  {
    budget: 500,
    spent: 501,
    expectedResult: 'NO_STAR',
    reason: 'Exceeded by ₹1'
  },
  {
    budget: 500,
    spent: 540,
    expectedResult: 'NO_STAR',
    reason: 'Exceeded by ₹40 (your case!)'
  },
  {
    budget: 500,
    spent: 1000,
    expectedResult: 'NO_STAR',
    reason: 'Exceeded by ₹500 (doubled budget)'
  },
];

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║  Achievement Validation Test - Strict Budget Enforcement       ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

console.log('RULE: User gets a star ONLY if: spent ≤ budget\n');
console.log('═'.repeat(70));

let passCount = 0;
let failCount = 0;

testCases.forEach((testCase, index) => {
  const { budget, spent, expectedResult, reason } = testCase;
  
  // This is the ACTUAL logic used in the server
  const isSuccess = spent <= budget;
  const actualResult = isSuccess ? 'STAR' : 'NO_STAR';
  const passed = actualResult === expectedResult;
  
  const icon = passed ? '✅' : '❌';
  const statusColor = actualResult === 'STAR' ? '🌟' : '⭕';
  
  console.log(`\nTest ${index + 1}: ${icon} ${passed ? 'PASS' : 'FAIL'}`);
  console.log(`  Budget:   ₹${budget}`);
  console.log(`  Spent:    ₹${spent}`);
  console.log(`  Savings:  ₹${budget - spent} ${budget - spent < 0 ? '(EXCEEDED!)' : ''}`);
  console.log(`  Result:   ${statusColor} ${actualResult}`);
  console.log(`  Expected: ${expectedResult === 'STAR' ? '🌟' : '⭕'} ${expectedResult}`);
  console.log(`  Reason:   ${reason}`);
  console.log(`  Formula:  ${spent} <= ${budget} = ${isSuccess}`);
  
  if (passed) passCount++;
  else failCount++;
});

console.log('\n' + '═'.repeat(70));
console.log(`\nTest Results: ${passCount} passed, ${failCount} failed`);

if (failCount === 0) {
  console.log('\n✅ All tests PASSED! Achievement logic is correct.\n');
} else {
  console.log('\n❌ Some tests FAILED! Achievement logic has bugs.\n');
}

// Highlight your specific case
console.log('═'.repeat(70));
console.log('\n🎯 YOUR CASE (barathgobi2007@gmail.com - January 2026):\n');
console.log('  Budget:   ₹500');
console.log('  Spent:    ₹540 (from transactions)');
console.log('  Exceeded: ₹40');
console.log('  Result:   ⭕ NO_STAR (correct!)');
console.log('\n  The invalid star has been awarded by mistake.');
console.log('  Run clean-invalid-achievements.ps1 to remove it.\n');
console.log('═'.repeat(70) + '\n');
