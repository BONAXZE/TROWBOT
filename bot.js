const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');

// إعدادات البوت
const TOKEN = 'YOUR_DISCORD_BOT_TOKEN_HERE'; // استبدل بتوكن البوت الخاص بك
const PREFIX = '!'; // البادئة للأوامر

// حالة البوت
let botStatus = true; // true = يعمل, false = متوقف

// إنشاء عميل ديسكورد
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// عندما يكون البوت جاهزًا
client.once('ready', () => {
  console.log(`✅ تم تسجيل الدخول باسم: ${client.user.tag}`);
  console.log(`📋 حالة البوت: ${botStatus ? 'يعمل' : 'متوقف'}`);
  client.user.setActivity('فحص الروابط | !مساعدة', { type: 'WATCHING' });
});

// عند استقبال رسالة
client.on('messageCreate', async (message) => {
  // تجاهل الرسائل من البوتات الأخرى
  if (message.author.bot) return;

  // إذا كان البوت متوقفًا، تجاهل جميع الرسائل ما عدا أوامر التشغيل
  if (!botStatus && !message.content.startsWith(`${PREFIX}تشغيل`)) {
    return;
  }

  // التحقق من الأمر
  if (message.content.startsWith(PREFIX)) {
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // أوامر الإدارة
    if (command === 'startbot') {
      if (botStatus) {
        return message.reply('✅ البوت يعمل بالفعل!');
      }
      botStatus = true;
      message.reply('✅ تم تشغيل البوت!');
      console.log('✅ تم تشغيل البوت بواسطة: ' + message.author.tag);
      return;
    }

    if (command === 'stopbot') {
      if (!botStatus) {
        return message.reply('❌ البوت متوقف بالفعل!');
      }
      botStatus = false;
      message.reply('❌ تم إيقاف البوت!');
      console.log('❌ تم إيقاف البوت بواسطة: ' + message.author.tag);
      return;
    }

    if (command === 'helpbot') {
      const helpEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('🎯 أوامر البوت')
        .setDescription('قائمة بأوامر البوت المتاحة:')
        .addFields(
          { name: '`/start-trowbot`', value: 'startbot', inline: true },
          { name: '`/stop-trowbot`', value: 'stopbot', inline: true },
          { name: '`/help-trowbot`', value: 'helpbot', inline: true }
        )
        .setTimestamp();
      
      message.reply({ embeds: [helpEmbed] });
      return;
    }
  }

  // فحص الروابط تلقائيًا
  if (containsLink(message.content)) {
    const links = extractLinks(message.content);
    
    for (const link of links) {
      try {
        // إشعار بأن البوت يفحص الرابط
        const checkingMsg = await message.reply(`🔍 جاري فحص الرابط: ${link}`);
        
        // فحص الرابط
        const status = await checkLink(link);
        
        // إنشاء embed لعرض النتيجة
        const resultEmbed = new EmbedBuilder()
          .setTitle('نتيجة فحص الرابط')
          .setURL(link)
          .setDescription(status)
          .setColor(status.includes('✅') ? 0x00FF00 : 0xFF0000)
          .setTimestamp();
        
        // تعديل الرسالة الأصلية لإظهار النتيجة
        checkingMsg.edit({ content: `📊 نتيجة فحص الرابط:`, embeds: [resultEmbed] });
        
      } catch (error) {
        console.error('Error checking link:', error);
        message.reply(`❌ حدث خطأ أثناء فحص الرابط: ${link}`);
      }
    }
  }
});

// دالة للتحقق من وجود روابط في النص
function containsLink(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return urlRegex.test(text);
}

// دالة لاستخراج جميع الروابط من النص
function extractLinks(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
}

// دالة لفحص الروابط
async function checkLink(url) {
  try {
    const response = await axios.get(url, { 
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.status >= 200 && response.status < 300) {
      return `✅ الرابط يعمل بشكل صحيح\n**كود الحالة:** ${response.status}`;
    } else if (response.status >= 300 && response.status < 400) {
      return `⚠️ الرابط يعمل但有 تحويل\n**كود الحالة:** ${response.status}`;
    } else if (response.status >= 400 && response.status < 500) {
      return `❌ خطأ عميل\n**كود الحالة:** ${response.status}`;
    } else if (response.status >= 500) {
      return `❌ خطأ خادم\n**كود الحالة:** ${response.status}`;
    }
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      return '❌ انتهت مهلة الطلب (10 ثواني)';
    } else if (error.response) {
      return `❌ خطأ في الاستجابة\n**كود الحالة:** ${error.response.status}`;
    } else if (error.request) {
      return '❌ لا يمكن الوصول إلى الرابط';
    } else {
      return `❌ خطأ غير متوقع: ${error.message}`;
    }
  }
}

// معالجة الأخطاء غير المتوقعة
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

// تسجيل الدخول إلى ديسكورد
client.login(TOKEN).catch(console.error);