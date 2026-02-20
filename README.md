# Telegram Mediator Bot

ربات واسطه‌گری خرید و فروش + طاق و معاوضه  
ساخته شده با Node.js و Telegraf

---

## نصب

```bash
npm install
```

---

## تنظیم توکن

توکن را داخل Environment Variable قرار دهید:

### روی Termux / لوکال:

```bash
export BOT_TOKEN="YOUR_REAL_BOT_TOKEN"
npm start
```

### روی Render:

Environment → Add Variable:

- KEY: `BOT_TOKEN`
- VALUE: توکن واقعی ربات

---

## اجرا

```bash
npm start
```

---

## فایل‌ها

- `bot.js` → کد اصلی ربات  
- `package.json` → مدیریت پکیج‌ها  
- `README.md` → توضیحات پروژه
