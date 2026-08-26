
const assert = require('assert');
const { add, subtract } = require('../src/utils/math');

// Testa Add
assert.strictEqual(add(2, 2), 4, 'add() deve somar 2 + 2 = 4');
// Testa Subtract
assert.strictEqual(subtract(5, 2), 3, 'subtract() deve subtrair 5 - 2 = 3');
console.log('MISSION_SUCCESS: Testes passaram perfeitamente no Motor FÊNIX!');
