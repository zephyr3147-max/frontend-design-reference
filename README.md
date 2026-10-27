# ZhZb Personal Site

个人主页、Crab Coast 浏览器小游戏和杂记页面。使用原生 HTML / CSS / JavaScript，无需安装前端构建依赖。

## 当前版本

当前代码版本：**v0.1.1 — 毛玻璃入口版**。完整历史和每版说明见 [版本更新记录](CHANGELOG.md)。

- 开场红字居中模糊显示，悬停后渐变为 Go!，同时扩大中央开口。

- 四块叠片逆时针旋转的欢迎页，中央方形进入按钮。
- 手写文案 Made, found & remembered。
- 十二个环绕图标：Journal 和 Crab Coast 可用，其余十个标注开发中。
- 环绕动画支持暂停、键盘操作和减少动态效果偏好。
- 游戏支持键盘与触摸操作、跳跃、渐进入水和速度相关翻车。
- 杂记支持本地记录、分类搜索、JSON 导入导出和主题切换。

**当前杂记记录保存在浏览器 localStorage，尚未实现云端同步或管理员登录。** 仓库及部署包不包含浏览器内的个人记录。迁移前先导出 JSON。

## 目录

- `dist/`：发布网站文件；部署时将其中内容作为网站根目录。
- `home-checks.cjs`：欢迎页、入场生命周期、暂停与恢复检查。
- `checks.cjs`：游戏键盘与触摸控制检查。
- `physics-checks.cjs`：游戏碰撞、入水、翻车与速度检查。
- `docs/`：版本维护、发布和恢复说明。
- `CHANGELOG.md`：版本号、对应提交和中文更新说明。
- `.openai/hosting.json`：历史工具配置。当前正式发布目标是已有 EdgeOne 项目，不要据此误发布到另一个站点。

## 本地预览

在仓库目录运行：

```sh
python -m http.server 8778 --bind 127.0.0.1 --directory dist
```

主页：`http://127.0.0.1:8778/#home`

重播开场：`http://127.0.0.1:8778/?welcome=1`

## 检查

需要已安装 Node.js：

```sh
node --check dist/home.js
node --check dist/journal/app.js
node home-checks.cjs
node checks.cjs
node physics-checks.cjs
```

## 发布

正式域名：https://www.zhzb.site/

仓库负责源代码与版本管理；推送 GitHub 当前不会自动更新正式网站。参见 [发布与版本管理](docs/development-and-release.md)。

## 字体与图标

Caveat 来自 [Google Fonts](https://github.com/google/fonts/tree/main/ofl/caveat)，按 SIL OFL 1.1 提供，许可证保存在 `dist/assets/fonts/OFL-Caveat.txt`。图标为本项目内联 SVG。
