# TTS 语音合成脚本使用指南

## 概述

这个脚本使用 Minimax API 为故事书生成语音朗读音频。它会读取 YAML 格式的故事配置文件，为每一页内容生成对应的 MP3 音频文件。

## 功能特性

- 🎯 自动读取 YAML 故事配置文件
- 🔊 使用 Minimax Speech 2.5 HD 模型生成高质量音频
- 📁 自动创建目录结构
- ⚡ 智能跳过已存在的音频文件
- � 音频文件完整性验证
- 📊 详细的音频状态报告
- �🚦 API 频率限制保护（每次调用间隔 1 秒）
- � 详细的进度反馈和错误处理
- 🔄 支持批量处理所有故事

## 环境配置

### 1. 安装依赖

确保项目已安装所需的 npm 包：

```bash
npm install js-yaml dotenv
```

### 2. 配置环境变量

在项目根目录的 `.env` 文件中设置你的 Minimax API 凭据：

```env
MINIMAX_GROUPID=你的group_id
MINIMAX_API_KEY=你的api_key
```

> ⚠️ 请妥善保管你的 API 密钥，不要提交到版本控制系统中。

## 使用方法

### 基本用法

```bash
# 为单个故事生成音频
node scripts/tts.js story_001

# 为所有故事生成音频
node scripts/tts.js all

# 查看所有故事的音频状态
node scripts/tts.js status

# 检查指定故事的音频状态
node scripts/tts.js check story_001
```

### npm scripts 快捷方式

```bash
# 为所有故事生成音频
npm run tts:all

# 查看音频状态报告
npm run tts:status

# 为单个故事生成音频
npm run tts story_001
```

### 使用示例

```bash
# 切换到项目目录
cd /Users/junmei/GitHub/ruolans-gallery

# 为 story_001 生成音频
node scripts/tts.js story_001

# 为所有故事生成音频（批量处理）
node scripts/tts.js all
```

## 文件结构要求

脚本期望以下文件结构：

```
src/config/
  ├── story_001.yaml    # 故事配置文件
  ├── story_002.yaml
  └── ...

public/audios/
  ├── story_001/        # 音频输出目录（自动创建）
  │   ├── 01.mp3
  │   ├── 02.mp3
  │   └── ...
  └── story_002/
      ├── 01.mp3
      └── ...
```

### YAML 配置文件格式

每个故事需要一个对应的 YAML 配置文件，格式如下：

```yaml
title: "故事标题"
author: "作者名字"
createdDate: "2025-08-20"
tags: ["标签1", "标签2"]

pages:
  - "第一页的故事文字内容..."
  - "第二页的故事文字内容..."
  - "第三页的故事文字内容..."
  # ... 继续到第10页
```

## 语音设置

脚本使用以下语音配置：

- **模型**: `speech-2.5-hd-preview` (最新的 HD 模型)
- **音色**: `Chinese (Mandarin)_Cute_Spirit` (可爱的中文女声)
- **语速**: 1.0 (正常语速)
- **音调**: 0 (默认音调)
- **音量**: 1.0 (最大音量)
- **音频格式**: MP3
- **采样率**: 32000 Hz
- **比特率**: 128000 bps

## 输出文件

- **文件格式**: MP3
- **命名规则**: `01.mp3`, `02.mp3`, ..., `10.mp3`
- **文件大小**: 通常每个文件 300-400 KB
- **音频质量**: 高清音质，适合在线播放和离线收听

## 错误处理

脚本包含完善的错误处理机制：

1. **环境变量检查**: 启动时验证 API 凭据
2. **文件存在性检查**: 确保配置文件存在
3. **API 错误处理**: 捕获和报告 API 调用错误
4. **网络错误处理**: 处理网络连接问题
5. **跳过已存在文件**: 避免重复生成相同音频

## 常见问题

### Q: 如何更改语音音色？

A: 修改 `generateAudio` 函数中的 `voiceId` 参数。可用的音色 ID 可以在 Minimax 文档中查找。

### Q: 生成的音频文件太大怎么办？

A: 可以调整 `audio_setting` 中的 `bitrate` 参数，降低比特率可以减小文件大小。

### Q: 如何自定义语速？

A: 修改 `voice_setting` 中的 `speed` 参数（0.5-2.0 之间）。

### Q: API 调用失败怎么办？

A: 检查以下几点：
- 确认 API 密钥和 Group ID 正确
- 检查网络连接
- 确认账户有足够的余额
- 查看错误信息中的具体原因

## API 使用限制

- 单次文本长度限制：10,000 字符
- 建议的请求频率：每秒不超过 1 次
- 请根据你的 Minimax 账户套餐查看具体的调用限制

## 技术细节

- **Node.js 版本**: 支持 ES Modules
- **并发处理**: 顺序处理以避免 API 频率限制
- **内存管理**: 及时释放音频数据内存
- **编码格式**: 音频数据使用 Hex 编码传输后转换为 Buffer

## 扩展功能

可以考虑添加的功能：

1. 多语言支持
2. 批量音色测试
3. 音频质量验证
4. 进度条显示
5. 音频预览功能
6. 自动重试机制

## 许可证

此脚本仅供 ruolans-gallery 项目内部使用。请遵守 Minimax API 的使用条款。
