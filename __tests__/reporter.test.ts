import { describe, it, expect, vi, beforeEach } from 'vitest';
import { report } from '../src/reporter';
import type { PageViewData } from '../src/types';

const mockData: PageViewData = {
  appId: 'test',
  url: 'https://example.com/home',
  path: '/home',
  referrer: 'https://google.com',
  title: 'Home',
  timestamp: 1711785600000,
  uid: 'user_1',
  screenWidth: 1920,
  screenHeight: 1080,
  language: 'zh-CN',
  ua: 'Mozilla/5.0',
};

describe('reporter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should use sendBeacon when available', () => {
    const sendBeaconMock = vi.fn().mockReturnValue(true);
    vi.stubGlobal('navigator', {
      ...navigator,
      sendBeacon: sendBeaconMock,
    });

    const result = report('https://api.test.com/track', mockData);

    expect(result).toBe(true);
    expect(sendBeaconMock).toHaveBeenCalledTimes(1);
    expect(sendBeaconMock.mock.calls[0][0]).toBe('https://api.test.com/track');
  });

  it('should fallback to fetch when sendBeacon fails', () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      sendBeacon: vi.fn().mockReturnValue(false),
    });

    const fetchMock = vi.fn().mockResolvedValue(new Response());
    vi.stubGlobal('fetch', fetchMock);

    const result = report('https://api.test.com/track', mockData);

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should fallback to XHR when fetch is not available', () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      sendBeacon: undefined,
    });

    // Remove fetch
    const originalFetch = globalThis.fetch;
    // @ts-expect-error -- intentionally removing fetch
    delete globalThis.fetch;

    const xhrSendMock = vi.fn();
    const xhrOpenMock = vi.fn();
    const xhrSetHeaderMock = vi.fn();

    vi.stubGlobal(
      'XMLHttpRequest',
      vi.fn().mockImplementation(() => ({
        open: xhrOpenMock,
        setRequestHeader: xhrSetHeaderMock,
        send: xhrSendMock,
      })),
    );

    const result = report('https://api.test.com/track', mockData);

    expect(result).toBe(true);
    expect(xhrOpenMock).toHaveBeenCalledWith(
      'POST',
      'https://api.test.com/track',
      true,
    );
    expect(xhrSendMock).toHaveBeenCalledTimes(1);

    // Restore fetch
    globalThis.fetch = originalFetch;
  });
});
