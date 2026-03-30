/**
 * 基于 localStorage 的 PV 去重模块
 *
 * 去重 key 格式: __wt:{appId}:{pathname}
 * value: 上次上报的时间戳（毫秒）
 */

const STORAGE_PREFIX = '__wt:';

/**
 * 生成去重用的 storage key
 */
export function buildDedupKey(appId: string, pathname: string): string {
  return `${STORAGE_PREFIX}${appId}:${pathname}`;
}

/**
 * 检查指定路径是否可以上报（是否超出去重窗口）
 *
 * @param appId - 应用标识
 * @param pathname - URL pathname
 * @param interval - 去重时间窗口（毫秒）
 * @returns true 表示可以上报，false 表示在去重窗口内应跳过
 */
export function shouldReport(
  appId: string,
  pathname: string,
  interval: number,
): boolean {
  const key = buildDedupKey(appId, pathname);

  try {
    const lastTime = localStorage.getItem(key);
    if (!lastTime) return true;

    const elapsed = Date.now() - Number(lastTime);
    return elapsed >= interval;
  } catch {
    // localStorage 不可用时（隐私模式等），始终上报
    return true;
  }
}

/**
 * 记录上报时间到 localStorage
 */
export function markReported(appId: string, pathname: string): void {
  const key = buildDedupKey(appId, pathname);

  try {
    localStorage.setItem(key, String(Date.now()));
  } catch {
    // 静默失败
  }
}

/**
 * 根据去重模式解析实际用于去重的 key 路径
 *
 * - 'path' 模式：直接返回完整 pathname
 * - 'prefix' 模式：匹配最长前缀并返回，未匹配则回退到完整 pathname
 *
 * @param pathname - 当前页面的 URL pathname
 * @param dedupBy - 去重模式
 * @param pathPrefixes - 前缀列表（dedupBy 为 'prefix' 时生效）
 * @returns 用于去重的路径字符串
 */
export function resolveDedupPath(
  pathname: string,
  dedupBy: 'path' | 'prefix',
  pathPrefixes: string[],
): string {
  if (dedupBy !== 'prefix' || pathPrefixes.length === 0) {
    return pathname;
  }

  // 匹配最长前缀（避免 /blog 误匹配 /blog-archive）
  let matched = '';
  for (const prefix of pathPrefixes) {
    if (
      pathname === prefix ||
      pathname.startsWith(prefix + '/')
    ) {
      if (prefix.length > matched.length) {
        matched = prefix;
      }
    }
  }

  return matched || pathname;
}

/**
 * 清理过期的去重记录，避免 localStorage 无限膨胀
 *
 * @param appId - 应用标识
 * @param maxAge - 超过此时间的记录将被清理（毫秒），默认 24 小时
 */
export function cleanExpiredRecords(
  appId: string,
  maxAge: number = 24 * 60 * 60 * 1000,
): void {
  try {
    const prefix = `${STORAGE_PREFIX}${appId}:`;
    const now = Date.now();
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const lastTime = Number(localStorage.getItem(key));
        if (now - lastTime > maxAge) {
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch {
    // 静默失败
  }
}
