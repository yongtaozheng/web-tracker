import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Tracker } from '../src/tracker';
import * as dedup from '../src/dedup';
import * as reporter from '../src/reporter';

// Mock modules
vi.mock('../src/reporter', () => ({
  report: vi.fn().mockReturnValue(true),
}));

describe('Tracker', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.mocked(reporter.report).mockReturnValue(true);
  });

  it('should report PV on initialization', () => {
    new Tracker({
      appId: 'test',
      reportUrl: '/api/track',
    });

    expect(reporter.report).toHaveBeenCalledTimes(1);
    const data = vi.mocked(reporter.report).mock.calls[0][1];
    expect(data.appId).toBe('test');
    expect(data.path).toBe('/');
  });

  it('should not report duplicate PV within interval', () => {
    const tracker = new Tracker({
      appId: 'test',
      reportUrl: '/api/track',
    });

    // First call happens in constructor
    expect(reporter.report).toHaveBeenCalledTimes(1);

    // Manual call should be deduped
    tracker.trackPageView();
    expect(reporter.report).toHaveBeenCalledTimes(1);

    tracker.destroy();
  });

  it('should apply default config correctly', () => {
    const tracker = new Tracker({
      appId: 'test',
      reportUrl: '/api/track',
    });

    const config = tracker.getConfig();
    expect(config.dedupInterval).toBe(30 * 60 * 1000);
    expect(config.autoTrack).toBe(true);
    expect(config.uid).toBe('');
    expect(config.debug).toBe(false);

    tracker.destroy();
  });

  it('should allow overriding config', () => {
    const tracker = new Tracker({
      appId: 'test',
      reportUrl: '/api/track',
      dedupInterval: 60000,
      autoTrack: false,
      uid: 'user_1',
      debug: true,
    });

    const config = tracker.getConfig();
    expect(config.dedupInterval).toBe(60000);
    expect(config.autoTrack).toBe(false);
    expect(config.uid).toBe('user_1');
    expect(config.debug).toBe(true);

    tracker.destroy();
  });

  it('should update uid via setUser', () => {
    const tracker = new Tracker({
      appId: 'test',
      reportUrl: '/api/track',
    });

    tracker.setUser('new_user');
    expect(tracker.getConfig().uid).toBe('new_user');

    tracker.destroy();
  });

  it('should not report after destroy', () => {
    const tracker = new Tracker({
      appId: 'test',
      reportUrl: '/api/track',
    });

    vi.mocked(reporter.report).mockClear();
    tracker.destroy();

    tracker.trackPageView();
    expect(reporter.report).not.toHaveBeenCalled();
  });

  it('should skip report when shouldReport returns false', () => {
    vi.spyOn(dedup, 'shouldReport').mockReturnValue(false);

    new Tracker({
      appId: 'test',
      reportUrl: '/api/track',
    });

    expect(reporter.report).not.toHaveBeenCalled();
  });

  it('should pass fieldNames to reporter', () => {
    const fieldNames = { appId: 'project_id', uid: 'user_id' };

    new Tracker({
      appId: 'test',
      reportUrl: '/api/track',
      fieldNames,
    });

    expect(reporter.report).toHaveBeenCalledTimes(1);
    // Third argument should be the fieldNames
    const passedFieldNames = vi.mocked(reporter.report).mock.calls[0][2];
    expect(passedFieldNames).toEqual(fieldNames);
  });

  it('should use empty fieldNames by default', () => {
    new Tracker({
      appId: 'test',
      reportUrl: '/api/track',
    });

    const passedFieldNames = vi.mocked(reporter.report).mock.calls[0][2];
    expect(passedFieldNames).toEqual({});
  });

  describe('prefix dedup mode', () => {
    it('should dedup by prefix when configured', () => {
      const tracker = new Tracker({
        appId: 'test',
        reportUrl: '/api/track',
        autoTrack: false,
        dedupBy: 'prefix',
        pathPrefixes: ['/blog'],
      });

      // First blog page → should report
      tracker.trackPageView('/blog/post-1');
      expect(reporter.report).toHaveBeenCalledTimes(2); // init + /blog/post-1

      // Second blog page → same prefix, should be deduped
      tracker.trackPageView('/blog/post-2');
      expect(reporter.report).toHaveBeenCalledTimes(2); // still 2

      // Different path → should report
      tracker.trackPageView('/about');
      expect(reporter.report).toHaveBeenCalledTimes(3);

      tracker.destroy();
    });

    it('should still report full path in data, not the prefix', () => {
      const tracker = new Tracker({
        appId: 'test',
        reportUrl: '/api/track',
        autoTrack: false,
        dedupBy: 'prefix',
        pathPrefixes: ['/blog'],
      });

      tracker.trackPageView('/blog/my-article');

      // The reported data should have the full path
      const calls = vi.mocked(reporter.report).mock.calls;
      const lastCallData = calls[calls.length - 1][1];
      expect(lastCallData.path).toBe('/blog/my-article');

      tracker.destroy();
    });

    it('should default to "path" dedupBy mode', () => {
      const tracker = new Tracker({
        appId: 'test',
        reportUrl: '/api/track',
      });

      const config = tracker.getConfig();
      expect(config.dedupBy).toBe('path');
      expect(config.pathPrefixes).toEqual([]);

      tracker.destroy();
    });
  });
});
