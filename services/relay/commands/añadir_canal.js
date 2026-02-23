import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ChannelSelectMenuBuilder, ChannelType } from "discord.js";
import { fetchMirrorModule, saveMirrorConfig, normalizeGroups } from "./_mirrorStore.js";

const LANGS = [
  { label: "ES", value: "ES" },
  { label: "EN", value: "EN" },
  { label: "FR", value: "FR" },
  { label: "DE", value: "DE" },
  { label: "IT", value: "IT" },
  { label: "PT", value: "PT" },
  { label: "JA", value: "JA" },
  { label: "KO", value: "KO" },
  { label: "ZH", value: "ZH" }
];

export default {
  data: new SlashCommandBuilder().setName("añadir_canal").setDescription("Añade un canal a un grupo mirror"),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const mod = await fetchMirrorModule();
    const cfg = mod?.config || {};
    const groups = normalizeGroups(cfg);
    if (!groups.length) return interaction.editReply({ content: "No hay grupos. Usa /crear_grupo primero." });

    const groupMenu = new StringSelectMenuBuilder()
      .setCustomId("mirror:add_channel:group")
      .setPlaceholder("Selecciona grupo")
      .addOptions(groups.slice(0,25).map((g)=>({ label: g.name, value: g.name })));

    const row = new ActionRowBuilder().addComponents(groupMenu);
    await interaction.editReply({ content: "Selecciona el grupo:", components: [row] });
  },

  async handleComponent(interaction) {
    if (interaction.isStringSelectMenu() && interaction.customId === "mirror:add_channel:group") {
      await interaction.deferUpdate();
      const group = interaction.values[0];

      const chMenu = new ChannelSelectMenuBuilder()
        .setCustomId(`mirror:add_channel:channel:${group}`)
        .setPlaceholder("Selecciona canal")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement);

      const langMenu = new StringSelectMenuBuilder()
        .setCustomId(`mirror:add_channel:lang:${group}`)
        .setPlaceholder("Idioma del canal")
        .addOptions(LANGS);

      await interaction.editReply({
        content: `Grupo: **${group}**\nSelecciona canal e idioma:`,
        components: [
          new ActionRowBuilder().addComponents(chMenu),
          new ActionRowBuilder().addComponents(langMenu)
        ]
      });
      return true;
    }

    // capture channel selection
    if (interaction.isChannelSelectMenu() && interaction.customId.startsWith("mirror:add_channel:channel:")) {
      await interaction.deferUpdate();
      const group = interaction.customId.split(":").slice(-1)[0];
      const channelId = interaction.values[0];

      // store in message components state via embed-less content marker
      const content = interaction.message.content || "";
      const next = content.replace(/\nCanal seleccionado:.*$/m, "");
      await interaction.editReply({ content: `${next}\nCanal seleccionado: \`${channelId}\`` });
      return true;
    }

    // language selection triggers save
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("mirror:add_channel:lang:")) {
      await interaction.deferUpdate();
      const group = interaction.customId.split(":").slice(-1)[0];
      const lang = interaction.values[0];

      // parse channelId from message content marker
      const m = /Canal seleccionado: `([^`]+)`/.exec(interaction.message.content || "");
      if (!m) {
        await interaction.editReply({ content: "Selecciona primero el canal.", components: interaction.message.components });
        return true;
      }
      const channelId = m[1];

      const mod = await fetchMirrorModule();
      const cfg = mod?.config || {};
      const groups = normalizeGroups(cfg);
      const g = groups.find((x) => x.name === group);
      if (!g) {
        await interaction.editReply({ content: "Grupo no encontrado.", components: [] });
        return true;
      }
      g.channels[channelId] = lang;

      await saveMirrorConfig({ active: true, config: { ...cfg, groups } });
      await interaction.editReply({ content: `Añadido canal <#${channelId}> (${lang}) en **${group}**`, components: [] });
      return true;
    }

    return false;
  }
};
