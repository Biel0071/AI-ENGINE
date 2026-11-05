(function attachAvatarPresets(root) {
  const presets = Object.freeze({
    zai: { label: 'ZAI', description: 'Íris ciano, traje tech e visor', config: { skin: 'cyber_cyan', hairStyle: 'crest', hairColor: 'cyan', outfit: 'cyber', shirtColor: '#087f8c', pantsColor: '#12323a', shoesColor: '#090d16', accessory: 'visor', badge: 'diamond', bodyType: 'standard' } },
    operations: { label: 'Operações', description: 'Uniforme utilitário e headset', config: { skin: 'tan', hairStyle: 'buzz', hairColor: 'black', outfit: 'casual', shirtColor: '#35665a', pantsColor: '#24342d', shoesColor: '#111813', accessory: 'headphones', badge: 'silver', bodyType: 'standard' } },
    creative: { label: 'Criação', description: 'Moletom e paleta violeta', config: { skin: 'fair', hairStyle: 'long', hairColor: 'purple', outfit: 'hoodie', shirtColor: '#594b79', pantsColor: '#292338', shoesColor: '#15121b', accessory: 'glasses', badge: 'none', bodyType: 'standard' } },
    research: { label: 'Pesquisa', description: 'Jaleco e scanner', config: { skin: 'brown', hairStyle: 'slick', hairColor: 'silver', outfit: 'labcoat', shirtColor: '#315a82', pantsColor: '#253346', shoesColor: '#101923', accessory: 'visor', badge: 'gold', bodyType: 'standard' } },
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = presets;
  if (root) root.FENIX_AVATAR_PRESETS = presets;
})(typeof window !== 'undefined' ? window : globalThis);
