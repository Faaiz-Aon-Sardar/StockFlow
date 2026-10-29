import { execSync } from 'node:child_process';

const testFiles = [
  'src/tests/acceptance.test.ts',
  'src/tests/transactional_workflows.test.ts',
  'src/tests/reports_and_import.test.ts',
];

console.log('=== StockFlow Automated Test Suite Execution ===\n');

let allPassed = true;

for (const file of testFiles) {
  console.log(`\n--- Running ${file} ---`);
  try {
    execSync(`node --experimental-strip-types "${file}"`, {
      stdio: 'inherit',
    });
  } catch (err) {
    allPassed = false;
    console.error(`FAILED: ${file}`);
  }
}

if (!allPassed) {
  process.exit(1);
} else {
  console.log('\n===============================================');
  console.log('  ALL STOCKFLOW TESTS PASSED SUCCESSFULLY! (100%)');
  console.log('===============================================\n');
}
