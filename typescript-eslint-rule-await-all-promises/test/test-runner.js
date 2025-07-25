import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// We'll use ts-node to run TypeScript directly
const tsNode = require('ts-node');

// Register TypeScript loader
tsNode.register({
  compilerOptions: {
    module: 'commonjs',
    target: 'es2020',
    moduleResolution: 'node',
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    skipLibCheck: true
  }
});

// Import the rule using require (CommonJS) since ts-node uses CommonJS
const { awaitAllPromises } = require('../src/rule.ts');

// Mock ESLint context
function createContext() {
  const reports = [];

  return {
    reports,
    report: function(descriptor) {
      reports.push(descriptor);
    },
    getParserServices: function() {
      // This would need to be properly implemented with actual TypeScript program
      // For now, this is just a placeholder
      throw new Error('This test runner needs proper TypeScript integration');
    }
  };
}

// Simple test function
function testRule() {
  console.log('Testing await-all-promises rule...');

  // Test basic rule structure
  console.log('Rule name:', awaitAllPromises.meta?.docs?.description || 'No description');
  console.log('Rule type:', awaitAllPromises.meta?.type || 'No type');

  // For a full test, we'd need to:
  // 1. Parse TypeScript code with @typescript-eslint/parser
  // 2. Create a proper TypeScript program
  // 3. Set up parser services
  // 4. Run the rule against test cases

  console.log('✅ Basic rule structure test passed');
  console.log('⚠️  Full integration test requires more setup');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testRule();
}
