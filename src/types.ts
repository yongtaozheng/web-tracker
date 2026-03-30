/**
 * Tracker 初始化配置
 */
export interface TrackerConfig {
  /** 应用标识，用于区分不同网站 */
  appId: string;

  /** 上报接口地址 */
  reportUrl: string;

  /** 去重时间窗口（毫秒），默认 30 分钟 */
  dedupInterval?: number;

  /** 是否自动监听路由变化并上报 PV，默认 true */
  autoTrack?: boolean;

  /** 用户标识，可在初始化后通过 setUser 设置 */
  uid?: string;

  /** 是否开启调试日志，默认 false */
  debug?: boolean;

  /**
   * 自定义上报字段名映射
   *
   * key 为 SDK 内部字段名，value 为你希望上报的字段名
   * 未配置的字段保持默认名称
   *
   * @example
   * ```ts
   * fieldNames: {
   *   appId: 'project_id',
   *   uid: 'user_id',
   *   timestamp: 'report_time',
   *   screenWidth: 'screen_w',
   *   screenHeight: 'screen_h',
   * }
   * ```
   */
  fieldNames?: Partial<FieldNameMapping>;

  /**
   * 去重模式，默认 'path'
   *
   * - 'path': 按完整 pathname 去重（默认）
   * - 'prefix': 按 URL 前缀去重，需配合 pathPrefixes 使用
   */
  dedupBy?: 'path' | 'prefix';

  /**
   * URL 前缀列表，dedupBy 为 'prefix' 时生效
   *
   * 匹配到同一前缀的路径视为同一页面进行去重
   * 未匹配到任何前缀的路径回退为完整 pathname 去重
   *
   * @example
   * ```ts
   * // /blog/post-1 和 /blog/post-2 视为同一页面
   * // /docs/api 和 /docs/guide 视为同一页面
   * pathPrefixes: ['/blog', '/docs']
   * ```
   */
  pathPrefixes?: string[];

  /**
   * 上报方式，默认 'fetch'
   *
   * - 'fetch': 使用 fetch，跨域最友好（credentials: omit），DevTools 可见（默认）
   * - 'beacon': 使用 sendBeacon，页面关闭也能发送，但跨域需后端配置具体 origin
   * - 'img': 使用 Image 标签，兼容性最好但只能传核心字段
   */
  reportStrategy?: 'beacon' | 'fetch' | 'img';
}

/**
 * 字段名映射：key 为内部字段名，value 为自定义字段名
 */
export type FieldNameMapping = {
  [K in keyof PageViewData]: string;
};

/**
 * 内部使用的完整配置（所有字段必填）
 */
export interface ResolvedConfig {
  appId: string;
  reportUrl: string;
  dedupInterval: number;
  autoTrack: boolean;
  uid: string;
  debug: boolean;
  fieldNames: Partial<FieldNameMapping>;
  dedupBy: 'path' | 'prefix';
  pathPrefixes: string[];
  reportStrategy: 'beacon' | 'fetch' | 'img';
}

/**
 * PV 上报数据结构
 */
export interface PageViewData {
  /** 应用标识 */
  appId: string;

  /** 完整 URL */
  url: string;

  /** URL pathname，去重依据 */
  path: string;

  /** 来源页面 */
  referrer: string;

  /** 页面标题 */
  title: string;

  /** 上报时间戳（毫秒） */
  timestamp: number;

  /** 用户标识 */
  uid: string;

  /** 屏幕宽度 */
  screenWidth: number;

  /** 屏幕高度 */
  screenHeight: number;

  /** 浏览器语言 */
  language: string;

  /** User-Agent */
  ua: string;
}

/**
 * 默认配置
 */
export const DEFAULT_CONFIG: Omit<ResolvedConfig, 'appId' | 'reportUrl'> = {
  dedupInterval: 30 * 60 * 1000, // 30 minutes
  autoTrack: true,
  uid: '',
  debug: false,
  fieldNames: {},
  dedupBy: 'path',
  pathPrefixes: [],
  reportStrategy: 'fetch',
};

/**
 * 根据字段映射将 PageViewData 转换为自定义字段名的对象
 */
export function mapFieldNames(
  data: PageViewData,
  fieldNames: Partial<FieldNameMapping>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(data) as Array<keyof PageViewData>) {
    const mappedKey = fieldNames[key] ?? key;
    result[mappedKey] = data[key];
  }

  return result;
}
