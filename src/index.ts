/**
 * web-tracker
 *
 * 轻量级通用前端埋点 SDK
 * 支持 PV 访问记录，30 分钟内同一路径自动去重
 *
 * @example
 * ```ts
 * import { createTracker } from 'web-tracker';
 *
 * const tracker = createTracker({
 *   appId: 'my-website',
 *   reportUrl: 'https://api.example.com/track',
 * });
 *
 * // 登录后设置用户
 * tracker.setUser('user_123');
 *
 * // 页面卸载时销毁（可选，SPA 应用建议调用）
 * tracker.destroy();
 * ```
 */

import { Tracker } from './tracker';
import type { TrackerConfig, PageViewData, FieldNameMapping } from './types';

/**
 * 创建 Tracker 实例
 *
 * @param config - 配置项
 * @returns Tracker 实例
 */
export function createTracker(config: TrackerConfig): Tracker {
  return new Tracker(config);
}

// 导出类型和类，方便高级用法
export { Tracker };
export type { TrackerConfig, PageViewData, FieldNameMapping };
