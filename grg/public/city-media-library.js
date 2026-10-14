'use strict';

(function initializeCityMediaLibrary() {
  const byId = (id) => document.getElementById(id);
  const panel = byId('fenixCityMediaPanel');
  if (!panel) return;

  const searchForm = byId('fenixCityMediaSearch');
  const status = byId('fenixCityMediaStatus');
  const resultList = byId('fenixCityMediaResults');
  const savedList = byId('fenixCityMediaSaved');
  const searchButton = searchForm.querySelector('button[type="submit"]');

  async function requestJson(url, options = {}) {
    const request = window.fenixFetch || fetch;
    const response = await request(url, { credentials: 'same-origin', ...options }, 'city-media-library');
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error?.message || body.error || `Falha HTTP ${response.status}`);
    return body;
  }

  function setStatus(message, state = 'neutral') {
    status.textContent = message;
    status.dataset.state = state;
  }

  function showEmpty(container, message) {
    container.replaceChildren();
    const empty = document.createElement('div');
    empty.className = 'fenix-city-media-empty';
    empty.textContent = message;
    container.append(empty);
  }

  function makePreview(item) {
    if (item.type === 'video') {
      const video = document.createElement('video');
      video.className = 'fenix-city-media-video';
      video.controls = true;
      video.preload = 'none';
      video.setAttribute('aria-label', `Prévia: ${item.title || 'vídeo'}`);
      video.src = item.url;
      if (item.thumbnailUrl) video.poster = item.thumbnailUrl;
      return video;
    }
    const image = document.createElement('img');
    image.className = 'fenix-city-media-preview';
    image.loading = 'lazy';
    image.alt = item.title || 'Imagem da busca';
    image.src = item.thumbnailUrl || item.url;
    image.referrerPolicy = 'no-referrer';
    return image;
  }

  function mediaCard(item, { saved = false } = {}) {
    const card = document.createElement('article');
    card.className = 'fenix-city-media-card';
    card.append(makePreview(item));
    const meta = document.createElement('div');
    meta.className = 'fenix-city-media-meta';
    const name = document.createElement('span');
    name.className = 'fenix-city-media-name';
    name.textContent = item.title || item.sourceId || 'Ativo sem título';
    const credit = document.createElement('span');
    credit.className = 'fenix-city-media-credit';
    credit.textContent = [item.source || 'Fonte externa', item.metadata?.license, item.metadata?.artist].filter(Boolean).join(' · ');
    const actions = document.createElement('div');
    actions.className = 'fenix-city-media-actions';
    const sourceLink = document.createElement('a');
    sourceLink.href = item.pageUrl || item.url;
    sourceLink.target = '_blank';
    sourceLink.rel = 'noopener noreferrer';
    sourceLink.textContent = 'Fonte';
    actions.append(sourceLink);
    if (!saved) {
      const save = document.createElement('button');
      save.type = 'button';
      save.textContent = 'Adicionar à Cidade';
      save.addEventListener('click', async () => {
        save.disabled = true;
        try {
          const response = await requestJson('/api/media/assets', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              sourceId: item.id, type: item.type, source: item.source,
              title: item.title, url: item.url, thumbnail: item.thumbnailUrl,
              metadata: { ...item.metadata, pageUrl: item.pageUrl },
            }),
          });
          save.textContent = response.created ? 'Registrado' : 'Já registrado';
          setStatus(response.created ? 'Ativo registrado e evento enviado para o mundo.' : 'Este ativo já estava registrado.', 'success');
          await loadSaved();
        } catch (error) {
          save.disabled = false;
          setStatus(error.message, 'error');
        }
      });
      actions.append(save);
    } else {
      const added = document.createElement('button');
      added.type = 'button';
      added.disabled = true;
      added.textContent = 'Registrado';
      actions.append(added);
    }
    meta.append(name, credit, actions);
    card.append(meta);
    return card;
  }

  async function loadSaved() {
    try {
      const response = await requestJson('/api/media/assets?limit=40');
      if (!response.assets?.length) return showEmpty(savedList, 'Nenhum ativo foi registrado nesta Cidade.');
      savedList.replaceChildren(...response.assets.map((asset) => mediaCard({
        ...asset, pageUrl: asset.metadata?.pageUrl, thumbnailUrl: asset.thumbnail,
      }, { saved: true })));
    } catch (error) {
      showEmpty(savedList, `Falha ao carregar ativos: ${error.message}`);
    }
  }

  function openPanel() {
    panel.hidden = false;
    byId('btnCityMediaLibrary')?.setAttribute('aria-expanded', 'true');
    loadSaved();
    byId('fenixCityMediaQuery')?.focus();
  }

  function closePanel() {
    panel.hidden = true;
    byId('btnCityMediaLibrary')?.setAttribute('aria-expanded', 'false');
    byId('btnCityMediaLibrary')?.focus();
  }

  byId('btnCityMediaLibrary')?.addEventListener('click', openPanel);
  byId('fenixCityMediaClose')?.addEventListener('click', closePanel);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !panel.hidden) closePanel(); });
  searchForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const query = byId('fenixCityMediaQuery').value.trim();
    const type = byId('fenixCityMediaType').value;
    if (query.length < 2) return setStatus('A busca precisa ter pelo menos 2 caracteres.', 'error');
    searchButton.disabled = true;
    setStatus('Consultando Wikimedia Commons…');
    showEmpty(resultList, 'Carregando resultados da fonte pública…');
    try {
      const params = new URLSearchParams({ query, type, limit: '8' });
      const response = await requestJson(`/api/media/search?${params}`);
      if (!response.items?.length) {
        showEmpty(resultList, 'A fonte não encontrou mídia compatível com essa busca.');
        setStatus(`Busca concluída em ${response.source}; nenhum resultado compatível.`, 'neutral');
      } else {
        resultList.replaceChildren(...response.items.map((item) => mediaCard(item)));
        setStatus(`${response.items.length} resultado(s) reais de ${response.source}${response.cached ? ' · cache recente' : ''}.`, 'success');
      }
    } catch (error) {
      showEmpty(resultList, 'A busca não foi concluída. Tente novamente quando a fonte estiver disponível.');
      setStatus(error.message, 'error');
    } finally {
      searchButton.disabled = false;
    }
  });

  showEmpty(resultList, 'Busque um termo para ver prévias reais.');
  showEmpty(savedList, 'Os ativos registrados aparecerão aqui.');
})();
