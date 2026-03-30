# @jyeontu/web-tracker

轻量级通用前端埋点 SDK，支持 PV 访问记录与 30 分钟自动去重。

- **框架无关** — 零依赖，React / Vue / Angular / 原生 JS 均可使用
- **极致轻量** — gzip 后仅 ~1.5KB
- **开箱即用** — 一行代码接入，自动监听路由变化
- **字段可配** — 上报字段名自由映射，适配任意后端接口

## 安装

```bash
npm install @jyeontu/web-tracker
```

## 快速上手

```ts
import { createTracker } from '@jyeontu/web-tracker';

const tracker = createTracker({
  appId: 'my-website',
  reportUrl: 'https://api.example.com/track',
});

// 登录后设置用户标识
tracker.setUser('user_123');
```

只需这一步，SDK 会自动完成：

1. 上报当前页面的 PV
2. 监听后续路由变化（History / Hash 模式均支持）
3. 同一路径 30 分钟内仅上报一次

## CDN / Script 标签引入

```html
<script src="@jyeontu/web-tracker.umd.js"></script>
<script>
  const tracker = WebTracker.createTracker({
    appId: 'my-website',
    reportUrl: '/api/track',
  });
</script>
```

## 配置项

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|:----:|--------|------|
| `appId` | `string` | ✅ | — | 应用标识，区分不同网站 |
| `reportUrl` | `string` | ✅ | — | 数据上报接口地址 |
| `dedupInterval` | `number` | — | `1800000`（30分钟） | 去重时间窗口（毫秒） |
| `autoTrack` | `boolean` | — | `true` | 是否自动监听路由变化 |
| `uid` | `string` | — | `''` | 用户标识，也可通过 `setUser()` 设置 |
| `debug` | `boolean` | — | `false` | 是否在控制台输出调试日志 |
| `fieldNames` | `Partial<FieldNameMapping>` | — | `{}` | 自定义上报字段名映射 |

## API

### `createTracker(config): Tracker`

创建并返回一个 Tracker 实例，初始化时自动上报当前页面 PV。

### `tracker.trackPageView(pathname?)`

手动触发一次 PV 上报（自动去重）。

```ts
// 使用当前 location.pathname
tracker.trackPageView();

// 指定路径
tracker.trackPageView('/custom-page');
```

### `tracker.setUser(uid)`

设置用户标识，通常在登录后调用。

```ts
tracker.setUser('user_456');
```

### `tracker.getConfig()`

获取当前配置的只读副本。

### `tracker.destroy()`

销毁实例，移除所有路由监听。适用于 SPA 组件卸载场景。

## 自定义字段名

通过 `fieldNames` 映射上报字段名，适配你的后端接口命名规范：

```ts
const tracker = createTracker({
  appId: 'my-website',
  reportUrl: '/api/track',
  fieldNames: {
    appId: 'project_id',
    uid: 'user_id',
    timestamp: 'report_time',
    screenWidth: 'screen_w',
    screenHeight: 'screen_h',
  },
});
```

后端将收到：

```json
{
  "project_id": "my-website",
  "url": "https://example.com/home",
  "path": "/home",
  "referrer": "https://google.com",
  "title": "首页",
  "report_time": 1711785600000,
  "user_id": "user_123",
  "screen_w": 1920,
  "screen_h": 1080,
  "language": "zh-CN",
  "ua": "Mozilla/5.0..."
}
```

未映射的字段保持原始名称。可映射的字段包括：

`appId` · `url` · `path` · `referrer` · `title` · `timestamp` · `uid` · `screenWidth` · `screenHeight` · `language` · `ua`

## 上报数据结构

每次 PV 上报的默认数据结构：

```ts
interface PageViewData {
  appId: string;        // 应用标识
  url: string;          // 完整 URL
  path: string;         // URL pathname（去重依据）
  referrer: string;     // 来源页面
  title: string;        // 页面标题
  timestamp: number;    // 上报时间戳（毫秒）
  uid: string;          // 用户标识
  screenWidth: number;  // 屏幕宽度
  screenHeight: number; // 屏幕高度
  language: string;     // 浏览器语言
  ua: string;           // User-Agent
}
```

## 去重机制

- 以 `localStorage` 存储上报记录，key 格式为 `__wt:{appId}:{pathname}`
- 每次上报前检查同一路径距上次上报是否超过 `dedupInterval`
- 查询参数（`?foo=bar`）和 hash（`#section`）不参与去重判断
- `localStorage` 不可用时（隐私模式等）回退为每次都上报
- 初始化时自动清理超过 24 小时的过期记录

## 路由监听

自动兼容以下场景：

| 场景 | 监听方式 |
|------|----------|
| 首次加载 | 初始化时立即上报 |
| History 路由（React Router / Vue Router） | 拦截 `pushState` / `replaceState` |
| 浏览器前进/后退 | `popstate` 事件 |
| Hash 路由 | `hashchange` 事件 |

设置 `autoTrack: false` 可关闭自动监听，改为手动调用 `trackPageView()`。

## 上报策略

按优先级依次尝试，确保数据不丢失：

1. **`navigator.sendBeacon`** — 页面关闭也能可靠发送
2. **`fetch`**（keepalive） — 现代浏览器通用方案
3. **`XMLHttpRequest`** — 传统兼容
4. **`Image`**（1x1 gif） — 终极降级，通过 URL 参数传递核心数据

## 后端接口示例

SDK 以 `POST` + `Content-Type: application/json` 发送数据，后端只需接收 JSON 即可：

```js
// Express
app.post('/api/track', (req, res) => {
  const { appId, path, timestamp, uid } = req.body;
  // 存入数据库...
  res.status(204).end();
});
```

```python
# Flask
@app.post('/api/track')
def track():
    data = request.get_json()
    # 存入数据库...
    return '', 204
```

```go
// Gin
r.POST("/api/track", func(c *gin.Context) {
    var data map[string]interface{}
    c.BindJSON(&data)
    // 存入数据库...
    c.Status(204)
})
```

## 构建产物

| 格式 | 文件 | 用途 |
|------|------|------|
| ESM | `dist/index.esm.js` | Vite / Webpack 等现代打包工具 |
| CJS | `dist/index.cjs.js` | Node.js / SSR |
| UMD | `dist/index.umd.js` | `<script>` 标签 / CDN |
| Types | `dist/index.d.ts` | TypeScript 类型声明 |

## 开发

```bash
# 安装依赖
npm install

# 运行测试
npm test

# 构建
npm run build

# 开发模式（watch）
npm run dev
```

## License

MIT
