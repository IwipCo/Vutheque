/* =========================================================
   RENDU - FILMS
   ========================================================= */
function sortList(list, sortValue, kind){
  const list2 = list.slice();
  const getYear = (x)=> parseInt(x.annee) || 0;
  const getPerson = (x)=> (kind === 'serie' ? (x.createur || '') : (x.realisateur || ''));
  switch(sortValue){
    case 'date_ajout_asc':
      list2.sort((a,b)=>(a.date_ajout||'').localeCompare(b.date_ajout||'')); break;
    case 'annee_desc':
      list2.sort((a,b)=>getYear(b)-getYear(a)); break;
    case 'annee_asc':
      list2.sort((a,b)=>getYear(a)-getYear(b)); break;
    case 'titre':
      list2.sort((a,b)=>(a.titre||'').localeCompare(b.titre||'', 'fr', {sensitivity:'base'})); break;
    case 'realisateur':
      list2.sort((a,b)=>getPerson(a).localeCompare(getPerson(b), 'fr', {sensitivity:'base'})); break;
    case 'priorite_desc':
      list2.sort((a,b)=>PRIORITY_LEVELS[getPriority(b)].rank - PRIORITY_LEVELS[getPriority(a)].rank); break;
    case 'recommande_par':
      list2.sort((a,b)=>(a.recommande_par||'').localeCompare(b.recommande_par||'', 'fr', {sensitivity:'base'})); break;
    case 'date_ajout_desc':
    default:
      list2.sort((a,b)=>(b.date_ajout||'').localeCompare(a.date_ajout||'')); break;
  }
  return list2;
}

function renderFilms(){
  const filter = document.getElementById('films-filter').value;
  const sortValue = document.getElementById('films-sort').value;
  const showRecommender = !!getCfg().show_recommender;
  let list = state.films.slice();
  if(filter === 'watched') list = list.filter(f=>f.vu);
  if(filter === 'unwatched') list = list.filter(f=>!f.vu);
  list = sortList(list, sortValue, 'film');
  const c = document.getElementById('films-container');

  if(list.length === 0){
    c.innerHTML = '<div class="empty-state">Aucun film ici pour le moment. Clique sur "+ Ajouter un film".</div>';
    return;
  }

  if(filmsView === 'card'){
    c.innerHTML = '<div class="grid">' + list.map(f=>`
      <div class="card" onclick="openFilmDetailFromCard(this, '${f.id}')">
        <div style="position:absolute;top:6px;right:6px;display:flex;gap:4px;align-items:center;z-index:1;">
          ${priorityIconOnly(f)}
          <span class="badge ${f.vu?'watched':'unwatched'}" style="position:static;">${f.vu?'Vu':'Non vu'}</span>
        </div>
        ${hasExtraInfo(f) ? `<span class="badge" style="top:6px;left:6px;right:auto;background:rgba(0,0,0,.7);" title="${escapeHtml(f.recommande_par ? 'Recommandé par ' + f.recommande_par : (f.commentaire || 'Liens disponibles'))}">💬</span>` : ''}
        ${f.affiche_url ? `<img src="${f.affiche_url}" alt="">` : `<div class="no-poster">${escapeHtml(f.titre)}</div>`}
        <div class="info">
          <div class="title">${escapeHtml(f.titre)}</div>
          <div class="year">${f.annee || ''}</div>
          <div style="font-size:11px;color:var(--accent);margin-top:2px;min-height:14px;">${showRecommender && f.recommande_par ? `👤 ${escapeHtml(f.recommande_par)}` : ''}</div>
          <button class="btn ${f.vu?'secondary':''}" style="width:100%;margin-top:6px;padding:6px 0;font-size:12px;" onclick="event.stopPropagation(); toggleFilmWatched('${f.id}', true)">${f.vu ? 'Marquer comme non vu' : 'Marquer comme vu'}</button>
        </div>
      </div>
    `).join('') + '</div>';
  } else if(filmsView === 'compact'){
    c.innerHTML = '<div class="grid-compact">' + list.map(f=>`
      <div class="card card-compact" onclick="openFilmDetailFromCard(this, '${f.id}')">
        <span class="badge ${f.vu?'watched':'unwatched'}">${f.vu?'Vu':'Non vu'}</span>
        ${f.affiche_url ? `<img src="${f.affiche_url}" alt="">` : `<div class="no-poster">${escapeHtml(f.titre)}</div>`}
        <div class="info">
          <div class="title">${escapeHtml(f.titre)}</div>
        </div>
      </div>
    `).join('') + '</div>';
  } else {
    c.innerHTML = `<table><thead><tr><th></th><th>Titre</th><th>Année</th><th>Réalisateur</th><th>Priorité</th>${showRecommender?'<th>Recommandé par</th>':''}<th>Statut</th><th></th></tr></thead><tbody>
      ${list.map(f=>`
        <tr onclick="openFilmDetail('${f.id}')">
          <td>${f.affiche_url ? `<img class="list-poster" src="${f.affiche_url}">` : ''}</td>
          <td>${escapeHtml(f.titre)}</td>
          <td>${f.annee||''}</td>
          <td>${escapeHtml(f.realisateur||'')}</td>
          <td>${priorityBadgeSmall(f)}</td>
          ${showRecommender?`<td>${escapeHtml(f.recommande_par||'')}</td>`:''}
          <td>${f.vu ? '✅ Vu' : '⬜ Non vu'}</td>
          <td><button class="btn ${f.vu?'secondary':''}" style="font-size:12px;padding:5px 10px;" onclick="event.stopPropagation(); toggleFilmWatched('${f.id}', true)">${f.vu ? 'Marquer comme non vu' : 'Marquer comme vu'}</button></td>
        </tr>
      `).join('')}
    </tbody></table>`;
  }
}

function hasExtraInfo(item){
  return !!(( item.commentaire && item.commentaire.trim()) || (item.recommande_par && item.recommande_par.trim()) || (item.liens && item.liens.length));
}

function getKnownTags(){
  const tags = new Set();
  state.films.forEach(f=>{ if(f.recommande_par) tags.add(f.recommande_par); });
  state.series.forEach(s=>{ if(s.recommande_par) tags.add(s.recommande_par); });
  (state.nytimes||[]).forEach(f=>{ if(f.recommande_par) tags.add(f.recommande_par); });
  return Array.from(tags).sort((a,b)=>a.localeCompare(b, 'fr'));
}

// Récupère les valeurs actuellement saisies (non enregistrées) dans le bloc "infos
// complémentaires" affiché, pour ne pas les perdre lors des rafraîchissements fréquents
// (ex: cocher un épisode pendant qu'on est en train de taper un commentaire).
let lastRenderedDetailKey = null; // clé "film:id" ou "serie:id" de la dernière fiche affichée dans #detail-content

function captureExtraDraft(fallbackItem, key){
  if(lastRenderedDetailKey !== key) return fallbackItem; // fiche différente de celle déjà affichée : pas de brouillon à récupérer
  const tagEl = document.getElementById('extra-tag-input');
  if(!tagEl) return fallbackItem;
  const commentEl = document.getElementById('extra-comment-input');
  const links = Array.from(document.querySelectorAll('.extra-link-input')).map(i=>i.value);
  return Object.assign({}, fallbackItem, {
    recommande_par: tagEl.value,
    commentaire: commentEl ? commentEl.value : fallbackItem.commentaire,
    liens: links
  });
}

const PRIORITY_LEVELS = {
  low:    { label: 'Low',    symbol: '↓', rank: 1, color: 'var(--accent)' },
  normal: { label: 'Normal', symbol: '→', rank: 2, color: 'var(--muted)' },
  high:   { label: 'High',   symbol: '↑', rank: 3, color: 'var(--warn)' },
  urgent: { label: 'Urgent', symbol: '⇈', rank: 4, color: 'var(--danger)' },
};
// Normalise la priorité d'un item : gère l'absence de valeur (par défaut Normal) et
// les anciennes valeurs numériques (1-5) issues du précédent système à étoiles.
function getPriority(item){
  const p = item.priorite;
  if(PRIORITY_LEVELS[p]) return p;
  if(typeof p === 'number'){
    if(p >= 5) return 'urgent';
    if(p === 4) return 'high';
    if(p === 3) return 'normal';
    if(p >= 1) return 'low';
  }
  return 'normal';
}
function priorityBadgeSmall(item){
  const level = getPriority(item);
  const lvl = PRIORITY_LEVELS[level];
  return `<span title="Priorité : ${lvl.label}" style="font-size:13px;color:${lvl.color};font-weight:700;">${lvl.symbol} ${lvl.label}</span>`;
}
function priorityIconOnly(item){
  const level = getPriority(item);
  const lvl = PRIORITY_LEVELS[level];
  return `<span class="badge" style="position:static;background:rgba(0,0,0,.7);color:${lvl.color};font-size:14px;" title="Priorité : ${lvl.label}">${lvl.symbol}</span>`;
}
function renderPriorityWidget(item, kind){
  const current = getPriority(item);
  const buttons = Object.keys(PRIORITY_LEVELS).map(key=>{
    const lvl = PRIORITY_LEVELS[key];
    const active = key === current;
    return `<button class="btn ${active?'':'secondary'}" style="padding:5px 10px;font-size:12px;margin-right:6px;margin-bottom:4px;${active?'':'color:'+lvl.color+';'}" onclick="setPriority('${kind}', '${item.id}', '${key}')"><span style="color:${active?'#fff':lvl.color};font-weight:700;">${lvl.symbol}</span> ${lvl.label}</button>`;
  }).join('');
  return `
    <div style="margin:12px 0;">
      <label class="field" style="margin-bottom:4px;">Priorité</label>
      <div>${buttons}</div>
    </div>
  `;
}
function setPriority(kind, id, value){
  if(!PRIORITY_LEVELS[value]) return;
  if(kind === 'film'){
    const f = state.films.find(x=>String(x.id)===String(id));
    if(!f) return;
    f.priorite = value;
    saveLocalState();
    renderFilms();
    openFilmDetail(id);
  } else if(kind === 'nytimes'){
    const f = state.nytimes.find(x=>String(x.id)===String(id));
    if(!f) return;
    f.priorite = value;
    saveLocalState();
    renderNytimesList();
    openNytimesDetail(id);
  } else {
    const s = state.series.find(x=>String(x.id)===String(id));
    if(!s) return;
    s.priorite = value;
    saveLocalState();
    renderSeries();
    renderSerieDetailModal();
  }
}

function renderExtraInfoBlock(item, kind){
  const links = item.liens || [];
  const linksHtml = links.map(l => `
    <div class="extra-link-row" style="display:flex;gap:6px;margin-bottom:6px;">
      <input type="text" class="extra-link-input" value="${escapeHtml(l)}" style="flex:1;" placeholder="https://..." onblur="saveExtraInfo('${kind}', '${item.id}', true)" oninput="scheduleExtraInfoAutoSave('${kind}', '${item.id}')">
      <button class="btn secondary" onclick="openExtraLink(this)" title="Ouvrir le lien">🔗</button>
      <button class="btn secondary" onclick="removeExtraLinkRow(this, '${kind}', '${item.id}')">✕</button>
    </div>
  `).join('');
  const tagsDatalist = getKnownTags().map(t => `<option value="${escapeHtml(t)}">`).join('');
  return `
    <h3 style="margin-top:20px;">Infos complémentaires</h3>
    <div class="settings-note" style="margin-top:0;">Ces champs s'enregistrent automatiquement (pas besoin d'un bouton).</div>
    <label class="field">Recommandé par</label>
    <input type="text" id="extra-tag-input" list="extra-known-tags" style="width:100%;max-width:280px;" value="${escapeHtml(item.recommande_par||'')}" placeholder="ex: Alice" onblur="saveExtraInfo('${kind}', '${item.id}', true)" oninput="scheduleExtraInfoAutoSave('${kind}', '${item.id}')">
    <datalist id="extra-known-tags">${tagsDatalist}</datalist>

    <label class="field">Liens (site, article, bande-annonce...)</label>
    <div id="extra-links-list">${linksHtml}</div>
    <button class="btn secondary" onclick="addExtraLinkRow('${kind}', '${item.id}')">+ Ajouter un lien</button>

    <label class="field">Commentaire</label>
    <textarea id="extra-comment-input" rows="3" style="width:100%;max-width:420px;resize:vertical;" onblur="saveExtraInfo('${kind}', '${item.id}', true)" oninput="scheduleExtraInfoAutoSave('${kind}', '${item.id}')">${escapeHtml(item.commentaire||'')}</textarea><br>

    <button class="btn secondary" style="margin-top:10px;" onclick="saveExtraInfo('${kind}', '${item.id}')">💾 Enregistrer maintenant</button>
  `;
}
let extraInfoAutoSaveTimer = null;
function scheduleExtraInfoAutoSave(kind, id){
  clearTimeout(extraInfoAutoSaveTimer);
  extraInfoAutoSaveTimer = setTimeout(()=> saveExtraInfo(kind, id, true), 500);
}
function flushExtraInfoIfPending(){
  // Force l'enregistrement immédiat des infos complémentaires si la fiche est affichée,
  // pour ne rien perdre à la fermeture même si le blur n'a pas eu le temps de se déclencher
  // (cas fréquent sur mobile/iOS quand on tape rapidement puis referme).
  clearTimeout(extraInfoAutoSaveTimer);
  if(document.getElementById('extra-comment-input') && openDetailType && openDetailId){
    saveExtraInfo(openDetailType, openDetailId, true);
  }
}
function addExtraLinkRow(kind, id){
  const container = document.getElementById('extra-links-list');
  if(!container) return;
  const row = document.createElement('div');
  row.className = 'extra-link-row';
  row.style.cssText = 'display:flex;gap:6px;margin-bottom:6px;';
  row.innerHTML = `<input type="text" class="extra-link-input" style="flex:1;" placeholder="https://..." onblur="saveExtraInfo('${kind}', '${id}', true)" oninput="scheduleExtraInfoAutoSave('${kind}', '${id}')"><button class="btn secondary" onclick="openExtraLink(this)" title="Ouvrir le lien">🔗</button><button class="btn secondary" onclick="removeExtraLinkRow(this, '${kind}', '${id}')">✕</button>`;
  container.appendChild(row);
  row.querySelector('.extra-link-input').focus();
  resizeDetailFlipToContent();
}
function removeExtraLinkRow(btn, kind, id){
  btn.closest('.extra-link-row').remove();
  resizeDetailFlipToContent();
  if(kind && id) saveExtraInfo(kind, id, true); // la suppression d'un lien s'enregistre immédiatement
}
function openExtraLink(btn){
  const input = btn.closest('.extra-link-row').querySelector('.extra-link-input');
  const url = input.value.trim();
  if(!url){ showToast('Aucun lien à ouvrir', 'error'); return; }
  const finalUrl = /^https?:\/\//i.test(url) ? url : 'https://' + url;
  window.open(finalUrl, '_blank', 'noopener');
}
function saveExtraInfo(kind, id, silent){
  const tagEl = document.getElementById('extra-tag-input');
  const commentEl = document.getElementById('extra-comment-input');
  if(!tagEl || !commentEl) return; // fiche pas (ou plus) affichée
  const tag = tagEl.value.trim();
  const comment = commentEl.value.trim();
  const liens = Array.from(document.querySelectorAll('.extra-link-input'))
    .map(inp => inp.value.trim())
    .filter(v => v.length > 0);

  if(kind === 'film'){
    const f = state.films.find(x=>String(x.id)===String(id));
    if(!f) return;
    f.recommande_par = tag;
    f.commentaire = comment;
    f.liens = liens;
    saveLocalState();
    renderFilms();
  } else if(kind === 'nytimes'){
    const f = state.nytimes.find(x=>String(x.id)===String(id));
    if(!f) return;
    f.recommande_par = tag;
    f.commentaire = comment;
    f.liens = liens;
    saveLocalState();
    renderNytimesList();
  } else {
    const s = state.series.find(x=>String(x.id)===String(id));
    if(!s) return;
    s.recommande_par = tag;
    s.commentaire = comment;
    s.liens = liens;
    saveLocalState();
    renderSeries();
  }
  if(!silent) showToast('Infos enregistrées', 'success');
}

function openFilmDetail(id){
  const f = state.films.find(x=>String(x.id)===String(id));
  if(!f) return;
  openDetailType = 'film';
  openDetailId = id;
  const key = 'film:' + id;
  const draftItem = captureExtraDraft(f, key);
  const html = `
    <div class="detail-header">
      ${f.affiche_url ? `<img src="${f.affiche_url}">` : ''}
      <div>
        <h2 style="margin:0 0 6px;">${escapeHtml(f.titre)} ${f.annee?`(${f.annee})`:''}</h2>
        <div class="dh-meta">Réalisateur : ${escapeHtml(f.realisateur||'inconnu')}</div>
        <div class="dh-meta">Genres : ${escapeHtml((f.genres||[]).join(', '))}</div>
        <div class="dh-meta">Casting : ${escapeHtml((f.casting||[]).slice(0,6).join(', '))}</div>
        ${f.tmdb_id ? `<div class="dh-meta"><a href="https://www.themoviedb.org/movie/${f.tmdb_id}" target="_blank">Voir sur TMDB ↗</a></div>` : ''}
        <p style="font-size:13px;color:var(--muted);max-width:480px;">${escapeHtml(f.synopsis||'')}</p>
        <button class="btn ${f.vu?'secondary':''}" onclick="toggleFilmWatched('${f.id}')">${f.vu ? 'Marquer comme non vu' : 'Marquer comme vu'}</button>
        <button class="btn danger" onclick="deleteFilm('${f.id}')">Supprimer</button>
        ${renderPriorityWidget(f, 'film')}
        ${renderExtraInfoBlock(draftItem, 'film')}
      </div>
    </div>
  `;
  document.getElementById('detail-content').innerHTML = html;
  lastRenderedDetailKey = key;
  openModal('detail-modal');
}
function toggleFilmWatched(id, skipDetailOpen){
  const f = state.films.find(x=>String(x.id)===String(id));
  if(!f) return;
  f.vu = !f.vu;
  saveLocalState();
  renderFilms();
  if(!skipDetailOpen) openFilmDetail(id);
}
function deleteFilm(id){
  if(!confirm('Supprimer ce film ?')) return;
  state.films = state.films.filter(x=>String(x.id)!==String(id));
  saveLocalState();
  closeModal('detail-modal');
  renderFilms();
}
