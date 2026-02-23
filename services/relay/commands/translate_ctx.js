import { ContextMenuCommandBuilder, ApplicationCommandType } from "discord.js";
import { env } from "../src/env.js";
import { getMongoDb } from "../src/db/mongo.js";
import { request } from "undici";

async function googleTranslate(q, to) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(to)}&dt=t&q=${encodeURIComponent(q)}`;
  const res = await request(url, { method: "GET" });
  const data = await res.body.json();
  const parts = (data?.[0] || []).map((x) => x?.[0]).filter(Boolean);
  return parts.join("");
}

export default {
  data: new ContextMenuCommandBuilder().setName("TRANSLATE").setType(ApplicationCommandType.Message),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const msg = interaction.targetMessage;
    const content = (msg?.content || "").trim();
    if (!content) return interaction.editReply({ content: "Mensaje vacío." });

    let to = "es";
    if (env.MONGO_URI) {
      const db = await getMongoDb(env.MONGO_URI, env.MONGO_DB);
      const pref = await db.collection("user_prefs").findOne({ userId: interaction.user.id });
      if (pref?.lang) to = String(pref.lang).toLowerCase();
    }

    const translated = await googleTranslate(content, to).catch(() => "");
    await interaction.editReply({ content: translated ? translated.slice(0, 2000) : "No se pudo traducir." });
  }
};
