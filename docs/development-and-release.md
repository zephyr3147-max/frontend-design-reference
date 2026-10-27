# 发布与版本管理

## 当前发布目标

- GitHub：代码存储和版本历史。
- EdgeOne：现有项目 zhzb-crab / makers-aw0ufe07qxq8。
- 正式域名：https://www.zhzb.site/。
- 发布根目录：dist/ 的内容。
- 本次仓库创建不自动配置 GitHub Pages，不改变域名、DNS、证书或加速区域。

只有正式域名实际显示当前版本后，才将发布状态写成成功。当前 GitHub 仓库与正式网站没有自动部署关联。

## 日常修改

1. 修改前运行 git status，保存当前有价值的工作。
2. 大改时创建分支，例如 git switch -c feat/new-home。
3. 完成一项功能，运行 README 中的检查，并实际查看桌面和手机页面。
4. git add 时明确选择文件，检查 git diff --cached 后提交。
5. git push 将提交同步到 GitHub。
6. 通过正式发布流程更新网站，并验证三个路径：/、/journal/、/game.html。

## 发布前检查

- 欢迎页正常进入主页，文字和图标不重复播放。
- 十二个图标显示，两个有效入口能进入、返回。
- 手机无横向溢出，暂停和恢复有效。
- 不清理浏览器 localStorage，不把个人 JSON 备份放进公开仓库。
- 压缩包根部直接放 index.html、home.css、home.js、assets/、game.html、physics.js、journal/，不要套 dist/ 文件夹。

## 回退

查看历史：

```sh
git log --oneline --decorate -12
```

工作区干净时，撤销最近一次普通提交并保留历史：

```sh
git revert HEAD
git push
```

从已知版本另开分支查看：

```sh
git switch -c inspect-v0.1.0 v0.1.0
```

恢复正式网站还需要重新发布对应版本的 dist/；仅 git revert 并不会更新未关联自动部署的平台。

Git 只管理代码。浏览器内的日记需另行导出，未来接入数据库后也要单独备份。

## 版本记录

当前代码版本为 v0.1.1，历史标签及各版中文说明见 [版本更新记录](../CHANGELOG.md)。

认可一个版本后，保留代码提交、带说明的 Git 标签和更新日志。已发布的标签不移动、不覆盖；后续修改使用新版本号。GitHub 版本号与正式网站的部署状态分开记录。
