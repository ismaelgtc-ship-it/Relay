export const data = {
  name: "ping",
  description: "Responde con Pong."
};

export async function execute(interaction) {
  await interaction.reply({ content: "Pong 🏓", ephemeral: true });
}
