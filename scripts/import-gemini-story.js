#!/usr/bin/env node

/**
 * Gemini Storybook Importer
 * 
 * 使用方法:
 * node scripts/import-gemini-story.js <gemini_share_url>
 * 
 * 示例:
 * node scripts/import-gemini-story.js https://g.co/gemini/share/8baffb7a1a87
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { chromium } from 'playwright';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class GeminiStoryImporter {
  constructor() {
    this.projectRoot = path.join(__dirname, '..');
    this.storiesDir = path.join(this.projectRoot, 'public', 'stories');
    this.configDir = path.join(this.projectRoot, 'src', 'config');
  }

  // 获取下一个可用的故事ID
  getNextStoryId() {
    const configFiles = fs.readdirSync(this.configDir)
      .filter(file => file.match(/^\d{3}\.yaml$/))
      .map(file => parseInt(file.replace('.yaml', '')))
      .sort((a, b) => b - a);
    
    const nextId = configFiles.length > 0 ? configFiles[0] + 1 : 1;
    return nextId.toString().padStart(3, '0');
  }

  // 下载图片
  async downloadImage(url, filePath) {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(filePath);
      
      https.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          resolve();
        });
        
        file.on('error', (err) => {
          fs.unlink(filePath, () => {}); // 删除失败的文件
          reject(err);
        });
      }).on('error', reject);
    });
  }

  // 提取故事内容
  async extractStoryContent(url) {
    const browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    // 设置用户代理和视口
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    await page.setViewportSize({ width: 1280, height: 720 });
    
    try {
      console.log('正在加载页面:', url);
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });
      
      // 等待页面完全加载
      console.log('等待页面加载完成...');
      await page.waitForTimeout(8000);
      
      // 获取故事标题
      const getTitle = async () => {
        try {
          // 尝试多种标题选择器
          const titleSelectors = [
            'div.cover-title',
            '.cover-title', 
            '[class*="title"]',
            'h1', 'h2', 'h3'
          ];
          
          for (const selector of titleSelectors) {
            const titleElement = page.locator(selector).first();
            if (await titleElement.isVisible()) {
              const text = await titleElement.textContent();
              if (text && text.trim()) {
                console.log(`找到标题 (${selector}): ${text.trim()}`);
                return text.trim();
              }
            }
          }
          
          return '未知故事';
        } catch (error) {
          console.log('获取标题失败:', error.message);
          return '未知故事';
        }
      };
      
      // 获取封面图片
      const getCoverImage = async () => {
        try {
          const coverSelectors = [
            'storybook-cover-page-content img',
            '[class*="cover"] img',
            'img'
          ];
          
          for (const selector of coverSelectors) {
            const imgElement = page.locator(selector).first();
            if (await imgElement.isVisible()) {
              const src = await imgElement.getAttribute('src');
              const alt = await imgElement.getAttribute('alt') || '故事封面';
              if (src) {
                console.log(`找到封面图片 (${selector}): ${src.substring(0, 100)}...`);
                return { src, alt };
              }
            }
          }
          
          return null;
        } catch (error) {
          console.log('获取封面图片失败:', error.message);
          return null;
        }
      };
      
      // 获取当前页面的内容
      const getCurrentPageContent = async () => {
        try {
          const content = { images: [], text: '' };
          
          // 尝试不同的选择器策略
          let spreadContainer;
          try {
            // 首先尝试找到没有 hide 类的容器
            spreadContainer = page.locator('div.spread-container.ng-star-inserted:not(.hide)').first();
            if (await spreadContainer.isVisible()) {
              console.log('使用主选择器策略');
            } else {
              // 如果上面的选择器没有找到可见元素，使用更简单的选择器
              console.log('使用备用选择器策略');
              spreadContainer = page.locator('div.spread-container').first();
            } 
          } catch (error) {
            console.log('使用备用选择器策略');
            spreadContainer = page.locator('div.spread-container').first();
          }
          
          if (await spreadContainer.isVisible()) {
            // 查找故事页面元素
            const storyPages = spreadContainer.locator('storybook-page');
            const pageCount = await storyPages.count();
            console.log(`找到 ${pageCount} 个 storybook-page 元素`);
            
            if (pageCount >= 2) {
              // 第一个页面通常包含图片
              const imagePage = storyPages.nth(0);
              const pageImage = imagePage.locator('img').first();
              
              if (await pageImage.isVisible()) {
                const src = await pageImage.getAttribute('src');
                const alt = await pageImage.getAttribute('alt') || '故事图片';
                if (src) {
                  content.images.push({ src, alt });
                  console.log(`找到页面图片: ${src.substring(0, 100)}...`);
                }
              }
              
              // 第二个页面通常包含文本
              const textPage = storyPages.nth(1);
              const textElement = textPage.locator('.main-page-layer p.story-text').first();
              
              if (await textElement.isVisible()) {
                const text = await textElement.textContent();
                if (text && text.trim()) {
                  content.text = text.trim();
                  console.log(`找到页面文本: ${text.trim().substring(0, 50)}...`);
                }
              }
            }
          } else {
            console.log('未找到可见的 spread-container');
          }
          
          return content;
        } catch (error) {
          console.log('获取页面内容失败:', error.message);
          return { images: [], text: '' };
        }
      };
      
      // 检查下一页按钮是否存在且可用
      const hasNextPage = async () => {
        try {
          const nextButton = page.locator('[data-test-id="next-page-button"]');
          const exists = await nextButton.isVisible();
          const disabled = await nextButton.isDisabled();
          console.log('下一页按钮状态:', { exists, disabled });
          return exists && !disabled;
        } catch (error) {
          console.log('检查下一页按钮失败:', error.message);
          return false;
        }
      };
      
      // 点击下一页按钮
      const goToNextPage = async () => {
        try {
          const nextButton = page.locator('[data-test-id="next-page-button"]');
          
          if (await nextButton.isVisible() && !(await nextButton.isDisabled())) {
            console.log('点击下一页按钮...');
            // 点击按钮
            await nextButton.click();
            
            return true;
          }
          
          return false;
        } catch (error) {
          console.log('点击下一页失败:', error.message);
          return false;
        }
      };
      
      console.log('开始提取故事内容...');
      
      // 1. 获取标题和封面
      const title = await getTitle();
      const coverImage = await getCoverImage();
      
      console.log('故事标题:', title);
      console.log('封面图片:', coverImage ? '已找到' : '未找到');
      
      // 2. 收集所有页面的内容
      const pages = [];
      const allImages = [];
      let pageNumber = 0;
      
      // 添加封面图片到图片列表
      if (coverImage) {
        allImages.push(coverImage);
      }

      // 检查翻页控件内容
      const pageLabel = await page.locator('span.page-number').innerText();
      console.log('当前页码标签:', pageLabel);

      // 从封面进入第一页故事
      console.log('从封面进入第一页故事...');
      if (await hasNextPage()) {
        console.log('准备从封面进入第一页...');
        const result = await goToNextPage();
        console.log('封面页导航结果:', result);
        await page.waitForTimeout(2000);
      } else {
        console.log('封面页无下一页按钮');
      }
      
      // 遍历所有故事页面
      let previousText = '';
      while (true) {
        console.log(`正在处理第 ${pageNumber + 1} 页...`);
        
        // 等待页面内容加载
        await page.waitForTimeout(3000);

        // 获取当前页码标签
        const pageLabel = await page.locator('span.page-number').innerText();
        console.log('当前页码标签:', pageLabel);

        
        // 获取当前页面内容
        const pageContent = await getCurrentPageContent();
        
        if (pageContent.text) {
          // 检查是否和上一页内容相同
          if (pageContent.text === previousText && pageNumber > 0) {
            console.log(`第 ${pageNumber + 1} 页内容与前一页相同，可能导航失败`);
            // 尝试再次等待和获取内容
            await page.waitForTimeout(2000);
            const retryContent = await getCurrentPageContent();
            if (retryContent.text === previousText) {
              console.log('重试后内容仍相同，跳出循环');
              break;
            }
            pageContent.text = retryContent.text;
          }
          
          pages.push({
            pageNumber: pageNumber + 1,
            text: pageContent.text
          });
          console.log(`第 ${pageNumber + 1} 页文字: ${pageContent.text.substring(0, 50)}...`);
          previousText = pageContent.text;
        } else {
          console.log(`第 ${pageNumber + 1} 页未找到文字内容`);
        }
        
        // 收集当前页面的图片
        if (pageContent.images.length > 0) {
          pageContent.images.forEach(img => {
            if (!allImages.some(existing => existing.src === img.src)) {
              allImages.push(img);
              console.log(`添加图片: ${img.src.substring(0, 100)}...`);
            }
          });
        } else {
          console.log(`第 ${pageNumber + 1} 页未找到图片`);
        }
        
        pageNumber++;
        
        // 检查是否还有下一页
        const hasNext = await hasNextPage();
        console.log('检查是否有下一页:', hasNext);
        
        if (!hasNext) {
          console.log('已到达最后一页');
          break;
        }
        
        // 点击下一页
        console.log('点击下一页按钮...');
        const success = await goToNextPage();
        console.log('导航成功:', success);
        
        if (!success) {
          console.log('无法点击下一页，结束遍历');
          break;
        }
        
        console.log('已点击下一页，页面内容已更新');
        
        // 安全限制：最多处理15页（故事页面）
        if (pageNumber >= 15) {
          console.log('达到最大页数限制，停止遍历');
          break;
        }
      }
      
      console.log(`总共提取了 ${pages.length} 页内容`);
      console.log(`总共找到 ${allImages.length} 张图片`);
      
      return {
        title,
        totalPages: pages.length,
        pages,
        images: allImages,
        extractedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('提取故事内容失败:', error.message);
      throw error;
    } finally {
      await browser.close();
    }
  }

  // 生成YAML配置
  generateYamlConfig(storyData, storyId) {
    const config = {
      title: storyData.title,
      author: '若兰',
      createdDate: new Date().toISOString().split('T')[0],
      tags: ['AI生成', '儿童故事'],
      pages: []
    };

    // 根据实际提取的页面数量生成配置
    const actualPageCount = storyData.pages.length;
    
    for (let i = 1; i <= actualPageCount; i++) {
      const extractedPage = storyData.pages.find(p => p.pageNumber === i);
      config.pages.push({
        text: extractedPage ? extractedPage.text : `第${i}页内容（请手动补充）`
      });
    }

    return yaml.dump(config, { 
      allowUnicode: true,
      lineWidth: -1 
    });
  }

  // 主要导入流程
  async import(url) {
    try {
      // 1. 提取故事内容
      console.log('开始提取故事内容...');
      const storyData = await this.extractStoryContent(url);
      
      console.log('页面evaluate执行结果:', storyData);
      
      console.log('提取结果:', {
        title: storyData.title,
        totalPages: storyData.totalPages,
        pagesExtracted: storyData.pages.length,
        imagesFound: storyData.images.length
      });

      if (!storyData.title) {
        throw new Error(`无法提取故事标题: ${JSON.stringify(storyData)}`);
      }

      if (storyData.images.length === 0) {
        throw new Error('未找到故事图片');
      }

      // 2. 获取新的故事ID
      const storyId = this.getNextStoryId();
      console.log('分配故事ID:', storyId);

      // 3. 创建目录
      const storyDir = path.join(this.storiesDir, storyId);
      if (!fs.existsSync(storyDir)) {
        fs.mkdirSync(storyDir, { recursive: true });
      }

      // 4. 下载图片
      console.log('开始下载图片...');
      
      // 检查图片数量是否过多
      if (storyData.images.length > 20) {
        throw new Error(`图片数量过多 (${storyData.images.length} 张)，最多支持 20 张图片`);
      }
      
      const imagesToDownload = storyData.images.length;
      
      for (let i = 0; i < imagesToDownload; i++) {
        const imageUrl = storyData.images[i].src;
        const filename = i === 0 ? 'cover.png' : `${(i).toString().padStart(2, '0')}.png`;
        const filePath = path.join(storyDir, filename);
        
        try {
          console.log(`下载图片 ${filename}...`);
          await this.downloadImage(imageUrl, filePath);
        } catch (error) {
          console.error(`下载图片 ${filename} 失败:`, error.message);
        }
      }

      // 5. 生成YAML配置文件
      console.log('生成配置文件...');
      const yamlContent = this.generateYamlConfig(storyData, storyId);
      const configPath = path.join(this.configDir, `${storyId}.yaml`);
      fs.writeFileSync(configPath, yamlContent, 'utf8');

      console.log('\n导入完成！');
      console.log('故事ID:', storyId);
      console.log('故事标题:', storyData.title);
      console.log('配置文件:', configPath);
      console.log('图片目录:', storyDir);
      console.log('下载图片数量:', imagesToDownload);
      
      if (storyData.pages.length < storyData.totalPages) {
        console.log('\n⚠️ 注意: 只提取了', storyData.pages.length, '页内容，总共', storyData.totalPages, '页');
        console.log('请手动检查并补充缺失的页面内容');
      }

      console.log('\n请重启开发服务器查看新故事: npm run dev');

    } catch (error) {
      console.error('导入失败:', error.message);
      process.exit(1);
    }
  }
}

// 命令行入口
async function main() {
  const url = process.argv[2];
  
  if (!url) {
    console.error('使用方法: node scripts/import-gemini-story.js <gemini_share_url>');
    console.error('示例: node scripts/import-gemini-story.js https://g.co/gemini/share/8baffb7a1a87');
    process.exit(1);
  }

  if (!url.includes('gemini.google.com') && !url.includes('g.co/gemini')) {
    console.error('错误: 请提供有效的 Gemini 故事分享链接');
    process.exit(1);
  }

  const importer = new GeminiStoryImporter();
  await importer.import(url);
}

// 如果直接运行这个脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default GeminiStoryImporter;