/**
 * Tracker 核心类
 *
 * 管理配置、去重、监听和上报的完整生命周期
 */

import type { TrackerConfig, ResolvedConfig } from './types';
import { DEFAULT_CONFIG } from './types';
import { shouldReport, markReported, cleanExpiredRecords, resolveDedupPath } from './dedup';
import { report } from './reporter';
import { listenRouteChange, getPathname } from './listener';
import { collectPageViewData } from './utils';

export class Tracker {
  private config: ResolvedConfig;
  private destroyListener: (() => void) | null = null;
  private isDestroyed = false;

  constructor(config: TrackerConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      uid: config.uid ?? DEFAULT_CONFIG.uid,
      dedupInterval: config.dedupInterval ?? DEFAULT_CONFIG.dedupInterval,
      autoTrack: config.autoTrack ?? DEFAULT_CONFIG.autoTrack,
      debug: config.debug ?? DEFAULT_CONFIG.debug,
      fieldNames: config.fieldNames ?? DEFAULT_CONFIG.fieldNames,
      dedupBy: config.dedupBy ?? DEFAULT_CONFIG.dedupBy,
      pathPrefixes: config.pathPrefixes ?? DEFAULT_CONFIG.pathPrefixes,
      reportStrategy: config.reportStrategy ?? DEFAULT_CONFIG.reportStrategy,
    };

    this.init();
  }

  /**
   * 初始化：上报当前页面 + 启动路由监听
   */
  private init(): void {
    // 清理过期的去重记录
    cleanExpiredRecords(this.config.appId);

    // 上报当前页面
    this.trackPageView();

    // 启动自动路由监听
    if (this.config.autoTrack) {
      this.destroyListener = listenRouteChange((pathname) => {
        this.trackPageView(pathname);
      });
    }

    this.log('Tracker initialized', this.config);
  }

  /**
   * 手动触发一次 PV 上报（自动去重）
   *
   * @param pathname - 可选，指定路径。默认使用当前 location.pathname
   */
  trackPageView(pathname?: string): void {
    if (this.isDestroyed) return;

    const path = pathname ?? getPathname();
    const { appId, reportUrl, dedupInterval, uid, dedupBy, pathPrefixes } = this.config;

    // 解析去重路径（prefix 模式下可能合并为前缀）
    const dedupPath = resolveDedupPath(path, dedupBy, pathPrefixes);

    // 去重检查
    if (!shouldReport(appId, dedupPath, dedupInterval)) {
      this.log(`Skipped (dedup): ${path} → key: ${dedupPath}`);
      return;
    }

    // 采集数据（上报完整 path，不是去重 path）
    const data = collectPageViewData(appId, uid, path);

    // 上报（应用字段名映射 + 上报策略）
    const sent = report(reportUrl, data, this.config.fieldNames, this.config.reportStrategy);

    if (sent) {
      // 记录上报时间（使用去重 path）
      markReported(appId, dedupPath);
      this.log(`Reported PV: ${path} → dedupKey: ${dedupPath}`, data);
    } else {
      this.log(`Report failed: ${path}`);
    }
  }

  /**
   * 设置用户标识（登录后调用）
   */
  setUser(uid: string): void {
    this.config.uid = uid;
    this.log(`User set: ${uid}`);
  }

  /**
   * 获取当前配置（只读副本）
   */
  getConfig(): Readonly<ResolvedConfig> {
    return { ...this.config };
  }

  /**
   * 销毁 Tracker 实例，移除所有监听
   */
  destroy(): void {
    if (this.isDestroyed) return;

    this.isDestroyed = true;

    if (this.destroyListener) {
      this.destroyListener();
      this.destroyListener = null;
    }

    this.log('Tracker destroyed');
  }

  /**
   * 调试日志
   */
  private log(message: string, data?: unknown): void {
    if (this.config.debug) {
      console.log(`[web-tracker] ${message}`, data ?? '');
    }
  }
}
