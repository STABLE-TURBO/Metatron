// test.js — Test suite for metatron.js parser
// Run with: node test.js

// Mock data for testing parser
const testCases = [
  {
    name: 'Normal case',
    input: `EXPLANATION: This is the explanation.
CODE: const x = 1;
VERIFICATION: Test with assert(x === 1); OWASP A01:2021`,
    expected: {
      explanation: 'This is the explanation.',
      code: 'const x = 1;',
      verification: 'Test with assert(x === 1); OWASP A01:2021'
    }
  },
  {
    name: 'Code with CODE: in comment',
    input: `EXPLANATION: Parsing tricky code.
CODE: // This comment contains "CODE:" to break parsing
const y = 2;
VERIFICATION: CWE-89 reference`,
    expected: {
      explanation: 'Parsing tricky code.',
      code: '// This comment contains "CODE:" to break parsing\nconst y = 2;',
      verification: 'CWE-89 reference'
    }
  },
  {
    name: 'Multiline code',
    input: `EXPLANATION: Multiline example.
CODE: function foo() {
  return 'bar';
}
VERIFICATION: MDN reference`,
    expected: {
      explanation: 'Multiline example.',
      code: 'function foo() {\n  return \'bar\';\n}',
      verification: 'MDN reference'
    }
  },
  {
    name: 'Weak verification',
    input: `EXPLANATION: Weak verif.
CODE: const z = 3;
VERIFICATION: Just a test`,
    expected: {
      explanation: 'Weak verif.',
      code: 'const z = 3;',
      verification: 'Just a test'
    }
  }
];

function parseResponse(raw) {
  const explMatch = raw.match(/EXPLANATION:\s*([\s\S]*?)\nCODE:/i);
  const codeMatch = raw.match(/CODE:\s*([\s\S]*?)\nVERIFICATION:/i);
  const verifMatch = raw.match(/VERIFICATION:\s*([\s\S]*)$/i);

  if (!explMatch || !codeMatch || !verifMatch) {
    return null; // Failed parse
  }

  return {
    explanation: explMatch[1].trim(),
    code: codeMatch[1].trim(),
    verification: verifMatch[1].trim()
  };
}

console.log('Running parser tests...\n');

let passed = 0;
let total = testCases.length;

testCases.forEach((test, i) => {
  console.log(`Test ${i + 1}: ${test.name}`);
  const result = parseResponse(test.input);
  if (result) {
    const match = result.explanation === test.expected.explanation &&
                  result.code === test.expected.code &&
                  result.verification === test.expected.verification;
    if (match) {
      console.log('  ✅ PASSED');
      passed++;
    } else {
      console.log('  ❌ FAILED');
      console.log('  Expected:', test.expected);
      console.log('  Got:', result);
    }
  } else {
    console.log('  ❌ PARSE FAILED');
  }
  console.log('');
});

console.log(`Results: ${passed}/${total} tests passed`);

if (passed === total) {
  console.log('🎉 All tests passed!');
} else {
  console.log('⚠️ Some tests failed. Check the output above.');
}
