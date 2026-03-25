# 🎮 MA Server Website

موقع سيرفر MA للرول بلاي — مع Discord OAuth2 كامل + بوت شغّال

## 📁 هيكل المشروع
```
ma-server/
├── server.js          ← الباك اند (Node.js + Express + discord.js)
├── package.json
├── .env               ← الإعدادات السرية
└── public/
    └── index.html     ← الموقع الكامل
```

## ⚙️ الإعداد خطوة بخطوة

### 1. تحديث ملف .env
```
DISCORD_CLIENT_ID=        ← من Developer Portal > Application ID
DISCORD_CLIENT_SECRET=    ← من Developer Portal > OAuth2 > Client Secret
DISCORD_BOT_TOKEN=        ← من Developer Portal > Bot > Token
DISCORD_WEBHOOK_URL=      ← من السيرفر > Channel Settings > Integrations (fallback فقط)
REDIRECT_URI=http://localhost:3000/auth/callback
SESSION_SECRET=any-random-string
PORT=3000
ACCEPTED_ROLE_ID=         ← ID الرتبة اللي المقبولين هياخدوها
GUILD_ID=                 ← ID السيرفر بتاعك
APPLICATIONS_CHANNEL_ID=  ← ID الشانيل اللي الطلبات هتتبعت فيه (مهم!)
```

### 2. Discord Developer Portal
اذهب إلى: https://discord.com/developers/applications

**OAuth2:**
- في Redirects أضف: `http://localhost:3000/auth/callback`
- انسخ Client Secret للـ .env

**Bot:**
- اضغط "Add Bot"
- انسخ Token للـ .env
- فعّل: `SERVER MEMBERS INTENT` + `MESSAGE CONTENT INTENT`

**Privileged Gateway Intents (مهم جداً!):**
في Bot > Privileged Gateway Intents فعّل:
- ✅ SERVER MEMBERS INTENT
- ✅ MESSAGE CONTENT INTENT

### 3. إضافة البوت للسيرفر
في OAuth2 > URL Generator اختار:
- Scopes: `bot` + `applications.commands`
- Bot Permissions: `Manage Roles` + `Send Messages` + `Read Message History`
انسخ الرابط واضف البوت للسيرفر

### 4. الحصول على الـ IDs
- **Guild ID**: السيرفر > كليك يمين > Copy Server ID
- **Role ID**: السيرفر > Settings > Roles > كليك يمين > Copy Role ID
- **Channel ID**: الشانيل > كليك يمين > Copy Channel ID
(لازم Developer Mode يكون شغّال من Discord Settings > Advanced)

### 5. تشغيل المشروع
```bash
npm install
npm start
```

## 🔧 كيف يشتغل النظام
1. المتقدم يدخل الموقع ويسجل بالديسكورد
2. يملأ الطلب ويبعته
3. **البوت** يبعت الطلب في شانيل الطلبات مع أزرار قبول/رفض
4. الأدمن يضغط ✅ قبول أو ❌ رفض
5. البوت تلقائياً:
   - يدي الرتبة للمقبول
   - يبعت DM للمقبول أو المرفوض بالنتيجة

## 📋 صفحات الموقع
| الصفحة | الوصف |
|--------|-------|
| `/` | الرئيسية |
| `/laws` | القوانين |
| `/apply` | تقديم الطلب |
| `/store` | المتجر |

## 🚀 رفع الموقع على سيرفر حقيقي
غير في `.env`:
```
REDIRECT_URI=https://yourdomain.com/auth/callback
```
وحدّثه في Discord Developer Portal كمان.
