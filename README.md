# 若兰的AI故事书集锦 (Ruolan's AI Storybook Gallery)

为6岁女孩若兰创建的个人AI故事书展示网站，用于展示她创作的AI生成故事书作品。

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
│   │   └── story_001/
│   │       ├── cover.png     # 封面图
│   │       ├── 01.png        # 第1页
│   │       └── ...
│   └── audios/               # 故事音频目录（预留）
│       └── story_001/
│           ├── 01.mp3
│           └── ...
├── src/
│   ├── components/
│   │   ├── HeroSection.astro
│   │   ├── Navigation.astro
│   │   ├── StoryCard.astro   # 故事卡片组件
│   │   └── Welcome.astro
│   ├── config/               # 故事配置文件
│   │   └── story_001.yaml    # 故事内容配置
│   ├── layouts/
│   │   └── Layout.astro
│   ├── lib/
│   │   └── stories.ts        # 故事数据处理
│   └── pages/
│       ├── index.astro       # 首页
│       ├── 404.astro         # 404页面
│       └── stories/
│           └── [id].astro    # 动态故事阅读页
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

## 📝 添加新故事

查看 [故事添加指南](./STORY_GUIDE.md) 了解如何添加新的故事书。

简单步骤：
1. 在 `public/stories/story_XXX/` 添加图片文件
2. 在 `src/config/story_XXX.yaml` 创建配置文件
3. 重启开发服务器

## 🎯 下一步计划

- [ ] 添加音频文件和语音播放功能
- [ ] 性能优化（图片懒加载、预加载）
- [ ] SEO优化
- [ ] 部署到生产环境

## 🛠️ 技术栈

- **框架：** Astro
- **样式：** Tailwind CSS + 自定义CSS
- **语言：** TypeScript
- **图标：** Lucide Icons
- **配置：** YAML

## 🧞 命令说明

| 命令                        | 作用                                              |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | 安装依赖                                          |
| `npm run dev`             | 启动开发服务器 `localhost:4321`                   |
| `npm run build`           | 构建生产版本到 `./dist/`                          |
| `npm run preview`         | 预览构建结果                                      |
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

### 音频功能（预留）
- 支持每页独立音频文件
- 播放/暂停控制
- 播放速度调节
- 自动翻页功能

---

**项目作者：** GitHub Copilot  
**创建时间：** 2025年8月21日  
**版本：** v1.0
