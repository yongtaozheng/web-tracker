/**
 * 路由变化监听模块
 *
 * 同时兼容:
 * - 传统多页应用（页面加载即触发）
 * - History 模式 SPA（React Router / Vue Router）
 * - Hash 模式 SPA
 */

type RouteChangeCallback = (pathname: string) => void;

// 保存原始方法的引用，用于 destroy 时恢复
let originalPushState: typeof history.pushState | null = null;
let originalReplaceState: typeof history.replaceState | null = null;

/**
 * 启动路由变化监听
 *
 * @param callback - 路由变化时的回调，参数为新的 pathname
 * @returns 清理函数，调用后移除所有监听
 */
export function listenRouteChange(callback: RouteChangeCallback): () => void {
  let lastPathname = getPathname();

  /**
   * 路由变化处理，内部做了 pathname 去重
   * 避免同一 pathname 重复触发回调
   */
  const handleRouteChange = (): void => {
    const currentPathname = getPathname();
    if (currentPathname !== lastPathname) {
      lastPathname = currentPathname;
      callback(currentPathname);
    }
  };

  // --- 1. 拦截 history.pushState ---
  originalPushState = history.pushState;
  history.pushState = function (...args: Parameters<typeof history.pushState>) {
    originalPushState!.apply(this, args);
    handleRouteChange();
  };

  // --- 2. 拦截 history.replaceState ---
  originalReplaceState = history.replaceState;
  history.replaceState = function (
    ...args: Parameters<typeof history.replaceState>
  ) {
    originalReplaceState!.apply(this, args);
    handleRouteChange();
  };

  // --- 3. 监听浏览器前进/后退 ---
  const onPopState = (): void => {
    handleRouteChange();
  };
  window.addEventListener('popstate', onPopState);

  // --- 4. 监听 hash 变化 ---
  const onHashChange = (): void => {
    handleRouteChange();
  };
  window.addEventListener('hashchange', onHashChange);

  // 返回清理函数
  return () => {
    // 恢复原始 history 方法
    if (originalPushState) {
      history.pushState = originalPushState;
      originalPushState = null;
    }
    if (originalReplaceState) {
      history.replaceState = originalReplaceState;
      originalReplaceState = null;
    }

    window.removeEventListener('popstate', onPopState);
    window.removeEventListener('hashchange', onHashChange);
  };
}

/**
 * 获取当前 pathname
 */
export function getPathname(): string {
  return window.location.pathname;
}
