/**
 * 工具函数模块
 */

import type { PageViewData } from './types';

/**
 * 采集当前页面的 PV 数据
 *
 * @param appId - 应用标识
 * @param uid - 用户标识
 * @param pathname - 当前页面路径（可选，默认从 location 取）
 */
export function collectPageViewData(
  appId: string,
  uid: string,
  pathname?: string,
): PageViewData {
  return {
    appId,
    url: window.location.href,
    path: pathname ?? window.location.pathname,
    referrer: document.referrer,
    title: document.title,
    timestamp: Date.now(),
    uid,
    screenWidth: window.screen?.width ?? 0,
    screenHeight: window.screen?.height ?? 0,
    language: navigator.language ?? '',
    ua: navigator.userAgent ?? '',
  };
}
