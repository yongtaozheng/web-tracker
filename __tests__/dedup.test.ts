import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  buildDedupKey,
  shouldReport,
  markReported,
  cleanExpiredRecords,
  resolveDedupPath,
} from '../src/dedup';

describe('dedup', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('buildDedupKey', () => {
    it('should build correct key format', () => {
      expect(buildDedupKey('myapp', '/home')).toBe('__wt:myapp:/home');
      expect(buildDedupKey('app2', '/about')).toBe('__wt:app2:/about');
    });
  });

  describe('shouldReport', () => {
    const APP_ID = 'test-app';
    const PATH = '/page';
    const INTERVAL = 30 * 60 * 1000; // 30 min

    it('should return true when no previous record exists', () => {
      expect(shouldReport(APP_ID, PATH, INTERVAL)).toBe(true);
    });

    it('should return false when within dedup interval', () => {
      markReported(APP_ID, PATH);
      expect(shouldReport(APP_ID, PATH, INTERVAL)).toBe(false);
    });

    it('should return true when dedup interval has passed', () => {
      const key = buildDedupKey(APP_ID, PATH);
      // Set a time 31 minutes ago
      const pastTime = Date.now() - 31 * 60 * 1000;
      localStorage.setItem(key, String(pastTime));

      expect(shouldReport(APP_ID, PATH, INTERVAL)).toBe(true);
    });

    it('should return true when localStorage is not available', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('localStorage disabled');
      });

      expect(shouldReport(APP_ID, PATH, INTERVAL)).toBe(true);
    });

    it('should handle different paths independently', () => {
      markReported(APP_ID, '/page-a');
      expect(shouldReport(APP_ID, '/page-a', INTERVAL)).toBe(false);
      expect(shouldReport(APP_ID, '/page-b', INTERVAL)).toBe(true);
    });

    it('should handle different appIds independently', () => {
      markReported('app-1', PATH);
      expect(shouldReport('app-1', PATH, INTERVAL)).toBe(false);
      expect(shouldReport('app-2', PATH, INTERVAL)).toBe(true);
    });
  });

  describe('markReported', () => {
    it('should store current timestamp', () => {
      const before = Date.now();
      markReported('app', '/test');
      const after = Date.now();

      const stored = Number(localStorage.getItem('__wt:app:/test'));
      expect(stored).toBeGreaterThanOrEqual(before);
      expect(stored).toBeLessThanOrEqual(after);
    });

    it('should not throw when localStorage is not available', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('localStorage disabled');
      });

      expect(() => markReported('app', '/test')).not.toThrow();
    });
  });

  describe('resolveDedupPath', () => {
    it('should return original path in "path" mode', () => {
      expect(resolveDedupPath('/blog/post-1', 'path', ['/blog'])).toBe('/blog/post-1');
    });

    it('should return original path in "prefix" mode with empty prefixes', () => {
      expect(resolveDedupPath('/blog/post-1', 'prefix', [])).toBe('/blog/post-1');
    });

    it('should match prefix and return it', () => {
      const prefixes = ['/blog', '/docs'];
      expect(resolveDedupPath('/blog/post-1', 'prefix', prefixes)).toBe('/blog');
      expect(resolveDedupPath('/blog/post-2', 'prefix', prefixes)).toBe('/blog');
      expect(resolveDedupPath('/docs/api', 'prefix', prefixes)).toBe('/docs');
    });

    it('should fallback to full path when no prefix matches', () => {
      const prefixes = ['/blog', '/docs'];
      expect(resolveDedupPath('/about', 'prefix', prefixes)).toBe('/about');
      expect(resolveDedupPath('/contact', 'prefix', prefixes)).toBe('/contact');
    });

    it('should match exact prefix path', () => {
      const prefixes = ['/blog'];
      expect(resolveDedupPath('/blog', 'prefix', prefixes)).toBe('/blog');
    });

    it('should not match partial prefix (avoid /blog matching /blog-archive)', () => {
      const prefixes = ['/blog'];
      expect(resolveDedupPath('/blog-archive', 'prefix', prefixes)).toBe('/blog-archive');
      expect(resolveDedupPath('/blog-archive/post', 'prefix', prefixes)).toBe('/blog-archive/post');
    });

    it('should match the longest prefix when multiple match', () => {
      const prefixes = ['/docs', '/docs/api'];
      expect(resolveDedupPath('/docs/api/users', 'prefix', prefixes)).toBe('/docs/api');
      expect(resolveDedupPath('/docs/guide', 'prefix', prefixes)).toBe('/docs');
    });
  });

  describe('cleanExpiredRecords', () => {
    it('should remove records older than maxAge', () => {
      const key = buildDedupKey('app', '/old');
      const expiredTime = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
      localStorage.setItem(key, String(expiredTime));

      const freshKey = buildDedupKey('app', '/fresh');
      localStorage.setItem(freshKey, String(Date.now()));

      cleanExpiredRecords('app', 24 * 60 * 60 * 1000);

      expect(localStorage.getItem(key)).toBeNull();
      expect(localStorage.getItem(freshKey)).not.toBeNull();
    });

    it('should not affect other apps keys', () => {
      const otherKey = buildDedupKey('other-app', '/page');
      const expiredTime = Date.now() - 25 * 60 * 60 * 1000;
      localStorage.setItem(otherKey, String(expiredTime));

      cleanExpiredRecords('app', 24 * 60 * 60 * 1000);

      // 不应该清理其他 app 的 key
      expect(localStorage.getItem(otherKey)).not.toBeNull();
    });
  });
});
