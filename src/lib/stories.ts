import yaml from 'js-yaml';

// 故事配置接口
export interface StoryConfig {
  title: string;
  author: string;
  createdDate: string;
  description?: string;
  tags: string[];
  pages: string[];
}

// 故事图片接口
export interface StoryImages {
  cover: string;
  pages: string[];
}

// 故事音频接口（预留）
export interface StoryAudios {
  pages: string[];
}

// 完整故事接口
export interface Story {
  id: string;
  config: StoryConfig;
  images: StoryImages;
  audios?: StoryAudios; // 可选，暂时没有音频文件
}

// 使用 import.meta.glob 获取所有 YAML 配置文件
const configModules = import.meta.glob('/src/config/*.yaml', { 
  query: '?raw',
  import: 'default',
  eager: true 
});

// 动态地获取所有故事页面图片和音频
const imagePageModules = import.meta.glob('/public/stories/*/[0-9][0-9].png', { eager: true, import: 'default' });
const audioPageModules = import.meta.glob('/public/audios/*/[0-9][0-9].mp3', { eager: true, import: 'default' });

// 获取所有故事
export async function getAllStories(): Promise<Story[]> {
  const stories: Story[] = [];
  
  try {
    // 处理每个配置文件
    for (const [configPath, configContent] of Object.entries(configModules)) {
      const storyId = configPath.match(/\/([^\/]+)\.yaml$/)?.[1];
      if (!storyId) continue;
      
      try {
        // 解析 YAML 配置
        const config = yaml.load(configContent as string) as StoryConfig;
        
        // 设置默认描述
        if (!config.description) {
          config.description = config.pages[0] || '一个精彩的故事...';
        }
        
        // 构建图片路径
        const pageImagePaths = Object.keys(imagePageModules)
          .filter(path => path.startsWith(`/public/stories/${storyId}/`))
          .sort();

        const images: StoryImages = {
          cover: `/stories/${storyId}/cover.png`,
          pages: pageImagePaths.map(path => path.replace('/public', ''))
        };

        // 构建音频路径
        const pageAudioPaths = Object.keys(audioPageModules)
          .filter(path => path.startsWith(`/public/audios/${storyId}/`))
          .sort();
        
        const audios: StoryAudios = {
          pages: pageAudioPaths.map(path => path.replace('/public', ''))
        };
        
        // 创建故事对象
        stories.push({
          id: storyId, // 直接使用原始的故事ID
          config,
          images,
          audios // 包含音频路径
        });
        
      } catch (error) {
        console.error(`Error loading story config for ${storyId}:`, error);
      }
    }
    
  } catch (error) {
    console.error('Error loading stories:', error);
  }

  // 按创建日期倒序排序
  stories.sort((a, b) => {
    const dateA = new Date(a.config.createdDate);
    const dateB = new Date(b.config.createdDate);
    return dateB.getTime() - dateA.getTime();
  });
  
  return stories;
}

// 根据ID获取单个故事
export async function getStoryById(id: string): Promise<Story | null> {
  const stories = await getAllStories();
  return stories.find(story => story.id === id) || null;
}

// 获取故事数量
export async function getStoriesCount(): Promise<number> {
  const stories = await getAllStories();
  return stories.length;
}
