import { SlashCommandBuilder, AttachmentBuilder } from "discord.js";
import { env } from "../src/env.js";
import { getMongoDb } from "../src/db/mongo.js";
import { request } from "undici";

let _tesseract = null;
async function getTesseract() {
  if (_tesseract) return _tesseract;
  const mod = await import("tesseract.js");
  _tesseract = mod;
  return _tesseract;
}

async function fetchBuffer(url) {
  const res = await request(url, { method: "GET" });
  if (res.statusCode >= 400) throw new Error(`fetch failed ${res.statusCode}`);
  const chunks = [];
  for await (const c of res.body) chunks.push(c);
  return Buffer.concat(chunks);
}

async function googleTranslate(q, to) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(to)}&dt=t&q=${encodeURIComponent(q)}`;
  const res = await request(url, { method: "GET" });
  const data = await res.body.json();
  const parts = (data?.[0] || []).map((x) => x?.[0]).filter(Boolean);
  return parts.join("");
}

export default {
  data: new SlashCommandBuilder()
    .setName("ocr")
    .setDescription("OCR + traducir (imagen adjunta)")
    .addAttachmentOption((o) => o.setName("imagen").setDescription("Imagen para OCR").setRequired(true))
    .addStringOption((o) => o.setName("to").setDescription("Idioma destino (es,en,fr,de,it,pt)").setRequired(false)),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const att = interaction.options.getAttachment("imagen", true);
    const toOpt = interaction.options.getString("to", false);

    let to = (toOpt || "").trim().toLowerCase();
    if (!to) {
      if (env.MONGO_URI) {
        const db = await getMongoDb(env.MONGO_URI, env.MONGO_DB);
        const pref = await db.collection("user_prefs").findOne({ userId: interaction.user.id });
        if (pref?.lang) to = String(pref.lang).toLowerCase();
      }
    }
    if (!to) to = "es";

    const buf = await fetchBuffer(att.url);
    const { createWorker } = await getTesseract();

    const worker = await createWorker("eng");
    const { data } = await worker.recognize(buf);
    await worker.terminate();

    const text = (data?.text || "").trim();
    if (!text) return interaction.editReply({ content: "No se detectó texto." });

    const translated = await googleTranslate(text, to).catch(() => "");
    const out = translated || text;

    // send DM with result file
    const file = new AttachmentBuilder(Buffer.from(out, "utf-8"), { name: "translation.txt" });
    await interaction.user.send({ content: `Resultado (${to.toUpperCase()}):\n\n${out.slice(0, 1900)}`, files: [file] }).catch(() => null);

    await interaction.editReply({ content: "He enviado el resultado por DM." });
  }
};
