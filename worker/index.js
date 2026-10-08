const REPO = "oa7life/quiz";

async function tg(env, method, body) {
  return fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export default {
  async fetch(request, env) {
    if (request.method !== "POST") return new Response("ok");
    if (request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== env.WEBHOOK_SECRET) {
      return new Response("forbidden", { status: 401 });
    }

    let update;
    try { update = await request.json(); } catch { return new Response("ok"); }

    const msg = update.message;
    if (!msg || String(msg.from?.id) !== String(env.TELEGRAM_ALLOWED_USER_ID)) {
      return new Response("ok");
    }
    const chatId = msg.chat.id;
    const doc = msg.document;
    const name = doc?.file_name || "";

    if (!doc || !/\.html?$/i.test(name)) {
      await tg(env, "sendMessage", { chat_id: chatId, text: "Send an .html file." });
      return new Response("ok");
    }

    const res = await fetch(`https://api.github.com/repos/${REPO}/dispatches`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.GITHUB_PAT}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "quiz-telegram-bot",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        event_type: "telegram_html",
        client_payload: { file_id: doc.file_id, file_name: name, chat_id: chatId },
      }),
    });

    await tg(env, "sendMessage", {
      chat_id: chatId,
      text: res.ok ? "⏳ Received, uploading..." : `❌ GitHub dispatch failed (${res.status})`,
    });
    return new Response("ok");
  },
};
