# AIR GALLERY — Cloudflare Pages

一个响应式数字艺术展厅网页，包含首页、作品展厅、艺术作品介绍，以及 MediaPipe 浏览器端手部追踪交互。

## 本地预览
推荐使用 VS Code 的 Live Server，或任何静态 HTTP 服务器。不要直接双击 `index.html`，因为浏览器的摄像头权限通常要求 HTTPS 或 localhost。

## 部署到 Cloudflare Pages（最简单）
1. 解压本项目文件夹。
2. 登录 https://dash.cloudflare.com/
3. 打开 **Workers & Pages** → **Create** → **Pages**（界面名称可能略有变化）。
4. 选择 **Upload assets / Direct Upload**。
5. 上传本文件夹内的文件（`index.html`、`styles.css`、`app.js`、`_headers`、`_redirects`），也可以先将这些文件压缩后按控制台要求上传。
6. 点击 Deploy。Cloudflare 会生成一个 `*.pages.dev` 在线网址。

## Git 部署（适合持续修改）
将这些文件放入 GitHub 仓库，然后在 Cloudflare Pages 选择 Connect to Git。框架选择 None，Build command 留空，Build output directory 填 `/` 或项目根目录（按控制台提示）。

## 手势操作
- 点击 **ENABLE CAMERA** 并允许摄像头权限。
- 移动手掌：控制艺术作品旋转。
- 拇指与食指捏合：切换聚焦状态。
- 左右移动/挥手：切换作品（识别阈值用于减少误触发）。
- 也可使用鼠标拖动作品、滚轮缩放、左右按钮切换。

## 重要说明
- 摄像头只在浏览器端处理，不会将视频上传到本项目服务器。
- MediaPipe 的模型和 WASM 从 jsDelivr / Google 模型托管地址加载，首次打开需要联网。
- 摄像头需要 HTTPS（Cloudflare Pages 默认提供 HTTPS）或 localhost。
- 如果某些网络环境无法访问 CDN 或模型资源，页面的静态视觉仍可使用，手势识别功能可能无法启动。
- 此项目为纯静态站点，不需要 Node 构建步骤。
