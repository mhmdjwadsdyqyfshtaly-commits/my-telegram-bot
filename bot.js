const { Telegraf, Markup } = require("telegraf");
const fs = require("fs");

// ================== SETTINGS ==================

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
    console.error("❌ BOT_TOKEN تنظیم نشده است.");
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// مالک + ادمین
const ADMINS = [5331199226, 6288768746];

let botStatus = true;

// گروه‌های خرید و فروش
const GROUPS_BUYSELL = [
    -1003726552794, -1003887546329, -1003787915485, -1003579693612,
    -1003823118498, -1003218627588, -1003732420908, -1003788399498,
    -1003839323551, -1003733616106, -1003163548121, -1003548872643,
    -1003415405390, -1003742630641, -1003897761746, -1003854331635,
    -1003863626081, -1003750449571, -1003870628008
];

// گروه‌های طاق و معاوضه
const GROUPS_TAQ = [
    -1003832529662, -1003707197585, -1003816203309, -1003749096836,
    -1003387744128, -1003745011627, -1003819930721, -1003711350927,
    -1003831908025, -1003684322337
];

// ================== STATE ==================

let state = {};

function saveState() {
    try {
        fs.writeFileSync("state.json", JSON.stringify(state, null, 2));
    } catch (e) {}
}

function loadState() {
    try {
        if (fs.existsSync("state.json")) {
            state = JSON.parse(fs.readFileSync("state.json", "utf8"));
        }
    } catch (e) {
        state = {};
    }
}

loadState();

// ================== KEYBOARDS ==================

function ownerKeyboard() {
    return Markup.keyboard([
        ["🔴 OFF", "🟢 ON"],
        ["واسطه‌گری طاق و معاوضه"],
        ["واسطه‌گری خرید و فروش"],
        ["ثبت رایگان آگهی اکانت"]
    ]).resize();
}

function userKeyboard() {
    return Markup.keyboard([
        ["واسطه‌گری طاق و معاوضه"],
        ["واسطه‌گری خرید و فروش"],
        ["ثبت رایگان آگهی اکانت"]
    ]).resize();
}

// ================== MIDDLEWARE ==================

bot.use((ctx, next) => {
    if (!botStatus && !ADMINS.includes(ctx.from?.id)) {
        return ctx.reply("ربات خاموش است ❌");
    }
    return next();
});

// ================== START ==================

bot.start((ctx) => {
    const text =
        "سلام 👋\n" +
        "برای ثبت درخواست واسطه‌گری از دکمه‌های زیر استفاده کن.\n" +
        "تمام مراحل به صورت خودکار انجام می‌شود.";

    if (ADMINS.includes(ctx.from.id)) {
        return ctx.reply(text, ownerKeyboard());
    }

    return ctx.reply(text, userKeyboard());
});

// ================== ON / OFF ==================

bot.hears("🔴 OFF", (ctx) => {
    if (!ADMINS.includes(ctx.from.id)) return;
    botStatus = false;
    ctx.reply("ربات خاموش شد ❌");
});

bot.hears("🟢 ON", (ctx) => {
    if (!ADMINS.includes(ctx.from.id)) return;
    botStatus = true;
    ctx.reply("ربات روشن شد ✅");
});

// ================== REQUEST WARNING ==================

function requestWarning(ctx, type) {
    return ctx.reply(
        "⚠️ شما در حال ثبت درخواست واسطه‌گری هستید.\n" +
        "با تایید، لینک ورود ساخته می‌شود.\n" +
        "🚨 ثبت اسپم یا تست باعث مسدودی می‌شود.\n" +
        "فقط یک طرف معامله درخواست ثبت کند.",
        Markup.keyboard([
            [type === "TAQ" ? "✔️ تایید طاق" : "✔️ تایید خرید"],
            ["بازگشت"]
        ]).resize()
    );
}

bot.hears("واسطه‌گری طاق و معاوضه", (ctx) => requestWarning(ctx, "TAQ"));
bot.hears("واسطه‌گری خرید و فروش", (ctx) => requestWarning(ctx, "BUYSELL"));

// ================== CONFIRM ==================

bot.hears("✔️ تایید طاق", (ctx) => startFlow(ctx, "TAQ"));
bot.hears("✔️ تایید خرید", (ctx) => startFlow(ctx, "BUYSELL"));

function startFlow(ctx, type) {
    const userId = ctx.from.id;

    state[userId] = {
        type,
        step: 0,
        members: [],
        requesterChatId: ctx.chat.id
    };
    saveState();

    sendGroupLink(ctx, userId);
}

// ================== SEND LINK ==================

async function sendGroupLink(ctx, userId) {
    const userState = state[userId];
    if (!userState) return;

    const groups = userState.type === "TAQ" ? GROUPS_TAQ : GROUPS_BUYSELL;
    const step = userState.step;

    if (step >= groups.length) {
        return ctx.telegram.sendMessage(
            userState.requesterChatId,
            "✅ همه مراحل گروه‌ها تکمیل شده است."
        );
    }

    const groupId = groups[step];

    const now = Math.floor(Date.now() / 1000);
    const expire = now + 3600;

    const invite = await ctx.telegram.createChatInviteLink(groupId, {
        expire_date: expire,
        member_limit: 2,
        name: "مرحله " + (step + 1)
    });

    await ctx.telegram.sendMessage(
        userState.requesterChatId,
        "🔗 لینک ورود مرحله " + (step + 1) + ":\n" +
        invite.invite_link +
        "\n\n⏰ اعتبار لینک: ۱ ساعت"
    );
}

// ================== CHAT MEMBER ==================

bot.on("chat_member", async (ctx) => {
    const chatId = ctx.chat.id;
    const member = ctx.update.chat_member?.new_chat_member;
    if (!member || !member.user) return;

    const user = member.user;

    const owner = Object.keys(state).find((uid) => {
        const s = state[uid];
        if (!s) return false;
        const groups = s.type === "TAQ" ? GROUPS_TAQ : GROUPS_BUYSELL;
        return groups[s.step] === chatId;
    });

    if (!owner) return;

    if (!state[owner].members.includes(user.id)) {
        state[owner].members.push(user.id);
        saveState();
    }

    if (state[owner].members.length === 2) {
        state[owner].step++;
        state[owner].members = [];
        saveState();

        sendGroupLink(ctx, owner);
    }
});

// ================== END COMMAND (انجام شد) ==================

bot.hears("انجام شد", async (ctx) => {
    const chatId = ctx.chat.id;
    const senderId = ctx.from.id;

    if (!ADMINS.includes(senderId)) {
        return ctx.reply("❌ شما اجازه اجرای این دستور را ندارید.");
    }

    const owner = Object.keys(state).find((uid) => {
        const s = state[uid];
        if (!s) return false;

        const groups = s.type === "TAQ" ? GROUPS_TAQ : GROUPS_BUYSELL;
        const prevStep = s.step - 1 >= 0 ? s.step - 1 : 0;

        return groups[prevStep] === chatId;
    });

    if (!owner) {
        return ctx.reply("❌ این گروه مربوط به هیچ درخواست فعالی نیست.");
    }

    await ctx.reply("✔️ واسطه‌گری انجام شد.");
    await ctx.reply("⏳ تا چند ثانیه دیگر تمامی پیام‌ها پاک می‌شوند...");

    const membersToKick = state[owner].members || [];
    for (let i = 0; i < membersToKick.length; i++) {
        try {
            await ctx.telegram.kickChatMember(chatId, membersToKick[i]);
        } catch (e) {}
    }

    await new Promise((resolve) => setTimeout(resolve, 10000));

    let lastId = ctx.message.message_id;

    async function fastDelete(start, end) {
        for (let i = start; i >= end; i--) {
            try {
                await ctx.telegram.deleteMessage(chatId, i);
            } catch (e) {}
        }
    }

    const batch = Math.floor(lastId / 5) || 1;

    await Promise.all([
        fastDelete(lastId, lastId - batch),
        fastDelete(lastId - batch, lastId - batch * 2),
        fastDelete(lastId - batch * 2, lastId - batch * 3),
        fastDelete(lastId - batch * 3, lastId - batch * 4),
        fastDelete(lastId - batch * 4, 1)
    ]);

    state[owner].members = [];
    saveState();

    await ctx.telegram.sendMessage(chatId, "✔️ تمامی پیام‌ها پاک شدند و گروه ریست شد.");
});

// ================== BACK ==================

bot.hears("بازگشت", (ctx) => {
    if (ADMINS.includes(ctx.from.id)) {
        return ctx.reply("منوی اصلی", ownerKeyboard());
    }
    return ctx.reply("منوی اصلی", userKeyboard());
});

// ================== LAUNCH ==================

bot.launch().then(() => {
    console.log("🤖 Bot started successfully");
});
