import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { env } from "../src/env.js";
import { getMongoDb } from "../src/db/mongo.js";

const LANG_BUTTONS = [
  { id: "lang:es", label: "🇪🇸 ES" },
  { id: "lang:en", label: "🇬🇧 EN" },
  { id: "lang:fr", label: "🇫🇷 FR" },
  { id: "lang:de", label: "🇩🇪 DE" },
  { id: "lang:it", label: "🇮🇹 IT" },
  { id: "lang:pt", label: "🇵🇹 PT" }
];

function rows() {
  const r1 = new ActionRowBuilder().addComponents(
    LANG_BUTTONS.slice(0, 3).map((b) => new ButtonBuilder().setCustomId(b.id).setLabel(b.label).setStyle(ButtonStyle.Secondary))
  );
  const r2 = new ActionRowBuilder().addComponents(
    LANG_BUTTONS.slice(3).map((b) => new ButtonBuilder().setCustomId(b.id).setLabel(b.label).setStyle(ButtonStyle.Secondary))
  );
  return [r1, r2];
}

export default {
  data: new SlashCommandBuilder().setName("select_language").setDescription("Publica botones de selección de idioma"),
  async execute(interaction) {
    await interaction.reply({ content: "Selecciona tu idioma preferido:", components: rows(), ephemeral: false });
  },

  async handleComponent(interaction) {
    if (!interaction.isButton()) return false;
    if (!interaction.customId.startsWith("lang:")) return false;

    const lang = interaction.customId.split(":")[1];
    if (!env.MONGO_URI) {
      await interaction.reply({ content: "Mongo no configurado (MONGO_URI).", ephemeral: true });
      return true;
    }
    const db = await getMongoDb(env.MONGO_URI, env.MONGO_DB);
    await db.collection("user_prefs").updateOne(
      { userId: interaction.user.id },
      { $set: { userId: interaction.user.id, lang, updatedAt: new Date() } },
      { upsert: true }
    );

    await interaction.reply({ content: `Idioma guardado: **${lang.toUpperCase()}**`, ephemeral: true });
    return true;
  }
};
