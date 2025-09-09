const { translateWithFreeAPI } = require('../background.js');

describe('translateWithFreeAPI', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('parses translation result from free API', async () => {
    const mockJson = jest.fn().mockResolvedValue([[['你好世界']]]);
    global.fetch.mockResolvedValue({ ok: true, status: 200, statusText: 'OK', json: mockJson });

    const result = await translateWithFreeAPI('Hello world', 'en', 'zh-CN');
    expect(result).toBe('你好世界');

    expect(global.fetch).toHaveBeenCalled();
  });

  test('throws on non-OK HTTP status', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 500, statusText: 'Server Error', json: jest.fn() });
    await expect(translateWithFreeAPI('Hello', 'en', 'zh-CN')).rejects.toThrow('HTTP 500');
  });
});

