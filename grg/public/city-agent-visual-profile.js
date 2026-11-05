(() => {
  'use strict';

  const profiles = [
    { key: 'security', match: /security|seguran|secops|prote[cç][aã]o/, shirtColor: '#59414b', hairColor: 0x292524, accentColor: '#d9828d', icon: '🛡️', accessory: 'visor' },
    { key: 'platform', match: /infra|platform|plataforma|devops|network|rede|sre/, shirtColor: '#31545b', hairColor: 0x334155, accentColor: '#6fc5ca', icon: '🖥️', accessory: 'headset' },
    { key: 'analysis', match: /data|dados|analyst|analista|research|pesquisa|quality|qa|teste/, shirtColor: '#4a4969', hairColor: 0x574337, accentColor: '#a6a1de', icon: '📊', accessory: 'glasses' },
    { key: 'product', match: /design|designer|product|produto|ux|ui|creative|criativ/, shirtColor: '#654b52', hairColor: 0x3f2c4f, accentColor: '#e2a181', icon: '✏️', accessory: 'tablet' },
    { key: 'operations', match: /operation|opera[cç][aã]o|manager|gest[aã]o|coordinator|coordena/, shirtColor: '#455747', hairColor: 0x4b4238, accentColor: '#9cc79e', icon: '⚙️', accessory: 'multimeter' },
  ];
  const defaultColors = ['#344458', '#3e4c43', '#4b4057', '#36505a', '#514640'];
  const defaultAccents = ['#86a9cf', '#8eb69b', '#b0a1ca', '#7fb5bd', '#c29a7e'];
  const hairColors = [0x282521, 0x41342e, 0x56504b, 0x262c38, 0x593d2e];
  const skinTones = ['#f0c7ad', '#ddb091', '#c99270', '#a87559', '#805540'];
  const defaultAccessories = ['tablet', 'glasses', 'headset', 'none', 'multimeter'];

  function stableIndex(value, length) {
    let hash = 2166136261;
    for (const char of String(value || 'agent')) {
      hash ^= char.codePointAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) % length;
  }

  const customSkinColors = {
    light: '#fde2d4', fair: '#fcd5b8', tan: '#d89b6b', brown: '#8d5524', dark: '#4a2c11',
    cyber_cyan: '#38bdf8', neon_green: '#22c55e', synth_gold: '#fbbf24',
  };
  const customHairColors = {
    black: 0x18181b, brown: 0x5c3a21, blonde: 0xfde047, red: 0xdc2626, silver: 0xcbd5e1,
    cyan: 0x06b6d4, purple: 0x9333ea, pink: 0xec4899, white: 0xffffff,
  };
  const allowedHairStyles = new Set(['spiky', 'slick', 'buzz', 'bob', 'long', 'crest']);
  const allowedAccessories = new Set(['none', 'visor', 'glasses', 'headphones', 'halo', 'badge']);
  const allowedOutfits = new Set(['suit', 'hoodie', 'labcoat', 'armor', 'casual', 'cyber']);
  const allowedBadges = new Set(['none', 'bronze', 'silver', 'gold', 'diamond', 'master']);
  const registryPalettes = {
    ember: ['#804a3b', '#dc8a68'], azure: ['#315a82', '#73b8e8'], violet: ['#594b79', '#b7a2ec'],
    jade: ['#35665a', '#79d0a5'], gold: ['#80672b', '#edc65d'], rose: ['#804b61', '#e79ab4'],
    cyan: ['#236b75', '#22d3ee'], steel: ['#596775', '#a6c2d4'],
  };
  const registryHairStyles = { short: 'buzz', swept: 'slick', hood: 'bob', visor: 'crest', none: 'buzz' };
  const registryOutfits = {
    'command-coat': 'suit', 'shield-jacket': 'armor', 'utility-suit': 'casual',
    'designer-jacket': 'hoodie', 'engineer-suit': 'suit',
  };
  const registryAccessories = {
    terminal: 'badge', scanner: 'visor', wrench: 'badge', shield: 'badge',
    'memory-core': 'halo', 'browser-lens': 'glasses',
  };

  function resolveCityAgentVisualProfile(agent = {}) {
    const identity = String(agent.id || 'agent');
    const description = `${agent.role || ''} ${agent.department || ''}`.toLocaleLowerCase('pt-BR');
    const isZai = /^(?:agent-)?zai(?:-agent)?$/i.test(identity) || String(agent.name || '').toLowerCase() === 'zai';
    const profile = profiles.find((candidate) => candidate.match.test(description));
    const index = stableIndex(identity, defaultColors.length);

    const resolved = {
      key: isZai ? 'zai' : profile?.key || 'specialist',
      source: 'role-derived',
      displayScale: 1.75,
      bodyType: 'standard',
      outfit: isZai ? 'cyber' : 'suit',
      badge: isZai ? 'diamond' : 'none',
      shirtColor: isZai ? '#087f8c' : profile?.shirtColor || defaultColors[index],
      accentColor: isZai ? '#22d3ee' : profile?.accentColor || defaultAccents[index],
      hairColor: isZai ? 0x102b36 : profile?.hairColor || hairColors[index],
      skinColor: skinTones[index],
      accessory: isZai ? 'visor' : profile?.accessory || defaultAccessories[index],
      icon: isZai ? '🦅' : profile?.icon || '👤',
      avatarUrl: agent.avatar?.avatarUrl || (function(id, desc) {
        const t = `${id} ${desc}`.toLowerCase();
        if (/camila|crm|vendas/.test(t)) return '/assets/agents/camila_avatar.png';
        if (/zai|bot|triagem/.test(t)) return '/assets/agents/zaibot_avatar.png';
        if (/ana|suporte/.test(t)) return '/assets/agents/ana_avatar.png';
        if (/carlos|geren|business|ceo/.test(t)) return '/assets/agents/carlos_avatar.png';
        if (/joao|backend|database|node/.test(t)) return '/assets/agents/joao_avatar.png';
        if (/marina|design|ux|frontend/.test(t)) return '/assets/agents/marina_avatar.png';
        if (/habbo|pedro|infra|devops|sre/.test(t)) return '/assets/agents/habbo_avatar.png';
        return '/assets/agents/camila_avatar_16bit.png';
      })(identity, description),
    };
    const avatar = agent.avatar && typeof agent.avatar === 'object' ? agent.avatar : {};
    const appearance = avatar.appearance && typeof avatar.appearance === 'object' ? avatar.appearance : null;
    if (appearance) {
      if (!isZai) {
        const palette = registryPalettes[appearance.colorProfile];
        if (palette) [resolved.shirtColor, resolved.accentColor] = palette;
        if (registryHairStyles[appearance.hair]) resolved.hairStyle = registryHairStyles[appearance.hair];
        if (registryOutfits[appearance.clothing]) resolved.outfit = registryOutfits[appearance.clothing];
        if (registryAccessories[appearance.accessory]) resolved.accessory = registryAccessories[appearance.accessory];
      }
      if (appearance.bodyType === 'compact') { resolved.displayScale = 1.55; resolved.bodyType = 'compact'; }
      else if (appearance.bodyType === 'tall') { resolved.displayScale = 1.85; resolved.bodyType = 'tall'; }
      resolved.source = 'registry-avatar';
    }
    let customized = false;
    if (['compact', 'standard', 'tall'].includes(avatar.bodyType)) {
      resolved.displayScale = { compact: 1.55, standard: 1.75, tall: 1.85 }[avatar.bodyType];
      resolved.bodyType = avatar.bodyType;
      customized = true;
    }
    if (customSkinColors[avatar.skin]) { resolved.skinColor = customSkinColors[avatar.skin]; customized = true; }
    if (customHairColors[avatar.hairColor] !== undefined) { resolved.hairColor = customHairColors[avatar.hairColor]; customized = true; }
    if (typeof avatar.shirtColor === 'string' && /^#[0-9a-f]{6}$/i.test(avatar.shirtColor)) { resolved.shirtColor = avatar.shirtColor; customized = true; }
    else if (typeof avatar.outfitColor === 'string' && /^#[0-9a-f]{6}$/i.test(avatar.outfitColor)) { resolved.shirtColor = avatar.outfitColor; customized = true; }
    for (const field of ['pantsColor', 'shoesColor']) {
      if (typeof avatar[field] === 'string' && /^#[0-9a-f]{6}$/i.test(avatar[field])) { resolved[field] = avatar[field]; customized = true; }
    }
    if (allowedHairStyles.has(avatar.hairStyle)) { resolved.hairStyle = avatar.hairStyle; customized = true; }
    if (allowedOutfits.has(avatar.outfit)) { resolved.outfit = avatar.outfit; customized = true; }
    if (allowedBadges.has(avatar.badge)) { resolved.badge = avatar.badge; customized = true; }
    if (allowedAccessories.has(avatar.accessory)) {
      resolved.accessory = avatar.accessory === 'headphones' ? 'headset' : avatar.accessory;
      customized = true;
    }
    if (customized) resolved.source = 'custom-avatar';
    return resolved;
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = resolveCityAgentVisualProfile;
  if (typeof window !== 'undefined') window.fenixCityAgentVisualProfile = resolveCityAgentVisualProfile;
})();
