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
        const images: StoryImages = {
          cover: `/stories/${storyId}/cover.png`,
          pages: [
            `/stories/${storyId}/01.png`,
            `/stories/${storyId}/02.png`,
            `/stories/${storyId}/03.png`,
            `/stories/${storyId}/04.png`,
            `/stories/${storyId}/05.png`,
            `/stories/${storyId}/06.png`,
            `/stories/${storyId}/07.png`,
            `/stories/${storyId}/08.png`,
            `/stories/${storyId}/09.png`,
            `/stories/${storyId}/10.png`
          ]
        };

        // 构建音频路径（预留，暂时没有音频文件）
        const audios: StoryAudios = {
          pages: [
            `/audios/${storyId}/01.mp3`,
            `/audios/${storyId}/02.mp3`,
            `/audios/${storyId}/03.mp3`,
            `/audios/${storyId}/04.mp3`,
            `/audios/${storyId}/05.mp3`,
            `/audios/${storyId}/06.mp3`,
            `/audios/${storyId}/07.mp3`,
            `/audios/${storyId}/08.mp3`,
            `/audios/${storyId}/09.mp3`,
            `/audios/${storyId}/10.mp3`
          ]
        };
        
        // 简单粗暴复制10份相同的故事
        for (let i = 1; i <= 10; i++) {
          stories.push({
            id: `${storyId}_${i}`,
            config,
            images,
            audios // 包含音频路径，但文件暂时不存在
          });
        }
        
      } catch (error) {
        console.error(`Error loading story config for ${storyId}:`, error);
      }
    }
    
  } catch (error) {
    console.error('Error loading stories:', error);
  }
  
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
