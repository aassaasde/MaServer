require('dotenv').config();
const express = require('express');
const session = require('express-session');
const axios = require('axios');
const path = require('path');
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================
// DISCORD BOT SETUP
// =============================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log(`✅ البوت شغال: ${client.user.tag}`);
});

// Handle button interactions (accept / reject)
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const parts = interaction.customId.split('_');
  const action = parts[0];
  const userId = parts[1];

  if (action === 'accept') {
    try {
      await interaction.deferUpdate();

      const guild = await client.guilds.fetch(process.env.GUILD_ID);
      const member = await guild.members.fetch(userId).catch(() => null);

      if (member && process.env.ACCEPTED_ROLE_ID) {
        await member.roles.add(process.env.ACCEPTED_ROLE_ID);
      }

      const user = await client.users.fetch(userId);
      await user.send({
        embeds: [new EmbedBuilder()
          .setTitle('✅ تم قبول طلبك في سيرفر MA!')
          .setDescription('أهلاً بك في سيرفر MA! تم قبول طلبك وستجد الرتبة الخاصة بك في السيرفر.\n\nاستمتع بتجربة الرول بلاي! 🎮')
          .setColor(0x00d26a)
          .setFooter({ text: 'MA Server' })
          .setTimestamp()
        ]
      });

      await interaction.editReply({
        content: `✅ تم قبول الطلب بواسطة ${interaction.user.tag}`,
        components: []
      });

    } catch (err) {
      console.error('Accept error:', err);
      await interaction.followUp({ content: `❌ حصل خطأ: ${err.message}`, ephemeral: true }).catch(() => {});
    }

  } else if (action === 'reject') {
    try {
      await interaction.reply({
        content: '📝 اكتب سبب الرفض في رسالة تالية (عندك 30 ثانية):',
        ephemeral: true
      });

      const filter = m => m.author.id === interaction.user.id;
      const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 30000 }).catch(() => null);
      const reason = collected?.first()?.content || 'لم يتم تحديد سبب';
      collected?.first()?.delete().catch(() => {});

      const user = await client.users.fetch(userId);
      await user.send({
        embeds: [new EmbedBuilder()
          .setTitle('❌ تم رفض طلبك في سيرفر MA')
          .setDescription(`نأسف لإخبارك بأنه تم رفض طلبك في سيرفر MA.\n\n**السبب:** ${reason}\n\nيمكنك التقديم مجدداً بعد مراجعة القوانين.`)
          .setColor(0xff4444)
          .setFooter({ text: 'MA Server' })
          .setTimestamp()
        ]
      });

      await interaction.message.edit({
        content: `❌ تم رفض الطلب بواسطة ${interaction.user.tag} | السبب: ${reason}`,
        components: []
      });

      await interaction.editReply({ content: '✅ تم إرسال الرفض.' });

    } catch (err) {
      console.error('Reject error:', err);
      await interaction.followUp({ content: `❌ حصل خطأ: ${err.message}`, ephemeral: true }).catch(() => {});
    }
  }
});

client.login(process.env.DISCORD_BOT_TOKEN).catch(err => {
  console.error('❌ فشل تسجيل دخول البوت:', err.message);
});

// =============================================
// EXPRESS MIDDLEWARE
// =============================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'ma-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// =============================================
// DISCORD OAUTH2
// =============================================
app.get('/auth/discord', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    redirect_uri: process.env.REDIRECT_URI,
    response_type: 'code',
    scope: 'identify'
  });
  res.redirect(`https://discord.com/oauth2/authorize?${params}`);
});

app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect('/?error=no_code');

  try {
    const tokenRes = await axios.post('https://discord.com/api/oauth2/token',
      new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.REDIRECT_URI
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token } = tokenRes.data;

    const userRes = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    req.session.user = {
      id: userRes.data.id,
      username: userRes.data.username,
      discriminator: userRes.data.discriminator,
      avatar: userRes.data.avatar,
      global_name: userRes.data.global_name
    };

    res.redirect('/apply');
  } catch (err) {
    console.error('OAuth error:', err.response?.data || err.message);
    res.redirect('/?error=auth_failed');
  }
});

app.get('/auth/me', (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

app.get('/auth/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// =============================================
// SUBMIT APPLICATION
// =============================================
app.post('/api/submit', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  const { basicInfo, randomAnswers } = req.body;
  const user = req.session.user;

  const fields = [
    { name: '👤 الاسم الحقيقي', value: basicInfo.realName || '—', inline: true },
    { name: '🎂 العمر', value: basicInfo.age || '—', inline: true },
    { name: '🆔 Discord ID', value: `<@${user.id}> \`${user.id}\``, inline: false },
    { name: '💬 يوزر الديسكورد', value: user.global_name || user.username, inline: true },
    { name: '🎭 اسم الشخصية', value: basicInfo.charName || '—', inline: true },
    { name: '📖 قصة الشخصية', value: (basicInfo.charStory || '—').substring(0, 1024) },
    { name: '🎮 تعريف الرول بلاي', value: (basicInfo.rpDef || '—').substring(0, 1024) },
  ];

  if (randomAnswers) {
    Object.entries(randomAnswers).forEach(([q, a]) => {
      fields.push({
        name: `❓ ${q.substring(0, 100)}`,
        value: (a || 'لم يُجب').substring(0, 500)
      });
    });
  }

  const embed = {
    title: '📋 طلب تسجيل جديد — سيرفر MA',
    color: 0xd4a017,
    thumbnail: {
      url: user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
        : `https://cdn.discordapp.com/embed/avatars/0.png`
    },
    fields,
    footer: {
      text: `MA Server • ID: ${user.id}`,
      icon_url: 'https://cdn.discordapp.com/embed/avatars/0.png'
    },
    timestamp: new Date().toISOString()
  };

  try {
    const channel = await client.channels.fetch(process.env.APPLICATIONS_CHANNEL_ID);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`accept_${user.id}`)
        .setLabel('✅ قبول')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`reject_${user.id}`)
        .setLabel('❌ رفض')
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({
      content: `@here طلب تسجيل جديد من <@${user.id}>`,
      embeds: [embed],
      components: [row]
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Send application error:', err.message);
    // Fallback to webhook without buttons
    try {
      await axios.post(process.env.DISCORD_WEBHOOK_URL, {
        content: `@here طلب تسجيل جديد من <@${user.id}> — يُرجى القبول/الرفض يدوياً`,
        embeds: [embed]
      });
      res.json({ success: true, warning: 'Sent via webhook (no buttons)' });
    } catch (webhookErr) {
      console.error('Webhook fallback error:', webhookErr.message);
      res.status(500).json({ error: 'Failed to send to Discord' });
    }
  }
});

// =============================================
// ADMIN: Accept/Reject (manual API fallback)
// =============================================
app.post('/api/admin/accept', async (req, res) => {
  const { userId } = req.body;
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    const member = await guild.members.fetch(userId);
    if (process.env.ACCEPTED_ROLE_ID) {
      await member.roles.add(process.env.ACCEPTED_ROLE_ID);
    }
    const user = await client.users.fetch(userId);
    await user.send({
      embeds: [new EmbedBuilder()
        .setTitle('✅ تم قبول طلبك في سيرفر MA!')
        .setDescription('أهلاً بك في سيرفر MA! تم قبول طلبك وستجد الرتبة الخاصة بك في السيرفر.\n\nاستمتع بتجربة الرول بلاي! 🎮')
        .setColor(0x00d26a)
        .setFooter({ text: 'MA Server' })
        .setTimestamp()
      ]
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Accept error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/reject', async (req, res) => {
  const { userId, reason } = req.body;
  try {
    const user = await client.users.fetch(userId);
    await user.send({
      embeds: [new EmbedBuilder()
        .setTitle('❌ تم رفض طلبك في سيرفر MA')
        .setDescription(`نأسف لإخبارك بأنه تم رفض طلبك في سيرفر MA.\n\n**السبب:** ${reason || 'لم يتم تحديد سبب'}\n\nيمكنك التقديم مجدداً بعد مراجعة القوانين.`)
        .setColor(0xff4444)
        .setFooter({ text: 'MA Server' })
        .setTimestamp()
      ]
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Reject error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// =============================================
// SERVE PAGES
// =============================================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/apply', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/laws', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/store', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => {
  console.log(`🚀 MA Server running on http://localhost:${PORT}`);
});
