# Desk Note

Desk Note 是一个轻量级 Windows 桌面便利贴待办应用，基于 Tauri、TypeScript 和 Rust。目标是常驻桌面、显示在系统托盘、隐藏任务栏入口，并支持多待办页面、拖拽排序、完成列表和本地持久化。

## 功能

- 多个待办页面，可新增、切换、重命名和删除。
- 待办项可新增、编辑、完成和拖拽排序。
- 完成项可永久删除。
- 数据保存到 Tauri app data 目录，启动时自动加载。
- 窗口默认便利贴大小，可调整大小、可拖动、置顶显示。
- 支持收缩到小窗口和恢复到展开尺寸。
- 系统托盘常驻，窗口不显示在任务栏。

## 推荐编译方式：GitHub Actions 云端编译

如果你的 Windows 电脑不能安装或运行 Docker、Node.js，推荐使用 GitHub Actions 云端编译。你的电脑只需要能把代码推送到 GitHub，不需要本地安装 Node、Rust 或 Docker。

已提供 workflow：

```text
.github/workflows/build-windows.yml
```

使用方式：

1. 把仓库推送到 GitHub。
2. 打开 GitHub 仓库页面。
3. 进入 `Actions`。
4. 选择 `Build Windows`。
5. 点击 `Run workflow`。
6. 等待任务结束后，在页面底部下载 artifact：`desk-note-windows`。

该 artifact 会包含生成的 Windows 程序或安装包，常见文件包括：

```text
desk-note.exe
*.exe
*.msi
```

这个方式仍然会在 GitHub 的 Windows runner 上使用 Node.js、Rust 和 MSVC，但这些依赖都运行在 GitHub 云端，不需要你的 Windows 电脑安装。

## 本地 Windows 编译环境

在 Windows 10/11 x64 上安装：

1. Node.js LTS: https://nodejs.org/
2. Rust: https://rustup.rs/
3. Microsoft Visual Studio Build Tools，并勾选 `Desktop development with C++`
4. WebView2 Runtime。Windows 11 通常自带；Windows 10 如果缺失，需要安装。

## 一键编译脚本

如果你的 Windows 电脑可以使用 Node.js 和 Rust，可以用本地脚本编译。

在 PowerShell 里进入项目目录：

```powershell
cd D:\path\to\desk_note
.\scripts\build-windows.ps1
```

脚本会执行：

- 检查 `node`、`npm`、`rustup`、`cargo`
- 检查 Visual Studio C++ Build Tools
- 执行 `npm ci`
- 添加 Rust target `x86_64-pc-windows-msvc`
- 执行 `npm test -- --run`
- 执行 `npm run build`
- 执行 `npm run tauri:build -- --target x86_64-pc-windows-msvc`

常用参数：

```powershell
# 跳过 npm 安装
.\scripts\build-windows.ps1 -SkipInstall

# 跳过测试
.\scripts\build-windows.ps1 -SkipTests

# 启动 Tauri 开发模式，不生成安装包
.\scripts\build-windows.ps1 -Dev
```

## 编译产物位置

脚本会在结束时打印 `.exe` 和 `.msi` 路径。常见位置：

```text
src-tauri\target\x86_64-pc-windows-msvc\release\desk-note.exe
src-tauri\target\x86_64-pc-windows-msvc\release\bundle\nsis\*.exe
src-tauri\target\x86_64-pc-windows-msvc\release\bundle\msi\*.msi
```

其中 `bundle\nsis\*.exe` 是更适合发给普通用户的安装包。

## 开发运行

只运行前端页面：

```powershell
npm run dev
```

运行真正的 Tauri 桌面应用：

```powershell
npm run tauri:dev
```

## WSL 编译说明

推荐在 Windows 原生环境编译。WSL 可以做前端构建和测试：

```bash
npm install
npm test -- --run
npm run build
```

但 Tauri Windows 安装包在 WSL 中交叉编译会更麻烦，`.msi` 尤其建议在 Windows 上生成。要稳定生成 Windows `.exe` 或安装包，优先使用 `scripts/build-windows.ps1`。

## `git merge dev` 报错排查

当前仓库检查结果：

- 当前分支是 `main`
- 本地存在 `dev`
- 当前 `HEAD` 已经是 `Merge branch 'dev'` 的合并提交
- 当前工作区是干净的

所以现在再次执行：

```bash
git merge dev
```

正常情况下应该提示 already up to date。

如果你之前执行时报错，常见原因是：

```bash
# 1. 不在 git 仓库目录
git status

# 2. 有未提交改动阻止合并
git status --short

# 3. 合并冲突
git status
git diff

# 4. dev 分支不存在或没有拉到本地
git branch --all
```

如果出现冲突，处理流程是：

```bash
git status
# 手动修改冲突文件
git add <冲突文件>
git commit
```

如果你把具体报错文本贴出来，可以进一步判断是哪一种。
