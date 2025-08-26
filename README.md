# 若兰的AI故事书集锦 (Ruolan's AI Storybook Gallery)

为6岁女孩若兰创建的个人AI故事书展示网站，用于展示她创作的AI生成故事书作品集。

## ✨ 已完成功能

### 📚 故事书展示
- ✅ 首页故事书封面展示
- ✅ 网格布局，响应式设计
- ✅ 故事卡片hover效果
- ✅ 故事元信息展示（标题、作者、描述、日期）

### 📖 故事书阅读器
- ✅ 完整的故事书阅读体验
- ✅ 图片+文字双重展示
- ✅ 翻页功能（按钮、键盘、滑动）
- ✅ 页码显示
- ✅ 全屏阅读模式
- ✅ 响应式布局（PC、平板、移动端）
- ✅ 音频功能预留（待添加音频文件）

### 🎨 设计特色
- ✅ 童真可爱的设计风格
- ✅ 粉色系温暖色彩搭配
- ✅ 流畅的动画效果
- ✅ 优秀的用户体验

## 🏗️ 项目结构

```text
/
├── public/
│   ├── favicon.svg
│   ├── stories/              # 故事图片目录
│   │   └── 001/              # 3位数字故事ID
│   │       ├── cover.png     # 封面图
│   │       ├── 01.png        # 第1页
│   │       └── ... (01.png-10.png, +可选扩展)
│   └── audios/               # 故事音频目录（可选）
│       └── 001/
│           ├── 01.mp3        # 第1页音频
│           └── ... (01.mp3-10.mp3, +可选扩展)
├── src/
│   ├── components/
│   │   ├── HeroSection.astro
│   │   ├── Navigation.astro
│   │   ├── StoryCard.astro   # 故事卡片组件
│   │   └── Welcome.astro
│   │   └── story/
│   │       ├── desktop/
│   │       │   └── DesktopStoryReader.astro
│   │       └── mobile/
│   │           └── MobileStoryReader.astro
│   ├── config/               # 故事配置文件
│   │   └── 001.yaml          # 故事内容配置
│   ├── layouts/
│   │   └── Layout.astro
│   ├── lib/
│   │   ├── stories.ts        # 故事数据处理
│   │   └── device.ts         # 设备检测
│   └── pages/
│       ├── index.astro       # 首页
│       ├── 404.astro         # 404页面
│       ├── about.astro       # 关于页面
│       └── stories/
│           └── [id].astro    # 动态故事阅读页
├── scripts/
│   ├── README.md            # 脚本使用说明
│   ├── tts.js               # 文本转语音脚本
│   └── import-gemini-story.js # Gemini故事导入脚本
└── package.json
```

## 🚀 快速开始

### 安装依赖
```sh
npm install
```

### 启动开发服务器
```sh
npm run dev
```

### 构建生产版本
```sh
npm run build
```

### 预览生产版本
```sh
npm run preview
```

## 📝 添加新故事

查看 [故事添加指南](./STORY_GUIDE.md) 了解如何添加新的故事书。

简单步骤：
1. 在 `public/stories/XXX/` 添加图片文件（XXX为3位数字ID）
2. 在 `src/config/XXX.yaml` 创建配置文件
3. 可选：生成音频文件 `npm run tts XXX`
4. 重启开发服务器

## 🎯 已完成 ✅

- [x] ✅ 添加音频文件和语音播放功能
- [x] ✅ 性能优化（图片懒加载、预加载）
- [x] ✅ SEO优化（Open Graph、Twitter Cards）
- [x] ✅ 部署配置完成

## 🎯 下一步计划

- [ ] 添加更多优质故事内容
- [ ] 添加收藏/点赞功能
- [ ] 添加故事分类和标签筛选
- [ ] 添加搜索功能
- [ ] 国际化支持（中英文切换）

## 🛠️ 技术栈

- **框架：** Astro 5.x
- **样式：** Tailwind CSS + 自定义CSS
- **语言：** TypeScript
- **图标：** Lucide Icons
- **配置：** YAML
- **音频：** Minimax TTS API集成
- **部署：** 静态部署就绪

## 🧞 命令说明

| 命令                        | 作用                                              |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | 安装依赖                                          |
| `npm run dev`             | 启动开发服务器 `localhost:4321`                   |
| `npm run build`           | 构建生产版本到 `./dist/`                          |
| `npm run preview`         | 预览构建结果                                      |
| `npm run tts story_xxx`   | 生成指定故事的音频（xxx为故事ID如001）            |
| `npm run tts:all`        | 生成所有故事的音频                                |
| `npm run tts:status`     | 查看音频生成状态                                  |
| `npm run astro ...`       | 运行Astro CLI命令                                 |

## 💫 特性说明

### 响应式设计
- PC端：左右分栏布局，图片+控制面板
- 移动端：上下堆叠布局，适合触摸操作
- 平板端：紧凑版PC布局

### 交互功能
- 键盘导航：左右方向键翻页，ESC退出全屏
- 触摸手势：左右滑动翻页（移动端）
- 全屏阅读：沉浸式阅读体验

### 音频功能 ✅
- ✅ 支持每页独立音频文件
- ✅ 播放/暂停控制
- ✅ 播放进度显示
- ✅ 播放速度调节（0.5x - 2x）
- ✅ 自动翻页功能
- ✅ 连续播放功能
- ✅ 音频同步滚动文字

---

**项目作者：** GitHub Copilot  
**创建时间：** 2025年8月21日  
**版本：** v2.0
**故事数量：** 11篇  
**音频状态：** 全部生成完成
