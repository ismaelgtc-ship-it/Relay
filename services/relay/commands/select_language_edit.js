import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

const BTN = [
  { id: "lang:es", label: "🇪🇸 ES" },
  { id: "lang:en", label: "🇬🇧 EN" },
  { id: "lang:fr", label: "🇫🇷 FR" },
  { id: "lang:de", label: "🇩🇪 DE" },
  { id: "lang:it", label: "🇮🇹 IT" },
  { id: "lang:pt", label: "🇵🇹 PT" }
];

function components() {
  return [
    new ActionRowBuilder().addComponents(
      BTN.slice(0,3).map((b)=>new ButtonBuilder().setCustomId(b.id).setLabel(b.label).setStyle(ButtonStyle.Secondary))
    ),
    new ActionRowBuilder().addComponents(
      BTN.slice(3).map((b)=>new ButtonBuilder().setCustomId(b.id).setLabel(b.label).setStyle(ButtonStyle.Secondary))
    )
  ];
}

export default {
  data: new SlashCommandBuilder().setName("language_panel").setDescription("🧩 Re-publish the language panel (buttons)"),
  async execute(interaction) {
    await interaction.reply({ content: "Panel updated. Select a language:", components: components(), ephemeral: false });
  }
};
