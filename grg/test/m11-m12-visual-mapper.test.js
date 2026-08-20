const test = require('node:test');
const assert = require('node:assert');
const { VisualCodeBidirectionalMapper } = require('../src/visual-ide/visual-code-mapper');

test('M11/M12: VisualCodeBidirectionalMapper — Visual to Code Resolution & Mutation', () => {
  const mapper = new VisualCodeBidirectionalMapper();

  // Register CheckoutButton component
  mapper.registerComponent('CheckoutButton', {
    file: 'src/components/CheckoutButton.tsx',
    startLine: 12,
    endLine: 45,
    elementSelectors: ['button#checkout', '.checkout-btn-primary']
  });

  // 1. Visual -> Code Resolution
  const resolved = mapper.resolveSourceLocation('button#checkout');
  assert.strictEqual(resolved.componentName, 'CheckoutButton');
  assert.strictEqual(resolved.file, 'src/components/CheckoutButton.tsx');
  assert.strictEqual(resolved.startLine, 12);

  // 2. Visual Mutation: Modify inline style
  const initialSource = `
    export const CheckoutButton = () => {
      return <button style={{ width: '300px', marginLeft: '20px' }}>Pagar</button>;
    };
  `;

  const mutationResult = mapper.applyVisualMutation({
    sourceCode: initialSource,
    componentName: 'CheckoutButton',
    targetProperty: 'marginLeft',
    newValue: "'40px'"
  });

  assert.strictEqual(mutationResult.success, true);
  assert.strictEqual(mutationResult.updatedCode.includes("marginLeft: '40px'"), true);

  // 3. Visual Match Score Calculation
  const score = mapper.calculateVisualMatchScore({
    layoutSimilarity: 94,
    colorMatch: 98,
    typographyMatch: 92,
    spacingMatch: 95
  });

  assert.strictEqual(score.visualMatchScore >= 90.0, true);
  assert.strictEqual(score.passed, true);
});
