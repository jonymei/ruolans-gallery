#!/usr/bin/env node

import TelegramBot from 'node-telegram-bot-api'
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.join(__dirname, '..')

// Configuration
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const AUTHORIZED_USER_ID = process.env.TELEGRAM_USER_ID

if (!BOT_TOKEN) {
  console.error('错误: 请在 .env 文件中设置 TELEGRAM_BOT_TOKEN')
  process.exit(1)
}

if (!AUTHORIZED_USER_ID) {
  console.error('错误: 请在 .env 文件中设置 TELEGRAM_USER_ID')
  process.exit(1)
}

// Create bot instance with long polling
const bot = new TelegramBot(BOT_TOKEN, { polling: true })

console.log('Telegram Bot 已启动，使用 Long Polling 模式...')

// Helper functions
function isAuthorized(userId) {
  return userId.toString() === AUTHORIZED_USER_ID
}

function isGeminiLink(url) {
  return url.includes('gemini.google.com') || url.includes('g.co/gemini')
}

function extractGeminiUrl(text) {
  // Extract URL from message text
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const matches = text.match(urlRegex)
  
  if (!matches) return null
  
  for (const url of matches) {
    if (isGeminiLink(url)) {
      return url
    }
  }
  
  return null
}

async function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`执行命令: ${command} ${args.join(' ')}`)
    
    const child = spawn(command, args, {
      cwd: PROJECT_ROOT,
      stdio: ['inherit', 'pipe', 'pipe'],
      ...options
    })
    
    let stdout = ''
    let stderr = ''
    
    child.stdout.on('data', (data) => {
      stdout += data.toString()
    })
    
    child.stderr.on('data', (data) => {
      stderr += data.toString()
    })
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr, code })
      } else {
        reject(new Error(`命令执行失败 (退出码: ${code})\nstdout: ${stdout}\nstderr: ${stderr}`))
      }
    })
    
    child.on('error', (error) => {
      reject(error)
    })
  })
}

async function validateStoryData(storyId) {
  const configPath = path.join(PROJECT_ROOT, 'src', 'config', `${storyId}.yaml`)
  const storyDir = path.join(PROJECT_ROOT, 'public', 'stories', storyId)
  
  // Check if config file exists
  if (!fs.existsSync(configPath)) {
    throw new Error(`配置文件不存在: ${configPath}`)
  }
  
  // Check if story directory exists
  if (!fs.existsSync(storyDir)) {
    throw new Error(`故事目录不存在: ${storyDir}`)
  }
  
  // Check if cover image exists
  const coverPath = path.join(storyDir, 'cover.png')
  if (!fs.existsSync(coverPath)) {
    throw new Error(`封面图片不存在: ${coverPath}`)
  }
  
  // Count story images (should be 01.png to 10.png)
  const imageFiles = fs.readdirSync(storyDir)
    .filter(file => file.match(/^\d{2}\.png$/))
    .sort()
  
  if (imageFiles.length === 0) {
    throw new Error('没有找到故事页面图片')
  }
  
  // Read title from config file
  let title = `故事 ${storyId}`
  try {
    const configContent = fs.readFileSync(configPath, 'utf8')
    const yamlMatch = configContent.match(/title:\s*(.+)/)
    if (yamlMatch) {
      title = yamlMatch[1].trim().replace(/['"]/g, '')
    }
  } catch (error) {
    console.warn('无法读取故事标题:', error.message)
  }
  
  return {
    configPath,
    storyDir,
    imageCount: imageFiles.length,
    hasImages: imageFiles,
    title
  }
}

function getNextStoryId() {
  const configDir = path.join(PROJECT_ROOT, 'src', 'config')
  const configFiles = fs
    .readdirSync(configDir)
    .filter((file) => file.match(/^\d{3}\.yaml$/))
    .map((file) => parseInt(file.replace('.yaml', '')))
    .sort((a, b) => b - a)

  const nextId = configFiles.length > 0 ? configFiles[0] + 1 : 1
  return nextId.toString().padStart(3, '0')
}

async function processGeminiLink(chatId, messageId, url) {
  let statusMessage = null
  
  try {
    // Send initial status
    statusMessage = await bot.sendMessage(chatId, '🔄 开始处理 Gemini 故事链接...', {
      reply_to_message_id: messageId
    })
    
    // Get story ID before import
    const storyId = getNextStoryId()
    
    // Step 1: Import story
    await bot.editMessageText('🔄 正在导入故事数据...', {
      chat_id: chatId,
      message_id: statusMessage.message_id
    })
    
    const importResult = await runCommand('node', ['scripts/import-gemini-story.js', url])
    console.log('Import completed:', importResult.stdout)
    
    // Step 2: Validate data
    await bot.editMessageText('🔄 验证故事数据...', {
      chat_id: chatId,
      message_id: statusMessage.message_id
    })
    
    const validationResult = await validateStoryData(storyId)
    
    // Step 3: Generate TTS
    await bot.editMessageText('🔄 生成音频文件...', {
      chat_id: chatId,
      message_id: statusMessage.message_id
    })
    
    const ttsResult = await runCommand('node', ['scripts/tts.js', storyId])
    console.log('TTS completed:', ttsResult.stdout)
    
    // Step 4: Git operations
    await bot.editMessageText('🔄 提交到 Git...', {
      chat_id: chatId,
      message_id: statusMessage.message_id
    })
    
    // Add files to git
    await runCommand('git', ['add', '.'])
    
    // Commit with message
    const commitMessage = `feat: add new story "${validationResult.title || storyId}" via Telegram Bot\n\n🤖 Generated with Telegram Bot\n\nCo-Authored-By: Telegram Bot <noreply@telegram.org>`
    await runCommand('git', ['commit', '-m', commitMessage])
    
    // Push to remote
    await runCommand('git', ['push'])
    
    // Success message
    await bot.editMessageText(
      `✅ 故事处理完成！\n\n` +
      `📚 故事标题: ${validationResult.title}\n` +
      `🆔 故事ID: ${storyId}\n` +
      `🖼️ 图片数量: ${validationResult.imageCount + 1}张 (含封面)\n` +
      `🎵 音频文件: 已生成\n` +
      `📝 已提交到 Git 并推送到远程\n\n` +
      `请重启开发服务器查看新故事: \`npm run dev\``,
      {
        chat_id: chatId,
        message_id: statusMessage.message_id,
        parse_mode: 'Markdown'
      }
    )
    
  } catch (error) {
    console.error('处理失败:', error)
    
    const errorMessage = `❌ 处理失败\n\n错误信息: ${error.message}`
    
    if (statusMessage) {
      await bot.editMessageText(errorMessage, {
        chat_id: chatId,
        message_id: statusMessage.message_id
      })
    } else {
      await bot.sendMessage(chatId, errorMessage, {
        reply_to_message_id: messageId
      })
    }
  }
}

// Bot event handlers
bot.on('message', async (msg) => {
  const chatId = msg.chat.id
  const userId = msg.from.id
  const messageId = msg.message_id
  
  console.log(`收到消息 - 用户ID: ${userId}, 聊天ID: ${chatId}`)
  
  // Check authorization
  if (!isAuthorized(userId)) {
    await bot.sendMessage(chatId, '❌ 未授权用户', {
      reply_to_message_id: messageId
    })
    return
  }
  
  // Handle different message types
  if (msg.text) {
    const text = msg.text.trim()
    
    // Handle /start command
    if (text === '/start') {
      await bot.sendMessage(chatId, 
        '👋 欢迎使用若兰故事导入机器人！\n\n' +
        '请发送 Gemini 故事分享链接，我会自动：\n' +
        '1. 导入故事数据和图片\n' +
        '2. 生成音频文件\n' +
        '3. 验证数据完整性\n' +
        '4. 提交到 Git 并推送\n\n' +
        '支持的链接格式：\n' +
        '• https://gemini.google.com/share/...\n' +
        '• https://g.co/gemini/share/...',
        { reply_to_message_id: messageId }
      )
      return
    }
    
    // Handle /status command
    if (text === '/status') {
      try {
        const gitStatus = await runCommand('git', ['status', '--porcelain'])
        const hasChanges = gitStatus.stdout.trim().length > 0
        
        await bot.sendMessage(chatId,
          `📊 系统状态\n\n` +
          `🔧 Git 状态: ${hasChanges ? '有未提交的更改' : '工作区干净'}\n` +
          `🤖 机器人状态: 运行中\n` +
          `📝 项目目录: ${PROJECT_ROOT}`,
          { reply_to_message_id: messageId }
        )
      } catch (error) {
        await bot.sendMessage(chatId, `❌ 获取状态失败: ${error.message}`, {
          reply_to_message_id: messageId
        })
      }
      return
    }
    
    // Check for Gemini links
    const geminiUrl = extractGeminiUrl(text)
    if (geminiUrl) {
      console.log(`检测到 Gemini 链接: ${geminiUrl}`)
      await processGeminiLink(chatId, messageId, geminiUrl)
      return
    }
    
    // Unknown message
    await bot.sendMessage(chatId, 
      '❓ 未识别的消息\n\n' +
      '请发送：\n' +
      '• Gemini 故事分享链接\n' +
      '• /start - 查看帮助\n' +
      '• /status - 查看状态',
      { reply_to_message_id: messageId }
    )
  }
})

// Error handling
bot.on('error', (error) => {
  console.error('Bot 错误:', error)
})

bot.on('polling_error', (error) => {
  console.error('轮询错误:', error)
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('正在关闭 Telegram Bot...')
  bot.stopPolling()
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('正在关闭 Telegram Bot...')
  bot.stopPolling()
  process.exit(0)
})

console.log('Bot 已启动，等待消息...')