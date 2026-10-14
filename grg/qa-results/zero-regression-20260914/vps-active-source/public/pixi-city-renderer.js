(function() {
    'use strict';

    // ============================================================================
    // 1. CONSTANTS & PALETTE
    // ============================================================================
    const ISO_TILE_WIDTH = 32;
    const ISO_TILE_HEIGHT = 16;
    const HALF_W = 16;
    const HALF_H = 8;

    const PALETTE = {
        // Ground & Environment
        grassLush: '#2D4C1E',
        grassMid: '#3A5F27',
        grassLight: '#4A7A31',
        grassHighlight: '#5FA738',
        grassFlowerYellow: '#FACC15',
        grassFlowerWhite: '#F8FAFC',
        grassFlowerBlue: '#38BDF8',

        asphaltDark: '#1E2024',
        asphaltMid: '#2C2D31',
        asphaltLight: '#3F4147',
        roadStripe: '#F1F5F9',

        stoneDark: '#475569',
        stoneMid: '#64748B',
        stoneLight: '#94A3B8',
        stoneHighlight: '#CBD5E1',

        waterDeep: '#0C4A6E',
        waterMid: '#0284C7',
        waterLight: '#38BDF8',
        waterRipple: '#E0F2FE',

        // Buildings: Fênix HQ (Obsidian Glass & Gold)
        obsidianDeep: '#080A0F',
        obsidianBase: '#0F131D',
        obsidianEdge: '#1E2536',
        glassCyan: '#00F0FF',
        glassCyanDim: '#0284C7',
        accentGold: '#F59E0B',
        goldLight: '#FDE047',

        // Buildings: Dev Loft (Terracotta Brick & Industrial Timber)
        brickDark: '#451A18',
        brickMid: '#6B2C27',
        brickLight: '#8E3C36',
        brickMortar: '#2D1412',
        timberDark: '#2E1A11',
        timberMid: '#4A2A1A',
        windowAmber: '#F59E0B',
        windowAmberGlow: '#FEF3C7',

        // Buildings: Research Lab (Titanium Cleanroom)
        titaniumBase: '#334155',
        titaniumMid: '#475569',
        titaniumLight: '#64748B',
        titaniumHighlight: '#94A3B8',
        hazardYellow: '#EAB308',
        hazardBlack: '#0F172A'
    };

    // ============================================================================
    // 2. ISOMETRIC UTILITIES
    // ============================================================================
    function gridToScreen(col, row) {
        return {
            x: (col - row) * HALF_W,
            y: (col + row) * HALF_H
        };
    }

    function screenToGrid(x, y) {
        return {
            col: Math.floor((x / HALF_W + y / HALF_H) / 2),
            row: Math.floor((y / HALF_H - x / HALF_W) / 2)
        };
    }

    function createTextureFromCanvas(app, width, height, drawFn) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        drawFn(ctx, width, height);
        return PIXI.Texture.from(canvas);
    }

    function drawIsoDiamond(ctx, cx, cy, w, h) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + w/2, cy + h/2);
        ctx.lineTo(cx, cy + h);
        ctx.lineTo(cx - w/2, cy + h/2);
        ctx.closePath();
    }

    // ============================================================================
    // 3. TILE GENERATION (Section 21: Tile Variation)
    // ============================================================================

    // Variant 1: Lush Meadow with Clovers
    function drawGrassTile01(ctx, w, h) {
        ctx.fillStyle = PALETTE.grassMid;
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.fill();

        // Shaded border
        ctx.strokeStyle = '#274319';
        ctx.lineWidth = 1;
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.stroke();

        // Soft clovers
        ctx.fillStyle = PALETTE.grassHighlight;
        ctx.fillRect(w/2 - 4, h/2 - 2, 2, 1);
        ctx.fillRect(w/2 - 3, h/2 - 3, 1, 2);
        ctx.fillRect(w/2 + 5, h/2 + 1, 2, 1);
        ctx.fillRect(w/2 + 6, h/2, 1, 2);

        // Dark speckles
        ctx.fillStyle = PALETTE.grassLush;
        ctx.fillRect(w/2 - 6, h/2 + 2, 1, 1);
        ctx.fillRect(w/2 + 3, h/2 - 4, 1, 1);
    }

    // Variant 2: Wildflower Meadow
    function drawGrassTile02(ctx, w, h) {
        ctx.fillStyle = PALETTE.grassMid;
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.fill();

        ctx.strokeStyle = '#274319';
        ctx.lineWidth = 1;
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.stroke();

        // Tiny yellow wildflower
        ctx.fillStyle = PALETTE.grassFlowerYellow;
        ctx.fillRect(w/2 - 5, h/2 - 1, 2, 2);
        ctx.fillStyle = '#713F12';
        ctx.fillRect(w/2 - 4, h/2 - 1, 1, 1);

        // Tiny white daisy
        ctx.fillStyle = PALETTE.grassFlowerWhite;
        ctx.fillRect(w/2 + 4, h/2 - 2, 2, 2);
        ctx.fillStyle = '#EAB308';
        ctx.fillRect(w/2 + 4, h/2 - 2, 1, 1);

        // Tiny blue forget-me-not
        ctx.fillStyle = PALETTE.grassFlowerBlue;
        ctx.fillRect(w/2, h/2 + 2, 2, 2);
    }

    // Variant 3: Shaded Turf (Deep Lawn)
    function drawGrassTile03(ctx, w, h) {
        ctx.fillStyle = '#274319';
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.fill();

        ctx.strokeStyle = '#1D3313';
        ctx.lineWidth = 1;
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.stroke();

        ctx.fillStyle = PALETTE.grassMid;
        ctx.fillRect(w/2 - 2, h/2 - 2, 4, 2);
        ctx.fillRect(w/2 - 4, h/2 + 1, 3, 1);
    }

    // Variant 4: Flowerbed Garden Soil
    function drawGrassTile04(ctx, w, h) {
        // Soil base
        ctx.fillStyle = '#3E2723';
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.fill();

        ctx.strokeStyle = '#27160D';
        ctx.lineWidth = 1;
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.stroke();

        // Foliage border
        ctx.fillStyle = PALETTE.grassHighlight;
        ctx.fillRect(w/2 - 6, h/2 - 2, 12, 4);

        // Red & Yellow Blooms
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(w/2 - 3, h/2 - 1, 2, 2);
        ctx.fillRect(w/2 + 2, h/2, 2, 2);
        ctx.fillStyle = '#FACC15';
        ctx.fillRect(w/2 - 1, h/2 - 2, 2, 2);
    }

    // Variant 5: Garden Cobblestone Stepping Path
    function drawGrassTile05(ctx, w, h) {
        ctx.fillStyle = PALETTE.grassMid;
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.fill();

        // 3 Cobblestones embedded in grass
        ctx.fillStyle = PALETTE.stoneMid;
        ctx.fillRect(w/2 - 4, h/2 - 3, 5, 3);
        ctx.fillRect(w/2 + 1, h/2 - 1, 6, 3);
        ctx.fillRect(w/2 - 6, h/2 + 1, 6, 3);

        // Stone highlights
        ctx.fillStyle = PALETTE.stoneLight;
        ctx.fillRect(w/2 - 4, h/2 - 3, 4, 1);
        ctx.fillRect(w/2 + 1, h/2 - 1, 5, 1);
        ctx.fillRect(w/2 - 6, h/2 + 1, 5, 1);

        // Stone borders
        ctx.fillStyle = '#334155';
        ctx.fillRect(w/2 - 4, h/2, 5, 1);
        ctx.fillRect(w/2 + 1, h/2 + 2, 6, 1);
        ctx.fillRect(w/2 - 6, h/2 + 4, 6, 1);
    }

    // Road: Main Clean Asphalt Base
    function drawRoadMainTile(ctx, w, h) {
        ctx.fillStyle = PALETTE.asphaltMid;
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.fill();

        ctx.strokeStyle = PALETTE.asphaltDark;
        ctx.lineWidth = 1;
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.stroke();

        // Subtle aggregate texture (charcoal grain)
        ctx.fillStyle = '#222428';
        ctx.fillRect(w/2 - 5, h/2 - 2, 1, 1);
        ctx.fillRect(w/2 + 4, h/2 + 1, 1, 1);
        ctx.fillRect(w/2 - 2, h/2 + 2, 1, 1);
    }

    // Road: Main Avenue NE-SW (dashed center line along 2:1 isometric slope)
    function drawRoadAvenueTile(ctx, w, h) {
        ctx.fillStyle = PALETTE.asphaltMid;
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.fill();

        ctx.strokeStyle = PALETTE.asphaltDark;
        ctx.lineWidth = 1;
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.stroke();

        // Clean dashed center stripe along NE-SW isometric line (slope 2:1)
        ctx.fillStyle = PALETTE.roadStripe;
        ctx.beginPath();
        ctx.moveTo(w/2 + 4, h/2 - 2);
        ctx.lineTo(w/2 + 6, h/2 - 1);
        ctx.lineTo(w/2 - 2, h/2 + 3);
        ctx.lineTo(w/2 - 4, h/2 + 2);
        ctx.closePath();
        ctx.fill();
    }

    // Road: Cross Boulevard NW-SE (dashed center line along -2:1 isometric slope)
    function drawRoadBoulevardTile(ctx, w, h) {
        ctx.fillStyle = PALETTE.asphaltMid;
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.fill();

        ctx.strokeStyle = PALETTE.asphaltDark;
        ctx.lineWidth = 1;
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.stroke();

        // Clean dashed center stripe along NW-SE isometric line (slope -2:1)
        ctx.fillStyle = PALETTE.roadStripe;
        ctx.beginPath();
        ctx.moveTo(w/2 - 4, h/2 - 2);
        ctx.lineTo(w/2 - 2, h/2 - 3);
        ctx.lineTo(w/2 + 6, h/2 + 1);
        ctx.lineTo(w/2 + 4, h/2 + 2);
        ctx.closePath();
        ctx.fill();
    }

    // Road: Pedestrian Crosswalk (True Isometric Zebra stripes)
    function drawRoadCrosswalkTile(ctx, w, h) {
        ctx.fillStyle = PALETTE.asphaltDark;
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.fill();

        ctx.strokeStyle = PALETTE.asphaltMid;
        ctx.lineWidth = 1;
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.stroke();

        // True isometric zebra crossing bars angled along slope
        ctx.fillStyle = '#FFFFFF';
        // Bar 1
        ctx.beginPath();
        ctx.moveTo(w/2 - 8, h/2 - 2); ctx.lineTo(w/2 - 5, h/2 - 3.5);
        ctx.lineTo(w/2 - 3, h/2 - 2.5); ctx.lineTo(w/2 - 6, h/2 - 1);
        ctx.closePath(); ctx.fill();

        // Bar 2
        ctx.beginPath();
        ctx.moveTo(w/2 - 3, h/2 + 0.5); ctx.lineTo(w/2, h/2 - 1);
        ctx.lineTo(w/2 + 2, h/2); ctx.lineTo(w/2 - 1, h/2 + 1.5);
        ctx.closePath(); ctx.fill();

        // Bar 3
        ctx.beginPath();
        ctx.moveTo(w/2 + 2, h/2 + 3); ctx.lineTo(w/2 + 5, h/2 + 1.5);
        ctx.lineTo(w/2 + 7, h/2 + 2.5); ctx.lineTo(w/2 + 4, h/2 + 4);
        ctx.closePath(); ctx.fill();
    }

    // Road: Secondary City Road (Smooth asphalt with curb bevel)
    function drawRoadSecondaryTile(ctx, w, h) {
        ctx.fillStyle = PALETTE.asphaltMid;
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.fill();

        ctx.strokeStyle = PALETTE.asphaltDark;
        ctx.lineWidth = 1;
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.stroke();

        // Subtle faint tire tracks
        ctx.fillStyle = '#1D1F23';
        ctx.fillRect(w/2 - 6, h/2 - 1, 4, 1);
        ctx.fillRect(w/2 + 2, h/2 + 1, 4, 1);
    }

    // Road / Plaza: Inlaid Monumental Pavers (Central Plaza)
    function drawPlazaPaverTile(ctx, w, h) {
        ctx.fillStyle = '#334155';
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.fill();

        // Inner geometric medallion
        ctx.fillStyle = '#475569';
        drawIsoDiamond(ctx, w/2, 2, w - 4, h - 2);
        ctx.fill();

        // Gold corner insets
        ctx.fillStyle = '#D97706';
        ctx.fillRect(w/2 - 1, 1, 2, 1);
        ctx.fillRect(w - 3, h/2 - 1, 2, 1);
        ctx.fillRect(w/2 - 1, h - 2, 2, 1);
        ctx.fillRect(1, h/2 - 1, 2, 1);

        // Seams
        ctx.strokeStyle = '#1E293B';
        ctx.lineWidth = 1;
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.stroke();
    }

    // Sidewalk Tile (Modular Stone Pavers with beveled curb)
    function drawSidewalkTile(ctx, w, h) {
        ctx.fillStyle = PALETTE.stoneMid;
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.fill();

        // Modular isometric flagstone pavers
        ctx.strokeStyle = PALETTE.stoneLight;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(w/2, 2); ctx.lineTo(w/2, h - 2);
        ctx.stroke();

        // Beveled curb rim
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.stroke();
    }

    // Variant 6: Daisy Clover Turf
    function drawGrassTile06(ctx, w, h) {
        ctx.fillStyle = PALETTE.grassMid;
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.fill();

        ctx.strokeStyle = '#274319';
        ctx.lineWidth = 1;
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.stroke();

        // 3 white daisies with golden center
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(w/2 - 5, h/2 - 2, 2, 2);
        ctx.fillStyle = '#FACC15';
        ctx.fillRect(w/2 - 4, h/2 - 1, 1, 1);

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(w/2 + 3, h/2 - 3, 2, 2);
        ctx.fillStyle = '#FACC15';
        ctx.fillRect(w/2 + 4, h/2 - 2, 1, 1);

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(w/2 - 1, h/2 + 2, 2, 2);
        ctx.fillStyle = '#FACC15';
        ctx.fillRect(w/2, h/2 + 2, 1, 1);
    }

    // Variant 7: Autumn / Fallen Leaves Patch
    function drawGrassTile07(ctx, w, h) {
        ctx.fillStyle = '#335422';
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.fill();

        ctx.strokeStyle = '#233C17';
        ctx.lineWidth = 1;
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.stroke();

        // Fallen golden amber & rust red leaves
        ctx.fillStyle = '#D97706';
        ctx.fillRect(w/2 - 6, h/2 - 1, 2, 1);
        ctx.fillRect(w/2 - 3, h/2 + 1, 2, 1);
        ctx.fillStyle = '#B45309';
        ctx.fillRect(w/2 + 4, h/2 - 2, 2, 1);
        ctx.fillStyle = '#DC2626';
        ctx.fillRect(w/2 + 2, h/2 + 2, 2, 1);
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(w/2 - 1, h/2 - 3, 1, 1);
    }

    // Variant 8: Mossy Stone-Trimmed Turf
    function drawGrassTile08(ctx, w, h) {
        ctx.fillStyle = PALETTE.grassMid;
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.fill();

        ctx.strokeStyle = '#274319';
        ctx.lineWidth = 1;
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.stroke();

        // Weathered curb edge with moss
        ctx.fillStyle = '#475569';
        ctx.fillRect(w/2 - 7, h/2 - 1, 4, 2);
        ctx.fillRect(w/2 + 3, h/2 + 1, 5, 2);
        ctx.fillStyle = PALETTE.grassHighlight;
        ctx.fillRect(w/2 - 6, h/2 - 2, 2, 1);
        ctx.fillRect(w/2 + 4, h/2, 3, 1);
    }

    // Road Variant 4: Asphalt with Cast Iron Manhole Cover
    function drawRoadManholeTile(ctx, w, h) {
        ctx.fillStyle = PALETTE.asphaltMid;
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.fill();

        ctx.strokeStyle = PALETTE.asphaltDark;
        ctx.lineWidth = 1;
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.stroke();

        // Circular cast-iron manhole cover
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.ellipse(w/2, h/2, 5, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.ellipse(w/2, h/2, 4, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#64748B';
        ctx.fillRect(w/2 - 1, h/2 - 1, 2, 1);
    }

    // Road Variant 5: Asphalt with Wear / Patch Seam
    function drawRoadWearTile(ctx, w, h) {
        ctx.fillStyle = PALETTE.asphaltMid;
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.fill();

        ctx.strokeStyle = PALETTE.asphaltDark;
        ctx.lineWidth = 1;
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.stroke();

        // Dark tar repair patch
        ctx.fillStyle = '#111317';
        ctx.fillRect(w/2 - 5, h/2 - 2, 6, 3);
        ctx.strokeStyle = '#090A0C';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(w/2 - 4, h/2 - 2);
        ctx.lineTo(w/2 - 2, h/2);
        ctx.lineTo(w/2 + 2, h/2 - 1);
        ctx.stroke();
    }

    // Road Variant 6: Road with Storm Drain Curb Inlet
    function drawRoadCurbTile(ctx, w, h) {
        ctx.fillStyle = PALETTE.asphaltMid;
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.fill();

        ctx.strokeStyle = PALETTE.asphaltDark;
        ctx.lineWidth = 1;
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.stroke();

        // Curb iron storm drain grating
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(w/2 - 6, h/2 + 1, 8, 2);
        ctx.fillStyle = '#64748B';
        ctx.fillRect(w/2 - 5, h/2 + 1, 1, 2);
        ctx.fillRect(w/2 - 3, h/2 + 1, 1, 2);
        ctx.fillRect(w/2 - 1, h/2 + 1, 1, 2);
    }

    // Sidewalk Variant 2: Segmented Square Pavers
    function drawSidewalkPaverTile(ctx, w, h) {
        ctx.fillStyle = '#5A677D';
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.fill();

        // 4 quadrants paver grid
        ctx.strokeStyle = '#3E495B';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(w/2, 0); ctx.lineTo(w/2, h);
        ctx.moveTo(0, h/2); ctx.lineTo(w, h/2);
        ctx.stroke();

        ctx.fillStyle = '#7888A0';
        ctx.fillRect(w/2 - 2, h/2 - 3, 2, 1);
        ctx.fillRect(w/2 + 2, h/2 + 1, 2, 1);
    }

    // Sidewalk Variant 3: Sidewalk with Curb Highlight (Meio-Fio)
    function drawSidewalkCurbTile(ctx, w, h) {
        ctx.fillStyle = PALETTE.stoneMid;
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.fill();

        // Prominent light granite curb stone along south edge
        ctx.fillStyle = '#CBD5E1';
        ctx.beginPath();
        ctx.moveTo(w/2, h - 2);
        ctx.lineTo(w - 2, h/2);
        ctx.lineTo(w, h/2 + 1);
        ctx.lineTo(w/2, h);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#1E293B';
        ctx.lineWidth = 1;
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.stroke();
    }

    // Sidewalk Variant 4: Corner Curb Transition with Tactile Paving
    function drawSidewalkCornerTile(ctx, w, h) {
        ctx.fillStyle = PALETTE.stoneMid;
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.fill();

        // Yellow tactile warning blisters (pedestrian accessibility)
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(w/2 - 4, h/2 - 2, 2, 2);
        ctx.fillRect(w/2, h/2 - 1, 2, 2);
        ctx.fillRect(w/2 - 2, h/2 + 1, 2, 2);

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.stroke();
    }

    // Sidewalk Variant 5: Heritage Cobblestone Promenade
    function drawSidewalkCobbleTile(ctx, w, h) {
        ctx.fillStyle = '#4B5563';
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.fill();

        // Fan cobblestone pattern
        ctx.fillStyle = '#6B7280';
        ctx.fillRect(w/2 - 5, h/2 - 2, 3, 2);
        ctx.fillRect(w/2 - 1, h/2 - 3, 3, 2);
        ctx.fillRect(w/2 + 3, h/2 - 1, 3, 2);
        ctx.fillRect(w/2 - 4, h/2 + 1, 3, 2);
        ctx.fillRect(w/2 + 1, h/2 + 2, 3, 2);

        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 0.5;
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.stroke();
    }

    // Sidewalk Variant 6: Tree Pit Metal Grating
    function drawSidewalkGrateTile(ctx, w, h) {
        ctx.fillStyle = PALETTE.stoneMid;
        drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.fill();

        // Cast iron square grating
        ctx.fillStyle = '#18181B';
        ctx.fillRect(w/2 - 6, h/2 - 3, 12, 6);
        ctx.strokeStyle = '#52525B';
        ctx.lineWidth = 0.5;
        for (let x = w/2 - 5; x <= w/2 + 5; x += 2) {
            ctx.beginPath();
            ctx.moveTo(x, h/2 - 3); ctx.lineTo(x, h/2 + 3);
            ctx.stroke();
        }
    }

    // ============================================================================
    // 4. ENVIRONMENT PROPS (Trees, Benches, Lights, Fountains, Monoliths)
    // ============================================================================

    // Lush Deciduous Oak Tree (44x56)
    function drawTreeOak(ctx, w, h) {
        const cx = Math.floor(w / 2);
        const cy = h - 6;

        // Ground shadow
        ctx.fillStyle = 'rgba(0,0,0,0.36)';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 15, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Trunk & Roots
        ctx.fillStyle = '#3E2723';
        ctx.beginPath();
        ctx.moveTo(cx - 3, cy - 20);
        ctx.lineTo(cx + 3, cy - 20);
        ctx.lineTo(cx + 5, cy);
        ctx.lineTo(cx - 5, cy);
        ctx.closePath();
        ctx.fill();

        // Bark texture
        ctx.fillStyle = '#27160D';
        ctx.fillRect(cx - 1, cy - 16, 2, 14);

        // Canopy Layer 1 (Deep shadow base)
        ctx.fillStyle = '#1B3819';
        ctx.beginPath();
        ctx.arc(cx, cy - 22, 16, 0, Math.PI * 2);
        ctx.fill();

        // Canopy Layer 2 (Mid foliage)
        ctx.fillStyle = '#2E5B2B';
        ctx.beginPath();
        ctx.arc(cx - 3, cy - 28, 14, 0, Math.PI * 2);
        ctx.arc(cx + 3, cy - 26, 13, 0, Math.PI * 2);
        ctx.fill();

        // Canopy Layer 3 (Lush green crown)
        ctx.fillStyle = '#437D3F';
        ctx.beginPath();
        ctx.arc(cx, cy - 36, 12, 0, Math.PI * 2);
        ctx.fill();

        // Sunlit leaf highlights
        ctx.fillStyle = '#74C068';
        ctx.beginPath();
        ctx.arc(cx - 3, cy - 39, 5, 0, Math.PI * 2);
        ctx.arc(cx + 4, cy - 33, 4, 0, Math.PI * 2);
        ctx.arc(cx - 6, cy - 26, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    // Slender Tech Cypress Tree (28x60)
    function drawTreeCypress(ctx, w, h) {
        const cx = Math.floor(w / 2);
        const cy = h - 6;

        ctx.fillStyle = 'rgba(0,0,0,0.32)';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 9, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Slender trunk
        ctx.fillStyle = '#3E2723';
        ctx.fillRect(cx - 2, cy - 14, 4, 14);

        // Columnar foliage base
        ctx.fillStyle = '#0F281E';
        ctx.beginPath();
        ctx.ellipse(cx, cy - 24, 8, 18, 0, 0, Math.PI * 2);
        ctx.fill();

        // Mid emerald body
        ctx.fillStyle = '#1B4D3E';
        ctx.beginPath();
        ctx.ellipse(cx, cy - 32, 7, 16, 0, 0, Math.PI * 2);
        ctx.fill();

        // Upper tip
        ctx.fillStyle = '#2D6A4F';
        ctx.beginPath();
        ctx.ellipse(cx, cy - 42, 5, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Sharp highlight apex
        ctx.fillStyle = '#52B788';
        ctx.fillRect(cx - 1, cy - 54, 2, 4);
    }

    // Flowering Sakura / Jacaranda Tree (44x54)
    function drawTreeSakura(ctx, w, h) {
        const cx = Math.floor(w / 2);
        const cy = h - 6;

        ctx.fillStyle = 'rgba(0,0,0,0.32)';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 14, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Dark sculptural trunk
        ctx.fillStyle = '#27160D';
        ctx.fillRect(cx - 2, cy - 18, 4, 18);

        // Deep blossom shadow
        ctx.fillStyle = '#831843';
        ctx.beginPath();
        ctx.arc(cx, cy - 22, 14, 0, Math.PI * 2);
        ctx.fill();

        // Rich pink canopy
        ctx.fillStyle = '#BE185D';
        ctx.beginPath();
        ctx.arc(cx - 3, cy - 28, 13, 0, Math.PI * 2);
        ctx.arc(cx + 3, cy - 27, 12, 0, Math.PI * 2);
        ctx.fill();

        // Bright blossom petals
        ctx.fillStyle = '#F472B6';
        ctx.beginPath();
        ctx.arc(cx, cy - 35, 10, 0, Math.PI * 2);
        ctx.fill();

        // Soft pastel highlights & falling petals
        ctx.fillStyle = '#FCE7F3';
        ctx.fillRect(cx - 3, cy - 37, 4, 3);
        ctx.fillRect(cx + 4, cy - 31, 3, 3);
        ctx.fillRect(cx - 8, cy - 14, 2, 2); // floating petal
        ctx.fillRect(cx + 7, cy - 10, 2, 2); // floating petal
    }

    // Central Plaza Sparkling Water Fountain (52x44)
    function drawPlazaFountain(ctx, w, h) {
        const cx = Math.floor(w / 2);
        const cy = h - 6;

        // Ground shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 22, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Hexagonal Stone Basin Base
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.ellipse(cx, cy - 4, 20, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Inner pool water
        ctx.fillStyle = '#0284C7';
        ctx.beginPath();
        ctx.ellipse(cx, cy - 5, 17, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Shimmering cyan water surface
        ctx.fillStyle = '#00F0FF';
        ctx.beginPath();
        ctx.ellipse(cx, cy - 5, 13, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Central sculpted stone pedestal
        ctx.fillStyle = '#64748B';
        ctx.fillRect(cx - 3, cy - 18, 6, 13);

        // Upper water bowl
        ctx.fillStyle = '#94A3B8';
        ctx.beginPath();
        ctx.ellipse(cx, cy - 18, 9, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#00F0FF';
        ctx.beginPath();
        ctx.ellipse(cx, cy - 19, 7, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Water jet spray
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(cx - 1, cy - 25, 2, 7);
        ctx.fillRect(cx - 3, cy - 22, 1, 4);
        ctx.fillRect(cx + 2, cy - 22, 1, 4);
    }

    // Polished Wood Park Bench (32x24)
    function drawPlazaBench(ctx, w, h) {
        const cx = Math.floor(w / 2);
        const cy = h - 4;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 12, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Polished Teak Slats
        ctx.fillStyle = '#B45309';
        ctx.fillRect(cx - 10, cy - 8, 20, 3);
        ctx.fillRect(cx - 10, cy - 13, 20, 3);

        // Slat highlights
        ctx.fillStyle = '#D97706';
        ctx.fillRect(cx - 10, cy - 8, 20, 1);
        ctx.fillRect(cx - 10, cy - 13, 20, 1);

        // Cast-iron ornate frame & armrests
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(cx - 9, cy - 6, 2, 6);
        ctx.fillRect(cx + 7, cy - 6, 2, 6);
        ctx.fillRect(cx - 10, cy - 15, 2, 11);
        ctx.fillRect(cx + 8, cy - 15, 2, 11);
    }

    // Modern Street Lamp with Radial Ground Illumination (30x52)
    function drawStreetLamp(ctx, w, h) {
        const cx = Math.floor(w / 2);
        const cy = h - 4;

        // Radial warm ground illumination pool
        const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, 22);
        grad.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
        grad.addColorStop(0.5, 'rgba(254, 240, 138, 0.2)');
        grad.addColorStop(1, 'rgba(254, 240, 138, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 22, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Matte black cast-iron post
        ctx.fillStyle = '#18181B';
        ctx.fillRect(cx - 1, cy - 36, 2, 36);

        // Base plate & anchor bolts
        ctx.fillRect(cx - 3, cy - 3, 6, 3);
        ctx.fillStyle = '#71717A';
        ctx.fillRect(cx - 2, cy - 2, 1, 1);
        ctx.fillRect(cx + 1, cy - 2, 1, 1);

        // Gooseneck arched lantern bracket
        ctx.fillStyle = '#18181B';
        ctx.fillRect(cx - 4, cy - 38, 8, 2);

        // Lantern housing
        ctx.fillStyle = '#27272A';
        ctx.fillRect(cx - 3, cy - 43, 6, 5);

        // Glowing incandescent filament core
        ctx.fillStyle = '#FFFBEB';
        ctx.fillRect(cx - 2, cy - 42, 4, 3);
        ctx.fillStyle = '#FACC15';
        ctx.fillRect(cx - 1, cy - 41, 2, 2);
    }

    // High-Tech Digital Billboard Totem (28x48)
    function drawDigitalTotem(ctx, w, h) {
        const cx = Math.floor(w / 2);
        const cy = h - 4;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 10, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Dark titanium kiosk pylon
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(cx - 6, cy - 38, 12, 38);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - 6, cy - 38, 12, 38);

        // Glowing vertical LED display
        ctx.fillStyle = '#00F0FF';
        ctx.fillRect(cx - 4, cy - 34, 8, 22);

        // Telemetry pulse graph
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - 3, cy - 20);
        ctx.lineTo(cx - 1, cy - 26);
        ctx.lineTo(cx + 1, cy - 22);
        ctx.lineTo(cx + 3, cy - 28);
        ctx.stroke();

        // Lower data ticker
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(cx - 4, cy - 10, 8, 4);
    }

    // Tech District Server Monolith (30x48)
    function drawServerMonolith(ctx, w, h) {
        const cx = Math.floor(w / 2);
        const cy = h - 4;

        ctx.fillStyle = 'rgba(0,0,0,0.38)';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 13, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Cabinet chassis
        ctx.fillStyle = '#090D16';
        ctx.fillRect(cx - 9, cy - 38, 18, 38);
        ctx.strokeStyle = '#1E293B';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - 9, cy - 38, 18, 38);

        // Server rack blade modules
        for (let i = 0; i < 5; i++) {
            const by = cy - 35 + i * 7;
            ctx.fillStyle = '#1E293B';
            ctx.fillRect(cx - 7, by, 14, 5);

            // Activity LEDs
            ctx.fillStyle = (i % 2 === 0) ? '#22C55E' : '#38BDF8';
            ctx.fillRect(cx - 5, by + 1, 2, 2);
            ctx.fillStyle = (i === 2) ? '#F59E0B' : '#22C55E';
            ctx.fillRect(cx - 1, by + 1, 2, 2);
            ctx.fillStyle = '#38BDF8';
            ctx.fillRect(cx + 3, by + 1, 2, 2);
        }
    }

    // Commuter Bicycle Rack (34x24)
    function drawBikeRack(ctx, w, h) {
        const cx = Math.floor(w / 2);
        const cy = h - 4;

        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 14, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Steel loops
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1.5;
        for (let i = -10; i <= 10; i += 10) {
            ctx.beginPath();
            ctx.arc(cx + i, cy - 8, 5, Math.PI, 0);
            ctx.lineTo(cx + i + 5, cy);
            ctx.moveTo(cx + i - 5, cy - 8);
            ctx.lineTo(cx + i - 5, cy);
            ctx.stroke();
        }

        // Parked Cyan Bike
        ctx.strokeStyle = '#06B6D4';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - 7, cy - 6);
        ctx.lineTo(cx - 2, cy - 12);
        ctx.lineTo(cx + 3, cy - 6);
        ctx.stroke();

        // Wheels
        ctx.fillStyle = '#18181B';
        ctx.beginPath();
        ctx.arc(cx - 7, cy - 4, 3, 0, Math.PI * 2);
        ctx.arc(cx + 3, cy - 4, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // Classic Crimson Fire Hydrant (18x24)
    function drawFireHydrant(ctx, w, h) {
        const cx = Math.floor(w / 2);
        const cy = h - 3;

        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 6, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Red Body
        ctx.fillStyle = '#DC2626';
        ctx.fillRect(cx - 3, cy - 12, 6, 12);
        ctx.fillStyle = '#B91C1C';
        ctx.fillRect(cx, cy - 12, 3, 12); // Shading

        // Brass Cap Nozzles
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(cx - 5, cy - 9, 2, 3);
        ctx.fillRect(cx + 3, cy - 9, 2, 3);
        ctx.fillRect(cx - 2, cy - 14, 4, 2); // Top bonnet nut
    }

    // Modern Dual Recycling/Trash Bin (20x24)
    function drawTrashBin(ctx, w, h) {
        const cx = Math.floor(w / 2);
        const cy = h - 3;

        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 8, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Dual bin body
        ctx.fillStyle = '#334155';
        ctx.fillRect(cx - 6, cy - 12, 12, 12);

        // Blue recycle flap
        ctx.fillStyle = '#0284C7';
        ctx.fillRect(cx - 5, cy - 10, 4, 3);

        // Green compost flap
        ctx.fillStyle = '#16A34A';
        ctx.fillRect(cx + 1, cy - 10, 4, 3);
    }

    // Modern Concrete Flower Planter Box (28x22)
    function drawPlanterFlower(ctx, w, h) {
        const cx = Math.floor(w / 2);
        const cy = h - 3;

        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 12, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Concrete box
        ctx.fillStyle = '#475569';
        ctx.fillRect(cx - 9, cy - 8, 18, 8);
        ctx.fillStyle = '#64748B';
        ctx.fillRect(cx - 9, cy - 8, 18, 2); // rim

        // Lush green foliage
        ctx.fillStyle = '#15803D';
        ctx.fillRect(cx - 8, cy - 13, 16, 6);

        // Blooming flower pixels
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(cx - 6, cy - 14, 2, 2);
        ctx.fillRect(cx + 3, cy - 14, 2, 2);
        ctx.fillStyle = '#FACC15';
        ctx.fillRect(cx - 1, cy - 15, 2, 2);
    }

    // Outdoor Developer Picnic / Coding Table (36x26)
    function drawPicnicTable(ctx, w, h) {
        const cx = Math.floor(w / 2);
        const cy = h - 4;

        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 14, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Table top
        ctx.fillStyle = '#78350F';
        ctx.fillRect(cx - 12, cy - 12, 24, 4);
        ctx.fillStyle = '#92400E';
        ctx.fillRect(cx - 12, cy - 12, 24, 1);

        // Benches
        ctx.fillStyle = '#78350F';
        ctx.fillRect(cx - 13, cy - 6, 26, 3);

        // Laptop on table
        ctx.fillStyle = '#94A3B8';
        ctx.fillRect(cx - 4, cy - 15, 8, 3);
        ctx.fillStyle = '#00F0FF';
        ctx.fillRect(cx - 3, cy - 17, 6, 3); // glowing screen
    }

    // ============================================================================
    // 5. BUILDINGS (Fênix HQ, ZapAI CRM, Research Lab, Security, Kiosk)
    // ============================================================================

    // Monumental Fênix Operating System HQ (180x220)
    function drawFenixHQ(ctx, w, h) {
        const cx = Math.floor(w / 2);
        const cy = h - 22;

        // Grand Ground Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.52)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 6, 64, 26, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ground entrance light pool (Cyan canopy glow)
        const grad = ctx.createRadialGradient(cx + 18, cy + 4, 3, cx + 18, cy + 4, 38);
        grad.addColorStop(0, 'rgba(0, 240, 255, 0.55)');
        grad.addColorStop(1, 'rgba(0, 240, 255, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(cx + 18, cy + 4, 38, 16, 0, 0, Math.PI * 2);
        ctx.fill();

        // ── TIER 1: Grand Lobby Foyer (Base: 76x38, Height: 48) ──
        const bW1 = 76, bH1 = 38, h1 = 48;
        const bY1 = cy;

        // Left Face (Obsidian)
        ctx.fillStyle = PALETTE.obsidianDeep;
        ctx.beginPath();
        ctx.moveTo(cx, bY1);
        ctx.lineTo(cx - bW1/2, bY1 - bH1/2);
        ctx.lineTo(cx - bW1/2, bY1 - bH1/2 - h1);
        ctx.lineTo(cx, bY1 - h1);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#1E293B';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Right Face (Obsidian & Glass Foyer)
        ctx.fillStyle = PALETTE.obsidianBase;
        ctx.beginPath();
        ctx.moveTo(cx, bY1);
        ctx.lineTo(cx + bW1/2, bY1 - bH1/2);
        ctx.lineTo(cx + bW1/2, bY1 - bH1/2 - h1);
        ctx.lineTo(cx, bY1 - h1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Grand Glass Foyer with Warm Interior Reception Lighting
        ctx.fillStyle = 'rgba(2, 132, 199, 0.4)';
        ctx.beginPath();
        ctx.moveTo(cx + 8, bY1 - 2);
        ctx.lineTo(cx + 34, bY1 - 15);
        ctx.lineTo(cx + 34, bY1 - 38);
        ctx.lineTo(cx + 8, bY1 - 25);
        ctx.closePath();
        ctx.fill();

        // Warm interior lobby light behind glass
        ctx.fillStyle = 'rgba(254, 240, 138, 0.35)';
        ctx.beginPath();
        ctx.moveTo(cx + 12, bY1 - 6);
        ctx.lineTo(cx + 30, bY1 - 15);
        ctx.lineTo(cx + 30, bY1 - 28);
        ctx.lineTo(cx + 12, bY1 - 19);
        ctx.closePath();
        ctx.fill();

        // Grand Automatic Double Glass Entrance Doors
        ctx.fillStyle = 'rgba(0, 240, 255, 0.85)';
        ctx.beginPath();
        ctx.moveTo(cx + 12, bY1 - 2);
        ctx.lineTo(cx + 30, bY1 - 11);
        ctx.lineTo(cx + 30, bY1 - 32);
        ctx.lineTo(cx + 12, bY1 - 23);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Center glass divider
        ctx.strokeStyle = '#0F172A';
        ctx.beginPath();
        ctx.moveTo(cx + 21, bY1 - 6.5);
        ctx.lineTo(cx + 21, bY1 - 27.5);
        ctx.stroke();

        // Modern Glass & Steel Entrance Canopy
        ctx.fillStyle = 'rgba(56, 189, 248, 0.65)';
        ctx.beginPath();
        ctx.moveTo(cx + 6, bY1 - 22);
        ctx.lineTo(cx + 28, bY1 - 33);
        ctx.lineTo(cx + 36, bY1 - 29);
        ctx.lineTo(cx + 14, bY1 - 18);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.stroke();

        // ── GRAND ENTRANCE STAIRCASE (Escadaria: 3 Cascading Tiers) ──
        // Tier 1 (Top landing step)
        ctx.fillStyle = '#64748B'; // Top tread
        ctx.beginPath();
        ctx.moveTo(cx + 10, bY1);
        ctx.lineTo(cx + 32, bY1 - 11);
        ctx.lineTo(cx + 36, bY1 - 9);
        ctx.lineTo(cx + 14, bY1 + 2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#334155'; // Front riser
        ctx.beginPath();
        ctx.moveTo(cx + 10, bY1);
        ctx.lineTo(cx + 14, bY1 + 2);
        ctx.lineTo(cx + 14, bY1 + 4);
        ctx.lineTo(cx + 10, bY1 + 2);
        ctx.closePath();
        ctx.fill();

        // Tier 2 (Middle step)
        ctx.fillStyle = '#475569'; // Top tread
        ctx.beginPath();
        ctx.moveTo(cx + 8, bY1 + 2);
        ctx.lineTo(cx + 34, bY1 - 11);
        ctx.lineTo(cx + 38, bY1 - 9);
        ctx.lineTo(cx + 12, bY1 + 5);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#1E293B'; // Front riser
        ctx.beginPath();
        ctx.moveTo(cx + 8, bY1 + 2);
        ctx.lineTo(cx + 12, bY1 + 5);
        ctx.lineTo(cx + 12, bY1 + 7);
        ctx.lineTo(cx + 8, bY1 + 4);
        ctx.closePath();
        ctx.fill();

        // Tier 3 (Plaza Ground step)
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(cx + 6, bY1 + 4);
        ctx.lineTo(cx + 36, bY1 - 11);
        ctx.lineTo(cx + 40, bY1 - 9);
        ctx.lineTo(cx + 10, bY1 + 8);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.moveTo(cx + 6, bY1 + 4);
        ctx.lineTo(cx + 10, bY1 + 8);
        ctx.lineTo(cx + 10, bY1 + 10);
        ctx.lineTo(cx + 6, bY1 + 6);
        ctx.closePath();
        ctx.fill();

        // Flanking Landscaping Planters at Entrance Steps
        // Left Planter
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(cx + 3, bY1 + 1, 4, 4);
        ctx.fillStyle = '#22C55E';
        ctx.fillRect(cx + 2, bY1 - 3, 6, 4);
        ctx.fillStyle = '#15803D';
        ctx.fillRect(cx + 3, bY1 - 1, 4, 2);

        // Right Planter
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(cx + 38, bY1 - 12, 4, 4);
        ctx.fillStyle = '#22C55E';
        ctx.fillRect(cx + 37, bY1 - 16, 6, 4);
        ctx.fillStyle = '#15803D';
        ctx.fillRect(cx + 38, bY1 - 14, 4, 2);

        // Neon Marquee: "FÊNIX HQ"
        ctx.fillStyle = '#FFB703';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('FÊNIX HQ', cx + 8, bY1 - h1 + 7);

        // ── TIER 2: Main Cyber Spire (Base: 58x29, Height: 75) ──
        const bW2 = 58, bH2 = 29, h2 = 75;
        const bY2 = bY1 - h1;

        // Setback Roof Deck
        ctx.fillStyle = '#1E293B';
        ctx.beginPath();
        ctx.moveTo(cx, bY2);
        ctx.lineTo(cx - bW1/2, bY2 - bH1/2);
        ctx.lineTo(cx, bY2 - bH1);
        ctx.lineTo(cx + bW1/2, bY2 - bH1/2);
        ctx.closePath();
        ctx.fill();

        // Left Face Tier 2
        ctx.fillStyle = '#0A0D14';
        ctx.beginPath();
        ctx.moveTo(cx, bY2);
        ctx.lineTo(cx - bW2/2, bY2 - bH2/2);
        ctx.lineTo(cx - bW2/2, bY2 - bH2/2 - h2);
        ctx.lineTo(cx, bY2 - h2);
        ctx.closePath();
        ctx.fill();

        // Right Face Tier 2
        ctx.fillStyle = '#111722';
        ctx.beginPath();
        ctx.moveTo(cx, bY2);
        ctx.lineTo(cx + bW2/2, bY2 - bH2/2);
        ctx.lineTo(cx + bW2/2, bY2 - bH2/2 - h2);
        ctx.lineTo(cx, bY2 - h2);
        ctx.closePath();
        ctx.fill();

        // Isometric Illuminated Window Matrix
        for (let row = 0; row < 7; row++) {
            const yOff = bY2 - 8 - row * 9;
            for (let col = 0; col < 3; col++) {
                const wx = cx - 5 - col * 7;
                const wy = yOff - col * 3.5;
                ctx.fillStyle = (row + col) % 3 === 0 ? '#38BDF8' : '#0284C7';
                ctx.fillRect(wx, wy, 4, 6);
            }
            for (let col = 0; col < 3; col++) {
                const wx = cx + 5 + col * 7;
                const wy = yOff - col * 3.5;
                ctx.fillStyle = (row + col) % 2 === 0 ? '#00F0FF' : '#0369A1';
                ctx.fillRect(wx, wy, 4, 6);
            }
        }

        // ── TIER 3: Executive Penthouse & Crest (Base: 38x19, Height: 38) ──
        const bW3 = 38, bH3 = 19, h3 = 38;
        const bY3 = bY2 - h2;

        // Left Face Tier 3
        ctx.fillStyle = '#06080C';
        ctx.beginPath();
        ctx.moveTo(cx, bY3);
        ctx.lineTo(cx - bW3/2, bY3 - bH3/2);
        ctx.lineTo(cx - bW3/2, bY3 - bH3/2 - h3);
        ctx.lineTo(cx, bY3 - h3);
        ctx.closePath();
        ctx.fill();

        // Right Face Tier 3
        ctx.fillStyle = '#0E131C';
        ctx.beginPath();
        ctx.moveTo(cx, bY3);
        ctx.lineTo(cx + bW3/2, bY3 - bH3/2);
        ctx.lineTo(cx + bW3/2, bY3 - bH3/2 - h3);
        ctx.lineTo(cx, bY3 - h3);
        ctx.closePath();
        ctx.fill();

        // Golden Fênix Crest Emblem on Penthouse
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.moveTo(cx + 8, bY3 - 14);
        ctx.lineTo(cx + 15, bY3 - 26);
        ctx.lineTo(cx + 20, bY3 - 16);
        ctx.lineTo(cx + 15, bY3 - 19);
        ctx.closePath();
        ctx.fill();

        // Rooftop Helipad Slab
        const topY = bY3 - h3;
        ctx.fillStyle = '#1E2536';
        ctx.beginPath();
        ctx.moveTo(cx, topY);
        ctx.lineTo(cx - bW3/2, topY - bH3/2);
        ctx.lineTo(cx, topY - bH3);
        ctx.lineTo(cx + bW3/2, topY - bH3/2);
        ctx.closePath();
        ctx.fill();

        // Helipad Yellow Circle & 'H'
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(cx, topY - bH3/2, 11, 5, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#FACC15';
        ctx.font = 'bold 6px sans-serif';
        ctx.fillText('H', cx - 2, topY - bH3/2 + 2);

        // Communications Spire with Blinking Aircraft Beacon
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, topY - bH3);
        ctx.lineTo(cx, topY - bH3 - 26);
        ctx.stroke();

        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(cx, topY - bH3 - 27, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
        ctx.beginPath();
        ctx.arc(cx, topY - bH3 - 27, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    // ZapAI CRM & Development Center (Dev Loft) (150x160)
    function drawDevLoft(ctx, w, h) {
        const cx = Math.floor(w / 2);
        const cy = h - 22;

        // Ground Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.48)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 5, 52, 22, 0, 0, Math.PI * 2);
        ctx.fill();

        // Warm Porch Lantern Glow
        const grad = ctx.createRadialGradient(cx + 14, cy + 4, 2, cx + 14, cy + 4, 28);
        grad.addColorStop(0, 'rgba(245, 158, 11, 0.5)');
        grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(cx + 14, cy + 4, 28, 14, 0, 0, Math.PI * 2);
        ctx.fill();

        const fw = 66, fh = 33, bH = 78;

        // Left Face (Dark Terracotta Brick)
        ctx.fillStyle = '#531B17';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - fw/2, cy - fh/2);
        ctx.lineTo(cx - fw/2, cy - fh/2 - bH);
        ctx.lineTo(cx, cy - bH);
        ctx.closePath();
        ctx.fill();

        // Brick Course Mortar Lines
        ctx.strokeStyle = '#3E1310';
        ctx.lineWidth = 1;
        for (let y = cy - 4; y > cy - bH; y -= 6) {
            ctx.beginPath();
            ctx.moveTo(cx, y);
            ctx.lineTo(cx - fw/2, y - fh/2);
            ctx.stroke();
        }

        // Right Face (Lit Warm Terracotta Brick)
        ctx.fillStyle = '#7C2D26';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + fw/2, cy - fh/2);
        ctx.lineTo(cx + fw/2, cy - fh/2 - bH);
        ctx.lineTo(cx, cy - bH);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#5A1F1A';
        for (let y = cy - 4; y > cy - bH; y -= 6) {
            ctx.beginPath();
            ctx.moveTo(cx, y);
            ctx.lineTo(cx + fw/2, y - fh/2);
            ctx.stroke();
        }

        // Arched Warehouse Industrial Windows (Warm Amber Interior Light)
        for (let floor = 0; floor < 3; floor++) {
            const rowY = cy - 24 - floor * 20;

            // 2 Windows per floor on right face
            for (let wIdx = 0; wIdx < 2; wIdx++) {
                const wx = cx + 8 + wIdx * 14;
                const wy = rowY - wIdx * 7;

                ctx.fillStyle = '#F59E0B';
                ctx.beginPath();
                ctx.arc(wx + 4, wy - 6, 4, Math.PI, 0);
                ctx.rect(wx, wy - 6, 8, 10);
                ctx.fill();

                // Window Mullions
                ctx.strokeStyle = '#451A18';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(wx + 4, wy - 6); ctx.lineTo(wx + 4, wy + 4);
                ctx.moveTo(wx, wy); ctx.lineTo(wx + 8, wy);
                ctx.stroke();
            }
        }

        // Entrance Porch Door & Lantern
        ctx.fillStyle = '#3E1A11';
        ctx.fillRect(cx + 8, cy - 14, 8, 12);
        ctx.fillStyle = '#FACC15';
        ctx.fillRect(cx + 6, cy - 16, 2, 3); // lantern

        // Neon Sign: "ZAPAI CRM"
        ctx.fillStyle = '#06B6D4';
        ctx.font = 'bold 7px monospace';
        ctx.fillText('ZAPAI CRM', cx + 6, cy - bH + 9);

        // Rooftop Industrial Deck
        ctx.fillStyle = '#262F3D';
        ctx.beginPath();
        ctx.moveTo(cx, cy - bH);
        ctx.lineTo(cx - fw/2, cy - fh/2 - bH);
        ctx.lineTo(cx, cy - fh - bH);
        ctx.lineTo(cx + fw/2, cy - fh/2 - bH);
        ctx.closePath();
        ctx.fill();

        // HVAC Chiller Unit with Spinning Fan
        ctx.fillStyle = '#475569';
        ctx.fillRect(cx - 14, cy - bH - 16, 14, 10);
        ctx.fillStyle = '#334155';
        ctx.fillRect(cx - 12, cy - bH - 14, 10, 6);
        ctx.strokeStyle = '#94A3B8';
        ctx.beginPath();
        ctx.moveTo(cx - 7, cy - bH - 13); ctx.lineTo(cx - 7, cy - bH - 9);
        ctx.moveTo(cx - 9, cy - bH - 11); ctx.lineTo(cx - 5, cy - bH - 11);
        ctx.stroke();

        // Rooftop Glass Skylight
        ctx.fillStyle = '#38BDF8';
        ctx.beginPath();
        ctx.moveTo(cx + 4, cy - bH - 8);
        ctx.lineTo(cx + 18, cy - bH - 15);
        ctx.lineTo(cx + 14, cy - bH - 19);
        ctx.lineTo(cx, cy - bH - 12);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#E2E8F0';
        ctx.stroke();
    }

    // Research & AI Core Facility (160x150)
    function drawResearchLab(ctx, w, h) {
        const cx = Math.floor(w / 2);
        const cy = h - 22;

        ctx.fillStyle = 'rgba(0,0,0,0.48)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 5, 54, 24, 0, 0, Math.PI * 2);
        ctx.fill();

        const fw = 72, fh = 36, bH = 68;

        // Titanium Dark Left Face
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - fw/2, cy - fh/2);
        ctx.lineTo(cx - fw/2, cy - fh/2 - bH);
        ctx.lineTo(cx, cy - bH);
        ctx.closePath();
        ctx.fill();

        // Titanium Light Right Face
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + fw/2, cy - fh/2);
        ctx.lineTo(cx + fw/2, cy - fh/2 - bH);
        ctx.lineTo(cx, cy - bH);
        ctx.closePath();
        ctx.fill();

        // Cyan Neon Seams
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 2); ctx.lineTo(cx, cy - bH);
        ctx.moveTo(cx + 16, cy - 8); ctx.lineTo(cx + 16, cy - bH - 8);
        ctx.stroke();

        // Observation Bay: Curved Panoramic Cyan Glass
        ctx.fillStyle = 'rgba(0, 240, 255, 0.9)';
        ctx.beginPath();
        ctx.moveTo(cx + 6, cy - 18);
        ctx.lineTo(cx + 28, cy - 29);
        ctx.lineTo(cx + 28, cy - 48);
        ctx.lineTo(cx + 6, cy - 37);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#E0F2FE';
        ctx.stroke();

        // Telemetry Waveform on Bay Window
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx + 10, cy - 28);
        ctx.lineTo(cx + 14, cy - 34);
        ctx.lineTo(cx + 18, cy - 27);
        ctx.lineTo(cx + 24, cy - 33);
        ctx.stroke();

        // Airlock Bay with Hazard Stripes
        ctx.fillStyle = '#1E293B';
        ctx.beginPath();
        ctx.moveTo(cx - 4, cy - 2);
        ctx.lineTo(cx - 24, cy - 12);
        ctx.lineTo(cx - 24, cy - 30);
        ctx.lineTo(cx - 4, cy - 20);
        ctx.closePath();
        ctx.fill();

        // Yellow Hazard Stripes
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 8, cy - 4); ctx.lineTo(cx - 16, cy - 16);
        ctx.moveTo(cx - 14, cy - 7); ctx.lineTo(cx - 22, cy - 19);
        ctx.stroke();

        // Roof Deck
        ctx.fillStyle = '#64748B';
        ctx.beginPath();
        ctx.moveTo(cx, cy - bH);
        ctx.lineTo(cx - fw/2, cy - fh/2 - bH);
        ctx.lineTo(cx, cy - fh - bH);
        ctx.lineTo(cx + fw/2, cy - fh/2 - bH);
        ctx.closePath();
        ctx.fill();

        // Satellite Radar Dish
        ctx.fillStyle = '#CBD5E1';
        ctx.beginPath();
        ctx.ellipse(cx - 10, cy - bH - 14, 12, 6, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0F172A';
        ctx.stroke();

        // Receiver Horn Pulse
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - 10, cy - bH - 14);
        ctx.lineTo(cx - 15, cy - bH - 26);
        ctx.stroke();
        ctx.fillStyle = '#00F0FF';
        ctx.beginPath();
        ctx.arc(cx - 15, cy - bH - 26, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }

    // Security Operations Outpost (110x100)
    function drawSecurityOutpost(ctx, w, h) {
        const cx = Math.floor(w / 2);
        const cy = h - 16;

        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 3, 36, 16, 0, 0, Math.PI * 2);
        ctx.fill();

        const fw = 48, fh = 24, bH = 46;

        // Hardened concrete facade
        ctx.fillStyle = '#1E293B';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - fw/2, cy - fh/2);
        ctx.lineTo(cx - fw/2, cy - fh/2 - bH);
        ctx.lineTo(cx, cy - bH);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + fw/2, cy - fh/2);
        ctx.lineTo(cx + fw/2, cy - fh/2 - bH);
        ctx.lineTo(cx, cy - bH);
        ctx.closePath();
        ctx.fill();

        // Blast door with red indicator
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(cx + 4, cy - 18, 12, 16);
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(cx + 14, cy - 12, 2, 2);

        // Flashing amber light bar on roof
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(cx - 4, cy - bH - 6, 8, 4);
    }

    // Outdoor Coffee & Byte Kiosk (True 2.5D Isometric Pavilion) (90x90)
    function drawCoffeeKiosk(ctx, w, h) {
        const cx = Math.floor(w / 2);
        const cy = h - 16;

        // Ground Contact Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.38)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 3, 34, 15, 0, 0, Math.PI * 2);
        ctx.fill();

        const fw = 48, fh = 24, bH = 26;

        // 1. Isometric Counter Base
        // Left Face (Dark Oak Timber)
        ctx.fillStyle = '#5D2808';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - fw/2, cy - fh/2);
        ctx.lineTo(cx - fw/2, cy - fh/2 - bH);
        ctx.lineTo(cx, cy - bH);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#3E1903';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Right Face (Lit Mahogany Timber with Service Hatch)
        ctx.fillStyle = '#78350F';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + fw/2, cy - fh/2);
        ctx.lineTo(cx + fw/2, cy - fh/2 - bH);
        ctx.lineTo(cx, cy - bH);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#451A03';
        ctx.stroke();

        // Service Hatch Opening (Recessed Dark Interior with Warm Golden Light)
        ctx.fillStyle = '#1E1008';
        ctx.beginPath();
        ctx.moveTo(cx + 4, cy - 6);
        ctx.lineTo(cx + 18, cy - 13);
        ctx.lineTo(cx + 18, cy - bH + 3);
        ctx.lineTo(cx + 4, cy - bH + 10);
        ctx.closePath();
        ctx.fill();

        // Warm interior glow in hatch
        ctx.fillStyle = 'rgba(254, 240, 138, 0.45)';
        ctx.fill();

        // Polished Service Countertop Shelf
        ctx.fillStyle = '#B45309';
        ctx.beginPath();
        ctx.moveTo(cx + 2, cy - 7);
        ctx.lineTo(cx + 20, cy - 16);
        ctx.lineTo(cx + 20, cy - 14);
        ctx.lineTo(cx + 2, cy - 5);
        ctx.closePath();
        ctx.fill();

        // Countertop Espresso Machine & Steaming Cup
        ctx.fillStyle = '#94A3B8';
        ctx.fillRect(cx + 11, cy - 20, 6, 6); // espresso machine
        ctx.fillStyle = '#E2E8F0';
        ctx.fillRect(cx + 6, cy - 12, 3, 3); // coffee cup
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillRect(cx + 7, cy - 16, 1, 3); // rising steam plume

        // Chalkboard Menu on Left Wall
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.moveTo(cx - 5, cy - 6);
        ctx.lineTo(cx - 19, cy - 13);
        ctx.lineTo(cx - 19, cy - bH + 4);
        ctx.lineTo(cx - 5, cy - bH + 11);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#92400E';
        ctx.stroke();
        // Chalk writing lines
        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(cx - 15, cy - 15, 8, 1);
        ctx.fillRect(cx - 14, cy - 12, 6, 1);

        // 2. Four Timber Corner Posts Supporting Canopy
        const postH = 20;
        ctx.fillStyle = '#451A03';
        ctx.fillRect(cx - fw/2, cy - fh/2 - bH - postH + 4, 2, postH);
        ctx.fillRect(cx - 1, cy - fh - bH - postH + 4, 2, postH);
        ctx.fillRect(cx + fw/2 - 2, cy - fh/2 - bH - postH + 4, 2, postH);
        ctx.fillRect(cx - 1, cy - bH - postH + 4, 2, postH);

        // 3. Striped Awning Canopy in 2:1 Isometric Projection (Red & White Canvas)
        const canY = cy - bH - postH + 4;
        const cW = fw + 8;
        const cH = fh + 4;
        const pitch = 14;

        // Left Roof Slope (Crimson Canvas)
        ctx.fillStyle = '#DC2626';
        ctx.beginPath();
        ctx.moveTo(cx, canY - pitch);
        ctx.lineTo(cx - cW/2, canY - cH/2);
        ctx.lineTo(cx, canY);
        ctx.closePath();
        ctx.fill();

        // Right Roof Slope (White Canvas)
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(cx, canY - pitch);
        ctx.lineTo(cx, canY);
        ctx.lineTo(cx + cW/2, canY - cH/2);
        ctx.closePath();
        ctx.fill();

        // Decorative Alternating Stripes along Left & Right Slopes
        ctx.fillStyle = '#B91C1C';
        ctx.beginPath();
        ctx.moveTo(cx - 6, canY - pitch + 3);
        ctx.lineTo(cx - cW/4, canY - cH/4);
        ctx.lineTo(cx - cW/4 + 4, canY - cH/4 + 2);
        ctx.lineTo(cx - 2, canY - pitch + 5);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.moveTo(cx + 4, canY - pitch + 4);
        ctx.lineTo(cx + cW/4, canY - cH/4);
        ctx.lineTo(cx + cW/4 + 4, canY - cH/4 - 2);
        ctx.lineTo(cx + 8, canY - pitch + 2);
        ctx.closePath();
        ctx.fill();

        // Front Fascia Sign: "CAFÉ"
        ctx.fillStyle = '#1E120B';
        ctx.fillRect(cx - 10, canY - 2, 20, 6);
        ctx.strokeStyle = '#F59E0B';
        ctx.strokeRect(cx - 10, canY - 2, 20, 6);
        ctx.fillStyle = '#FDE047';
        ctx.font = 'bold 5px monospace';
        ctx.fillText('CAFÉ', cx - 7, canY + 3);
    }

    // Commercial Boutique & Storefront (130x120)
    function drawCommercialBoutique(ctx, w, h) {
        const cx = Math.floor(w / 2);
        const cy = h - 18;

        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 4, 48, 20, 0, 0, Math.PI * 2);
        ctx.fill();

        const fw = 60, fh = 30, bH = 62;

        // Left Face (Modern Warm Charcoal Concrete)
        ctx.fillStyle = '#27272A';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - fw/2, cy - fh/2);
        ctx.lineTo(cx - fw/2, cy - fh/2 - bH);
        ctx.lineTo(cx, cy - bH);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#3F3F46';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Right Face (Retail Storefront Glass)
        ctx.fillStyle = '#18181B';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + fw/2, cy - fh/2);
        ctx.lineTo(cx + fw/2, cy - fh/2 - bH);
        ctx.lineTo(cx, cy - bH);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Display Windows on Right Face (Warm Pastel Boutique Interior)
        ctx.fillStyle = '#FEF3C7';
        ctx.beginPath();
        ctx.moveTo(cx + 6, cy - 12);
        ctx.lineTo(cx + 24, cy - 21);
        ctx.lineTo(cx + 24, cy - 42);
        ctx.lineTo(cx + 6, cy - 33);
        ctx.closePath();
        ctx.fill();

        // Striped Fabric Awning (Coral Red & Warm White)
        for (let i = 0; i < 4; i++) {
            const ax = cx + 4 + i * 5;
            const ay = cy - 28 - i * 2.5;
            ctx.fillStyle = (i % 2 === 0) ? '#E11D48' : '#FFFFFF';
            ctx.fillRect(ax, ay, 6, 8);
        }

        // Boutique Illuminated Acrylic Sign: "MARKET"
        ctx.fillStyle = '#090D16';
        ctx.fillRect(cx + 6, cy - bH + 6, 36, 10);
        ctx.strokeStyle = '#FB7185';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx + 6, cy - bH + 6, 36, 10);
        ctx.fillStyle = '#FB7185';
        ctx.font = 'bold 6.5px sans-serif';
        ctx.fillText('MARKET', cx + 10, cy - bH + 14);

        // Roof Balustrade & Skylight
        ctx.fillStyle = '#3F3F46';
        ctx.beginPath();
        ctx.moveTo(cx, cy - bH);
        ctx.lineTo(cx - fw/2, cy - fh/2 - bH);
        ctx.lineTo(cx, cy - fh - bH);
        ctx.lineTo(cx + fw/2, cy - fh/2 - bH);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#38BDF8';
        ctx.fillRect(cx - 8, cy - bH - 12, 16, 6);
    }

    // Cloud Data Center & Server Vault (140x130)
    function drawDataCenter(ctx, w, h) {
        const cx = Math.floor(w / 2);
        const cy = h - 20;

        ctx.fillStyle = 'rgba(0,0,0,0.48)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 4, 52, 22, 0, 0, Math.PI * 2);
        ctx.fill();

        const fw = 64, fh = 32, bH = 65;

        // Left Face (Titanium Slate)
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - fw/2, cy - fh/2);
        ctx.lineTo(cx - fw/2, cy - fh/2 - bH);
        ctx.lineTo(cx, cy - bH);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#1E293B';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Right Face (Industrial Datacenter Louvers)
        ctx.fillStyle = '#1E293B';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + fw/2, cy - fh/2);
        ctx.lineTo(cx + fw/2, cy - fh/2 - bH);
        ctx.lineTo(cx, cy - bH);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Horizontal Cooling Louvers with Cyan Underglow
        for (let i = 0; i < 5; i++) {
            const ly = cy - 14 - i * 9;
            ctx.fillStyle = '#090D16';
            ctx.fillRect(cx + 6, ly - 3, 22, 5);
            ctx.fillStyle = (i % 2 === 0) ? '#00F0FF' : '#22C55E';
            ctx.fillRect(cx + 8, ly - 2, 3, 2);
            ctx.fillRect(cx + 14, ly - 2, 3, 2);
            ctx.fillRect(cx + 20, ly - 2, 3, 2);
        }

        // Heavy High-Voltage Vault Door
        ctx.fillStyle = '#334155';
        ctx.fillRect(cx - 18, cy - 22, 12, 18);
        ctx.fillStyle = '#FACC15';
        ctx.fillRect(cx - 14, cy - 20, 4, 2); // Yellow hazard bar

        // Rooftop HVAC Industrial Chillers & Cooling Tower
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(cx, cy - bH);
        ctx.lineTo(cx - fw/2, cy - fh/2 - bH);
        ctx.lineTo(cx, cy - fh - bH);
        ctx.lineTo(cx + fw/2, cy - fh/2 - bH);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#475569';
        ctx.fillRect(cx - 12, cy - bH - 14, 12, 10);
        ctx.fillRect(cx + 4, cy - bH - 12, 10, 8);
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(cx - 6, cy - bH - 9, 3, 0, Math.PI * 2);
        ctx.arc(cx + 9, cy - bH - 8, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }

    // Creative & Design Studio Loft (120x120)
    function drawCreativeStudio(ctx, w, h) {
        const cx = Math.floor(w / 2);
        const cy = h - 18;

        ctx.fillStyle = 'rgba(0,0,0,0.42)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 4, 44, 18, 0, 0, Math.PI * 2);
        ctx.fill();

        const fw = 54, fh = 27, bH = 54;

        // Left Face (Muted Terracotta)
        ctx.fillStyle = '#7C2D12';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - fw/2, cy - fh/2);
        ctx.lineTo(cx - fw/2, cy - fh/2 - bH);
        ctx.lineTo(cx, cy - bH);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#5A1F0D';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Right Face (Clean White Loft Wall)
        ctx.fillStyle = '#E2E8F0';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + fw/2, cy - fh/2);
        ctx.lineTo(cx + fw/2, cy - fh/2 - bH);
        ctx.lineTo(cx, cy - bH);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#CBD5E1';
        ctx.stroke();

        // High studio gallery windows (Cyan / Lavender Light)
        ctx.fillStyle = '#818CF8';
        ctx.fillRect(cx + 6, cy - 38, 16, 14);
        ctx.strokeStyle = '#312E81';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx + 6, cy - 38, 16, 14);
        ctx.beginPath();
        ctx.moveTo(cx + 14, cy - 38); ctx.lineTo(cx + 14, cy - 24);
        ctx.stroke();

        // Studio Entrance Glass Door
        ctx.fillStyle = '#0284C7';
        ctx.fillRect(cx + 8, cy - 16, 10, 14);

        // Sawtooth Industrial Skylight Roof
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.moveTo(cx, cy - bH);
        ctx.lineTo(cx - fw/2, cy - fh/2 - bH);
        ctx.lineTo(cx, cy - fh - bH);
        ctx.lineTo(cx + fw/2, cy - fh/2 - bH);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#38BDF8';
        ctx.beginPath();
        ctx.moveTo(cx - 10, cy - bH - 4);
        ctx.lineTo(cx - 2, cy - bH - 12);
        ctx.lineTo(cx + 6, cy - bH - 4);
        ctx.closePath();
        ctx.fill();
    }

    // Urban Metro / Transit Station Pavilion (110x90)
    function drawTransitPavilion(ctx, w, h) {
        const cx = Math.floor(w / 2);
        const cy = h - 14;

        ctx.fillStyle = 'rgba(0,0,0,0.38)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 3, 38, 16, 0, 0, Math.PI * 2);
        ctx.fill();

        // Subway Descent Stairs Entrance
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - 18, cy - 9);
        ctx.lineTo(cx, cy - 18);
        ctx.lineTo(cx + 18, cy - 9);
        ctx.closePath();
        ctx.fill();

        // Escalator lines
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        for (let i = 1; i <= 4; i++) {
            ctx.beginPath();
            ctx.moveTo(cx - 18 + i * 3.5, cy - 9 + i * 1.7);
            ctx.lineTo(cx + i * 3.5, cy - 18 + i * 1.7);
            ctx.stroke();
        }

        // Steel Glass Curved Canopy
        ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
        ctx.beginPath();
        ctx.ellipse(cx, cy - 22, 22, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#64748B';
        ctx.fillRect(cx - 16, cy - 22, 2, 16);
        ctx.fillRect(cx + 14, cy - 22, 2, 16);

        // Metro Beacon Pylon ("M / Fênix Line")
        ctx.fillStyle = '#DC2626';
        ctx.fillRect(cx - 3, cy - 36, 6, 12);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 7px sans-serif';
        ctx.fillText('M', cx - 2.5, cy - 27);
    }

    // ============================================================================
    // 6. MAIN PIXI CITY RENDERER
    // ============================================================================

    class PixiCityRenderer {
        constructor(containerOrId) {
            this.container = (typeof containerOrId === 'string')
                ? document.getElementById(containerOrId)
                : containerOrId;
            window.fenixCity = this;
            this.app = null;
            this.worldContainer = null;

            this.terrainLayer = null;
            this.roadLayer = null;
            this.sortedLayer = null;
            this.uiLayer = null;

            this.camera = { x: 0, y: 0, zoom: 1.4 };
            this.targetCamera = { x: 0, y: 0, zoom: 1.4 };

            this.agents = new Map();
            this.buildings = new Map();
            this.textures = {};
            this.isDragging = false;
            this.dragStart = { x: 0, y: 0 };
            this.isPhotoMode = false;

            if (window.PIXI && PIXI.TextureSource) {
                PIXI.TextureSource.defaultOptions.scaleMode = 'nearest';
            }

            this.isReady = false;
            this.readyPromise = this.init().then(() => { this.isReady = true; });
        }

        async init() {
            const container = this.container;
            if (!container) {
                console.error('[PixiCityRenderer] Container not found.');
                return;
            }

            this.app = new PIXI.Application();
            await this.app.init({
                resizeTo: container,
                preference: 'webgl',
                antialias: false,
                roundPixels: true,
                resolution: window.devicePixelRatio || 1,
                autoDensity: true,
                background: '#04070c',
                backgroundAlpha: 1,
            });

            this.app.canvas.classList.add('pixi-city-canvas');
            this.app.canvas.style.imageRendering = 'pixelated';
            this.app.canvas.style.display = 'block';
            this.app.canvas.style.width = '100%';
            this.app.canvas.style.height = '100%';
            container.appendChild(this.app.canvas);

            const legacyCanvas = document.getElementById('cityCanvas');
            if (legacyCanvas) {
                legacyCanvas.style.setProperty('display', 'none', 'important');
                legacyCanvas.style.setProperty('opacity', '0', 'important');
                legacyCanvas.style.setProperty('pointer-events', 'none', 'important');
            }

            this.generateTextures();

            this.worldContainer = new PIXI.Container();
            this.worldContainer.sortableChildren = true;
            this.app.stage.addChild(this.worldContainer);

            this.terrainLayer = new PIXI.Container();
            this.roadLayer = new PIXI.Container();
            this.sortedLayer = new PIXI.Container();
            this.sortedLayer.sortableChildren = true;
            this.uiLayer = new PIXI.Container();

            this.worldContainer.addChild(this.terrainLayer);
            this.worldContainer.addChild(this.roadLayer);
            this.worldContainer.addChild(this.sortedLayer);
            this.worldContainer.addChild(this.uiLayer);

            this.setupInteractions();
            this.generateCity();

            // Center camera on Development District / Central Plaza
            const center = gridToScreen(14, 18);
            this.camera.x = center.x;
            this.camera.y = center.y;
            this.camera.zoom = 1.6;
            this.targetCamera.x = center.x;
            this.targetCamera.y = center.y;
            this.targetCamera.zoom = 1.6;

            this.app.ticker.add((ticker) => this.update(ticker));

            window.addEventListener('resize', () => this.resize());
            this.resize();

            if (legacyCanvas) {
                legacyCanvas.style.setProperty('display', 'none', 'important');
            }

            this.isReady = true;
            console.log('[PixiCityRenderer] V4.5 Art Director active — PixiJS', PIXI.VERSION);
        }

        generateTextures() {
            const TK = window.TerrainKit;
            const SK = window.StreetKit;
            const BK = window.BuildingKit;
            const VK = window.VegetationKit;
            const LK = window.LightingKit;
            const FK = window.StreetFurnitureKit;

            // Diverse Terrain Tiles (8 Grass Variants, 6 Road Variants, 6 Sidewalk Variants)
            this.textures.grass01 = createTextureFromCanvas(this.app, ISO_TILE_WIDTH, ISO_TILE_HEIGHT, (ctx, w, h) => TK ? TK.drawGrass(ctx, w, h, 0) : drawGrassTile01(ctx, w, h));
            this.textures.grass02 = createTextureFromCanvas(this.app, ISO_TILE_WIDTH, ISO_TILE_HEIGHT, (ctx, w, h) => TK ? TK.drawGrass(ctx, w, h, 1) : drawGrassTile02(ctx, w, h));
            this.textures.grass03 = createTextureFromCanvas(this.app, ISO_TILE_WIDTH, ISO_TILE_HEIGHT, (ctx, w, h) => TK ? TK.drawGrass(ctx, w, h, 2) : drawGrassTile03(ctx, w, h));
            this.textures.grass04 = createTextureFromCanvas(this.app, ISO_TILE_WIDTH, ISO_TILE_HEIGHT, (ctx, w, h) => TK ? TK.drawGrass(ctx, w, h, 3) : drawGrassTile04(ctx, w, h));
            this.textures.grass05 = createTextureFromCanvas(this.app, ISO_TILE_WIDTH, ISO_TILE_HEIGHT, (ctx, w, h) => TK ? TK.drawGrass(ctx, w, h, 4) : drawGrassTile05(ctx, w, h));
            this.textures.grass06 = createTextureFromCanvas(this.app, ISO_TILE_WIDTH, ISO_TILE_HEIGHT, (ctx, w, h) => TK ? TK.drawGrass(ctx, w, h, 5) : drawGrassTile06(ctx, w, h));
            this.textures.grass07 = createTextureFromCanvas(this.app, ISO_TILE_WIDTH, ISO_TILE_HEIGHT, (ctx, w, h) => TK ? TK.drawGrass(ctx, w, h, 6) : drawGrassTile07(ctx, w, h));
            this.textures.grass08 = createTextureFromCanvas(this.app, ISO_TILE_WIDTH, ISO_TILE_HEIGHT, (ctx, w, h) => TK ? TK.drawGrass(ctx, w, h, 7) : drawGrassTile08(ctx, w, h));

            this.textures.roadMain = createTextureFromCanvas(this.app, ISO_TILE_WIDTH, ISO_TILE_HEIGHT, (ctx, w, h) => SK ? SK.drawRoad(ctx, w, h, 'main') : drawRoadMainTile(ctx, w, h));
            this.textures.roadAvenue = createTextureFromCanvas(this.app, ISO_TILE_WIDTH, ISO_TILE_HEIGHT, (ctx, w, h) => SK ? SK.drawRoad(ctx, w, h, 'avenue') : drawRoadAvenueTile(ctx, w, h));
            this.textures.roadBoulevard = createTextureFromCanvas(this.app, ISO_TILE_WIDTH, ISO_TILE_HEIGHT, (ctx, w, h) => SK ? SK.drawRoad(ctx, w, h, 'avenue') : drawRoadBoulevardTile(ctx, w, h));
            this.textures.roadCross = createTextureFromCanvas(this.app, ISO_TILE_WIDTH, ISO_TILE_HEIGHT, (ctx, w, h) => SK ? SK.drawRoad(ctx, w, h, 'crosswalk') : drawRoadCrosswalkTile(ctx, w, h));
            this.textures.roadSec = createTextureFromCanvas(this.app, ISO_TILE_WIDTH, ISO_TILE_HEIGHT, (ctx, w, h) => SK ? SK.drawRoad(ctx, w, h, 'main') : drawRoadSecondaryTile(ctx, w, h));
            this.textures.roadPlaza = createTextureFromCanvas(this.app, ISO_TILE_WIDTH, ISO_TILE_HEIGHT, (ctx, w, h) => SK ? SK.drawSidewalk(ctx, w, h, 'plaza') : drawPlazaPaverTile(ctx, w, h));
            this.textures.roadManhole = createTextureFromCanvas(this.app, ISO_TILE_WIDTH, ISO_TILE_HEIGHT, (ctx, w, h) => SK ? SK.drawRoad(ctx, w, h, 'manhole') : drawRoadManholeTile(ctx, w, h));
            this.textures.roadWear = createTextureFromCanvas(this.app, ISO_TILE_WIDTH, ISO_TILE_HEIGHT, (ctx, w, h) => SK ? SK.drawRoad(ctx, w, h, 'curb') : drawRoadWearTile(ctx, w, h));
            this.textures.roadCurb = createTextureFromCanvas(this.app, ISO_TILE_WIDTH, ISO_TILE_HEIGHT, (ctx, w, h) => SK ? SK.drawRoad(ctx, w, h, 'curb') : drawRoadCurbTile(ctx, w, h));

            this.textures.sidewalk = createTextureFromCanvas(this.app, ISO_TILE_WIDTH, ISO_TILE_HEIGHT, (ctx, w, h) => SK ? SK.drawSidewalk(ctx, w, h, 'standard') : drawSidewalkTile(ctx, w, h));
            this.textures.sidewalkPaver = createTextureFromCanvas(this.app, ISO_TILE_WIDTH, ISO_TILE_HEIGHT, (ctx, w, h) => SK ? SK.drawSidewalk(ctx, w, h, 'paver') : drawSidewalkPaverTile(ctx, w, h));
            this.textures.sidewalkCurb = createTextureFromCanvas(this.app, ISO_TILE_WIDTH, ISO_TILE_HEIGHT, (ctx, w, h) => SK ? SK.drawSidewalk(ctx, w, h, 'curb') : drawSidewalkCurbTile(ctx, w, h));
            this.textures.sidewalkCorner = createTextureFromCanvas(this.app, ISO_TILE_WIDTH, ISO_TILE_HEIGHT, (ctx, w, h) => SK ? SK.drawSidewalk(ctx, w, h, 'standard') : drawSidewalkCornerTile(ctx, w, h));
            this.textures.sidewalkCobble = createTextureFromCanvas(this.app, ISO_TILE_WIDTH, ISO_TILE_HEIGHT, (ctx, w, h) => SK ? SK.drawSidewalk(ctx, w, h, 'cobble') : drawSidewalkCobbleTile(ctx, w, h));
            this.textures.sidewalkGrate = createTextureFromCanvas(this.app, ISO_TILE_WIDTH, ISO_TILE_HEIGHT, (ctx, w, h) => SK ? SK.drawSidewalk(ctx, w, h, 'grate') : drawSidewalkGrateTile(ctx, w, h));

            // Backward compatibility aliases
            this.textures.grass = this.textures.grass01;
            this.textures.road = this.textures.roadMain;

            // Elevated Landmark Buildings (Asset-First Game Art Pipeline)
            this.textures.fenixHQ = createTextureFromCanvas(this.app, 180, 220, (ctx, w, h) => {
                if (BK) {
                    if (typeof BK.drawFenixHQ === 'function') return BK.drawFenixHQ(ctx, w, h);
                    if (typeof BK.drawFenixHQLandmark === 'function') return BK.drawFenixHQLandmark(ctx, w, h);
                }
                return drawFenixHQ(ctx, w, h);
            });
            this.textures.devLoft = createTextureFromCanvas(this.app, 150, 160, (ctx, w, h) => {
                if (BK) {
                    if (typeof BK.drawDevLoft === 'function') return BK.drawDevLoft(ctx, w, h);
                    if (typeof BK.drawDevLoftWarehouse === 'function') return BK.drawDevLoftWarehouse(ctx, w, h);
                }
                return drawDevLoft(ctx, w, h);
            });
            this.textures.researchLab = createTextureFromCanvas(this.app, 160, 150, (ctx, w, h) => {
                if (BK) {
                    if (typeof BK.drawAIPub === 'function') return BK.drawAIPub(ctx, w, h);
                    if (typeof BK.drawAIHub === 'function') return BK.drawAIHub(ctx, w, h);
                    if (typeof BK.drawResearchCitadel === 'function') return BK.drawResearchCitadel(ctx, w, h);
                }
                return drawResearchLab(ctx, w, h);
            });
            this.textures.securityOutpost = createTextureFromCanvas(this.app, 110, 100, drawSecurityOutpost);
            this.textures.coffeeKiosk = createTextureFromCanvas(this.app, 90, 90, (ctx, w, h) => {
                if (BK && typeof BK.drawCoffeeKiosk === 'function') return BK.drawCoffeeKiosk(ctx, w, h);
                return drawCoffeeKiosk(ctx, w, h);
            });
            this.textures.commercialBoutique = createTextureFromCanvas(this.app, 130, 120, drawCommercialBoutique);
            this.textures.dataCenter = createTextureFromCanvas(this.app, 140, 130, drawDataCenter);
            this.textures.creativeStudio = createTextureFromCanvas(this.app, 120, 120, drawCreativeStudio);
            this.textures.transitPavilion = createTextureFromCanvas(this.app, 110, 90, drawTransitPavilion);

            // Varied Environment Props
            this.textures.treeOak = createTextureFromCanvas(this.app, 44, 56, (ctx, w, h) => {
                if (VK) {
                    if (typeof VK.drawBroadleafOak === 'function') return VK.drawBroadleafOak(ctx, w, h);
                    if (typeof VK.drawParkOak === 'function') return VK.drawParkOak(ctx, w, h);
                }
                return drawTreeOak(ctx, w, h);
            });
            this.textures.treeCypress = createTextureFromCanvas(this.app, 28, 60, (ctx, w, h) => {
                if (VK) {
                    if (typeof VK.drawColumnarCypress === 'function') return VK.drawColumnarCypress(ctx, w, h);
                    if (typeof VK.drawTallCypress === 'function') return VK.drawTallCypress(ctx, w, h);
                }
                return drawTreeCypress(ctx, w, h);
            });
            this.textures.treeSakura = createTextureFromCanvas(this.app, 44, 54, (ctx, w, h) => {
                if (VK && typeof VK.drawWeepingSakura === 'function') return VK.drawWeepingSakura(ctx, w, h);
                return drawTreeSakura(ctx, w, h);
            });
            this.textures.tree = this.textures.treeOak;

            this.textures.fountain = createTextureFromCanvas(this.app, 52, 44, (ctx, w, h) => {
                if (FK) {
                    if (typeof FK.drawTieredFountain === 'function') return FK.drawTieredFountain(ctx, w, h, 0);
                    if (typeof FK.drawGrandFountain === 'function') return FK.drawGrandFountain(ctx, w, h, 0);
                }
                return drawPlazaFountain(ctx, w, h);
            });
            this.textures.bench = createTextureFromCanvas(this.app, 32, 24, (ctx, w, h) => {
                if (FK) {
                    if (typeof FK.drawMahoganyBench === 'function') return FK.drawMahoganyBench(ctx, w, h);
                    if (typeof FK.drawParkBench === 'function') return FK.drawParkBench(ctx, w, h);
                }
                return drawPlazaBench(ctx, w, h);
            });
            this.textures.streetLamp = createTextureFromCanvas(this.app, 30, 52, (ctx, w, h) => {
                if (LK && typeof LK.drawVictorianStreetLamp === 'function') return LK.drawVictorianStreetLamp(ctx, w, h);
                return drawStreetLamp(ctx, w, h);
            });
            this.textures.digitalTotem = createTextureFromCanvas(this.app, 28, 48, drawDigitalTotem);
            this.textures.serverMonolith = createTextureFromCanvas(this.app, 30, 48, drawServerMonolith);
            this.textures.bikeRack = createTextureFromCanvas(this.app, 34, 24, (ctx, w, h) => {
                if (FK) {
                    if (typeof FK.drawBicycleRack === 'function') return FK.drawBicycleRack(ctx, w, h);
                    if (typeof FK.drawBikeRack === 'function') return FK.drawBikeRack(ctx, w, h);
                }
                return drawBikeRack(ctx, w, h);
            });
            this.textures.fireHydrant = createTextureFromCanvas(this.app, 18, 24, (ctx, w, h) => {
                if (FK && typeof FK.drawFireHydrant === 'function') return FK.drawFireHydrant(ctx, w, h);
                return drawFireHydrant(ctx, w, h);
            });
            this.textures.trashBin = createTextureFromCanvas(this.app, 20, 24, (ctx, w, h) => {
                if (FK && typeof FK.drawDualTrashBin === 'function') return FK.drawDualTrashBin(ctx, w, h);
                return drawTrashBin(ctx, w, h);
            });
            this.textures.planterFlower = createTextureFromCanvas(this.app, 28, 22, (ctx, w, h) => {
                if (VK) {
                    if (typeof VK.drawLandscapedPlanter === 'function') return VK.drawLandscapedPlanter(ctx, w, h);
                    if (typeof VK.drawStonePlanter === 'function') return VK.drawStonePlanter(ctx, w, h);
                }
                return drawPlanterFlower(ctx, w, h);
            });
            this.textures.picnicTable = createTextureFromCanvas(this.app, 36, 26, (ctx, w, h) => {
                if (FK) {
                    if (typeof FK.drawBistroTable === 'function') return FK.drawBistroTable(ctx, w, h);
                    if (typeof FK.drawCafeBistroTable === 'function') return FK.drawCafeBistroTable(ctx, w, h);
                }
                return drawPicnicTable(ctx, w, h);
            });
        }

        generateCity() {
            const gridSize = 40;

            // Master Road Network
            const isMainAve = (c) => c === 17 || c === 18;
            const isCrossBoulevard = (r) => r === 15 || r === 16 || r === 28 || r === 29;
            const isSecondaryAve = (c) => c === 8 || c === 28;
            const isCrossStreet = (r) => r === 6 || r === 22;

            // District Zones
            const isCentralPlaza = (c, r) => (c >= 8 && c <= 16 && r >= 6 && r <= 14);
            const isDevPatio = (c, r) => (c >= 9 && c <= 16 && r >= 17 && r <= 24);
            const isCommercialZone = (c, r) => (c >= 29 && c <= 36 && r >= 6 && r <= 13);
            const isDataVaultZone = (c, r) => (c >= 29 && c <= 36 && r >= 23 && r <= 29);
            const isResearchCourtyard = (c, r) => (c >= 20 && c <= 27 && r >= 8 && r <= 15);
            const isSecurityCompound = (c, r) => (c >= 21 && c <= 28 && r >= 21 && r <= 28);
            const isCreativePark = (c, r) => (c >= 2 && c <= 8 && r >= 19 && r <= 27);
            const isMemoryCommons = (c, r) => (c >= 2 && c <= 8 && r >= 6 && r <= 14);

            // Sidewalk Borders along streets
            const isSidewalk = (c, r) => {
                if (isMainAve(c) || isCrossBoulevard(r) || isSecondaryAve(c) || isCrossStreet(r)) return false;
                return (c === 16 || c === 19 || c === 7 || c === 9 || c === 27 || c === 29 ||
                        r === 14 || r === 17 || r === 27 || r === 30 || r === 5 || r === 7 || r === 21 || r === 23);
            };

            // High quality deterministic PRNG
            function hashRnd(col, row) {
                let n = col * 374761393 + row * 668265263;
                n = (n ^ (n >> 13)) * 1274126177;
                return ((n ^ (n >> 16)) >>> 0) / 4294967296;
            }

            for (let r = 0; r < gridSize; r++) {
                for (let c = 0; c < gridSize; c++) {
                    const pos = gridToScreen(c, r);
                    const isRoadCol = isMainAve(c) || isSecondaryAve(c);
                    const isRoadRow = isCrossBoulevard(r) || isCrossStreet(r);
                    const isIntersection = isRoadCol && isRoadRow;

                    let tileTex = null;
                    let isRoadTile = false;

                    if (isCentralPlaza(c, r)) {
                        // Central Plaza Flagstone Pavers, Cobblestone & Medallion Insets
                        if (c === 13 && r === 11) {
                            tileTex = this.textures.roadPlaza;
                        } else if ((c + r) % 4 === 0) {
                            tileTex = this.textures.sidewalkCobble;
                        } else if ((c + r) % 3 === 0) {
                            tileTex = this.textures.grass05;
                        } else {
                            tileTex = this.textures.roadPlaza;
                        }
                        isRoadTile = false;
                    } else if (isDevPatio(c, r)) {
                        tileTex = ((c + r) % 3 === 0) ? this.textures.sidewalkPaver : this.textures.roadPlaza;
                        isRoadTile = false;
                    } else if (isCommercialZone(c, r) || isDataVaultZone(c, r) || isResearchCourtyard(c, r) || isSecurityCompound(c, r)) {
                        tileTex = ((c + r) % 2 === 0) ? this.textures.sidewalkPaver : this.textures.roadPlaza;
                        isRoadTile = false;
                    } else if (isCreativePark(c, r) || isMemoryCommons(c, r)) {
                        tileTex = ((c === 5 || r === 23 || r === 10) ? this.textures.grass05 :
                                   (hashRnd(c, r) > 0.6) ? this.textures.grass02 : this.textures.grass06);
                        isRoadTile = false;
                    } else if (isIntersection) {
                        tileTex = this.textures.roadCross; // Zebra Crosswalk
                        isRoadTile = true;
                    } else if (isMainAve(c)) {
                        if (r === 12) tileTex = this.textures.roadManhole;
                        else if (r === 20) tileTex = this.textures.roadWear;
                        else if (c === 17 && r % 3 === 0) tileTex = this.textures.roadAvenue;
                        else tileTex = this.textures.roadMain;
                        isRoadTile = true;
                    } else if (isCrossBoulevard(r)) {
                        if (c === 12) tileTex = this.textures.roadManhole;
                        else if (c === 24) tileTex = this.textures.roadWear;
                        else if (r === 15 && c % 3 === 0) tileTex = this.textures.roadBoulevard;
                        else tileTex = this.textures.roadMain;
                        isRoadTile = true;
                    } else if (isSecondaryAve(c) || isCrossStreet(r)) {
                        tileTex = this.textures.roadSec;
                        isRoadTile = true;
                    } else if (isSidewalk(c, r)) {
                        const sRnd = hashRnd(c * 3, r * 5);
                        if (sRnd > 0.75) tileTex = this.textures.sidewalkPaver;
                        else if (sRnd > 0.50) tileTex = this.textures.sidewalkCurb;
                        else if (sRnd > 0.35) tileTex = this.textures.sidewalkCorner;
                        else tileTex = this.textures.sidewalk;
                        isRoadTile = false;
                    } else {
                        // Rich organic natural grass terrain across 8 variants
                        const rVal = hashRnd(c, r);
                        if (rVal > 0.88) tileTex = this.textures.grass02; // Wildflowers
                        else if (rVal > 0.76) tileTex = this.textures.grass06; // Daisy clovers
                        else if (rVal > 0.64) tileTex = this.textures.grass04; // Flowerbeds
                        else if (rVal > 0.52) tileTex = this.textures.grass07; // Autumn leaves
                        else if (rVal > 0.40) tileTex = this.textures.grass08; // Mossy turf
                        else if (rVal < 0.20) tileTex = this.textures.grass03; // Shaded turf
                        else tileTex = this.textures.grass01; // Lush turf
                        isRoadTile = false;
                    }

                    const tileSprite = new PIXI.Sprite(tileTex);
                    tileSprite.anchor.set(0.5, 0);
                    tileSprite.x = Math.round(pos.x);
                    tileSprite.y = Math.round(pos.y);

                    if (isRoadTile) {
                        this.roadLayer.addChild(tileSprite);
                    } else {
                        this.terrainLayer.addChild(tileSprite);
                    }
                }
            }

            // ── Deliberate Urban Streetlamps (Positioned along sidewalk edges & intersections) ──
            const deliberateLamps = [
                // Main Avenue Sidewalk Curb
                [16, 9], [16, 14], [16, 20], [16, 26],
                [19, 9], [19, 14], [19, 20], [19, 26],
                // Cross Boulevard Sidewalk Curb
                [10, 14], [14, 14], [22, 14], [26, 14],
                [10, 17], [14, 17], [22, 17], [26, 17],
                // Central Plaza Entrances
                [13, 7], [13, 14], [8, 11], [16, 11],
                // Café Walkway
                [9, 23], [13, 21]
            ];
            for (const [col, row] of deliberateLamps) {
                this.placeProp(col, row, this.textures.streetLamp);
            }

            // ── Dedicated Green Belt Tree Groves (Natural Urban Forestry, No Random Noise) ──
            const greenBeltTrees = [
                // North Park Boundary
                [5, 4, this.textures.treeOak], [7, 4, this.textures.treeCypress],
                [19, 4, this.textures.treeOak], [21, 4, this.textures.treeSakura],
                [25, 5, this.textures.treeCypress], [28, 5, this.textures.treeOak],
                // South Park Boundary
                [4, 32, this.textures.treeOak], [8, 33, this.textures.treeCypress],
                [20, 32, this.textures.treeSakura], [23, 33, this.textures.treeOak],
                [27, 32, this.textures.treeCypress],
                // East Green Belt
                [21, 18, this.textures.treeSakura], [24, 18, this.textures.treeOak],
                [25, 20, this.textures.treeCypress]
            ];
            for (const [col, row, tex] of greenBeltTrees) {
                this.placeProp(col, row, tex);
            }

            // ============================================================
            // 8 DISTINCT URBAN DISTRICTS (True 2.5D Living Game World)
            // ============================================================

            // ── DISTRICT 1: Central Fênix Plaza & Headquarters ──
            this.placeBuilding(10, 9, this.textures.fenixHQ, 'fenix-hq');
            this.placeProp(13, 11, this.textures.fountain); // Centerpiece sparkling water fountain
            this.placeProp(11, 11, this.textures.bench);
            this.placeProp(15, 11, this.textures.bench);
            this.placeProp(13, 9,  this.textures.bench);
            this.placeProp(13, 13, this.textures.bench);
            this.placeProp(9, 8,   this.textures.planterFlower);
            this.placeProp(15, 8,  this.textures.planterFlower);
            this.placeProp(9, 13,  this.textures.planterFlower);
            this.placeProp(15, 13, this.textures.planterFlower);
            this.placeProp(10, 13, this.textures.treeCypress);
            this.placeProp(16, 13, this.textures.treeCypress);

            // ── DISTRICT 2: Dev Loft & Tech Park (ZapAI CRM) ──
            this.placeBuilding(14, 19, this.textures.devLoft, 'dev-loft');
            this.placeBuilding(10, 23, this.textures.coffeeKiosk, 'coffee-kiosk');
            this.placeProp(12, 21, this.textures.picnicTable); // Outdoor developer coding table
            this.placeProp(15, 21, this.textures.bikeRack);    // Commuter bicycle parking
            this.placeProp(11, 19, this.textures.digitalTotem);// Telemetry display totem
            this.placeProp(16, 18, this.textures.serverMonolith);
            this.placeProp(16, 20, this.textures.fireHydrant);
            this.placeProp(11, 22, this.textures.trashBin);
            this.placeProp(13, 23, this.textures.treeSakura);

            // ── DISTRICT 3: Research & AI Core ──
            this.placeBuilding(23, 12, this.textures.researchLab, 'research-lab');
            this.placeProp(25, 13, this.textures.digitalTotem);
            this.placeProp(21, 13, this.textures.treeCypress);
            this.placeProp(25, 11, this.textures.treeCypress);
            this.placeProp(23, 15, this.textures.bench);
            this.placeProp(24, 15, this.textures.planterFlower);

            // ── DISTRICT 4: Security & Cyber Defense Outpost ──
            this.placeBuilding(25, 25, this.textures.securityOutpost, 'security-outpost');
            this.placeProp(23, 25, this.textures.serverMonolith);
            this.placeProp(24, 26, this.textures.serverMonolith);
            this.placeProp(26, 24, this.textures.streetLamp);
            this.placeProp(27, 26, this.textures.fireHydrant);
            this.placeProp(22, 24, this.textures.digitalTotem);

            // ── DISTRICT 5: Commercial Marketplace & Transit Commons ──
            this.placeBuilding(32, 8, this.textures.commercialBoutique, 'commercial-boutique');
            this.placeBuilding(33, 12, this.textures.transitPavilion, 'transit-pavilion');
            this.placeProp(30, 9,  this.textures.picnicTable); // Outdoor bistro cafe table
            this.placeProp(30, 10, this.textures.bikeRack);
            this.placeProp(32, 7,  this.textures.planterFlower);
            this.placeProp(34, 7,  this.textures.treeCypress);
            this.placeProp(29, 9,  this.textures.trashBin);
            this.placeProp(35, 10, this.textures.streetLamp);

            // ── DISTRICT 6: Cloud Data Vault & Power Infrastructure ──
            this.placeBuilding(32, 26, this.textures.dataCenter, 'data-center');
            this.placeProp(30, 26, this.textures.serverMonolith);
            this.placeProp(31, 27, this.textures.serverMonolith);
            this.placeProp(34, 27, this.textures.digitalTotem);
            this.placeProp(30, 28, this.textures.fireHydrant);
            this.placeProp(35, 26, this.textures.treeOak);

            // ── DISTRICT 7: Design & Creative Studios Commons ──
            this.placeBuilding(5, 23, this.textures.creativeStudio, 'creative-studio');
            this.placeProp(5, 25, this.textures.fountain);
            this.placeProp(4, 24, this.textures.bench);
            this.placeProp(6, 24, this.textures.bench);
            this.placeProp(4, 27, this.textures.picnicTable);
            this.placeProp(7, 26, this.textures.treeSakura);
            this.placeProp(3, 26, this.textures.treeOak);
            this.placeProp(5, 28, this.textures.planterFlower);

            // ── DISTRICT 8: Autonomous AI & Memory Commons ──
            this.placeProp(5, 7, this.textures.digitalTotem);
            this.placeProp(4, 8, this.textures.bench);
            this.placeProp(6, 8, this.textures.bench);
            this.placeProp(6, 6, this.textures.treeCypress);
            this.placeProp(4, 6, this.textures.planterFlower);
            this.placeProp(3, 7, this.textures.treeCypress);

            // ── Connecting Pocket Parks ──
            this.placeProp(20, 17, this.textures.treeOak);
            this.placeProp(21, 18, this.textures.treeSakura);
            this.placeProp(20, 19, this.textures.bench);
            this.placeProp(21, 19, this.textures.planterFlower);
        }

        placeBuilding(col, row, texture, id) {
            const sprite = new PIXI.Sprite(texture);
            sprite.anchor.set(0.5, 1);
            const pos = gridToScreen(col, row);
            sprite.x = Math.round(pos.x);
            sprite.y = Math.round(pos.y + ISO_TILE_HEIGHT / 2);
            sprite.zIndex = sprite.y;
            sprite.eventMode = 'static';
            sprite.cursor = 'pointer';

            if (id) {
                sprite.buildingId = id;
                if (!this.buildings) this.buildings = new Map();
                this.buildings.set(id, { sprite, col, row });
            }

            this.sortedLayer.addChild(sprite);
            return sprite;
        }

        placeProp(col, row, texture) {
            const sprite = new PIXI.Sprite(texture);
            sprite.anchor.set(0.5, 1);
            const pos = gridToScreen(col, row);
            sprite.x = Math.round(pos.x);
            sprite.y = Math.round(pos.y + ISO_TILE_HEIGHT / 2);
            sprite.zIndex = sprite.y;
            this.sortedLayer.addChild(sprite);
            return sprite;
        }

        // --- Agents (Animated 2.5D RPG Character System) ---

        addAgent(agentData) {
            if (this.agents.has(agentData.id)) return;

            const col = (agentData.gridX !== undefined) ? agentData.gridX : (agentData.x || 0);
            const row = (agentData.gridY !== undefined) ? agentData.gridY : (agentData.y || 0);
            const pos = gridToScreen(col, row);

            let sprite = null;
            let character = null;

            if (window.FenixCharacterSystem && window.FenixCharacterSystem.CityCharacter) {
                if (!this.charCache) {
                    this.charCache = new window.FenixCharacterSystem.CharacterTextureCache(this.app);
                }
                character = new window.FenixCharacterSystem.CityCharacter(agentData, this.charCache);
                character.gridX = col;
                character.gridY = row;
                sprite = character.sprite;
                sprite.x = Math.round(pos.x);
                sprite.y = Math.round(pos.y + ISO_TILE_HEIGHT / 2);
                sprite.zIndex = sprite.y;
            } else {
                const canvas = document.createElement('canvas');
                canvas.width = 24;
                canvas.height = 40;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = agentData.color || '#3B82F6';
                ctx.fillRect(6, 10, 12, 24);
                const tex = PIXI.Texture.from(canvas);
                sprite = new PIXI.Sprite(tex);
                sprite.anchor.set(0.5, 1);
                sprite.x = Math.round(pos.x);
                sprite.y = Math.round(pos.y + ISO_TILE_HEIGHT / 2);
                sprite.zIndex = sprite.y;
            }

            this.sortedLayer.addChild(sprite);
            this.agents.set(agentData.id, { character, sprite, data: agentData, gridX: col, gridY: row });

            if (window.fenixInteraction) {
                window.fenixInteraction.registerObject({
                    id: agentData.id,
                    type: 'agent',
                    sprite: sprite,
                    metadata: {
                        name: character?.displayName || agentData.name || agentData.id,
                        role: agentData.role || 'developer',
                        status: agentData.status || 'ACTIVE',
                        model: agentData.model || 'Gemini 2.5 Flash',
                        provider: agentData.gateway || 'ai-gateway',
                        task: agentData.task || agentData.currentTask || 'Active in District',
                        identity: agentData.identity || `fenix://agent/${agentData.id}`,
                        tokens: agentData.tokens || 0
                    }
                });
            }
        }

        removeAgent(id) {
            const agent = this.agents.get(id);
            if (agent) {
                this.sortedLayer.removeChild(agent.sprite);
                if (agent.character && agent.character.destroy) {
                    agent.character.destroy();
                } else {
                    agent.sprite.destroy();
                }
                this.agents.delete(id);
            }
        }

        updateAgent(id, data) {
            const agent = this.agents.get(id);
            if (agent) {
                if (data.x !== undefined) agent.gridX = data.x;
                if (data.y !== undefined) agent.gridY = data.y;
                if (agent.character) {
                    agent.character.gridX = agent.gridX;
                    agent.character.gridY = agent.gridY;
                    if (data.state && agent.character.setState) {
                        agent.character.setState(data.state);
                    }
                }

                const pos = gridToScreen(agent.gridX, agent.gridY);
                agent.sprite.x = Math.round(pos.x);
                agent.sprite.y = Math.round(pos.y + ISO_TILE_HEIGHT/2);
                agent.sprite.zIndex = agent.sprite.y;
            }
        }

        // --- Camera & Input ---

        setupInteractions() {
            const canvas = this.app.canvas;
            canvas.style.touchAction = 'none';

            canvas.addEventListener('pointerdown', (e) => {
                this.isDragging = true;
                this.dragStart = { x: e.clientX, y: e.clientY };
                if (this.followTarget) {
                    this.unfollow();
                }
            });

            window.addEventListener('pointermove', (e) => {
                if (!this.isDragging) return;
                const dx = (e.clientX - this.dragStart.x) / this.camera.zoom;
                const dy = (e.clientY - this.dragStart.y) / this.camera.zoom;
                this.targetCamera.x -= dx;
                this.targetCamera.y -= dy;
                this.dragStart = { x: e.clientX, y: e.clientY };
            });

            window.addEventListener('pointerup', () => {
                this.isDragging = false;
            });

            canvas.addEventListener('wheel', (e) => {
                e.preventDefault();
                const zoomFactor = 1.2;
                if (e.deltaY < 0) {
                    this.targetCamera.zoom *= zoomFactor;
                } else {
                    this.targetCamera.zoom /= zoomFactor;
                }
                this.targetCamera.zoom = Math.max(0.5, Math.min(this.targetCamera.zoom, 5.0));
                this.updateZoomLabel();
            }, { passive: false });

            this.bindToolbarButtons();
        }

        bindToolbarButtons() {
            const btnZoomIn = document.getElementById('btnZoomIn');
            const btnZoomOut = document.getElementById('btnZoomOut');
            const btnFitCity = document.getElementById('btnFitCity');
            const btnResetCamera = document.getElementById('btnResetCamera');
            const btnCenterAgent = document.getElementById('btnCenterAgent');
            const btnCenterMission = document.getElementById('btnCenterMission');
            const btnFollowAgent = document.getElementById('btnFollowAgent');
            const btnFollowMission = document.getElementById('btnFollowMission');
            const btnTogglePhotoMode = document.getElementById('btnTogglePhotoMode');
            const btnViewMission = document.getElementById('btnViewMission');

            btnZoomIn?.addEventListener('click', () => { this.zoomBy(1.25); });
            btnZoomOut?.addEventListener('click', () => { this.zoomBy(0.8); });
            btnFitCity?.addEventListener('click', () => { this.fitCity(); });
            btnResetCamera?.addEventListener('click', () => { this.resetCamera(); });

            btnCenterAgent?.addEventListener('click', () => {
                if (this.agents.size > 0) {
                    const firstAgent = this.agents.values().next().value;
                    if (firstAgent) {
                        this.targetCamera.x = firstAgent.sprite.x;
                        this.targetCamera.y = firstAgent.sprite.y;
                        this.targetCamera.zoom = 2.4;
                        this.updateZoomLabel();
                    }
                }
            });

            btnCenterMission?.addEventListener('click', () => {
                this.unfollow();
                const pos = gridToScreen(14, 19);
                this.targetCamera.x = pos.x;
                this.targetCamera.y = pos.y;
                this.targetCamera.zoom = 2.2;
                this.updateZoomLabel();
            });

            btnFollowAgent?.addEventListener('click', () => {
                if (this.followedAgentId) {
                    this.unfollow();
                    btnFollowAgent.classList.remove('active');
                } else if (this.agents.size > 0) {
                    const agentId = this.agents.keys().next().value;
                    this.followAgent(agentId);
                    btnFollowAgent.classList.add('active');
                }
            });

            btnFollowMission?.addEventListener('click', () => {
                this.centerMission();
            });

            btnTogglePhotoMode?.addEventListener('click', () => {
                this.togglePhotoMode();
            });

            btnViewMission?.addEventListener('click', () => {
                if (window.BuildingInteriorSystem?.openMissionModal) {
                    window.BuildingInteriorSystem.openMissionModal();
                } else {
                    window.location.hash = '#operations';
                }
            });
        }

        updateZoomLabel() {
            const lbl = document.getElementById('lblZoomLevel');
            if (lbl) {
                lbl.textContent = `${Math.round(this.targetCamera.zoom * 100)}%`;
            }
        }

        zoomBy(factor) {
            this.targetCamera.zoom = Math.max(0.5, Math.min(this.targetCamera.zoom * factor, 5.0));
            this.updateZoomLabel();
        }

        fitCity() {
            this.unfollow();
            this.targetCamera.x = 0;
            this.targetCamera.y = 0;
            this.targetCamera.zoom = 0.85;
            this.updateZoomLabel();
        }

        resetCamera() {
            this.unfollow();
            const center = gridToScreen(14, 18);
            this.targetCamera.x = center.x;
            this.targetCamera.y = center.y;
            this.targetCamera.zoom = 1.6;
            this.updateZoomLabel();
        }

        centerMission() {
            this.unfollow();
            const pos = gridToScreen(14, 19);
            this.targetCamera.x = pos.x;
            this.targetCamera.y = pos.y;
            this.targetCamera.zoom = 2.4;
            this.updateZoomLabel();
        }

        // --- Follow Agent Engine (Gate 08) ---

        followAgent(agentId, customZoom = null) {
            const agent = this.agents.get(agentId);
            if (!agent) return;

            this.followTarget = agent;
            this.followedAgentId = agentId;
            const targetZoom = customZoom || 2.4;
            this.targetCamera.zoom = targetZoom;
            this.updateZoomLabel();
            this.updateNameplates();

            console.log(`[PixiCityRenderer] Following agent: ${agentId}`);

            document.dispatchEvent(new CustomEvent('fenix:city:follow', {
                detail: { agentId, agent }
            }));

            const btnFollow = document.getElementById('btnFollowAgent');
            if (btnFollow) btnFollow.classList.add('active');
        }

        unfollow() {
            if (this.followedAgentId) {
                console.log(`[PixiCityRenderer] Unfollowing agent: ${this.followedAgentId}`);
                this.followTarget = null;
                this.followedAgentId = null;

                const btnFollow = document.getElementById('btnFollowAgent');
                if (btnFollow) btnFollow.classList.remove('active');

                this.updateNameplates();
                document.dispatchEvent(new CustomEvent('fenix:city:unfollow'));
            }
        }

        updateNameplates() {
            for (const [, agent] of this.agents) {
                if (agent.character?.updateNameplate) {
                    agent.character.updateNameplate(this.camera?.zoom || this.targetCamera?.zoom || 1.5);
                }
            }
        }

        // --- Photo Mode / Pure Game World (Gate 01 / Art Director) ---

        togglePhotoMode(enable) {
            this.isPhotoMode = (enable !== undefined) ? enable : !this.isPhotoMode;
            const body = document.body;
            const container = document.getElementById('wsCityContainer');

            if (this.isPhotoMode) {
                body.classList.add('art-director-photo-mode');
                container?.classList.add('pure-world');
                const btn = document.getElementById('btnTogglePhotoMode');
                if (btn) btn.classList.add('active');
            } else {
                body.classList.remove('art-director-photo-mode');
                container?.classList.remove('pure-world');
                const btn = document.getElementById('btnTogglePhotoMode');
                if (btn) btn.classList.remove('active');
            }

            const legacyCanvas = document.getElementById('cityCanvas');
            if (legacyCanvas) {
                legacyCanvas.style.setProperty('display', 'none', 'important');
                legacyCanvas.style.setProperty('opacity', '0', 'important');
            }

            // Immediately update character nameplates
            this.updateNameplates();
            this.resize();
            setTimeout(() => this.resize(), 50);
            setTimeout(() => this.resize(), 150);
        }

        enterPhotoMode() {
            this.togglePhotoMode(true);
        }

        exitPhotoMode() {
            this.togglePhotoMode(false);
        }

        setCamera(x, y, zoom) {
            if (x !== undefined && x !== null) {
                this.camera.x = x;
                this.targetCamera.x = x;
            }
            if (y !== undefined && y !== null) {
                this.camera.y = y;
                this.targetCamera.y = y;
            }
            if (zoom !== undefined && zoom !== null) {
                this.camera.zoom = zoom;
                this.targetCamera.zoom = zoom;
            }
            this.updateZoomLabel();
            this.updateNameplates();
            if (this.app?.screen && this.worldContainer) {
                const screenPosX = this.app.screen.width / 2 - this.camera.x * this.camera.zoom;
                const screenPosY = this.app.screen.height / 2 - this.camera.y * this.camera.zoom;
                this.worldContainer.position.set(screenPosX, screenPosY);
                this.worldContainer.scale.set(this.camera.zoom);
                if (window.fenixInterior && window.fenixInterior.container) {
                    window.fenixInterior.container.position.set(screenPosX, screenPosY);
                    window.fenixInterior.container.scale.set(this.camera.zoom);
                }
            }
        }

        animateCameraTo(x, y, zoom, durationMs = 500) {
            this.targetCamera.x = x;
            this.targetCamera.y = y;
            this.targetCamera.zoom = zoom;
            this.updateZoomLabel();
        }

        reparent(newContainer) {
            if (!this.app || !this.app.canvas || !newContainer) return;
            if (!newContainer.contains(this.app.canvas)) {
                newContainer.appendChild(this.app.canvas);
            }
            this.container = newContainer;
            this.app.resizeTo = newContainer;
            const legacyCanvas = document.getElementById('cityCanvas');
            if (legacyCanvas) {
                legacyCanvas.style.setProperty('display', 'none', 'important');
            }
            setTimeout(() => this.resize(), 50);
        }

        resize() {
            if (!this.app) return;
            if (this.isPhotoMode) {
                this.app.renderer.resize(window.innerWidth, window.innerHeight);
            } else {
                this.app.resize();
            }
        }

        update(ticker) {
            const dtMs = ticker.deltaTime * 16.66;
            const dt = ticker.deltaTime * 0.1;

            if (this.followTarget && this.followTarget.sprite) {
                this.targetCamera.x = this.followTarget.sprite.x;
                this.targetCamera.y = this.followTarget.sprite.y;
            }

            this.camera.x += (this.targetCamera.x - this.camera.x) * dt;
            this.camera.y += (this.targetCamera.y - this.camera.y) * dt;
            this.camera.zoom += (this.targetCamera.zoom - this.camera.zoom) * dt;

            if (this.app?.screen && this.worldContainer) {
                const screenPosX = this.app.screen.width / 2 - this.camera.x * this.camera.zoom;
                const screenPosY = this.app.screen.height / 2 - this.camera.y * this.camera.zoom;

                this.worldContainer.position.set(screenPosX, screenPosY);
                this.worldContainer.scale.set(this.camera.zoom);

                if (window.fenixInterior && window.fenixInterior.container) {
                    window.fenixInterior.container.position.set(screenPosX, screenPosY);
                    window.fenixInterior.container.scale.set(this.camera.zoom);
                }
            }

            // Update all characters (animation cycle, pathfinding, nameplate zoom LOD)
            for (const [, agent] of this.agents) {
                if (agent.character && agent.character.update) {
                    agent.character.update(dtMs, this.camera.zoom);
                }
            }

            this.sortedLayer.sortChildren();
        }
    }

    // Export to window
    window.PixiCityRenderer = PixiCityRenderer;
    window.gridToScreen = gridToScreen;
    window.screenToGrid = screenToGrid;

})();
