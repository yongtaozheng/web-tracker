import { describe, it, expect } from 'vitest';
import { mapFieldNames } from '../src/types';
import type { PageViewData } from '../src/types';

const baseData: PageViewData = {
  appId: 'my-app',
  url: 'https://example.com/home',
  path: '/home',
  referrer: 'https://google.com',
  title: '首页',
  timestamp: 1711785600000,
  uid: 'user_1',
  screenWidth: 1920,
  screenHeight: 1080,
  language: 'zh-CN',
  ua: 'Mozilla/5.0',
};

describe('mapFieldNames', () => {
  it('should return original keys when no mapping provided', () => {
    const result = mapFieldNames(baseData, {});
    expect(result).toEqual(baseData);
  });

  it('should map specified fields and keep others unchanged', () => {
    const result = mapFieldNames(baseData, {
      appId: 'project_id',
      uid: 'user_id',
    });

    // Mapped fields
    expect(result['project_id']).toBe('my-app');
    expect(result['user_id']).toBe('user_1');

    // Original keys should NOT exist for mapped fields
    expect(result['appId']).toBeUndefined();
    expect(result['uid']).toBeUndefined();

    // Unmapped fields keep original names
    expect(result['url']).toBe('https://example.com/home');
    expect(result['path']).toBe('/home');
    expect(result['timestamp']).toBe(1711785600000);
  });

  it('should map all fields when fully configured', () => {
    const fullMapping = {
      appId: 'app_id',
      url: 'page_url',
      path: 'page_path',
      referrer: 'ref',
      title: 'page_title',
      timestamp: 'report_time',
      uid: 'user_id',
      screenWidth: 'screen_w',
      screenHeight: 'screen_h',
      language: 'lang',
      ua: 'user_agent',
    };

    const result = mapFieldNames(baseData, fullMapping);

    expect(result).toEqual({
      app_id: 'my-app',
      page_url: 'https://example.com/home',
      page_path: '/home',
      ref: 'https://google.com',
      page_title: '首页',
      report_time: 1711785600000,
      user_id: 'user_1',
      screen_w: 1920,
      screen_h: 1080,
      lang: 'zh-CN',
      user_agent: 'Mozilla/5.0',
    });
  });

  it('should preserve value types after mapping', () => {
    const result = mapFieldNames(baseData, {
      timestamp: 'ts',
      screenWidth: 'sw',
    });

    expect(typeof result['ts']).toBe('number');
    expect(typeof result['sw']).toBe('number');
    expect(typeof result['path']).toBe('string');
  });
});
