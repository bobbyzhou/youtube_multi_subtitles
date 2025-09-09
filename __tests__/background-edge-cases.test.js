const { isValidApiKey, translateWithFreeAPI } = require('../background.js');

describe('background edge cases', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('isValidApiKey handles edge cases', () => {
    expect(isValidApiKey(null)).toBe(false);
    expect(isValidApiKey(undefined)).toBe(false);
    expect(isValidApiKey(123)).toBe(false);
    expect(isValidApiKey('')).toBe(false);
    expect(isValidApiKey('   ')).toBe(false);
    expect(isValidApiKey('AIza')).toBe(false); // too short
    expect(isValidApiKey('AIzaSyA-1234567890')).toBe(true);
    expect(isValidApiKey('ya29.1234567890123')).toBe(true);
  });

  test('translateWithFreeAPI handles network errors', async () => {
    global.fetch.mockRejectedValue(new Error('Network error'));

    await expect(translateWithFreeAPI('Hello', 'en', 'zh-CN')).rejects.toThrow('Network error');
  });

  test('translateWithFreeAPI handles empty response', async () => {
    const mockJson = jest.fn().mockResolvedValue([]);
    global.fetch.mockResolvedValue({ ok: true, status: 200, statusText: 'OK', json: mockJson });

    await expect(translateWithFreeAPI('Hello', 'en', 'zh-CN')).rejects.toThrow('Invalid free API response format');
  });

  test('translateWithFreeAPI handles malformed response', async () => {
    const mockJson = jest.fn().mockResolvedValue({ invalid: 'format' });
    global.fetch.mockResolvedValue({ ok: true, status: 200, statusText: 'OK', json: mockJson });

    await expect(translateWithFreeAPI('Hello', 'en', 'zh-CN')).rejects.toThrow('Invalid free API response format');
  });
});
