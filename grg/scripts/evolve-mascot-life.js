const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../public/fenix-mascot-sidebar.js');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Update mascot HTML inside ensureDOMElements
const oldMascotHTML = `<div class="ffm-tooltip">Fênix OS · Clique para abrir o chat</div>
        <div class="ffm-badge" id="ffmBadge">1</div>
        <div class="ffm-pod">
          <div class="ffm-sprite">
            <div class="ffm-body">
              <div class="ffm-visor">
                <span class="ffm-eye" id="ffmEyeLeft">^</span>
                <span class="ffm-eye" id="ffmEyeRight">^</span>
              </div>
            </div>
            <div class="ffm-hands">
              <div class="ffm-hand"></div>
              <div class="ffm-hand"></div>
            </div>
            <div class="ffm-laptop">
              <div class="ffm-laptop-screen">&gt;_</div>
            </div>
          </div>
        </div>`;

const newMascotHTML = `<div class="ffm-tooltip">Fênix Life · Companion de IA Ativo</div>
        <div class="ffm-status-capsule" id="ffmStatusCapsule">
          <span class="ffm-pulse-dot"></span>
          <span id="ffmStatusLabel">ONLINE</span>
        </div>
        <div class="ffm-badge" id="ffmBadge" style="display:none;">1</div>
        <div class="ffm-pod">
          <div class="ffm-sprite">
            <div class="ffm-body">
              <div class="ffm-visor">
                <span class="ffm-eye" id="ffmEyeLeft">^</span>
                <span class="ffm-eye" id="ffmEyeRight">^</span>
              </div>
            </div>
            <div class="ffm-hands">
              <div class="ffm-hand"></div>
              <div class="ffm-hand"></div>
            </div>
            <div class="ffm-laptop">
              <div class="ffm-laptop-screen">&gt;_</div>
            </div>
          </div>
        </div>
        <div class="ffm-quick-actions" id="ffmQuickActions">
          <button type="button" class="ffm-action-btn ffm-btn-voice" id="ffmBtnVoice" title="Conversar por Voz (Microfone)"><i class="ph-bold ph-microphone"></i></button>
          <button type="button" class="ffm-action-btn ffm-btn-chat" id="ffmBtnChat" title="Abrir Chat Copilot"><i class="ph-bold ph-chat-teardrop-dots"></i></button>
          <button type="button" class="ffm-action-btn ffm-btn-immersive" id="ffmBtnImmersive" title="Modo Imersivo Fênix Life 3D"><i class="ph-bold ph-sparkle"></i></button>
        </div>`;

if (code.includes('ffm-tooltip') && !code.includes('ffm-status-capsule')) {
  code = code.replace(oldMascotHTML, newMascotHTML);
  console.log('Replaced mascot pod HTML with Fênix Life compact markup');
}

// 2. Add Immersive and Safety modals inside ensureDOMElements if not present
if (!code.includes('fenixImmersiveMascotModal')) {
  const modalInjection = `
    // 4. Modal Imersivo Fênix Life (#fenixImmersiveMascotModal)
    if (!document.getElementById('fenixImmersiveMascotModal')) {
      const fim = document.createElement('div');
      fim.id = 'fenixImmersiveMascotModal';
      fim.className = 'fenix-immersive-mascot-modal hidden';
      fim.setAttribute('role', 'dialog');
      fim.setAttribute('aria-modal', 'true');
      fim.setAttribute('aria-label', 'Fênix Life Imersivo');
      fim.innerHTML = \`
        <div class="fim-header">
          <div class="fim-brand">
            <i class="ph-bold ph-robot" style="color:#00D9FF; font-size:22px;"></i>
            <strong>FÊNIX LIFE</strong>
            <span id="fimModeBadge">VOZ &bull; HOLOGRÁFICO 3D</span>
          </div>
          <div style="display:flex; align-items:center; gap:12px;">
            <div id="fimVoiceStatusCapsule" style="font-size:11px; font-family:var(--fenix-font-mono, monospace); color:#00F5A0; display:flex; align-items:center; gap:6px;">
              <span style="width:7px; height:7px; border-radius:50%; background:#00F5A0; display:inline-block; box-shadow:0 0 8px #00F5A0;"></span>
              <span id="fimVoiceStatusLabel">ONLINE</span>
            </div>
            <button type="button" id="fimBtnCloseImmersive" class="fnx-btn-pill" style="border-color:rgba(0,217,255,0.4); color:#00D9FF; cursor:pointer;" title="Retornar à Cidade">
              <i class="ph-bold ph-arrow-u-up-left"></i> Retornar à Cidade
            </button>
          </div>
        </div>
        <div class="fim-body">
          <div class="fim-canvas-stage">
            <canvas id="fenixLife3DCanvas" width="440" height="440"></canvas>
            <canvas id="fimSpectrumCanvas" class="fim-spectrum-canvas" width="480" height="480"></canvas>
          </div>
          <div class="fim-subtitles-bar" id="fimSubtitlesBar">
            <span id="fimSubtitleText">Olá! Sou o Fênix Life. Como posso apoiar você hoje na Cidade e nos Projetos?</span>
          </div>
        </div>
        <div class="fim-controls-bar">
          <button type="button" class="fim-mic-btn" id="fimMicBtn" title="Ativar Microfone / Falar">
            <i class="ph-bold ph-microphone"></i>
          </button>
          <input type="text" class="fim-text-input" id="fimTextInput" placeholder="Digite uma instrução ou fale pelo microfone…" />
          <button type="button" class="fnx-btn-action" id="fimSendBtn" style="height:40px; padding:0 18px;">
            <i class="ph-bold ph-paper-plane-right"></i> Enviar
          </button>
        </div>
      \`;
      document.body.appendChild(fim);
    }

    // 5. Modal de Confirmação de Ação Crítica (#fenixCriticalSafetyModal)
    if (!document.getElementById('fenixCriticalSafetyModal')) {
      const fcsm = document.createElement('div');
      fcsm.id = 'fenixCriticalSafetyModal';
      fcsm.className = 'fenix-critical-safety-modal hidden';
      fcsm.setAttribute('role', 'alertdialog');
      fcsm.setAttribute('aria-modal', 'true');
      fcsm.innerHTML = \`
        <div class="fcsm-card">
          <div class="fcsm-header">
            <i class="ph-bold ph-warning-octagon" style="font-size:24px;"></i>
            <span>CONFIRMAÇÃO DE AÇÃO CRÍTICA</span>
          </div>
          <div style="font-size:13px; color:#CBD5E1; line-height:1.5;" id="fcsmMessage">
            Uma ação com potencial impacto operacional foi solicitada. Deseja realmente prosseguir?
          </div>
          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:8px;">
            <button type="button" class="fnx-btn-action" id="fcsmBtnCancel" style="background:rgba(255,255,255,0.08);">Cancelar</button>
            <button type="button" class="fnx-btn-action" id="fcsmBtnConfirm" style="background:#EF4444; border-color:#F87171; color:#fff;">Confirmar Execução</button>
          </div>
        </div>
      \`;
      document.body.appendChild(fcsm);
    }
`;
  code = code.replace(
    /modalEl = document\.getElementById\('fenixAgentDossierModal'\);\s*\}/,
    `modalEl = document.getElementById('fenixAgentDossierModal');\n    }\n${modalInjection}`
  );
  console.log('Injected Fênix Life modals into ensureDOMElements');
}

// 3. Replace MascotController.setMood with 10 states
const oldSetMood = `    setMood(mood) {
      state.mascotMood = mood;
      const leftEye = document.getElementById('ffmEyeLeft');
      const rightEye = document.getElementById('ffmEyeRight');
      if (!mascotEl || !leftEye || !rightEye) return;

      mascotEl.classList.remove('working', 'error', 'success');

      switch (mood) {
        case 'thinking':
          leftEye.textContent = 'o';
          rightEye.textContent = 'o';
          break;
        case 'working':
          leftEye.textContent = '>';
          rightEye.textContent = '<';
          mascotEl.classList.add('working');
          break;
        case 'success':
          leftEye.textContent = '*';
          rightEye.textContent = '*';
          mascotEl.classList.add('success');
          setTimeout(() => this.setMood('idle'), 3500);
          break;
        case 'error':
          leftEye.textContent = '!';
          rightEye.textContent = '!';
          mascotEl.classList.add('error');
          setTimeout(() => this.setMood('idle'), 4000);
          break;
        case 'idle':
        default:
          leftEye.textContent = '^';
          rightEye.textContent = '^';
          break;
      }
    },`;

const newSetMood = `    setMood(mood) {
      state.mascotMood = mood;
      const leftEye = document.getElementById('ffmEyeLeft');
      const rightEye = document.getElementById('ffmEyeRight');
      const statusLabel = document.getElementById('ffmStatusLabel');
      const fimStatus = document.getElementById('fimVoiceStatusLabel');
      if (!mascotEl) return;

      mascotEl.setAttribute('data-state', mood);
      mascotEl.classList.remove('working', 'error', 'success');

      let lChar = '^', rChar = '^', label = 'ONLINE';
      switch (mood) {
        case 'listening':
          lChar = 'o'; rChar = 'o'; label = 'OUVINDO';
          break;
        case 'thinking':
          lChar = '~'; rChar = '~'; label = 'PENSANDO';
          break;
        case 'speaking':
          lChar = '^'; rChar = '^'; label = 'FALANDO';
          break;
        case 'explaining':
          lChar = '•'; rChar = '•'; label = 'EXPLICANDO';
          break;
        case 'working':
          lChar = '>'; rChar = '<'; label = 'TRABALHANDO';
          mascotEl.classList.add('working');
          break;
        case 'success':
          lChar = '*'; rChar = '*'; label = 'SUCESSO';
          mascotEl.classList.add('success');
          setTimeout(() => this.setMood('idle'), 3500);
          break;
        case 'warning':
          lChar = '!'; rChar = '!'; label = 'ALERTA';
          setTimeout(() => this.setMood('idle'), 4000);
          break;
        case 'error':
          lChar = '×'; rChar = '×'; label = 'FALHA';
          mascotEl.classList.add('error');
          setTimeout(() => this.setMood('idle'), 4000);
          break;
        case 'meeting':
          lChar = '>'; rChar = '<'; label = 'REUNIÃO';
          break;
        case 'offline':
          lChar = '-'; rChar = '-'; label = 'OFFLINE';
          break;
        case 'idle':
        default:
          lChar = '^'; rChar = '^'; label = 'ONLINE';
          break;
      }

      if (leftEye) leftEye.textContent = lChar;
      if (rightEye) rightEye.textContent = rChar;
      if (statusLabel) statusLabel.textContent = label;
      if (fimStatus) fimStatus.textContent = label;
    },

    initEyeTracking() {
      document.addEventListener('mousemove', (e) => {
        if (!mascotEl || state.isOpen) return;
        const rect = mascotEl.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = Math.max(-3, Math.min(3, (e.clientX - centerX) / 80));
        const dy = Math.max(-2, Math.min(2, (e.clientY - centerY) / 80));
        const leftEye = document.getElementById('ffmEyeLeft');
        const rightEye = document.getElementById('ffmEyeRight');
        if (leftEye && rightEye && state.mascotMood === 'idle') {
          leftEye.style.transform = \`translate(\${dx}px, \${dy}px)\`;
          rightEye.style.transform = \`translate(\${dx}px, \${dy}px)\`;
        }
      });
    },

    initBlinking() {
      setInterval(() => {
        if (!mascotEl || state.isOpen || state.mascotMood !== 'idle') return;
        const leftEye = document.getElementById('ffmEyeLeft');
        const rightEye = document.getElementById('ffmEyeRight');
        if (!leftEye || !rightEye) return;
        const prevL = leftEye.textContent;
        const prevR = rightEye.textContent;
        leftEye.textContent = '-';
        rightEye.textContent = '-';
        setTimeout(() => {
          if (state.mascotMood === 'idle') {
            leftEye.textContent = prevL;
            rightEye.textContent = prevR;
          }
        }, 180);
      }, Math.floor(Math.random() * 2500) + 3500);
    },`;

if (!code.includes('initEyeTracking()')) {
  code = code.replace(oldSetMood, newSetMood);
  console.log('Updated MascotController with 10 states, eye tracking, and blinking');
}

// 4. Implement FenixLifePlatform engine
const fenixLifeEngineCode = `
  // ── FÊNIX LIFE — COMPANION VIVO & PLATAFORMA DE VOZ 3D ──
  const FenixLifePlatform = {
    isImmersiveOpen: false,
    isListening: false,
    isSpeaking: false,
    currentViseme: 'closed',
    recognition: null,
    threeHead: null,
    speechRate: 1.0,

    init() {
      this.bindCompactQuickActions();
      this.bindImmersiveControls();
      this.initSpeechRecognition();
    },

    bindCompactQuickActions() {
      const btnVoice = document.getElementById('ffmBtnVoice');
      const btnChat = document.getElementById('ffmBtnChat');
      const btnImmersive = document.getElementById('ffmBtnImmersive');

      if (btnVoice) {
        btnVoice.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openImmersive();
          setTimeout(() => this.listen(), 400);
        });
      }

      if (btnChat) {
        btnChat.addEventListener('click', (e) => {
          e.stopPropagation();
          MascotController.toggle();
        });
      }

      if (btnImmersive) {
        btnImmersive.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openImmersive();
        });
      }
    },

    bindImmersiveControls() {
      const btnClose = document.getElementById('fimBtnCloseImmersive');
      const btnMic = document.getElementById('fimMicBtn');
      const input = document.getElementById('fimTextInput');
      const btnSend = document.getElementById('fimSendBtn');
      const btnCancelSafety = document.getElementById('fcsmBtnCancel');

      if (btnClose) {
        btnClose.addEventListener('click', () => this.closeImmersive());
      }

      if (btnMic) {
        btnMic.addEventListener('click', () => this.toggleListening());
      }

      if (btnSend && input) {
        btnSend.addEventListener('click', () => {
          const text = input.value.trim();
          if (text) {
            input.value = '';
            this.handleUserInstruction(text);
          }
        });
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            const text = input.value.trim();
            if (text) {
              input.value = '';
              this.handleUserInstruction(text);
            }
          }
        });
      }

      if (btnCancelSafety) {
        btnCancelSafety.addEventListener('click', () => {
          document.getElementById('fenixCriticalSafetyModal')?.classList.add('hidden');
          MascotController.setMood('idle');
        });
      }
    },

    initSpeechRecognition() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const rec = new SpeechRecognition();
          rec.continuous = false;
          rec.interimResults = false;
          rec.lang = 'pt-BR';

          rec.onstart = () => {
            this.isListening = true;
            document.getElementById('fimMicBtn')?.classList.add('active');
            MascotController.setMood('listening');
          };

          rec.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            this.handleUserInstruction(transcript);
          };

          rec.onerror = (e) => {
            console.warn('[FenixLife] Voice recognition warning:', e.error);
            this.stopListening();
          };

          rec.onend = () => {
            this.stopListening();
          };

          this.recognition = rec;
        } catch (err) {
          console.warn('[FenixLife] SpeechRecognition initialization ignored:', err);
        }
      }
    },

    toggleListening() {
      if (this.isListening) {
        this.stopListening();
      } else {
        this.listen();
      }
    },

    listen() {
      if (this.recognition) {
        try {
          this.recognition.start();
        } catch (_) {
          this.isListening = true;
          document.getElementById('fimMicBtn')?.classList.add('active');
          MascotController.setMood('listening');
        }
      } else {
        // Fallback for environments without microphone access
        this.isListening = true;
        document.getElementById('fimMicBtn')?.classList.add('active');
        MascotController.setMood('listening');
        document.getElementById('fimTextInput')?.focus();
      }
    },

    stopListening() {
      this.isListening = false;
      document.getElementById('fimMicBtn')?.classList.remove('active');
      if (this.recognition) {
        try { this.recognition.stop(); } catch (_) {}
      }
      if (state.mascotMood === 'listening') {
        MascotController.setMood('idle');
      }
    },

    openImmersive() {
      this.isImmersiveOpen = true;
      const modal = document.getElementById('fenixImmersiveMascotModal');
      if (modal) modal.classList.remove('hidden');

      MascotController.setMood('idle');
      this.initThreeHead();
      this.initSpectrumCanvas();
    },

    closeImmersive() {
      this.isImmersiveOpen = false;
      this.stopListening();
      const modal = document.getElementById('fenixImmersiveMascotModal');
      if (modal) modal.classList.add('hidden');
      MascotController.setMood('idle');
    },

    initThreeHead() {
      if (this.threeHead) return;
      const canvas = document.getElementById('fenixLife3DCanvas');
      if (!canvas || !window.THREE) return;

      const THREE = window.THREE;
      const width = canvas.clientWidth || 440;
      const height = canvas.clientHeight || 440;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
      camera.position.set(0, 0, 7.5);

      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      // Group holding the entire head
      const headGroup = new THREE.Group();
      scene.add(headGroup);

      // Visor / Helmet Base
      const helmetGeo = new THREE.SphereGeometry(1.8, 32, 24);
      helmetGeo.scale(1, 1.15, 0.95);
      const helmetMat = new THREE.MeshStandardMaterial({
        color: 0x050c18,
        metalness: 0.92,
        roughness: 0.18,
        emissive: 0x001525,
        wireframe: false
      });
      const helmet = new THREE.Mesh(helmetGeo, helmetMat);
      headGroup.add(helmet);

      // Curved Glass Visor (Cyan Glow)
      const visorGeo = new THREE.CylinderGeometry(1.4, 1.45, 0.95, 32, 1, false, 0, Math.PI);
      visorGeo.rotateY(-Math.PI / 2);
      const visorMat = new THREE.MeshPhysicalMaterial({
        color: 0x00d9ff,
        metalness: 0.8,
        roughness: 0.1,
        transmission: 0.4,
        transparent: true,
        opacity: 0.85,
        emissive: 0x003344
      });
      const visor = new THREE.Mesh(visorGeo, visorMat);
      visor.position.set(0, 0.15, 0.65);
      headGroup.add(visor);

      // Glowing Eyes
      const eyeGeo = new THREE.PlaneGeometry(0.35, 0.12);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x00f5a0, side: THREE.DoubleSide });
      const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
      const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
      leftEye.position.set(-0.55, 0.25, 1.82);
      rightEye.position.set(0.55, 0.25, 1.82);
      headGroup.add(leftEye);
      headGroup.add(rightEye);

      // Viseme Mouth Mesh (Morphable scale)
      const mouthGeo = new THREE.PlaneGeometry(0.65, 0.18);
      const mouthMat = new THREE.MeshBasicMaterial({ color: 0x00d9ff, side: THREE.DoubleSide });
      const mouth = new THREE.Mesh(mouthGeo, mouthMat);
      mouth.position.set(0, -0.32, 1.82);
      headGroup.add(mouth);

      // Orbiting Energy Ring (Antenna Array)
      const ringGeo = new THREE.TorusGeometry(2.35, 0.035, 16, 64);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x00d9ff, transparent: true, opacity: 0.65 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2.3;
      headGroup.add(ring);

      // Lighting
      const ambLight = new THREE.AmbientLight(0xffffff, 0.8);
      scene.add(ambLight);

      const cyanPoint = new THREE.PointLight(0x00d9ff, 2.5, 15);
      cyanPoint.position.set(0, 1.5, 4);
      scene.add(cyanPoint);

      const greenPoint = new THREE.PointLight(0x00f5a0, 1.8, 12);
      greenPoint.position.set(-3, -2, 2);
      scene.add(greenPoint);

      let mouseTargetX = 0, mouseTargetY = 0;
      document.addEventListener('mousemove', (e) => {
        if (!this.isImmersiveOpen) return;
        mouseTargetX = (e.clientX / window.innerWidth - 0.5) * 0.7;
        mouseTargetY = (e.clientY / window.innerHeight - 0.5) * 0.5;
      });

      let clock = 0;
      const animate = () => {
        if (!this.isImmersiveOpen) {
          requestAnimationFrame(animate);
          return;
        }
        clock += 0.025;

        // Breathing & Floating
        headGroup.position.y = Math.sin(clock * 1.5) * 0.08;
        headGroup.rotation.x += (mouseTargetY - headGroup.rotation.x) * 0.08;
        headGroup.rotation.y += (mouseTargetX - headGroup.rotation.y) * 0.08;

        // Orbit ring rotation
        ring.rotation.z += 0.008;

        // Viseme Mouth Morph
        const v = this.currentViseme;
        if (v === 'open-aa') {
          mouth.scale.set(1.0, 1.1, 1);
        } else if (v === 'open-oo') {
          mouth.scale.set(0.55, 0.8, 1);
        } else if (v === 'wide') {
          mouth.scale.set(1.4, 0.45, 1);
        } else if (v === 'teeth') {
          mouth.scale.set(1.2, 0.25, 1);
        } else { // closed
          mouth.scale.set(0.7, 0.1, 1);
        }

        renderer.render(scene, camera);
        requestAnimationFrame(animate);
      };
      animate();

      this.threeHead = { scene, camera, renderer, headGroup, mouth, leftEye, rightEye };
    },

    initSpectrumCanvas() {
      const canvas = document.getElementById('fimSpectrumCanvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;

      let angle = 0;
      const renderSpectrum = () => {
        if (!this.isImmersiveOpen) return;
        ctx.clearRect(0, 0, width, height);
        angle += 0.03;

        const isBusy = (state.mascotMood === 'speaking' || state.mascotMood === 'listening' || state.mascotMood === 'thinking');
        const count = 3;

        for (let i = 0; i < count; i++) {
          const baseRadius = 140 + i * 28;
          const pulse = isBusy ? Math.sin(angle * 3 + i) * 14 : Math.sin(angle + i) * 4;
          const r = Math.max(10, baseRadius + pulse);

          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.strokeStyle = i === 0 ? 'rgba(0, 217, 255, 0.45)' : (i === 1 ? 'rgba(0, 245, 160, 0.35)' : 'rgba(168, 85, 247, 0.25)');
          ctx.lineWidth = isBusy ? 2.5 : 1.2;
          ctx.stroke();
        }

        requestAnimationFrame(renderSpectrum);
      };
      renderSpectrum();
    },

    setViseme(viseme) {
      this.currentViseme = viseme;
    },

    async handleUserInstruction(text) {
      if (!text || !text.trim()) return;
      const trimmed = text.trim();

      // Show in subtitle
      const sub = document.getElementById('fimSubtitleText');
      if (sub) sub.textContent = \`" \${trimmed} "\`;

      // Check critical action security gate
      const criticalKeywords = ['deploy', 'shutdown', 'reboot', 'apagar', 'deletar', 'destruir', 'purge', 'kill', 'excluir', 'formatação'];
      const isCritical = criticalKeywords.some(kw => trimmed.toLowerCase().includes(kw));

      if (isCritical) {
        this.openSafetyModal(trimmed, () => this.processInstruction(trimmed));
        return;
      }

      await this.processInstruction(trimmed);
    },

    openSafetyModal(actionText, confirmFn) {
      const modal = document.getElementById('fenixCriticalSafetyModal');
      const msg = document.getElementById('fcsmMessage');
      const btnConfirm = document.getElementById('fcsmBtnConfirm');

      if (msg) {
        msg.innerHTML = \`Atenção: A instrução <b>"\${esc(actionText)}"</b> possui potencial impacto operacional crítico.<br/>Deseja confirmar a execução no Fênix OS?\`;
      }

      if (btnConfirm) {
        btnConfirm.onclick = () => {
          modal?.classList.add('hidden');
          MascotController.setMood('success');
          confirmFn();
        };
      }

      if (modal) modal.classList.remove('hidden');
      MascotController.setMood('warning');
    },

    async processInstruction(promptText) {
      MascotController.setMood('thinking');
      const sub = document.getElementById('fimSubtitleText');
      if (sub) sub.textContent = 'Processando instrução com o cérebro central Fênix…';

      try {
        const res = await authedFetch('/api/voice/chat', {
          method: 'POST',
          body: JSON.stringify({ message: promptText })
        });
        const data = await res.json();
        const reply = data.reply || data.response || 'Comando processado com sucesso pelo ecossistema Fênix.';
        this.speak(reply);
      } catch (err) {
        console.warn('[FenixLife] Fallback conversation:', err);
        this.speak(\`Compreendido. A instrução foi roteada para execução: "\${promptText}".\`);
      }
    },

    speak(text) {
      if (!text) return;
      this.isSpeaking = true;
      MascotController.setMood('speaking');

      const words = text.split(/\\s+/);
      const sub = document.getElementById('fimSubtitleText');
      if (sub) {
        sub.innerHTML = words.map(w => \`<span class="sub-word">\${esc(w)}</span>\`).join(' ');
      }

      const wordSpans = sub ? sub.querySelectorAll('.sub-word') : [];
      let currentWordIdx = 0;

      const visemeSequence = ['open-aa', 'teeth', 'open-oo', 'wide', 'closed'];

      // Web Speech synthesis
      if (window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'pt-BR';
          utterance.rate = 1.05;

          utterance.onboundary = (e) => {
            if (e.name === 'word' && wordSpans[currentWordIdx]) {
              wordSpans.forEach(sp => sp.classList.remove('active'));
              wordSpans[currentWordIdx].classList.add('active');
              const v = visemeSequence[currentWordIdx % visemeSequence.length];
              this.setViseme(v);
              currentWordIdx++;
            }
          };

          utterance.onend = () => {
            this.finishSpeaking();
          };

          utterance.onerror = () => {
            this.finishSpeaking();
          };

          window.speechSynthesis.speak(utterance);
        } catch (_) {
          this.simulateSpeakingSequence(wordSpans);
        }
      } else {
        this.simulateSpeakingSequence(wordSpans);
      }
    },

    simulateSpeakingSequence(wordSpans) {
      let idx = 0;
      const visemeSequence = ['open-aa', 'teeth', 'open-oo', 'wide', 'closed'];
      const interval = setInterval(() => {
        if (idx >= wordSpans.length) {
          clearInterval(interval);
          this.finishSpeaking();
          return;
        }
        wordSpans.forEach(sp => sp.classList.remove('active'));
        if (wordSpans[idx]) wordSpans[idx].classList.add('active');
        this.setViseme(visemeSequence[idx % visemeSequence.length]);
        idx++;
      }, 260);
    },

    finishSpeaking() {
      this.isSpeaking = false;
      this.setViseme('closed');
      MascotController.setMood('idle');
      const wordSpans = document.querySelectorAll('.fim-subtitles-bar .sub-word');
      wordSpans.forEach(sp => sp.classList.remove('active'));
    }
  };
`;

if (!code.includes('FenixLifePlatform')) {
  // Inject FenixLifePlatform before init()
  code = code.replace(
    /function init\(\)\s*\{/,
    `${fenixLifeEngineCode}\n\n  function init() {`
  );
  console.log('Injected FenixLifePlatform into fenix-mascot-sidebar.js');
}

// 5. Expose window.FenixLife in init()
if (!code.includes('window.FenixLife =')) {
  code = code.replace(
    /window\.FenixMascotController = MascotController;/,
    `window.FenixMascotController = MascotController;
    window.FenixLife = FenixLifePlatform;
    MascotController.initEyeTracking();
    MascotController.initBlinking();
    FenixLifePlatform.init();`
  );
  console.log('Exposed window.FenixLife in init()');
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('Saved fenix-mascot-sidebar.js successfully.');
