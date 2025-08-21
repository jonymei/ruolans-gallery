import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// 获取当前文件的目录路径 (ES modules 替代 __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// 从环境变量读取配置
const group_id = process.env.MINIMAX_GROUPID;
const api_key = process.env.MINIMAX_API_KEY;

if (!group_id || !api_key) {
  console.error('错误: 请在 .env 文件中设置 MINIMAX_GROUPID 和 MINIMAX_API_KEY');
  process.exit(1);
}

/**
 * 读取故事配置文件
 * @param {string} storyId - 故事ID，如 "story_001"
 * @returns {Object} 故事配置对象
 */
function readStoryConfig(storyId) {
  const configPath = path.join(__dirname, '..', 'src', 'config', `${storyId}.yaml`);
  
  if (!fs.existsSync(configPath)) {
    throw new Error(`故事配置文件不存在: ${configPath}`);
  }
  
  const yamlContent = fs.readFileSync(configPath, 'utf8');
  return yaml.load(yamlContent);
}

/**
 * 确保目录存在，如果不存在则创建
 * @param {string} dirPath - 目录路径
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`创建目录: ${dirPath}`);
  }
}

/**
 * 验证音频文件的完整性
 * @param {string} filePath - 音频文件路径
 * @returns {boolean} 文件是否有效
 */
function validateAudioFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  
  const stats = fs.statSync(filePath);
  // 检查文件大小是否合理（至少 1KB，最多 10MB）
  if (stats.size < 1024 || stats.size > 10 * 1024 * 1024) {
    return false;
  }
  
  // 检查文件是否为有效的 MP3 文件（简单检查文件头）
  const buffer = fs.readFileSync(filePath, { encoding: null, flag: 'r' });
  if (buffer.length < 3) {
    return false;
  }
  
  // MP3 文件通常以 ID3 标签开始（'ID3'）或直接以帧同步开始（0xFF）
  const header = buffer.slice(0, 3);
  const isId3 = header.toString() === 'ID3';
  const isMp3Frame = header[0] === 0xFF && (header[1] & 0xE0) === 0xE0;
  
  return isId3 || isMp3Frame;
}

/**
 * 获取故事的音频生成状态
 * @param {string} storyId - 故事ID
 * @returns {Object} 音频状态信息
 */
function getAudioStatus(storyId) {
  const config = readStoryConfig(storyId);
  const audioDir = path.join(__dirname, '..', 'public', 'audios', storyId);
  
  const status = {
    storyId,
    title: config.title,
    totalPages: config.pages.length,
    existingFiles: 0,
    validFiles: 0,
    missingFiles: [],
    invalidFiles: []
  };
  
  for (let i = 1; i <= config.pages.length; i++) {
    const pageNumber = String(i).padStart(2, '0');
    const audioFileName = `${pageNumber}.mp3`;
    const audioFilePath = path.join(audioDir, audioFileName);
    
    if (fs.existsSync(audioFilePath)) {
      status.existingFiles++;
      if (validateAudioFile(audioFilePath)) {
        status.validFiles++;
      } else {
        status.invalidFiles.push(audioFileName);
      }
    } else {
      status.missingFiles.push(audioFileName);
    }
  }
  
  return status;
}

/**
 * 显示所有故事的音频状态
 */
function showAllAudioStatus() {
  console.log('\n📊 音频文件状态报告');
  console.log('========================\n');
  
  const configDir = path.join(__dirname, '..', 'src', 'config');
  const configFiles = fs.readdirSync(configDir).filter(file => file.endsWith('.yaml'));
  
  for (const configFile of configFiles) {
    const storyId = path.basename(configFile, '.yaml');
    const status = getAudioStatus(storyId);
    
    console.log(`📖 ${status.title} (${status.storyId})`);
    console.log(`   总页数: ${status.totalPages}`);
    console.log(`   已生成: ${status.validFiles}/${status.totalPages} ✅`);
    
    if (status.invalidFiles.length > 0) {
      console.log(`   损坏文件: ${status.invalidFiles.join(', ')} ❌`);
    }
    
    if (status.missingFiles.length > 0) {
      console.log(`   缺失文件: ${status.missingFiles.join(', ')} ⚠️`);
    }
    
    const completionRate = (status.validFiles / status.totalPages * 100).toFixed(1);
    console.log(`   完成度: ${completionRate}%\n`);
  }
}

/**
 * 调用 Minimax TTS API 生成音频
 * @param {string} text - 要合成的文本
 * @param {string} voiceId - 声音ID
 * @returns {Promise<Buffer>} 音频数据
 */
async function generateAudio(text, voiceId = 'Chinese (Mandarin)_Cute_Spirit') {
  const requestBody = {
    "model": "speech-2.5-hd-preview",
    "text": text,
    "timber_weights": [
      {
        "voice_id": voiceId,
        "weight": 1
      }
    ],
    "voice_setting": {
      "voice_id": "",
      "speed": 1.0,
      "pitch": 0,
      "vol": 1.0
    },
    "audio_setting": {
      "sample_rate": 32000,
      "bitrate": 128000,
      "format": "mp3"
    },
    "language_boost": "Chinese",
    "output_format": "hex"
  };

  console.log(`正在合成音频: ${text.substring(0, 30)}...`);
  
  try {
    const response = await fetch(`https://api.minimax.chat/v1/t2a_v2?GroupId=${group_id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${api_key}`,
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API请求失败: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const result = await response.json();
    
    if (result.base_resp && result.base_resp.status_code !== 0) {
      throw new Error(`API返回错误: ${result.base_resp.status_msg}`);
    }

    if (!result.data || !result.data.audio) {
      throw new Error('API响应中没有音频数据');
    }

    // 将hex编码的音频数据转换为Buffer
    const audioHex = result.data.audio;
    const audioBuffer = Buffer.from(audioHex, 'hex');
    
    console.log(`音频合成成功: ${audioBuffer.length} 字节`);
    return audioBuffer;
    
  } catch (error) {
    console.error('生成音频时出错:', error.message);
    throw error;
  }
}

/**
 * 为单个故事生成所有音频文件
 * @param {string} storyId - 故事ID
 */
async function generateStoryAudios(storyId) {
  console.log(`\n开始处理故事: ${storyId}`);
  
  try {
    // 读取故事配置
    const config = readStoryConfig(storyId);
    console.log(`故事标题: ${config.title}`);
    console.log(`作者: ${config.author}`);
    console.log(`页面数量: ${config.pages.length}`);
    
    // 确保音频输出目录存在
    const audioDir = path.join(__dirname, '..', 'public', 'audios', storyId);
    ensureDirectoryExists(audioDir);
    
    // 为每一页生成音频
    for (let i = 0; i < config.pages.length; i++) {
      const pageNumber = String(i + 1).padStart(2, '0'); // 01, 02, 03...
      const pageText = config.pages[i];
      const audioFileName = `${pageNumber}.mp3`;
      const audioFilePath = path.join(audioDir, audioFileName);
      
      // 检查文件是否已存在
      if (fs.existsSync(audioFilePath)) {
        console.log(`跳过已存在的文件: ${audioFileName}`);
        continue;
      }
      
      try {
        // 生成音频
        const audioBuffer = await generateAudio(pageText);
        
        // 保存音频文件
        fs.writeFileSync(audioFilePath, audioBuffer);
        console.log(`✅ 保存音频: ${audioFileName}`);
        
        // 添加延迟避免API频率限制
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ 生成第${pageNumber}页音频失败:`, error.message);
        // 继续处理下一页
      }
    }
    
    console.log(`✅ 故事 ${storyId} 音频生成完成！`);
    
  } catch (error) {
    console.error(`❌ 处理故事 ${storyId} 时出错:`, error.message);
  }
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('用法: node tts.js <command> [story_id]');
    console.log('');
    console.log('命令:');
    console.log('  <story_id>     为指定故事生成音频 (例: story_001)');
    console.log('  all            为所有故事生成音频');
    console.log('  status         显示所有故事的音频状态');
    console.log('  check <id>     检查指定故事的音频状态');
    console.log('');
    console.log('示例:');
    console.log('  node tts.js story_001');
    console.log('  node tts.js all');
    console.log('  node tts.js status');
    console.log('  node tts.js check story_001');
    process.exit(1);
  }
  
  const command = args[0];
  
  if (command === 'status') {
    // 显示所有故事的音频状态
    showAllAudioStatus();
    return;
  }
  
  if (command === 'check') {
    // 检查指定故事的音频状态
    if (args.length < 2) {
      console.error('错误: 请指定要检查的故事ID');
      console.log('用法: node tts.js check <story_id>');
      process.exit(1);
    }
    
    const storyId = args[1];
    try {
      const status = getAudioStatus(storyId);
      console.log(`\n📖 ${status.title} (${status.storyId})`);
      console.log(`总页数: ${status.totalPages}`);
      console.log(`已生成: ${status.validFiles}/${status.totalPages}`);
      console.log(`完成度: ${(status.validFiles / status.totalPages * 100).toFixed(1)}%`);
      
      if (status.missingFiles.length > 0) {
        console.log(`\n⚠️  缺失的音频文件:`);
        status.missingFiles.forEach(file => console.log(`   - ${file}`));
      }
      
      if (status.invalidFiles.length > 0) {
        console.log(`\n❌ 损坏的音频文件:`);
        status.invalidFiles.forEach(file => console.log(`   - ${file}`));
      }
      
      if (status.validFiles === status.totalPages) {
        console.log(`\n✅ 所有音频文件都已生成且有效！`);
      }
      
    } catch (error) {
      console.error(`❌ 检查故事 ${storyId} 时出错:`, error.message);
    }
    return;
  }
  
  if (command === 'all') {
    // 处理所有故事
    const configDir = path.join(__dirname, '..', 'src', 'config');
    const configFiles = fs.readdirSync(configDir).filter(file => file.endsWith('.yaml'));
    
    console.log(`发现 ${configFiles.length} 个故事配置文件`);
    
    for (const configFile of configFiles) {
      const storyId = path.basename(configFile, '.yaml');
      await generateStoryAudios(storyId);
    }
    
  } else {
    // 处理单个故事
    await generateStoryAudios(command);
  }
  
  console.log('\n🎉 所有任务完成！');
}

// 错误处理
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  process.exit(1);
});

// 运行主函数
main().catch(console.error);
