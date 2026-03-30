/**
 * 数据上报模块
 *
 * 支持三种上报策略:
 * - beacon: sendBeacon（默认，页面关闭也能发送）
 * - fetch: fetch POST（DevTools 可见，方便调试）
 * - img: Image 标签（兼容性最好，数据有限）
 *
 * 每种策略内部都有降级链保证数据不丢失
 *
 * 注意:
 * 1. 使用 text/plain 作为 Content-Type 而非 application/json
 *    这样请求属于 CORS "简单请求"，不会触发预检（OPTIONS）
 * 2. fetch/XHR 均设置 credentials: 'omit'，不发送 Cookie
 *    这样后端可安全使用 Access-Control-Allow-Origin: * 通配符
 *    （credentials: 'include' + 通配符 * 会被浏览器拦截）
 *
 * Body 仍然是合法 JSON 字符串，后端用 JSON.parse(body) 解析即可。
 */

import type { PageViewData, FieldNameMapping } from './types';
import { mapFieldNames } from './types';

type ReportStrategy = 'beacon' | 'fetch' | 'img';

/**
 * 上报 PV 数据到服务端
 *
 * @param url - 上报接口地址
 * @param data - PV 数据
 * @param fieldNames - 可选，自定义字段名映射
 * @param strategy - 上报策略，默认 'beacon'
 * @returns 是否发送成功（仅表示请求已发出，不代表服务端已接收）
 */
export function report(
  url: string,
  data: PageViewData,
  fieldNames?: Partial<FieldNameMapping>,
  strategy: ReportStrategy = 'beacon',
): boolean {
  const mapped = fieldNames && Object.keys(fieldNames).length > 0
    ? mapFieldNames(data, fieldNames)
    : data;
  const payload = JSON.stringify(mapped);

  // 根据策略选择首选上报方式，失败后按降级链尝试
  switch (strategy) {
    case 'fetch':
      return tryFetch(url, payload)
        || trySendBeacon(url, payload)
        || tryXHR(url, payload)
        || tryImage(url, data, fieldNames);

    case 'img':
      return tryImage(url, data, fieldNames)
        || tryFetch(url, payload)
        || trySendBeacon(url, payload);

    case 'beacon':
    default:
      return trySendBeacon(url, payload)
        || tryFetch(url, payload)
        || tryXHR(url, payload)
        || tryImage(url, data, fieldNames);
  }
}

/**
 * sendBeacon 注意: 浏览器规范强制 credentials: 'include'，无法修改
 * 如果后端 CORS 使用通配符 *，sendBeacon 跨域会被浏览器拦截
 * 但数据仍会到达服务端（简单请求先发送再校验响应）
 * 建议后端设置具体 origin 而非 *，或使用 fetch 策略
 */
function trySendBeacon(url: string, payload: string): boolean {
  try {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'text/plain' });
      return navigator.sendBeacon(url, blob);
    }
  } catch {
    // 静默失败
  }
  return false;
}

function tryFetch(url: string, payload: string): boolean {
  try {
    if (typeof fetch !== 'undefined') {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: payload,
        keepalive: true,
        credentials: 'omit',
      }).catch(() => {
        // 静默失败，fetch 已发出
      });
      return true;
    }
  } catch {
    // 静默失败
  }
  return false;
}

function tryXHR(url: string, payload: string): boolean {
  try {
    if (typeof XMLHttpRequest !== 'undefined') {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'text/plain');
      xhr.send(payload);
      return true;
    }
  } catch {
    // 静默失败
  }
  return false;
}

function tryImage(
  url: string,
  data: PageViewData,
  fieldNames?: Partial<FieldNameMapping>,
): boolean {
  try {
    if (typeof Image !== 'undefined') {
      const img = new Image();
      const fn = fieldNames ?? {};
      const params = new URLSearchParams({
        [fn.appId ?? 'appId']: data.appId,
        [fn.path ?? 'path']: data.path,
        [fn.url ?? 'url']: data.url,
        [fn.timestamp ?? 't']: String(data.timestamp),
      });
      img.src = `${url}?${params.toString()}`;
      return true;
    }
  } catch {
    // 静默失败
  }
  return false;
}
