require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const fs = require("fs");

const app = express();
app.get("/", (req, res) => {
  res.send("✅ Bot TMVFREE đang chạy 24/7 trên Render hihih! cập nhập chữ đậm");
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Web server listening on port ${PORT}`);
});

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
console.log("🤖 Bot đã chạy...");

const waitingForSerial = {};
const DAILY_LIMIT = 5;
const userDailyCount = {};
const ADMIN_ID = process.env.ADMIN_ID;

// Tổng lượt all-time
let TOTAL_COUNT = 0;
if (fs.existsSync("total_count.log")) {
  TOTAL_COUNT = parseInt(fs.readFileSync("total_count.log", "utf8")) || 0;
}

// Người dùng duy nhất
let knownUsers = new Set();
if (fs.existsSync("known_users.json")) {
  const arr = JSON.parse(fs.readFileSync("known_users.json", "utf8"));
  knownUsers = new Set(arr);
}

setInterval(() => {
  Object.keys(userDailyCount).forEach((uid) => (userDailyCount[uid] = 0));
}, 24 * 60 * 60 * 1000);

// ===================== Key Logic =====================

function strToHex(str) {
  let padding = "";
  for (let index = 0; index < str.length; index++) {
    const charCode = str.charCodeAt(index).toString(16).padStart(2, '0');
    padding += charCode;
  }
  return padding;
}

function salt(data, saltCode) {
  let resultStr = "";
  for (let index = 0; index < data.length; index++) {
    const code = data.charCodeAt(index % data.length) ^ saltCode.charCodeAt(index % saltCode.length);
    resultStr += String.fromCharCode(code);
  }
  return strToHex(resultStr);
}

function ctime(s) {
  let a = 1, c = 0, h, o;
  if (s) {
    a = 0;
    for (h = s.length - 1; h >= 0; h--) {
      o = s.charCodeAt(h);
      a = (a << 6 & 268435455) + o + (o << 14);
      c = a & 266338304;
      a = c !== 0 ? a ^ c >> 21 : a;
    }
  }
  return String(a);
}

function generateKey(serial, duration) {
  const STORE_SECRET_KEY = '125e11574c5a42535a595547585443515b58545b514358545143545143545143';
  const date = new Date();

  switch (duration) {
    case '1month': date.setMonth(date.getMonth() + 1); break;
    case '3month': date.setMonth(date.getMonth() + 3); break;
    case '6month': date.setMonth(date.getMonth() + 6); break;
    case '12month': date.setMonth(date.getMonth() + 12); break;
    case '1200month': date.setMonth(date.getMonth() + 1200); break; // vĩnh viễn
  }

  return salt(ctime(serial) + "|" + Math.floor(date.getTime() / 1000), STORE_SECRET_KEY);
}

function randomDuration() {
  const options = [
    { value: "1month", label: "1 Tháng", weight: 25 },
    { value: "3month", label: "3 Tháng", weight: 25 },
    { value: "6month", label: "6 Tháng", weight: 25 },
    { value: "12month", label: "12 Tháng", weight: 15 },
    { value: "1200month", label: "Vĩnh Viễn", weight: 10 },
  ];

  const totalWeight = options.reduce((sum, opt) => sum + opt.weight, 0);
  const rand = Math.random() * totalWeight;

  let sum = 0;
  for (const opt of options) {
    sum += opt.weight;
    if (rand <= sum) return opt;
  }

  return options[0]; // fallback nếu có lỗi
}


// ===================== BOT Logic =====================

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const fullName = [msg.from.first_name, msg.from.last_name].filter(Boolean).join(" ");

  knownUsers.add(userId);
  fs.writeFileSync("known_users.json", JSON.stringify([...knownUsers]));

  const menu = [
    [{ text: "🎁 Lấy Key TMV FREE", callback_data: "get_key" }],
    [
      { text: "❤️ TMV VIP", url: "https://www.tungmuvang.in/2023/08/tmv-panel-retouch-lam-anh-chuyen-nghiep.html" },
      { text: "💚 TMV AUTO", url: "https://www.tungmuvang.in/2023/12/ra-mat-ban-panel-chuyen-danh-cho-dan.html" },
      { text: "💜 Adobe BQ", url: "https://www.tungmuvang.in/2025/03/thong-tin-cac-goi-adobe-ban-quyen-tmv.html" },
    ],
  ];

  if (String(userId) === ADMIN_ID) {
    menu.splice(1, 0, [
      { text: "📊 Check hôm nay ", callback_data: "check_admin" },
      { text: "📈 Tổng số lượt", callback_data: "check_total" },
      { text: "👥 Số người dùng", callback_data: "check_users" }
    ]);
  }

  bot.sendMessage(chatId, `👋 Chào *${fullName || "bạn"}*!  

🤖 Đây là *BOT tự động lấy key Panel TMVFREE*.  
Vui lòng chọn một chức năng bên dưới:`, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: menu },
  });
});

bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;

bot.sendMessage(chatId, 
  "🔑 Gửi *Serial* để bắt đầu nhận Key sử dụng *TMVFREE* nhé!\n" +
  "⏳ Thời hạn key sẽ được tạo ngẫu nhiên — từ *1 tháng* cho đến *vĩnh viễn*!\n\n" +
  "😄 *Mẹo nhỏ:* Tỉ lệ key *vĩnh viễn* khoảng *10%*, nên đừng ngại thử thêm vài lần để may mắn gọi tên bạn!",
  { parse_mode: "Markdown" }
);


  if (query.data === "check_admin") {
    if (String(userId) !== ADMIN_ID) {
      bot.sendMessage(chatId, "🚫 Bạn không có quyền xem báo cáo hôm nay.");
      bot.answerCallbackQuery(query.id);
      return;
    }

    const total = Object.values(userDailyCount).reduce((a, b) => a + b, 0);
    const report = Object.entries(userDailyCount)
      .map(([uid, count]) => `👤 UserID: ${uid} — Đã dùng: ${count}/${DAILY_LIMIT}`)
      .join("\n");

    const text = `📊 *Báo cáo hôm nay:*\n\nTổng lượt tạo hôm nay: *${total}*\nTổng lượt tạo từ trước tới nay: *${TOTAL_COUNT}*\n\n` +
      (report || "📊 Chưa có ai sử dụng hôm nay.");

    bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
    bot.answerCallbackQuery(query.id);
  }

  if (query.data === "check_total") {
    if (String(userId) !== ADMIN_ID) {
      bot.sendMessage(chatId, "🚫 Bạn không có quyền xem báo cáo tổng.");
      bot.answerCallbackQuery(query.id);
      return;
    }

    bot.sendMessage(chatId, `📈 *Tổng số lượt key đã tạo từ trước tới nay:* *${TOTAL_COUNT}*`, {
      parse_mode: "Markdown"
    });
    bot.answerCallbackQuery(query.id);
  }

  if (query.data === "check_users") {
    if (String(userId) !== ADMIN_ID) {
      bot.sendMessage(chatId, "🚫 Bạn không có quyền xem.");
      bot.answerCallbackQuery(query.id);
      return;
    }

    bot.sendMessage(chatId, `👥 Số người dùng đã từng dùng bot: *${knownUsers.size}*`, {
      parse_mode: "Markdown"
    });
    bot.answerCallbackQuery(query.id);
  }
});

bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text?.trim();

  if (!waitingForSerial[userId]) return;
  if (!text || text.startsWith("/")) return;

  if (String(userId) !== ADMIN_ID) {
    if (!userDailyCount[userId]) userDailyCount[userId] = 0;

    if (userDailyCount[userId] >= DAILY_LIMIT) {
      bot.sendMessage(chatId, "🚫 Bạn đã vượt quá số lượt hôm nay.");
      waitingForSerial[userId] = false;
      return;
    }

    userDailyCount[userId]++;
  }

  const { label, value } = randomDuration();
  const key = generateKey(text, value);

  TOTAL_COUNT++;
  fs.writeFileSync("total_count.log", TOTAL_COUNT.toString());

  const remaining = String(userId) !== ADMIN_ID
    ? DAILY_LIMIT - userDailyCount[userId]
    : "∞";

  const message = `🤪 Chúc Mừng Bạn Đã Tạo Được Key Có Hạn Là: *${label}*

✅*Serial:* \`${text}\`

🔑*Key:* \`${key}\`
*Bạn chỉ cần bấm vào dòng KEY là sẽ tự động được copy:*

📊 Bạn còn *${remaining}/${DAILY_LIMIT}* lượt hôm nay.

💻 *Cách Kích Hoạt Panel:*
👉Bạn hãy mở *Photoshop* → chọn menu *Window > Extensions > TMVFREE* → nhập key vào ô bên dưới → *Done*!`;

  bot.sendMessage(chatId, message, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🎁 Lấy Key Khác", callback_data: "get_key" }],
        [
          { text: "❤️ TMV VIP", url: "https://www.tungmuvang.in/2023/08/tmv-panel-retouch-lam-anh-chuyen-nghiep.html" },
          { text: "💚 TMV AUTO", url: "https://www.tungmuvang.in/2023/12/ra-mat-ban-panel-chuyen-danh-cho-dan.html" },
          { text: "💜 Adobe BQ", url: "https://www.tungmuvang.in/2025/03/thong-tin-cac-goi-adobe-ban-quyen-tmv.html" },
        ],
      ],
    },
  });

  if (String(userId) !== ADMIN_ID) {
    const fullName = [msg.from.first_name, msg.from.last_name].filter(Boolean).join(" ");
    const username = msg.from.username || "(không có username)";
    bot.sendMessage(ADMIN_ID,
      `📢 User *${fullName}* (${username}) [ID: \`${userId}\`] vừa tạo key:\n\nSerial: \`${text}\`\nKey: \`${key}\`\nThời hạn: *${label}*`, {
        parse_mode: "Markdown"
      });
  }

  waitingForSerial[userId] = false;
});
