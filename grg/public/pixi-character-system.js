/**
 * FÊNIX CITY V5 — Pixi Character System (Golden Slice Art Production)
 * True Isometric 2.5D Pixel Art Character System.
 * - Human silhouette with head, hair, face, neck, torso, arms, hands, legs, shoes, outfit, accessory.
 * - Multi-direction Spritesheet Architecture: N (North/Rear), S (South/Front), E (East/Right), W (West/Left).
 * - Full 4-frame animations: IDLE, WALK, WORK, THINK, COMMUNICATE, SUCCESS, ERROR, WAITING, BLOCKED.
 * - 22+ Unique Visual Role Configurations across 8 Skin Tones, 8 Hair Colors, and 8 Hairstyles.
 * - Ambient NPCs: Courier, Visitor, Technician, Maintenance.
 * - Ground Contact Shadows on every character.
 * - Strict Nameplate Discipline: NO raw UUIDs in world, Zoom LOD (Far: zero text, Med: short name, Near: name + status badge).
 * - Photo Mode Cleanliness: zero text/HUD in photo mode.
 */
(function() {
  'use strict';

  const CHAR_STATES = {
    IDLE: 'idle',
    WALK: 'walk',
    WORK: 'work',
    THINK: 'think',
    COMMUNICATE: 'communicate',
    SUCCESS: 'success',
    ERROR: 'error',
    WAITING: 'waiting',
    BLOCKED: 'blocked'
  };

  const DIRECTIONS = { S: 0, W: 1, N: 2, E: 3 };
  const WALK_FRAMES = 4;
  const CHAR_WIDTH = 24;
  const CHAR_HEIGHT = 40;

  // ── Diverse Palettes (8 Realistic Skin Tones & 8 Vibrant Hair Palettes) ──
  const SKIN_PALETTES = [
    { base: '#FEE3D4', shadow: '#E2B89A', lip: '#D89E88' }, // Ivory
    { base: '#F5D5C0', shadow: '#D9A98A', lip: '#C6876E' }, // Warm Fair
    { base: '#E8C4A0', shadow: '#CA9E76', lip: '#B57C58' }, // Golden Fair
    { base: '#D4A373', shadow: '#B37D50', lip: '#9E673E' }, // Warm Tan
    { base: '#C8956C', shadow: '#A46E47', lip: '#8E5B37' }, // Olive Bronze
    { base: '#8D5B38', shadow: '#6B3F23', lip: '#552F17' }, // Deep Bronze
    { base: '#55331C', shadow: '#3C2110', lip: '#2D160A' }, // Rich Espresso
    { base: '#E0B89C', shadow: '#BD8F72', lip: '#A8765A' }  // Peach Beige
  ];

  const HAIR_PALETTES = [
    { base: '#18181B', highlight: '#3F3F46' }, // Jet Black
    { base: '#3B2314', highlight: '#5C3820' }, // Dark Chocolate
    { base: '#5D3A1A', highlight: '#8B5828' }, // Chestnut Brown
    { base: '#9A3412', highlight: '#C2410C' }, // Auburn / Ginger
    { base: '#D97706', highlight: '#FBBF24' }, // Golden Honey
    { base: '#94A3B8', highlight: '#CBD5E1' }, // Platinum Silver
    { base: '#0284C7', highlight: '#38BDF8' }, // Cyber Teal
    { base: '#7C3AED', highlight: '#A78BFA' }  // Digital Violet
  ];

  // ── 22+ Distinct Role Configurations (Real Operational Agents & Ambient NPCs) ──
  const ROLE_CONFIGS = {
    developer: {
      shirt: '#2563EB', shirtShadow: '#1D4ED8',
      pants: '#1E293B', pantsShadow: '#0F172A',
      shoes: '#F8FAFC', shoesTrim: '#64748B',
      accent: '#60A5FA', type: 'hoodie'
    },
    backend: {
      shirt: '#059669', shirtShadow: '#047857',
      pants: '#1E293B', pantsShadow: '#0F172A',
      shoes: '#334155', shoesTrim: '#10B981',
      accent: '#34D399', type: 'henley'
    },
    frontend: {
      shirt: '#3B82F6', shirtShadow: '#1D4ED8',
      pants: '#374151', pantsShadow: '#1F2937',
      shoes: '#F8FAFC', shoesTrim: '#EC4899',
      accent: '#F472B6', type: 'sweater'
    },
    architect: {
      shirt: '#6366F1', shirtShadow: '#4338CA',
      pants: '#0F172A', pantsShadow: '#020617',
      shoes: '#451A03', shoesTrim: '#78350F',
      accent: '#F59E0B', type: 'blazer'
    },
    designer: {
      shirt: '#DB2777', shirtShadow: '#BE185D',
      pants: '#374151', pantsShadow: '#1F2937',
      shoes: '#E2E8F0', shoesTrim: '#9333EA',
      accent: '#F43F5E', type: 'turtleneck'
    },
    qa: {
      shirt: '#16A34A', shirtShadow: '#15803D',
      pants: '#1F2937', pantsShadow: '#111827',
      shoes: '#334155', shoesTrim: '#22C55E',
      accent: '#FACC15', type: 'vest'
    },
    devops: {
      shirt: '#D97706', shirtShadow: '#B45309',
      pants: '#1E293B', pantsShadow: '#0F172A',
      shoes: '#18181B', shoesTrim: '#F59E0B',
      accent: '#FDE047', type: 'jacket'
    },
    security: {
      shirt: '#DC2626', shirtShadow: '#991B1B',
      pants: '#111827', pantsShadow: '#030712',
      shoes: '#09090B', shoesTrim: '#EF4444',
      accent: '#F87171', type: 'tactical'
    },
    researcher: {
      shirt: '#F8FAFC', shirtShadow: '#CBD5E1',
      pants: '#334155', pantsShadow: '#1E293B',
      shoes: '#1E293B', shoesTrim: '#06B6D4',
      accent: '#06B6D4', type: 'labcoat'
    },
    manager: {
      shirt: '#475569', shirtShadow: '#334155',
      pants: '#0F172A', pantsShadow: '#020617',
      shoes: '#18181B', shoesTrim: '#CBD5E1',
      accent: '#38BDF8', type: 'suit'
    },
    'master-avatar': {
      shirt: '#7C3AED', shirtShadow: '#5B21B6',
      pants: '#0F172A', pantsShadow: '#020617',
      shoes: '#18181B', shoesTrim: '#F59E0B',
      accent: '#F59E0B', type: 'orchestrator'
    },
    orchestrator: {
      shirt: '#7C3AED', shirtShadow: '#5B21B6',
      pants: '#0F172A', pantsShadow: '#020617',
      shoes: '#18181B', shoesTrim: '#F59E0B',
      accent: '#F59E0B', type: 'orchestrator'
    },
    analyst: {
      shirt: '#4F46E5', shirtShadow: '#3730A3',
      pants: '#0F172A', pantsShadow: '#020617',
      shoes: '#1E293B', shoesTrim: '#818CF8',
      accent: '#818CF8', type: 'suit'
    },
    commercial: {
      shirt: '#E11D48', shirtShadow: '#BE123C',
      pants: '#1E293B', pantsShadow: '#0F172A',
      shoes: '#0F172A', shoesTrim: '#FB7185',
      accent: '#FB7185', type: 'blazer'
    },
    support: {
      shirt: '#0D9488', shirtShadow: '#0F766E',
      pants: '#1F2937', pantsShadow: '#111827',
      shoes: '#111827', shoesTrim: '#2DD4BF',
      accent: '#2DD4BF', type: 'sweater'
    },
    runtime: {
      shirt: '#0284C7', shirtShadow: '#0369A1',
      pants: '#0F172A', pantsShadow: '#020617',
      shoes: '#0F172A', shoesTrim: '#38BDF8',
      accent: '#38BDF8', type: 'tactical'
    },
    'cloud-architect': {
      shirt: '#0284C7', shirtShadow: '#0369A1',
      pants: '#1E293B', pantsShadow: '#0F172A',
      shoes: '#F8FAFC', shoesTrim: '#38BDF8',
      accent: '#38BDF8', type: 'vest'
    },
    'mobile-dev': {
      shirt: '#EA580C', shirtShadow: '#C2410C',
      pants: '#374151', pantsShadow: '#1F2937',
      shoes: '#F8FAFC', shoesTrim: '#FB923C',
      accent: '#FB923C', type: 'hoodie'
    },
    'db-admin': {
      shirt: '#65A30D', shirtShadow: '#4D7C0F',
      pants: '#1E293B', pantsShadow: '#0F172A',
      shoes: '#451A03', shoesTrim: '#84CC16',
      accent: '#84CC16', type: 'jacket'
    },
    'perf-eng': {
      shirt: '#0D9488', shirtShadow: '#0F766E',
      pants: '#111827', pantsShadow: '#030712',
      shoes: '#F8FAFC', shoesTrim: '#2DD4BF',
      accent: '#2DD4BF', type: 'tactical'
    },
    'security-auditor': {
      shirt: '#475569', shirtShadow: '#334155',
      pants: '#0F172A', pantsShadow: '#020617',
      shoes: '#09090B', shoesTrim: '#EF4444',
      accent: '#EF4444', type: 'suit'
    },
    // Ambient NPCs
    courier: {
      shirt: '#EAB308', shirtShadow: '#CA8A04',
      pants: '#1E293B', pantsShadow: '#0F172A',
      shoes: '#F8FAFC', shoesTrim: '#FACC15',
      accent: '#FDE047', type: 'courier'
    },
    visitor: {
      shirt: '#A855F7', shirtShadow: '#9333EA',
      pants: '#3B82F6', pantsShadow: '#2563EB',
      shoes: '#F8FAFC', shoesTrim: '#C084FC',
      accent: '#E9D5FF', type: 'sweater'
    },
    technician: {
      shirt: '#F97316', shirtShadow: '#EA580C',
      pants: '#1E293B', pantsShadow: '#0F172A',
      shoes: '#451A03', shoesTrim: '#FB923C',
      accent: '#FDBA74', type: 'jacket'
    },
    maintenance: {
      shirt: '#10B981', shirtShadow: '#059669',
      pants: '#1F2937', pantsShadow: '#111827',
      shoes: '#18181B', shoesTrim: '#34D399',
      accent: '#6EE7B7', type: 'vest'
    },
    default: {
      shirt: '#4F46E5', shirtShadow: '#3730A3',
      pants: '#1E293B', pantsShadow: '#0F172A',
      shoes: '#18181B', shoesTrim: '#94A3B8',
      accent: '#818CF8', type: 'hoodie'
    }
  };

  function hashString(str) {
    let hash = 0;
    if (!str) return 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  // ── Character Sprite Generator (Multi-Direction 2.5D Isometric Pixel Art) ──
  function drawCharacter(ctx, w, h, roleKey, direction, frame, state, variantId = 0) {
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;

    const cx = Math.floor(w / 2); // cx = 12
    const role = ROLE_CONFIGS[roleKey] || ROLE_CONFIGS.default;

    const skin = SKIN_PALETTES[variantId % SKIN_PALETTES.length];
    const hair = HAIR_PALETTES[(variantId * 3) % HAIR_PALETTES.length];
    const hairStyle = variantId % 8; // 8 distinct hair styles

    // Animation bob & limb offsets
    let bodyBob = 0;
    let legOffsetL = 0;
    let legOffsetR = 0;
    let armOffsetL = 0;
    let armOffsetR = 0;

    if (state === CHAR_STATES.WALK) {
      const cycle = [0, 2, 0, -2];
      legOffsetL = cycle[frame % 4];
      legOffsetR = -cycle[frame % 4];
      armOffsetL = -cycle[frame % 4];
      armOffsetR = cycle[frame % 4];
      bodyBob = (frame % 2 === 1) ? -1 : 0;
    } else if (state === CHAR_STATES.IDLE) {
      // Subtle 4-frame breathing
      bodyBob = (frame === 1 || frame === 2) ? -1 : 0;
    } else if (state === CHAR_STATES.WORK) {
      bodyBob = -1; // engaged forward posture at desk
    } else if (state === CHAR_STATES.SUCCESS) {
      bodyBob = (frame % 2 === 1) ? -2 : -1; // jumping cheer
    } else if (state === CHAR_STATES.ERROR) {
      bodyBob = (frame % 2 === 1) ? -1 : 0;
    }

    const by = h - 4 + bodyBob; // baseline Y (around 36)

    // ── 1. Contact Ground Shadow ──
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.beginPath();
    ctx.ellipse(cx, h - 3, 6.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── DRAWING BY DIRECTION ──
    if (direction === DIRECTIONS.S) {
      // ============================================================
      // DIRECTION: SOUTH (FRONT VIEW)
      // ============================================================

      // FEET & SHOES (Isometric toe flare & sole rim)
      const leftShoeX = cx - 4;
      const rightShoeX = cx + 1;
      const leftShoeY = by - 3 + legOffsetL;
      const rightShoeY = by - 3 + legOffsetR;

      ctx.fillStyle = role.shoes;
      ctx.fillRect(leftShoeX - 1, leftShoeY, 4, 2);
      ctx.fillRect(rightShoeX, rightShoeY, 4, 2);
      ctx.fillStyle = role.shoesTrim;
      ctx.fillRect(leftShoeX - 1, leftShoeY + 2, 4, 1);
      ctx.fillRect(rightShoeX, rightShoeY + 2, 4, 1);

      // LEGS & PANTS (Tapered with inner seam shadow)
      const legTopY = by - 12;
      ctx.fillStyle = role.pants;
      ctx.fillRect(leftShoeX, legTopY, 3, (by - 3) - legTopY + legOffsetL);
      ctx.fillStyle = role.pantsShadow;
      ctx.fillRect(leftShoeX + 2, legTopY, 1, (by - 3) - legTopY + legOffsetL);

      ctx.fillStyle = role.pants;
      ctx.fillRect(rightShoeX, legTopY, 3, (by - 3) - legTopY + legOffsetR);
      ctx.fillStyle = role.pantsShadow;
      ctx.fillRect(rightShoeX, legTopY, 1, (by - 3) - legTopY + legOffsetR);

      // Knee crease highlight
      ctx.fillStyle = role.accent || '#94A3B8';
      ctx.fillRect(leftShoeX + 1, by - 7 + legOffsetL, 1, 1);
      ctx.fillRect(rightShoeX + 1, by - 7 + legOffsetR, 1, 1);

      // HIPS & WAISTBAND
      ctx.fillStyle = role.pantsShadow;
      ctx.fillRect(cx - 4, legTopY - 1, 8, 2);
      ctx.fillStyle = '#CBD5E1'; // Belt buckle
      ctx.fillRect(cx - 1, legTopY - 1, 2, 1);

      // TORSO & OUTFIT (Anatomically tapered: waist 8 -> mid 9 -> shoulders 10)
      const torsoY = by - 23;
      // Lower torso (waist)
      ctx.fillStyle = role.shirt;
      ctx.fillRect(cx - 4, torsoY + 6, 8, 4);
      ctx.fillStyle = role.shirtShadow;
      ctx.fillRect(cx, torsoY + 6, 4, 4);

      // Mid chest
      ctx.fillStyle = role.shirt;
      ctx.fillRect(cx - 4.5, torsoY + 3, 9, 3);
      ctx.fillStyle = role.shirtShadow;
      ctx.fillRect(cx, torsoY + 3, 4.5, 3);

      // Upper chest & shoulders (outer corners sloped naturally)
      ctx.fillStyle = role.shirt;
      ctx.fillRect(cx - 5, torsoY + 1, 10, 2);
      ctx.fillStyle = role.shirtShadow;
      ctx.fillRect(cx, torsoY + 1, 5, 2);
      // Top shoulder ridge
      ctx.fillStyle = role.shirt;
      ctx.fillRect(cx - 4, torsoY, 8, 1);
      ctx.fillStyle = role.shirtShadow;
      ctx.fillRect(cx, torsoY, 4, 1);

      // Front Outfit Accents & Details
      if (role.type === 'hoodie') {
        ctx.fillStyle = role.shirtShadow;
        ctx.fillRect(cx - 3, torsoY + 5, 6, 3); // kangaroo pocket
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(cx - 2, torsoY + 2, 1, 3); // drawstrings
        ctx.fillRect(cx + 1, torsoY + 2, 1, 3);
      } else if (role.type === 'blazer' || role.type === 'suit') {
        ctx.fillStyle = '#FFFFFF'; // dress shirt V-neck
        ctx.beginPath();
        ctx.moveTo(cx - 2, torsoY); ctx.lineTo(cx + 2, torsoY); ctx.lineTo(cx, torsoY + 4); ctx.closePath();
        ctx.fill();
        ctx.fillStyle = role.accent; // tie
        ctx.fillRect(cx - 0.5, torsoY + 1, 1, 5);
        ctx.fillStyle = '#F59E0B'; // button
        ctx.fillRect(cx - 0.5, torsoY + 7, 1, 1);
      } else if (role.type === 'labcoat') {
        ctx.fillStyle = '#06B6D4'; // cyan undershirt
        ctx.fillRect(cx - 1, torsoY, 2, 6);
        ctx.fillStyle = '#CBD5E1'; // coat lapel
        ctx.fillRect(cx - 4, torsoY + 5, 2, 1);
        ctx.fillStyle = '#3B82F6'; // pen in pocket
        ctx.fillRect(cx - 3, torsoY + 4, 1, 2);
      } else if (role.type === 'vest') {
        ctx.fillStyle = '#FEF08A'; // reflective safety stripe
        ctx.fillRect(cx - 4, torsoY + 3, 8, 1);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(cx - 4, torsoY + 6, 8, 1);
      } else if (role.type === 'tactical') {
        ctx.fillStyle = '#18181B'; // tactical chest harness
        ctx.fillRect(cx - 4, torsoY + 1, 8, 7);
        ctx.fillStyle = '#EF4444'; // badge
        ctx.fillRect(cx - 2, torsoY + 2, 4, 3);
        ctx.fillStyle = '#FACC15';
        ctx.fillRect(cx - 1, torsoY + 3, 2, 1);
      } else if (role.type === 'orchestrator') {
        ctx.fillStyle = '#F59E0B'; // gold embroidery
        ctx.fillRect(cx - 3, torsoY + 2, 2, 3);
        ctx.fillRect(cx + 1, torsoY + 2, 2, 3);
        ctx.fillStyle = '#FDE047';
        ctx.fillRect(cx - 1, torsoY + 4, 2, 2);
      } else if (role.type === 'courier') {
        ctx.fillStyle = '#78350F'; // diagonal messenger bag strap
        ctx.fillRect(cx - 4, torsoY + 1, 8, 2);
        ctx.fillRect(cx + 2, torsoY + 5, 3, 4); // bag pouch on hip
        ctx.fillStyle = '#F59E0B'; // bag buckle
        ctx.fillRect(cx + 3, torsoY + 6, 1, 1);
      }

      // ARMS & HANDS
      const armY = torsoY + 1;
      const armW = 2;
      const armH = 6;

      if (state === CHAR_STATES.WORK) {
        const tapL = (frame % 2 === 0) ? 1 : 0;
        const tapR = (frame % 2 === 1) ? 1 : 0;
        ctx.fillStyle = role.shirt;
        ctx.fillRect(cx - 6, armY, armW, 5);
        ctx.fillStyle = skin.base;
        ctx.fillRect(cx - 5, armY + 4 + tapL, 3, 2);
        ctx.fillStyle = role.shirtShadow;
        ctx.fillRect(cx + 4, armY, armW, 5);
        ctx.fillStyle = skin.base;
        ctx.fillRect(cx + 2, armY + 4 + tapR, 3, 2);
      } else if (state === CHAR_STATES.THINK) {
        ctx.fillStyle = role.shirt;
        ctx.fillRect(cx - 6, armY, armW, armH);
        ctx.fillStyle = skin.base;
        ctx.fillRect(cx - 6, armY + armH, armW, 2);
        ctx.fillStyle = role.shirtShadow;
        ctx.fillRect(cx + 4, armY, armW, 3);
        ctx.fillRect(cx + 2, armY - 3, armW, 4);
        ctx.fillStyle = skin.base;
        ctx.fillRect(cx + 1, armY - 4, 2, 2);
      } else if (state === CHAR_STATES.COMMUNICATE) {
        ctx.fillStyle = role.shirt;
        ctx.fillRect(cx - 6, armY, armW, armH);
        ctx.fillStyle = skin.base;
        ctx.fillRect(cx - 6, armY + armH, armW, 2);
        ctx.fillStyle = role.shirtShadow;
        ctx.fillRect(cx + 4, armY + 1, 3, 2);
        ctx.fillStyle = skin.base;
        ctx.fillRect(cx + 6, armY, 2, 3);
      } else if (state === CHAR_STATES.SUCCESS) {
        ctx.fillStyle = role.shirt;
        ctx.fillRect(cx - 6, armY - 4, armW, 6);
        ctx.fillStyle = skin.base;
        ctx.fillRect(cx - 6, armY - 6, armW, 2);
        ctx.fillStyle = role.shirtShadow;
        ctx.fillRect(cx + 4, armY - 4, armW, 6);
        ctx.fillStyle = skin.base;
        ctx.fillRect(cx + 4, armY - 6, armW, 2);
      } else if (state === CHAR_STATES.ERROR) {
        ctx.fillStyle = role.shirt;
        ctx.fillRect(cx - 6, armY - 2, armW, 4);
        ctx.fillStyle = skin.base;
        ctx.fillRect(cx - 4, armY - 6, 2, 2);
        ctx.fillStyle = role.shirtShadow;
        ctx.fillRect(cx + 4, armY - 2, armW, 4);
        ctx.fillStyle = skin.base;
        ctx.fillRect(cx + 2, armY - 6, 2, 2);
      } else {
        ctx.fillStyle = role.shirt;
        ctx.fillRect(cx - 6, armY + armOffsetL, armW, armH);
        ctx.fillStyle = skin.base;
        ctx.fillRect(cx - 6, armY + armH + armOffsetL, armW, 2);
        ctx.fillStyle = role.shirtShadow;
        ctx.fillRect(cx + 4, armY + armOffsetR, armW, armH);
        ctx.fillStyle = skin.base;
        ctx.fillRect(cx + 4, armY + armH + armOffsetR, armW, 2);
      }

      // NECK
      const neckY = torsoY - 2;
      ctx.fillStyle = skin.shadow;
      ctx.fillRect(cx - 1.5, neckY, 3, 2);

      // HEAD & FACE (Sculpted Rounded Silhouette)
      const headY = neckY - 8;
      // Chin (tapered)
      ctx.fillStyle = skin.shadow;
      ctx.fillRect(cx - 2, headY + 7, 4, 1);
      // Lower jaw
      ctx.fillStyle = skin.base;
      ctx.fillRect(cx - 3, headY + 5, 6, 2);
      // Cheeks & Mid face
      ctx.fillRect(cx - 4, headY + 2, 8, 3);
      // Forehead (beveled corners for round skull)
      ctx.fillRect(cx - 3, headY, 6, 2);
      ctx.fillRect(cx - 4, headY + 1, 8, 1);

      // Ears
      ctx.fillStyle = skin.shadow;
      ctx.fillRect(cx - 5, headY + 3, 1, 2);
      ctx.fillRect(cx + 4, headY + 3, 1, 2);

      // EYES & EXPRESSION (Authentic 16-bit RPG expression)
      const eyeY = headY + 3;
      if (state === CHAR_STATES.IDLE && frame === 3) {
        // Peaceful blink
        ctx.fillStyle = skin.shadow;
        ctx.fillRect(cx - 3, eyeY + 1, 2, 1);
        ctx.fillRect(cx + 1, eyeY + 1, 2, 1);
      } else {
        // Left eye
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(cx - 3, eyeY, 2, 2);
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(cx - 3, eyeY, 1, 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(cx - 2, eyeY, 1, 1); // specular catchlight

        // Right eye
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(cx + 1, eyeY, 2, 2);
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(cx + 2, eyeY, 1, 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(cx + 1, eyeY, 1, 1); // specular catchlight
      }

      // Eyebrows matching hair
      ctx.fillStyle = hair.base;
      ctx.fillRect(cx - 3, eyeY - 1, 2, 1);
      ctx.fillRect(cx + 1, eyeY - 1, 2, 1);

      // Subtle nose shadow
      ctx.fillStyle = skin.shadow;
      ctx.fillRect(cx - 0.5, headY + 5, 1, 1);

      // Mouth
      ctx.fillStyle = (state === CHAR_STATES.COMMUNICATE) ? '#7F1D1D' : skin.lip;
      ctx.fillRect(cx - 1, headY + 6, 2, (state === CHAR_STATES.COMMUNICATE) ? 2 : 1);

      // Hair (Front S Styles)
      drawHairFront(ctx, cx, headY, hair, hairStyle, role);

    } else if (direction === DIRECTIONS.N) {
      // ============================================================
      // DIRECTION: NORTH (REAR VIEW)
      // ============================================================

      const leftShoeX = cx - 4;
      const rightShoeX = cx + 1;
      const leftShoeY = by - 3 + legOffsetL;
      const rightShoeY = by - 3 + legOffsetR;

      ctx.fillStyle = role.shoes;
      ctx.fillRect(leftShoeX, leftShoeY, 3, 2);
      ctx.fillStyle = role.shoesTrim;
      ctx.fillRect(leftShoeX, leftShoeY + 2, 3, 1);

      ctx.fillStyle = role.shoes;
      ctx.fillRect(rightShoeX, rightShoeY, 3, 2);
      ctx.fillStyle = role.shoesTrim;
      ctx.fillRect(rightShoeX, rightShoeY + 2, 3, 1);

      // Back of Legs / Pants
      const legTopY = by - 12;
      ctx.fillStyle = role.pants;
      ctx.fillRect(leftShoeX, legTopY, 3, (by - 3) - legTopY + legOffsetL);
      ctx.fillRect(rightShoeX, legTopY, 3, (by - 3) - legTopY + legOffsetR);

      // Rear Belt & Pockets
      ctx.fillStyle = role.pantsShadow;
      ctx.fillRect(cx - 4, legTopY - 1, 8, 2);
      ctx.fillRect(cx - 4, legTopY + 2, 2, 2); // left pocket
      ctx.fillRect(cx + 2, legTopY + 2, 2, 2); // right pocket

      // Back of Torso (Tapered shoulders)
      const torsoY = by - 23;
      ctx.fillStyle = role.shirt;
      ctx.fillRect(cx - 4, torsoY + 6, 8, 4);
      ctx.fillRect(cx - 4.5, torsoY + 3, 9, 3);
      ctx.fillRect(cx - 5, torsoY + 1, 10, 2);
      ctx.fillRect(cx - 4, torsoY, 8, 1);
      ctx.fillStyle = role.shirtShadow;
      ctx.fillRect(cx - 0.5, torsoY, 1, 10); // center back seam

      if (role.type === 'hoodie') {
        // Hood hanging down back
        ctx.fillStyle = role.shirtShadow;
        ctx.fillRect(cx - 4, torsoY, 8, 5);
        ctx.fillStyle = role.accent;
        ctx.fillRect(cx - 1, torsoY + 4, 2, 1);
      } else if (role.type === 'courier') {
        ctx.fillStyle = '#78350F';
        ctx.fillRect(cx - 4, torsoY + 2, 8, 2);
        ctx.fillRect(cx - 3, torsoY + 4, 3, 3);
      }

      // Arms at back
      const armY = torsoY + 1;
      const armW = 2;
      const armH = 6;
      ctx.fillStyle = role.shirt;
      ctx.fillRect(cx - 6, armY + armOffsetL, armW, armH);
      ctx.fillStyle = role.shirtShadow;
      ctx.fillRect(cx + 4, armY + armOffsetR, armW, armH);

      // Back of Neck
      const neckY = torsoY - 2;
      ctx.fillStyle = skin.shadow;
      ctx.fillRect(cx - 1.5, neckY, 3, 2);

      // Back of Head (Full hair crown coverage)
      const headY = neckY - 8;
      ctx.fillStyle = hair.base;
      ctx.fillRect(cx - 4, headY, 8, 8);
      ctx.fillRect(cx - 3, headY - 1, 6, 2);
      ctx.fillStyle = hair.highlight;
      ctx.fillRect(cx - 3, headY, 6, 2); // crown highlight sheen
      ctx.fillStyle = hair.base;
      ctx.fillRect(cx - 3, headY + 7, 6, 2); // nape hair

    } else if (direction === DIRECTIONS.E) {
      // ============================================================
      // DIRECTION: EAST (RIGHT PROFILE / 3-QUARTER)
      // ============================================================

      const footX = cx - 2;
      const footY = by - 3;
      // Front stepping shoe
      ctx.fillStyle = role.shoes;
      ctx.fillRect(footX, footY + legOffsetR, 5, 2);
      ctx.fillStyle = role.shoesTrim;
      ctx.fillRect(footX, footY + 2 + legOffsetR, 5, 1);

      // Leg
      const legTopY = by - 12;
      ctx.fillStyle = role.pants;
      ctx.fillRect(footX + 1, legTopY, 4, (by - 3) - legTopY + legOffsetR);
      ctx.fillStyle = role.pantsShadow;
      ctx.fillRect(footX, legTopY, 2, (by - 3) - legTopY);

      // Side Torso (Angled 3/4)
      const torsoY = by - 23;
      ctx.fillStyle = role.shirt;
      ctx.fillRect(cx - 3, torsoY + 6, 7, 4);
      ctx.fillRect(cx - 4, torsoY + 2, 8, 4);
      ctx.fillRect(cx - 3, torsoY, 7, 2);
      ctx.fillStyle = role.shirtShadow;
      ctx.fillRect(cx - 4, torsoY + 1, 2, 9); // back-facing shadow

      // Foreground Arm (swings with walk)
      const armY = torsoY + 1;
      ctx.fillStyle = role.shirt;
      ctx.fillRect(cx - 1, armY + armOffsetR, 3, 5);
      ctx.fillStyle = skin.base;
      ctx.fillRect(cx - 1, armY + 5 + armOffsetR, 3, 2);

      // Neck
      const neckY = torsoY - 2;
      ctx.fillStyle = skin.shadow;
      ctx.fillRect(cx - 2, neckY, 3, 2);

      // Head (Profile facing right)
      const headY = neckY - 8;
      ctx.fillStyle = skin.base;
      ctx.fillRect(cx - 3, headY + 1, 6, 7);
      ctx.fillRect(cx + 3, headY + 3, 1, 2); // nose tip pointing right
      ctx.fillRect(cx + 3, headY + 5, 1, 1); // upper lip
      ctx.fillRect(cx - 2, headY, 5, 2); // rounded crown

      // Ear on left
      ctx.fillStyle = skin.shadow;
      ctx.fillRect(cx - 3, headY + 3, 1, 3);

      // Single right-looking eye
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(cx + 1, headY + 3, 2, 2);
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(cx + 2, headY + 3, 1, 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(cx + 1, headY + 3, 1, 1);

      // Eyebrow
      ctx.fillStyle = hair.base;
      ctx.fillRect(cx + 1, headY + 2, 2, 1);

      // Hair profile
      ctx.fillStyle = hair.base;
      ctx.fillRect(cx - 4, headY - 1, 7, 3);
      ctx.fillRect(cx - 4, headY + 1, 2, 5);
      ctx.fillStyle = hair.highlight;
      ctx.fillRect(cx - 2, headY - 1, 4, 1);

    } else if (direction === DIRECTIONS.W) {
      // ============================================================
      // DIRECTION: WEST (LEFT PROFILE / 3-QUARTER)
      // ============================================================

      const footX = cx - 3;
      const footY = by - 3;
      // Front stepping shoe
      ctx.fillStyle = role.shoes;
      ctx.fillRect(footX - 1, footY + legOffsetL, 5, 2);
      ctx.fillStyle = role.shoesTrim;
      ctx.fillRect(footX - 1, footY + 2 + legOffsetL, 5, 1);

      // Leg
      const legTopY = by - 12;
      ctx.fillStyle = role.pants;
      ctx.fillRect(footX - 1, legTopY, 4, (by - 3) - legTopY + legOffsetL);
      ctx.fillStyle = role.pantsShadow;
      ctx.fillRect(footX + 2, legTopY, 2, (by - 3) - legTopY);

      // Side Torso (Angled 3/4)
      const torsoY = by - 23;
      ctx.fillStyle = role.shirt;
      ctx.fillRect(cx - 4, torsoY + 6, 7, 4);
      ctx.fillRect(cx - 4, torsoY + 2, 8, 4);
      ctx.fillRect(cx - 4, torsoY, 7, 2);
      ctx.fillStyle = role.shirtShadow;
      ctx.fillRect(cx + 2, torsoY + 1, 2, 9); // back-facing shadow

      // Foreground Arm (swings with walk)
      const armY = torsoY + 1;
      ctx.fillStyle = role.shirt;
      ctx.fillRect(cx - 2, armY + armOffsetL, 3, 5);
      ctx.fillStyle = skin.base;
      ctx.fillRect(cx - 2, armY + 5 + armOffsetL, 3, 2);

      // Neck
      const neckY = torsoY - 2;
      ctx.fillStyle = skin.shadow;
      ctx.fillRect(cx - 1, neckY, 3, 2);

      // Head (Profile facing left)
      const headY = neckY - 8;
      ctx.fillStyle = skin.base;
      ctx.fillRect(cx - 3, headY + 1, 6, 7);
      ctx.fillRect(cx - 4, headY + 3, 1, 2); // nose tip pointing left
      ctx.fillRect(cx - 4, headY + 5, 1, 1); // upper lip
      ctx.fillRect(cx - 3, headY, 5, 2); // rounded crown

      // Ear on right
      ctx.fillStyle = skin.shadow;
      ctx.fillRect(cx + 2, headY + 3, 1, 3);

      // Single left-looking eye
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(cx - 3, headY + 3, 2, 2);
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(cx - 3, headY + 3, 1, 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(cx - 2, headY + 3, 1, 1);

      // Eyebrow
      ctx.fillStyle = hair.base;
      ctx.fillRect(cx - 3, headY + 2, 2, 1);

      // Hair profile
      ctx.fillStyle = hair.base;
      ctx.fillRect(cx - 3, headY - 1, 7, 3);
      ctx.fillRect(cx + 2, headY + 1, 2, 5);
      ctx.fillStyle = hair.highlight;
      ctx.fillRect(cx - 2, headY - 1, 4, 1);
    }

    // ── Role Specific Accessories (Glasses, Headsets, Badges) ──
    if (direction === DIRECTIONS.S) {
      const headY = by - 23 - 2 - 8;
      if (roleKey === 'architect' || roleKey === 'researcher' || roleKey === 'analyst') {
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - 3.5, headY + 2.5, 3, 2);
        ctx.strokeRect(cx + 0.5, headY + 2.5, 3, 2);
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(cx - 1, headY + 3, 2, 1);
      } else if (roleKey === 'devops' || roleKey === 'support') {
        ctx.fillStyle = '#18181B';
        ctx.fillRect(cx - 5, headY + 2, 2, 3);
        ctx.fillRect(cx - 4, headY - 2, 8, 1);
        ctx.fillRect(cx + 3, headY + 2, 2, 3);
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(cx + 2, headY + 5, 1, 1);
      } else if (roleKey === 'qa' && state !== CHAR_STATES.WORK) {
        ctx.fillStyle = '#78350F';
        ctx.fillRect(cx + 4, by - 16, 4, 5);
        ctx.fillStyle = '#FEF08A';
        ctx.fillRect(cx + 5, by - 15, 2, 3);
      }
    }

    // ── 4-Frame State VFX Overlays ──
    const headTopY = by - 31;
    if (state === CHAR_STATES.THINK) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.fillRect(cx + 4, headTopY - 7, 8, 6);
      ctx.fillRect(cx + 3, headTopY - 2, 2, 2);
      ctx.fillStyle = (frame % 2 === 0) ? '#0284C7' : '#38BDF8';
      ctx.fillRect(cx + 6 + (frame % 3), headTopY - 5, 2, 2);
    } else if (state === CHAR_STATES.COMMUNICATE) {
      ctx.fillStyle = '#06B6D4';
      ctx.fillRect(cx + 4, headTopY - 8, 9, 6);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(cx + 6, headTopY - 6, 1, 2);
      ctx.fillRect(cx + 8, headTopY - 6, 1, 2);
      ctx.fillRect(cx + 10, headTopY - 6, 1, 2);
    } else if (state === CHAR_STATES.SUCCESS) {
      ctx.fillStyle = '#FACC15';
      const sparkY = headTopY - 6 - (frame % 2);
      ctx.fillRect(cx - 5, sparkY, 2, 2);
      ctx.fillRect(cx + 5, sparkY - 2, 2, 2);
      ctx.fillRect(cx, sparkY - 3, 2, 2);
    } else if (state === CHAR_STATES.ERROR) {
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(cx - 1, headTopY - 9, 3, 6);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(cx, headTopY - 8, 1, 3);
      ctx.fillRect(cx, headTopY - 4, 1, 1);
    } else if (state === CHAR_STATES.WAITING) {
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(cx - 3, headTopY - 5, 1, 1);
      ctx.fillRect(cx, headTopY - 5, 1, 1);
      ctx.fillRect(cx + 3, headTopY - 5, 1, 1);
    } else if (state === CHAR_STATES.BLOCKED) {
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(cx - 2, headTopY - 7, 5, 4);
      ctx.fillStyle = '#000000';
      ctx.fillRect(cx, headTopY - 6, 1, 2);
    }
  }

  // ── Helper: Draw Front Hairstyles (8 distinct styles) ──
  function drawHairFront(ctx, cx, headY, hair, hairStyle, role) {
    ctx.fillStyle = hair.base;
    if (hairStyle === 0) {
      // Classic Side-Part
      ctx.fillRect(cx - 4, headY - 2, 8, 4);
      ctx.fillRect(cx - 4, headY, 2, 4);
      ctx.fillRect(cx + 3, headY, 1, 3);
      ctx.fillStyle = hair.highlight;
      ctx.fillRect(cx - 2, headY - 2, 4, 1);
    } else if (hairStyle === 1) {
      // Ponytail / Bun
      ctx.fillRect(cx - 4, headY - 2, 8, 4);
      ctx.fillRect(cx - 4, headY, 1, 3);
      ctx.fillRect(cx + 3, headY, 1, 3);
      ctx.fillRect(cx + 4, headY - 1, 2, 5);
      ctx.fillStyle = role.accent;
      ctx.fillRect(cx + 3, headY, 1, 2);
    } else if (hairStyle === 2) {
      // Voluminous Curly Afro
      ctx.fillRect(cx - 5, headY - 3, 10, 5);
      ctx.fillRect(cx - 5, headY + 1, 2, 4);
      ctx.fillRect(cx + 3, headY + 1, 2, 4);
      ctx.fillStyle = hair.highlight;
      ctx.fillRect(cx - 3, headY - 3, 6, 1);
      ctx.fillRect(cx - 4, headY - 1, 2, 2);
    } else if (hairStyle === 3) {
      // Spiky Undercut
      ctx.fillRect(cx - 4, headY - 1, 8, 3);
      ctx.fillRect(cx - 3, headY - 4, 2, 3);
      ctx.fillRect(cx, headY - 5, 2, 4);
      ctx.fillRect(cx + 2, headY - 3, 2, 2);
      ctx.fillStyle = hair.highlight;
      ctx.fillRect(cx, headY - 5, 1, 2);
    } else if (hairStyle === 4) {
      // Sleek Bob with Bangs
      ctx.fillRect(cx - 4, headY - 2, 8, 4);
      ctx.fillRect(cx - 4, headY + 2, 8, 1);
      ctx.fillRect(cx - 5, headY, 2, 6);
      ctx.fillRect(cx + 3, headY, 2, 6);
      ctx.fillStyle = hair.highlight;
      ctx.fillRect(cx - 3, headY - 2, 5, 1);
    } else if (hairStyle === 5) {
      // Long Wavy
      ctx.fillRect(cx - 4, headY - 2, 8, 4);
      ctx.fillRect(cx - 5, headY, 2, 8);
      ctx.fillRect(cx + 3, headY, 2, 8);
      ctx.fillStyle = hair.highlight;
      ctx.fillRect(cx - 3, headY - 2, 6, 1);
      ctx.fillRect(cx - 5, headY + 3, 1, 3);
    } else if (hairStyle === 6) {
      // Buzz Cut + Trimmed Full Beard
      ctx.fillRect(cx - 4, headY - 1, 8, 2);
      ctx.fillRect(cx - 4, headY + 5, 8, 3);
      ctx.fillRect(cx - 2, headY + 4, 4, 1);
    } else {
      // Executive Slicked
      ctx.fillRect(cx - 4, headY - 2, 8, 4);
      ctx.fillRect(cx - 4, headY, 1, 3);
      ctx.fillRect(cx + 3, headY, 1, 3);
      ctx.fillStyle = hair.highlight;
      ctx.fillRect(cx - 3, headY - 2, 6, 2);
    }
  }

  // ── Helper: Format Agent Display Name (NO UUIDs in World) ──
  function formatAgentDisplayName(rawName, role, id) {
    const canonicalNames = {
      courier: 'Courier Leo',
      visitor: 'Visitor Clara',
      technician: 'Technician Bruno',
      maintenance: 'Maintenance Sam',
      'master-avatar': 'Master Orchestrator',
      orchestrator: 'Master Orchestrator'
    };

    if (canonicalNames[role]) {
      return canonicalNames[role];
    }

    const isUuid = !rawName ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i.test(rawName) ||
      rawName.startsWith('38515b10') ||
      rawName.length > 24;

    if (!isUuid) return rawName;

    const friendlyRoles = {
      developer: 'Senior Dev',
      backend: 'Backend Lead',
      frontend: 'UI Engineer',
      architect: 'Lead Architect',
      designer: 'Creative Lead',
      qa: 'QA Specialist',
      devops: 'DevOps Eng',
      security: 'Sec Officer',
      researcher: 'AI Scientist',
      manager: 'Tech Director',
      analyst: 'Data Analyst',
      commercial: 'Account Lead',
      support: 'Support Eng',
      runtime: 'Systems Eng',
      'cloud-architect': 'Cloud Architect',
      'mobile-dev': 'Mobile Dev',
      'db-admin': 'Database Admin',
      'perf-eng': 'Performance Eng',
      'security-auditor': 'Security Auditor',
      default: 'Agent'
    };

    const roleName = friendlyRoles[role] || 'Agent';
    const firstNames = ['Lucas', 'Sofia', 'Marcus', 'Elena', 'Gabriel', 'Maya', 'Chen', 'Zack', 'Iris', 'Alex', 'Theo', 'Clara'];
    const h = hashString(id || '1');
    const assignedName = firstNames[h % firstNames.length];
    return `${roleName} ${assignedName}`;
  }

  // ── Helper: Ultra-compact short name for medium zoom LOD ──
  function formatAgentShortName(displayName, role, id) {
    const canonicalShorts = {
      courier: 'Courier Leo',
      visitor: 'Visitor Clara',
      technician: 'Tech Bruno',
      maintenance: 'Maint Sam',
      'master-avatar': 'Master Orchestrator',
      orchestrator: 'Master Orchestrator'
    };

    if (canonicalShorts[role]) {
      return canonicalShorts[role];
    }

    const rolePrefixes = {
      developer: 'Dev',
      backend: 'Backend',
      frontend: 'Frontend',
      architect: 'Arch',
      designer: 'Design',
      qa: 'QA',
      devops: 'DevOps',
      security: 'Sec',
      researcher: 'Sci',
      manager: 'Lead',
      analyst: 'Data',
      commercial: 'Biz',
      support: 'Support',
      runtime: 'Sys',
      'cloud-architect': 'Cloud',
      'mobile-dev': 'Mobile',
      'db-admin': 'DBA',
      'perf-eng': 'Perf',
      'security-auditor': 'Audit'
    };
    const prefix = rolePrefixes[role] || 'Agent';
    const firstNames = ['Lucas', 'Sofia', 'Marcus', 'Elena', 'Gabriel', 'Maya', 'Chen', 'Zack', 'Iris', 'Alex', 'Theo', 'Clara'];
    const h = hashString(id || '1');
    const assignedName = firstNames[h % firstNames.length];
    return `${prefix} ${assignedName}`;
  }

  // ── Character Texture Cache ──
  class CharacterTextureCache {
    constructor(app) {
      this.app = app;
      this.cache = new Map();
    }

    getKey(role, direction, frame, state, variantId = 0) {
      return `${role}_${direction}_${frame}_${state}_v${variantId}`;
    }

    getTexture(role, direction, frame, state, variantId = 0) {
      const key = this.getKey(role, direction, frame, state, variantId);
      if (this.cache.has(key)) return this.cache.get(key);

      const canvas = document.createElement('canvas');
      canvas.width = CHAR_WIDTH;
      canvas.height = CHAR_HEIGHT;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      drawCharacter(ctx, CHAR_WIDTH, CHAR_HEIGHT, role, direction, frame, state, variantId);

      const texture = PIXI.Texture.from(canvas);
      this.cache.set(key, texture);
      return texture;
    }
  }

  // ── Character Sprite Class ──
  class CityCharacter {
    constructor(agentData, textureCache) {
      this.id = agentData.id;
      this.role = (agentData.role || 'default').toLowerCase();
      this.variantId = hashString(this.id) % 16;
      this.displayName = formatAgentDisplayName(agentData.name, this.role, this.id);
      this.shortName = formatAgentShortName(this.displayName, this.role, this.id);
      this.name = this.displayName;
      this.isSeatedInRoom = !!agentData.isSeated;

      this.state = CHAR_STATES.IDLE;
      this.direction = (agentData.direction !== undefined) ? agentData.direction : DIRECTIONS.S;
      this.frame = 0;
      this.frameTimer = 0;
      this.frameInterval = 180;

      this.gridX = agentData.gridX || 0;
      this.gridY = agentData.gridY || 0;
      this.targetGridX = this.gridX;
      this.targetGridY = this.gridY;

      this.textureCache = textureCache;

      const tex = textureCache.getTexture(this.role, this.direction, 0, this.state, this.variantId);
      this.sprite = new PIXI.Sprite(tex);
      this.sprite.anchor.set(0.5, 1);
      this.sprite.zIndex = 0;
      this.sprite.eventMode = 'static';
      this.sprite.cursor = 'pointer';

      // ── Nameplate Discipline: Compact Pixel Badge (NO UUIDs, Zoom LOD) ──
      this.nameLabel = new PIXI.Text({
        text: this.shortName,
        style: {
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: 5.5,
          fontWeight: 'bold',
          fill: '#F8FAFC',
          align: 'center',
          stroke: { color: '#090D16', width: 1.5 },
          lineHeight: 6
        }
      });
      this.nameLabel.anchor.set(0.5, 1);
      this.nameLabel.y = -CHAR_HEIGHT - 3;
      this.nameLabel.visible = false;
      this.sprite.addChild(this.nameLabel);

      this.path = [];
      this.pathIndex = 0;
      this.walkSpeed = 0.022;
      this.walkProgress = 0;
    }

    setState(newState) {
      if (this.state !== newState) {
        this.state = newState;
        this.frame = 0;
        this.updateTexture();
      }
    }

    setDirection(dx, dy) {
      if (Math.abs(dx) > Math.abs(dy)) {
        this.direction = dx > 0 ? DIRECTIONS.E : DIRECTIONS.W;
      } else {
        this.direction = dy > 0 ? DIRECTIONS.S : DIRECTIONS.N;
      }
    }

    updateTexture() {
      const tex = this.textureCache.getTexture(this.role, this.direction, this.frame, this.state, this.variantId);
      this.sprite.texture = tex;
    }

    updateNameplate(zoom) {
      const isPhotoMode = window.fenixCity && window.fenixCity.isPhotoMode;
      if (isPhotoMode || !zoom || zoom < 1.6 || this.isSeatedInRoom) {
        this.nameLabel.visible = false;
        return;
      }

      this.nameLabel.visible = true;

      const statusDot = (this.state === 'work') ? '● WORK' :
                        (this.state === 'think') ? '● THINK' :
                        (this.state === 'walk') ? '● WALK' :
                        (this.state === 'error') ? '● ERR' :
                        (this.state === 'success') ? '● OK' : '● IDLE';

      const labelName = this.shortName || this.displayName;

      if (zoom >= 2.8) {
        this.nameLabel.text = `${labelName} ${statusDot}`;
      } else {
        this.nameLabel.text = labelName;
      }
    }

    update(dt, currentZoom) {
      this.frameTimer += dt;
      if (this.frameTimer >= this.frameInterval) {
        this.frameTimer -= this.frameInterval;
        this.frame = (this.frame + 1) % WALK_FRAMES;
        this.updateTexture();
      }

      this.updateNameplate(currentZoom || window.fenixCity?.camera?.zoom || 1.5);

      if (this.path.length > 0 && this.pathIndex < this.path.length) {
        const target = this.path[this.pathIndex];
        const dx = target.x - this.gridX;
        const dy = target.y - this.gridY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 0.05) {
          this.gridX = target.x;
          this.gridY = target.y;
          this.pathIndex++;
          if (this.pathIndex >= this.path.length) {
            this.path = [];
            this.pathIndex = 0;
            this.setState(CHAR_STATES.IDLE);
          }
        } else {
          this.setDirection(dx, dy);
          this.setState(CHAR_STATES.WALK);
          const step = this.walkSpeed * dt;
          this.gridX += (dx / dist) * step;
          this.gridY += (dy / dist) * step;
        }

        if (window.gridToScreen) {
          const pos = window.gridToScreen(this.gridX, this.gridY);
          this.sprite.x = Math.round(pos.x);
          this.sprite.y = Math.round(pos.y + 8);
          this.sprite.zIndex = this.sprite.y;
        }
      }
    }

    setPath(path) {
      this.path = path;
      this.pathIndex = 0;
      if (path.length > 0) {
        this.setState(CHAR_STATES.WALK);
      }
    }

    destroy() {
      if (this.sprite) {
        this.sprite.removeChild(this.nameLabel);
        this.nameLabel.destroy();
        this.sprite.destroy();
      }
    }
  }

  // ── A* Pathfinder ──
  class AStarPathfinder {
    constructor(gridWidth, gridHeight) {
      this.w = gridWidth;
      this.h = gridHeight;
      this.blocked = new Set();
    }

    setBlocked(x, y) {
      this.blocked.add(`${x},${y}`);
    }

    isBlocked(x, y) {
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return true;
      return this.blocked.has(`${x},${y}`);
    }

    heuristic(ax, ay, bx, by) {
      return Math.abs(ax - bx) + Math.abs(ay - by);
    }

    findPath(sx, sy, ex, ey) {
      if (this.isBlocked(ex, ey)) return [];

      const open = [{ x: sx, y: sy, g: 0, h: this.heuristic(sx, sy, ex, ey), f: 0, parent: null }];
      open[0].f = open[0].h;
      const closed = new Set();
      const dirs = [[1,0],[-1,0],[0,1],[0,-1]];

      while (open.length > 0) {
        open.sort((a, b) => a.f - b.f);
        const curr = open.shift();
        const key = `${curr.x},${curr.y}`;

        if (curr.x === ex && curr.y === ey) {
          const path = [];
          let node = curr;
          while (node) { path.unshift({ x: node.x, y: node.y }); node = node.parent; }
          return path;
        }

        closed.add(key);

        for (const [dx, dy] of dirs) {
          const nx = curr.x + dx;
          const ny = curr.y + dy;
          const nk = `${nx},${ny}`;
          if (closed.has(nk) || this.isBlocked(nx, ny)) continue;
          const g = curr.g + 1;
          const h = this.heuristic(nx, ny, ex, ey);
          const existing = open.find(n => n.x === nx && n.y === ny);
          if (!existing) {
            open.push({ x: nx, y: ny, g, h, f: g + h, parent: curr });
          } else if (g < existing.g) {
            existing.g = g;
            existing.f = g + existing.h;
            existing.parent = curr;
          }
        }
      }
      return [];
    }
  }

  // Export
  window.FenixCharacterSystem = {
    CHAR_STATES,
    DIRECTIONS,
    ROLE_COLORS: ROLE_CONFIGS,
    CharacterTextureCache,
    CityCharacter,
    AStarPathfinder,
    formatAgentDisplayName,
    formatAgentShortName
  };

})();
