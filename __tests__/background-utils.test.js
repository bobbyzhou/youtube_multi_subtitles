const { isValidApiKey } = require('../background.js');

describe('background utilities', () => {
  test('isValidApiKey validates plausible Google style keys', () => {
    expect(isValidApiKey('')).toBe(false);
    expect(isValidApiKey('short')).toBe(false);
    expect(isValidApiKey('AIzaSyA-1234567890')).toBe(true);
    expect(isValidApiKey('ya29.SomeOAuthTokenLike')).toBe(true);
    expect(isValidApiKey('   AIzaSyA-1234567890   ')).toBe(true);
  });
});

