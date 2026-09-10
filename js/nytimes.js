/* =========================================================
   COLLECTION "100 NYTIMES" — séparée de "Ma liste", ne doit apparaître
   nulle part ailleurs (Ma liste, À voir, Tableau de bord...).
   ========================================================= */
function openNytimesDetail(id){
  const f = state.nytimes.find(x=>String(x.id)===String(id));
  if(!f) return;
  openDetailType = 'nytimes';
  openDetailId = id;
  const key = 'nytimes:' + id;
  const draftItem = captureExtraDraft(f, key);
  const html = `
    <div class="detail-header">
      ${f.affiche_url ? `<img src="${f.affiche_url}">` : ''}
      <div>
        <h2 style="margin:0 0 6px;">${escapeHtml(f.titre)} ${f.annee?`(${f.annee})`:''}</h2>
        <div class="dh-meta">🏆 #${f.nytimes_index+1} de la liste 100 NYTimes</div>
        <div class="dh-meta">Réalisateur : ${escapeHtml(f.realisateur||'inconnu')}</div>
        <div class="dh-meta">Genres : ${escapeHtml((f.genres||[]).join(', '))}</div>
        <div class="dh-meta">Casting : ${escapeHtml((f.casting||[]).slice(0,6).join(', '))}</div>
        ${f.tmdb_id ? `<div class="dh-meta"><a href="https://www.themoviedb.org/movie/${f.tmdb_id}" target="_blank">Voir sur TMDB ↗</a></div>` : ''}
        <p style="font-size:13px;color:var(--muted);max-width:480px;">${escapeHtml(f.synopsis||'')}</p>
        <div class="settings-note" style="margin:8px 0;">Ce film fait partie de ta liste "100 NYTimes", séparée de "Ma liste".</div>
        <button class="btn ${f.vu?'secondary':''}" onclick="toggleNytimesWatched('${f.id}')">${f.vu ? 'Marquer comme non vu' : 'Marquer comme vu'}</button>
        <button class="btn danger" onclick="deleteNytimesFilm('${f.id}')">Retirer de la liste NYTimes</button>
        ${renderPriorityWidget(f, 'nytimes')}
        ${renderExtraInfoBlock(draftItem, 'nytimes')}
      </div>
    </div>
  `;
  document.getElementById('detail-content').innerHTML = html;
  lastRenderedDetailKey = key;
  openModal('detail-modal');
}
function openNytimesDetailFromRow(rowEl, id){
  pendingFlipSourceEl = rowEl;
  openNytimesDetail(id);
}
function toggleNytimesWatched(id, skipDetailOpen){
  const f = state.nytimes.find(x=>String(x.id)===String(id));
  if(!f) return;
  f.vu = !f.vu;
  saveLocalState();
  renderNytimesList();
  if(!skipDetailOpen) openNytimesDetail(id);
}
function deleteNytimesFilm(id){
  if(!confirm('Retirer ce film de ta liste NYTimes ?')) return;
  state.nytimes = state.nytimes.filter(x=>String(x.id)!==String(id));
  saveLocalState();
  closeModal('detail-modal');
  renderNytimesList();
}
