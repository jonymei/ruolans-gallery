#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import https from 'https'
import { chromium } from 'playwright'
import yaml from 'js-yaml'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const PROJECT_ROOT = path.join(__dirname, '..')
const STORIES_DIR = path.join(PROJECT_ROOT, 'public', 'stories')
const CONFIG_DIR = path.join(PROJECT_ROOT, 'src', 'config')

function getNextStoryId() {
  const configFiles = fs
    .readdirSync(CONFIG_DIR)
    .filter((file) => file.match(/^\d{3}\.yaml$/))
    .map((file) => parseInt(file.replace('.yaml', '')))
    .sort((a, b) => b - a)

  const nextId = configFiles.length > 0 ? configFiles[0] + 1 : 1
  return nextId.toString().padStart(3, '0')
}

function downloadImage(url, filePath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath)

    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`))
          return
        }

        response.pipe(file)
        file.on('finish', () => {
          file.close()
          resolve()
        })
        file.on('error', reject)
      })
      .on('error', reject)
  })
}

async function extractStoryContent(url) {
  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  const page = await browser.newPage()

  await page.setExtraHTTPHeaders({
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  })
  await page.setViewportSize({ width: 1280, height: 720 })

  try {
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    })

    await page.waitForTimeout(8000)

    const getTitle = async () => {
      const titleSelectors = [
        'div.cover-title',
        '.cover-title',
        '[class*="title"]',
        'h1',
        'h2',
        'h3',
      ]

      for (const selector of titleSelectors) {
        const titleElement = page.locator(selector).first()
        if (await titleElement.isVisible()) {
          const text = await titleElement.textContent()
          if (text?.trim()) return text.trim()
        }
      }

      throw new Error('无法提取故事标题')
    }

    const getCoverImage = async () => {
      const coverSelectors = [
        'storybook-cover-page-content img',
        '[class*="cover"] img',
        'img',
      ]

      for (const selector of coverSelectors) {
        const imgElement = page.locator(selector).first()
        if (await imgElement.isVisible()) {
          const src = await imgElement.getAttribute('src')
          const alt = (await imgElement.getAttribute('alt')) || '故事封面'
          if (src) return { src, alt }
        }
      }

      throw new Error('无法获取封面图片')
    }

    const getCurrentPageContent = async () => {
      const content = { imageUrl: null, text: '' }

      const spreadContainer = await page
        .locator('div.spread-container.ng-star-inserted:not(.hide)')
        .first()

      if (!(await spreadContainer.isVisible())) {
        throw new Error('当前页面内容不可见')
      }

      const storyPages = spreadContainer.locator('storybook-page')
      const pageCount = await storyPages.count()

      if (pageCount != 2) {
        throw new Error('当前页面内容不符合预期')
      }
      const imagePage = storyPages.nth(0)
      const pageImage = imagePage.locator('.main-page-layer img').first()

      if (await pageImage.isVisible()) {
        const src = await pageImage.getAttribute('src')
        if (src) {
          content.imageUrl = src
          console.log(`找到页面图片: ${src.substring(0, 100)}...`)
        }
      }

      const textPage = storyPages.nth(1)
      const textElement = textPage
        .locator('.main-page-layer p.story-text')
        .first()

      if (await textElement.isVisible()) {
        const text = await textElement.textContent()
        if (text?.trim()) {
          content.text = text.trim()
          console.log(`找到页面文本: ${text.trim().substring(0, 50)}...`)
        }
      }

      return content
    }

    const hasNextPage = async () => {
      const nextButton = page.locator('[data-test-id="next-page-button"]')
      return (await nextButton.isVisible()) && !(await nextButton.isDisabled())
    }

    const goToNextPage = async () => {
      const nextButton = page.locator('[data-test-id="next-page-button"]')

      if (await hasNextPage()) {
        await nextButton.click()
        return true
      }

      return false
    }

    const title = await getTitle()
    const coverImage = await getCoverImage()

    const pages = []
    const allImages = [coverImage]
    let pageNumber = 0

    if (await hasNextPage()) {
      if (!(await goToNextPage())) {
        throw new Error('无法从封面页导航到第一页')
      }
      await page.waitForTimeout(2000)
    }

    let previousText = ''
    while (true) {
      await page.waitForTimeout(3000)

      const pageContent = await getCurrentPageContent()

      if (pageContent.text) {
        if (pageContent.text === previousText && pageNumber > 0) {
          await page.waitForTimeout(2000)
          const retryContent = await getCurrentPageContent()
          if (retryContent.text === previousText) {
            break
          }
          pageContent.text = retryContent.text
        }

        pages.push({
          pageNumber: pageNumber + 1,
          text: pageContent.text,
        })
        previousText = pageContent.text
      }

      if (pageContent.imageUrl) {
        if (
          allImages.some((existing) => existing.src === pageContent.imageUrl)
        ) {
          console.warn(
            `重复添加图片: ${pageContent.imageUrl.substring(0, 100)}...`
          )
        }
        allImages.push({ src: pageContent.imageUrl, alt: '故事图片' })
      }

      pageNumber++

      if (!(await hasNextPage()) || pageNumber >= 20) {
        break
      }

      if (!(await goToNextPage())) {
        break
      }
    }

    if (pages.length === 0) {
      throw new Error('未提取到任何页面内容')
    }

    if (allImages.length === 0) {
      throw new Error('未找到任何图片')
    }

    // 检查图片和文本数量匹配：图片数量应该比文本页数多1（封面）
    if (allImages.length !== pages.length + 1) {
      throw new Error(
        `图片和文本数量不匹配：图片${allImages.length}张，文本${
          pages.length
        }页（期望图片数量为${pages.length + 1}）`
      )
    }

    return {
      title,
      totalPages: pages.length,
      pages,
      images: allImages,
      extractedAt: new Date().toISOString(),
    }
  } finally {
    await browser.close()
  }
}

function generateYamlConfig(storyData) {
  const config = {
    title: storyData.title,
    author: '若兰',
    createdDate: new Date().toISOString().split('T')[0],
    tags: ['AI生成', '儿童故事'],
    pages: storyData.pages.map((page) => ({ text: page.text })),
  }

  return yaml.dump(config, {
    allowUnicode: true,
    lineWidth: -1,
  })
}

async function importStory(url) {
  const storyData = await extractStoryContent(url)

  const storyId = getNextStoryId()
  const storyDir = path.join(STORIES_DIR, storyId)

  if (!fs.existsSync(storyDir)) {
    fs.mkdirSync(storyDir, { recursive: true })
  }

  if (storyData.images.length > 20) {
    throw new Error(
      `图片数量过多 (${storyData.images.length} 张)，最多支持 20 张图片`
    )
  }

  for (let i = 0; i < storyData.images.length; i++) {
    const imageUrl = storyData.images[i].src
    const filename =
      i === 0 ? 'cover.png' : `${i.toString().padStart(2, '0')}.png`
    const filePath = path.join(storyDir, filename)

    console.log(`下载图片 ${filename}...`)
    await downloadImage(imageUrl, filePath)
  }

  const yamlContent = generateYamlConfig(storyData)
  const configPath = path.join(CONFIG_DIR, `${storyId}.yaml`)
  fs.writeFileSync(configPath, yamlContent, 'utf8')

  console.log('导入完成！')
  console.log('故事ID:', storyId)
  console.log('故事标题:', storyData.title)
  console.log('配置文件:', configPath)
  console.log('图片目录:', storyDir)
  console.log('下载图片数量:', storyData.images.length)
  console.log('\n请重启开发服务器查看新故事: npm run dev')
}

async function main() {
  const url = process.argv[2]

  if (!url) {
    console.error(
      '使用方法: node scripts/import-gemini-story.js <gemini_share_url>'
    )
    console.error(
      '示例: node scripts/import-gemini-story.js https://g.co/gemini/share/8baffb7a1a87'
    )
    process.exit(1)
  }

  if (!url.includes('gemini.google.com') && !url.includes('g.co/gemini')) {
    console.error('错误: 请提供有效的 Gemini 故事分享链接')
    process.exit(1)
  }

  try {
    await importStory(url)
  } catch (error) {
    console.error('导入失败:', error.message)
    process.exit(1)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
