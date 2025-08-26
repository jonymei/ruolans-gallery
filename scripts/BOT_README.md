# Telegram Bot Setup Guide

这个 Telegram Bot 用于自动处理 Gemini Storybook 分享链接，执行导入、TTS 生成、数据验证和 Git 提交等操作。

## 前置要求

1. **Telegram Bot Token**
   - 向 @BotFather 申请一个新的 Bot Token
   - 获取你的 Telegram User ID（可以通过 @userinfobot 获取）

2. **环境变量配置**
   在项目根目录的 `.env` 文件中添加以下配置：

   ```bash
   # Telegram Bot 配置
   TELEGRAM_BOT_TOKEN=你的_Bot_Token
   TELEGRAM_USER_ID=你的_Telegram_用户ID
   
   # 现有的 Minimax 配置
   MINIMAX_GROUPID=你的_Minimax_Group_ID
   MINIMAX_API_KEY=你的_Minimax_API_Key
   ```

## 启动 Bot

```bash
# 启动 Telegram Bot
npm run bot
```

Bot 使用 Long Polling 模式运行，会持续监听 Telegram 消息。

## 使用方式

1. **启动 Bot 后**，向你的 Bot 发送 `/start` 命令查看帮助信息

2. **发送 Gemini 链接**，Bot 会自动：
   - 导入故事数据和图片
   - 生成 TTS 音频文件
   - 验证数据完整性
   - 提交到 Git 并推送到远程

3. **支持的命令**：
   - `/start` - 查看帮助信息
   - `/status` - 查看系统状态
   - 直接发送 Gemini 分享链接进行处理

## 支持的链接格式

- `https://gemini.google.com/share/...`
- `https://g.co/gemini/share/...`

## 处理流程

1. **验证用户权限** - 只有授权用户可以使用
2. **导入故事** - 调用 `import-gemini-story.js` 脚本
3. **生成音频** - 调用 TTS 脚本生成音频文件
4. **数据验证** - 检查配置文件、图片和目录结构
5. **Git 操作** - 添加文件、提交并推送到远程

## 错误处理

Bot 包含完整的错误处理机制：
- 用户权限验证
- 链接格式验证
- 脚本执行错误捕获
- Git 操作错误处理
- 详细的错误信息反馈

## 安全特性

- **用户白名单** - 只有指定的 Telegram User ID 可以使用
- **链接验证** - 只处理有效的 Gemini 分享链接
- **环境变量** - 敏感信息通过环境变量管理

## 日志和监控

Bot 会在控制台输出详细的操作日志：
- 接收到的消息信息
- 执行的命令和结果
- 错误信息和堆栈跟踪

## 停止 Bot

使用 `Ctrl+C` 或发送 SIGTERM 信号优雅地停止 Bot。

## 故障排除

1. **Bot 无法启动**
   - 检查 `.env` 文件中的 Token 配置
   - 确认 Bot Token 有效
   - 检查网络连接

2. **用户无法使用**
   - 确认 `TELEGRAM_USER_ID` 配置正确
   - 通过 @userinfobot 重新获取用户ID

3. **脚本执行失败**
   - 检查项目依赖是否完整安装
   - 确认 Playwright 浏览器已安装
   - 检查 Minimax API 配置

4. **Git 操作失败**
   - 确认 Git 仓库状态正常
   - 检查远程仓库连接
   - 确认有推送权限

## 开发模式

在开发过程中，可以修改 Bot 代码后重启服务：

```bash
# 停止当前 Bot (Ctrl+C)
# 重新启动
npm run bot
```