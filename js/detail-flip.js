/* =========================================================
   ANIMATION "FLIP & GROW" carte -> fenêtre détail
   (test initial sur l'onglet Découvrir)
   ========================================================= */
let activeFlip = null;

// Mesure la hauteur naturelle du contenu (hors écran, invisible) à la largeur cible,
// pour que la fenêtre s'ajuste au contenu réel plutôt que d'imposer une hauteur fixe.
function measureBackContentHeight(backHtml, width){
  const probe = document.createElement('div');
  probe.style.cssText = `position:fixed;visibility:hidden;top:-9999px;left:-9999px;width:${width}px;box-sizing:border-box;padding:20px;overflow:visible;`;
  probe.innerHTML = backHtml;
  document.body.appendChild(probe);
  const h = probe.scrollHeight;
  probe.remove();
  return h;
}

function startCardFlip(cardEl, backHtml){
  if(activeFlip) return; // une animation à la fois
  const rect = cardEl.getBoundingClientRect();

  const backdrop = document.createElement('div');
  backdrop.className = 'flip-backdrop';
  backdrop.onclick = closeCardFlip;
  document.body.appendChild(backdrop);

  const card = document.createElement('div');
  card.className = 'flip-card';
  card.style.top = rect.top + 'px';
  card.style.left = rect.left + 'px';
  card.style.width = rect.width + 'px';
  card.style.height = rect.height + 'px';
  card.innerHTML = `
    <div class="flip-inner">
      <div class="flip-face front discover-card">${cardEl.innerHTML}</div>
      <div class="flip-face back">${backHtml}</div>
    </div>
  `;
  document.body.appendChild(card);
  cardEl.style.visibility = 'hidden';

  const targetW = Math.min(window.innerWidth - 32, 700);
  const maxH = Math.min(window.innerHeight - 40, window.innerHeight * 0.9);
  const naturalH = measureBackContentHeight(backHtml, targetW);
  const targetH = Math.max(180, Math.min(naturalH, maxH));

  const margin = 16;
  const cardCenterX = rect.left + rect.width / 2;
  const cardCenterY = rect.top + rect.height / 2;
  const maxLeft = Math.max(margin, window.innerWidth - targetW - margin);
  const maxTop = Math.max(margin, window.innerHeight - targetH - margin);
  const targetLeft = Math.min(Math.max(cardCenterX - targetW / 2, margin), maxLeft);
  const targetTop = Math.min(Math.max(cardCenterY - targetH / 2, margin), maxTop);

  // Forcer un reflow avant de changer les valeurs cibles, pour que la transition CSS se déclenche
  card.getBoundingClientRect();

  requestAnimationFrame(()=>{
    backdrop.classList.add('show');
    card.style.top = targetTop + 'px';
    card.style.left = targetLeft + 'px';
    card.style.width = targetW + 'px';
    card.style.height = targetH + 'px';
    card.querySelector('.flip-inner').classList.add('flipped');
  });
  // Filet de sécurité pour Safari iOS : "backface-visibility:hidden" est peu fiable
  // sur les éléments avec "overflow" défini, ce qui peut laisser la face avant
  // visible en miroir. On la masque explicitement une fois le flip terminé.
  const front = card.querySelector('.flip-face.front');
  setTimeout(()=>{ if(front) front.style.visibility = 'hidden'; }, 520);

  activeFlip = { card, backdrop, cardEl, rect };
  document.addEventListener('keydown', flipEscHandler);
}

function closeCardFlip(){
  if(!activeFlip) return;
  const { card, backdrop, cardEl, rect } = activeFlip;
  const front = card.querySelector('.flip-face.front');
  if(front) front.style.visibility = ''; // on la rend de nouveau visible avant de la faire réapparaître en tournant
  card.style.top = rect.top + 'px';
  card.style.left = rect.left + 'px';
  card.style.width = rect.width + 'px';
  card.style.height = rect.height + 'px';
  card.querySelector('.flip-inner').classList.remove('flipped');
  backdrop.classList.remove('show');

  const cleanup = ()=>{
    card.remove();
    backdrop.remove();
    if(cardEl && cardEl.isConnected) cardEl.style.visibility = '';
    document.removeEventListener('keydown', flipEscHandler);
    activeFlip = null;
  };
  card.addEventListener('transitionend', cleanup, { once:true });
  setTimeout(cleanup, 600); // filet de sécurité si transitionend ne se déclenche pas
}

function flipEscHandler(ev){
  if(ev.key === 'Escape') closeCardFlip();
}

/* =========================================================
   FLIP DETAIL (fiches Films / Séries, contenu vivant)
   Réutilise le même principe que le flip Découvrir, mais anime
   un conteneur persistant (#detail-flip-card) dont le contenu
   (#detail-content) continue d'être mis à jour par le code existant
   (renderSerieDetailModal, toggleEpisode, etc.) sans rien casser.
   ========================================================= */
let pendingFlipSourceEl = null; // carte source, posée juste avant l'ouverture
let detailFlipOpen = false;
let detailFlipSourceRect = null;
let detailFlipSourceEl = null;

function handleDetailModalOpen(){
  if(detailFlipOpen){
    // La fiche est déjà ouverte : c'est un re-rendu (coche, accordéon...) → juste un ajustement de taille
    pendingFlipSourceEl = null;
    resizeDetailFlipToContent();
    return;
  }
  const sourceEl = pendingFlipSourceEl;
  pendingFlipSourceEl = null;
  startDetailFlip(sourceEl);
}

function startDetailFlip(sourceEl){
  const card = document.getElementById('detail-flip-card');
  const front = document.getElementById('detail-flip-front');
  const backWrap = document.getElementById('detail-flip-back');
  const inner = document.getElementById('detail-flip-inner');
  const backdrop = document.getElementById('detail-flip-backdrop');

  let rect;
  if(sourceEl){
    rect = sourceEl.getBoundingClientRect();
    front.innerHTML = sourceEl.innerHTML;
    sourceEl.style.visibility = 'hidden';
  } else {
    const w = 120, h = 180;
    rect = { left:(window.innerWidth-w)/2, top:(window.innerHeight-h)/2, width:w, height:h };
    front.innerHTML = '';
  }

  card.style.display = 'block';
  backdrop.style.display = 'block';
  front.style.visibility = ''; // réinitialise un éventuel masquage laissé par une ouverture précédente
  card.style.top = rect.top + 'px';
  card.style.left = rect.left + 'px';
  card.style.width = rect.width + 'px';
  card.style.height = rect.height + 'px';
  inner.classList.remove('flipped');

  card.getBoundingClientRect(); // forcer un reflow avant transition

  const targetW = Math.min(window.innerWidth - 32, 700);
  const naturalH = measureBackContentHeight(backWrap.innerHTML, targetW);
  const maxH = Math.min(window.innerHeight - 40, window.innerHeight * 0.9);
  const targetH = Math.max(180, Math.min(naturalH, maxH));

  const margin = 16;
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const maxLeft = Math.max(margin, window.innerWidth - targetW - margin);
  const maxTop = Math.max(margin, window.innerHeight - targetH - margin);
  const targetLeft = Math.min(Math.max(centerX - targetW / 2, margin), maxLeft);
  const targetTop = Math.min(Math.max(centerY - targetH / 2, margin), maxTop);

  requestAnimationFrame(()=>{
    backdrop.classList.add('show');
    card.style.top = targetTop + 'px';
    card.style.left = targetLeft + 'px';
    card.style.width = targetW + 'px';
    card.style.height = targetH + 'px';
    inner.classList.add('flipped');
  });
  // Filet de sécurité Safari iOS (voir startCardFlip) : masque la face avant
  // une fois le flip terminé, au cas où "backface-visibility" ne suffise pas.
  setTimeout(()=>{ front.style.visibility = 'hidden'; }, 520);

  detailFlipOpen = true;
  detailFlipSourceRect = rect;
  detailFlipSourceEl = sourceEl;
}

function resizeDetailFlipToContent(){
  if(!detailFlipOpen) return;
  const card = document.getElementById('detail-flip-card');
  const backWrap = document.getElementById('detail-flip-back');
  const currentRect = card.getBoundingClientRect();
  const naturalH = measureBackContentHeight(backWrap.innerHTML, currentRect.width);
  const maxH = Math.min(window.innerHeight - 40, window.innerHeight * 0.9);
  const targetH = Math.max(180, Math.min(naturalH, maxH));
  const margin = 16;
  const centerY = currentRect.top + currentRect.height / 2;
  const maxTop = Math.max(margin, window.innerHeight - targetH - margin);
  const targetTop = Math.min(Math.max(centerY - targetH / 2, margin), maxTop);
  card.style.height = targetH + 'px';
  card.style.top = targetTop + 'px';
}

function closeDetailFlip(){
  if(!detailFlipOpen) return;
  flushExtraInfoIfPending();
  const card = document.getElementById('detail-flip-card');
  const front = document.getElementById('detail-flip-front');
  const inner = document.getElementById('detail-flip-inner');
  const backdrop = document.getElementById('detail-flip-backdrop');
  const rect = detailFlipSourceRect;

  if(front) front.style.visibility = ''; // on la rend de nouveau visible avant de la faire réapparaître en tournant
  if(rect){
    card.style.top = rect.top + 'px';
    card.style.left = rect.left + 'px';
    card.style.width = rect.width + 'px';
    card.style.height = rect.height + 'px';
  }
  inner.classList.remove('flipped');
  backdrop.classList.remove('show');

  const sourceEl = detailFlipSourceEl;
  const cleanup = ()=>{
    card.style.display = 'none';
    backdrop.style.display = 'none';
    if(sourceEl && sourceEl.isConnected) sourceEl.style.visibility = '';
    detailFlipOpen = false;
    detailFlipSourceRect = null;
    detailFlipSourceEl = null;
    lastRenderedDetailKey = null;
  };
  card.addEventListener('transitionend', cleanup, { once:true });
  setTimeout(cleanup, 600);
}

function openFilmDetailFromCard(cardEl, id){
  pendingFlipSourceEl = cardEl;
  openFilmDetail(id);
}
function openSerieDetailFromCard(cardEl, id){
  pendingFlipSourceEl = cardEl;
  openSerieDetail(id);
}

function parseRssItems(xmlText){
  try{
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');
    if(doc.querySelector('parsererror')) return [];
    return Array.from(doc.querySelectorAll('item')).map(it=>({
      title: it.querySelector('title')?.textContent || '',
      link: it.querySelector('link')?.textContent || '#',
      pubDate: it.querySelector('pubDate')?.textContent || ''
    }));
  }catch(e){
    return [];
  }
}

async function loadCinemaProgramme(){
  const cfg = getCfg();
  const container = document.getElementById('discover-cinema');
  if(!container) return;
  if(!cfg.cinema_url){
    container.innerHTML = '<div class="empty-state">Colle le lien de ton cinéma dans les Paramètres pour voir son programme apparaître ici.</div>';
    return;
  }
  container.innerHTML = '<div class="empty-state">Chargement...</div>';

  let origin = null;
  try{ origin = new URL(cfg.cinema_url).origin; }catch(e){ /* URL invalide, on ignore le flux RSS */ }

  let rssHtml = '';
  if(origin){
    try{
      const res = await fetch(origin + '/feed');
      if(!res.ok) throw new Error('HTTP ' + res.status);
      const text = await res.text();
      const items = parseRssItems(text).slice(0, 6);
      if(items.length){
        rssHtml = '<div class="grid">' + items.map(it=>`
          <div class="discover-card">
            <div class="info">
              <div class="title">${escapeHtml(it.title)}</div>
              <div class="meta">${escapeHtml((it.pubDate||'').substring(0,16))}</div>
              <a class="btn secondary" style="display:block;text-align:center;text-decoration:none;box-sizing:border-box;" href="${it.link}" target="_blank">Lire ↗</a>
            </div>
          </div>
        `).join('') + '</div>';
      }
    }catch(err){
      rssHtml = '<div class="settings-note">Aperçu automatique indisponible ici (probablement bloqué par le navigateur, CORS). Utilise le lien direct ci-dessous pour voir le programme complet.</div>';
    }
  }

  container.innerHTML = `
    <div style="margin-bottom:14px;">
      <a class="btn" style="text-decoration:none;display:inline-block;" href="${cfg.cinema_url}" target="_blank">🎬 Voir le programme complet ↗</a>
    </div>
    ${rssHtml}
  `;
}

function markSeasonWatched(serieId, seasonNum, watched){
  const s = state.series.find(x=>String(x.id)===String(serieId));
  if(!s) return;
  const season = s.saisons.find(sx=>sx.numero===seasonNum);
  if(!season) return;
  season.episodes.forEach(e=>{
    if(watched && !isEpisodeReleased(e)) return; // on ne marque pas comme vu un épisode pas encore diffusé
    e.vu = watched;
    if(watched) e.nouveau = false;
  });
  saveLocalState();
  openSeasonNumbers.add(seasonNum);
  renderSerieDetailModal();
  renderSeries();
}
