/* =========================================================
   RENDU - SERIES
   ========================================================= */
// Un épisode est "diffusé" s'il n'a pas de date connue (on ne peut pas savoir, donc on le
// traite comme déjà sorti) ou si sa date de diffusion est passée ou aujourd'hui.
function isEpisodeReleased(ep){
  if(!ep.date_diffusion) return true;
  const d = new Date(ep.date_diffusion);
  if(isNaN(d.getTime())) return true;
  const today = new Date();
  today.setHours(23,59,59,999); // inclut les épisodes qui sortent aujourd'hui
  return d <= today;
}
function unwatchedCount(serie){
  let n=0;
  (serie.saisons||[]).forEach(s=> s.episodes.forEach(e=>{ if(!e.vu && isEpisodeReleased(e)) n++; }));
  return n;
}
function totalCount(serie){
  let n=0;
  (serie.saisons||[]).forEach(s=> n += s.episodes.length);
  return n;
}
function getFirstUnwatchedEpisode(serie){
  const saisons = (serie.saisons||[]).slice().sort((a,b)=>a.numero-b.numero);
  for(const saison of saisons){
    const episodes = saison.episodes.slice().sort((a,b)=>a.numero-b.numero);
    for(const ep of episodes){
      if(!ep.vu && isEpisodeReleased(ep)) return { saison: saison.numero, episode: ep };
    }
  }
  return null;
}

// Durée d'un épisode en minutes : sa propre durée si connue, sinon la durée moyenne
// de la série, sinon une estimation générique de 45 min.
function getEpisodeDuration(ep, serie){
  return ep.duree || serie.duree_moyenne_ep || 45;
}
// Somme des durées (en minutes) des épisodes non vus et déjà diffusés d'une série.
function unwatchedDurationMinutes(serie){
  let total = 0;
  (serie.saisons||[]).forEach(s=> s.episodes.forEach(e=>{
    if(!e.vu && isEpisodeReleased(e)) total += getEpisodeDuration(e, serie);
  }));
  return total;
}
// Somme des durées (en minutes) des épisodes déjà vus d'une série.
function watchedDurationMinutes(serie){
  let total = 0;
  (serie.saisons||[]).forEach(s=> s.episodes.forEach(e=>{
    if(e.vu) total += getEpisodeDuration(e, serie);
  }));
  return total;
}
// Formate une durée en minutes en texte lisible (min / h / j / semaines / mois).
function formatDuration(totalMinutes){
  totalMinutes = Math.round(totalMinutes);
  if(totalMinutes <= 0) return '0 min';
  if(totalMinutes < 60) return totalMinutes + ' min';
  const totalHours = Math.floor(totalMinutes/60);
  const remMin = totalMinutes % 60;
  if(totalHours < 24) return totalHours + 'h' + (remMin ? String(remMin).padStart(2,'0') : '');
  const totalDays = Math.floor(totalHours/24);
  const remHours = totalHours % 24;
  if(totalDays < 7) return totalDays + 'j' + (remHours ? ' ' + remHours + 'h' : '');
  if(totalDays < 30){
    const weeks = Math.floor(totalDays/7);
    const remDays = totalDays % 7;
    return weeks + 'sem' + (remDays ? ' ' + remDays + 'j' : '');
  }
  const totalMonths = Math.floor(totalDays/30);
  const remDays = totalDays % 30;
  return totalMonths + ' mois' + (remDays ? ' ' + remDays + 'j' : '');
}
// Comme formatDuration, mais ajoute une seconde ligne avec l'équivalent en heures
// dès que le format principal est en jours/semaines/mois (donc pas déjà en h/min).
function formatDurationWithHours(totalMinutes){
  const main = formatDuration(totalMinutes);
  if(totalMinutes < 60*24) return main; // déjà en minutes/heures, pas besoin de répéter
  const totalHours = Math.round(totalMinutes/60);
  return `${main}<div style="font-size:11px;font-weight:400;color:var(--muted);margin-top:2px;">≈ ${totalHours} h</div>`;
}

// Réutilisable : liste des prochains épisodes non vus, un par série (utilisée par
// la vue "Épisodes" de la page Séries ET par l'onglet "À voir").
// --- Onglet "À voir" (page dédiée regroupant Séries + Films à voir) ---
function renderAvoirSeries(){
  const showRecommender = !!getCfg().show_recommender;
  let list = state.series.filter(s => s.suivie !== false);
  list = sortList(list, 'priorite_desc', 'serie');
  renderEpisodesQueueInto('avoir-series-container', list, showRecommender);
}
function renderAvoirFilms(){
  const sortEl = document.getElementById('avoir-films-sort');
  const sortValue = sortEl ? sortEl.value : 'priorite_desc';
  const showRecommender = !!getCfg().show_recommender;
  let list = state.films.filter(f => !f.vu);
  list = sortList(list, sortValue, 'film');
  const c = document.getElementById('avoir-films-container');
  if(list.length === 0){
    c.innerHTML = '<div class="empty-state">Aucun film à voir. Tout est à jour 🎉</div>';
    return;
  }
  c.innerHTML = list.map(f => `
    <div class="episode-row quick-episode-row" style="background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:8px;padding:12px 14px;align-items:center;">
      ${f.affiche_url ? `<img class="list-poster" src="${f.affiche_url}">` : ''}
      <span class="ep-title" style="cursor:pointer;display:flex;flex-direction:column;gap:2px;align-items:flex-start;" onclick="openFilmDetail('${f.id}')">
        <span><strong>${escapeHtml(f.titre)}</strong> ${f.annee ? `(${f.annee})` : ''}</span>
        <span style="font-size:12px;color:var(--muted);">${escapeHtml(f.realisateur||'')}</span>
        <span style="font-size:11px;">${priorityBadgeSmall(f)}${showRecommender && f.recommande_par ? ` <span style="color:var(--accent);">· 👤 ${escapeHtml(f.recommande_par)}</span>` : ''}</span>
      </span>
      <input type="checkbox" class="quick-check" title="Marquer comme vu" onchange="markFilmWatchedQuick(this, '${f.id}')">
    </div>
  `).join('');
}
function markFilmWatchedQuick(btnEl, id){
  const f = state.films.find(x=>String(x.id)===String(id));
  if(!f) return;
  const row = btnEl ? btnEl.closest('.quick-episode-row') : null;
  const applyChange = ()=>{
    f.vu = true;
    saveLocalState();
    renderFilms();
    renderAvoirFilms();
  };
  if(row){
    row.classList.add('just-watched');
    setTimeout(applyChange, 280);
  } else {
    applyChange();
  }
}
function setAvoirTab(tab){
  document.getElementById('avoir-tab-series').classList.toggle('active', tab==='series');
  document.getElementById('avoir-tab-films').classList.toggle('active', tab==='films');
  document.getElementById('avoir-series-panel').style.display = tab==='series' ? 'block' : 'none';
  document.getElementById('avoir-films-panel').style.display = tab==='films' ? 'block' : 'none';
  if(tab==='series') renderAvoirSeries();
  else renderAvoirFilms();
}

// --- Sous-onglets "Ma liste" / "Découvrir" sur les pages Films et Séries ---
function setFilmsPageTab(tab){
  document.getElementById('films-tab-liste').classList.toggle('active', tab==='liste');
  document.getElementById('films-tab-decouvrir').classList.toggle('active', tab==='decouvrir');
  document.getElementById('films-tab-nytimes').classList.toggle('active', tab==='nytimes');
  document.getElementById('films-liste-panel').style.display = tab==='liste' ? 'block' : 'none';
  document.getElementById('films-decouvrir-panel').style.display = tab==='decouvrir' ? 'block' : 'none';
  document.getElementById('films-nytimes-panel').style.display = tab==='nytimes' ? 'block' : 'none';
  if(tab==='decouvrir'){ loadDiscoverContent(false); loadCinemaProgramme(); }
  if(tab==='nytimes'){ renderNytimesList(); }
}
// --- Liste "100 meilleurs films du 21e siècle" (New York Times) ---
const NYTIMES_100 = [
  "Parasite", "Mulholland Drive", "There Will Be Blood", "In the Mood for Love", "Moonlight",
  "No Country for Old Men", "Eternal Sunshine of the Spotless Mind", "Get Out", "Le Voyage de Chihiro", "The Social Network",
  "Mad Max: Fury Road", "La Zone d'intérêt", "Les Fils de l'homme", "Inglourious Basterds", "La cité de Dieu",
  "Tigre et Dragon", "Le secret de Brokeback Mountain", "Et... ta mère aussi!", "Zodiac", "Le Loup de Wall Street",
  "La famille Tenenbaum", "The Grand Budapest Hotel", "Boyhood", "Her", "Phantom Thread",
  "Anatomie d'une chute", "Adaptation.", "The Dark Knight : Le Chevalier noir", "Premier contact", "Lost in Translation",
  "Les Infiltrés", "Mes meilleures amies", "Une séparation", "WALL·E", "Un prophète",
  "A Serious Man", "Call Me by Your Name", "Portrait de la jeune fille en feu", "Lady Bird", "Yi yi",
  "Le Fabuleux Destin d'Amélie Poulain", "The Master", "Old Boy", "Once Upon a Time in... Hollywood", "Le stratège",
  "Roma", "Presque célèbre", "La Vie des autres", "Before Sunset", "Là-haut",
  "12 Years a Slave", "La Favorite", "Borat : Leçons culturelles sur l'Amérique pour profit glorieuse nation Kazakhstan", "Le Labyrinthe de Pan", "Inception",
  "Punch-Drunk Love : Ivre d'amour", "Bêtes de scène", "Uncut Gems", "Toni Erdmann", "Whiplash",
  "Kill Bill: Volume I", "Memento", "Little Miss Sunshine", "Gone Girl", "Oppenheimer",
  "Spotlight", "Tár", "Démineurs", "Under the Skin", "Morse",
  "Ocean's Eleven", "Carol", "Ratatouille", "The Florida Project", "Amour",
  "O' Brother", "Everything Everywhere All at Once", "Aftersun", "The Tree of Life", "Volver",
  "Black Swan", "The act of killing - L'acte de tuer", "Inside Llewyn Davis", "Melancholia", "Présentateur vedette: La légende de Ron Burgundy",
  "Past lives - Nos vies d'avant", "Le Seigneur des anneaux : La Communauté de l'anneau", "Les Glaneurs et la Glaneuse", "Interstellar", "Frances Ha",
  "Fish Tank", "Gladiator", "Michael Clayton", "Minority Report", "Julie (en 12 chapitres)",
  "Black Panther", "Gravity", "Grizzly Man", "Memories of Murder", "SuperGrave"
];

function renderNytimesList(){
  const c = document.getElementById('nytimes-list');
  c.innerHTML = NYTIMES_100.map((title, idx) => {
    const f = state.nytimes.find(x => x.nytimes_index === idx);
    if(f){
      // Déjà ajouté : mêmes infos que "Ma liste → vue Liste" (sans priorité ni recommandeur)
      return `
      <div class="nytimes-added-row" onclick="openNytimesDetailFromRow(this, '${f.id}')">
        <span class="nyt-rank">${idx+1}</span>
        ${f.affiche_url ? `<img class="list-poster" src="${f.affiche_url}">` : ''}
        <span class="nyt-info">
          <strong>${escapeHtml(f.titre)}</strong> ${f.annee?`(${f.annee})`:''}
          <span class="nyt-director">${escapeHtml(f.realisateur||'')}</span>
        </span>
        <span class="nyt-status">${f.vu ? '✅ Vu' : '⬜ Non vu'}</span>
        <button class="btn ${f.vu?'secondary':''}" onclick="event.stopPropagation(); toggleNytimesWatched('${f.id}', true)">${f.vu ? 'Marquer comme non vu' : 'Marquer comme vu'}</button>
      </div>`;
    }
    return `
    <div class="episode-row" style="background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:6px;padding:10px 14px;">
      <span style="width:30px;flex-shrink:0;color:var(--muted);font-weight:700;">${idx+1}</span>
      <span class="ep-title">${escapeHtml(title)}</span>
      <button class="btn secondary" data-title="${escapeHtml(title)}" data-index="${idx}" onclick="nytimesSearch(this.dataset.title, Number(this.dataset.index))">🔍 Rechercher</button>
    </div>`;
  }).join('');
}

let pendingNytimesIndex = null;
function nytimesSearch(title, index){
  // On ne fait pas d'ajout automatique à l'aveugle : certains titres français peuvent
  // correspondre à plusieurs résultats TMDB, on ouvre donc la recherche pré-remplie
  // pour laisser choisir/valider le bon film (avec résumé et affiche) avant ajout.
  openSearchModal('movie'); // réinitialise pendingNytimesIndex à null : on le fixe donc APRÈS cet appel
  pendingNytimesIndex = index;
  const cleanTitle = title.split(' - ')[0].split(':')[0].trim();
  document.getElementById('search-input').value = cleanTitle;
  doSearch();
}

function setSeriesPageTab(tab){
  document.getElementById('series-tab-liste').classList.toggle('active', tab==='liste');
  document.getElementById('series-tab-decouvrir').classList.toggle('active', tab==='decouvrir');
  document.getElementById('series-liste-panel').style.display = tab==='liste' ? 'block' : 'none';
  document.getElementById('series-decouvrir-panel').style.display = tab==='decouvrir' ? 'block' : 'none';
  if(tab==='decouvrir'){ loadDiscoverContent(false); }
}

function renderEpisodesQueueInto(containerId, list, showRecommender){
  const c = document.getElementById(containerId);
  const rows = list
    .map(s=>({ s, next: getFirstUnwatchedEpisode(s) }))
    .filter(r=>r.next !== null);
  if(rows.length === 0){
    c.innerHTML = '<div class="empty-state">Aucun épisode en attente. Tout est à jour 🎉</div>';
    return;
  }
  c.innerHTML = rows.map(({s, next})=>`
    <div class="episode-row quick-episode-row" style="background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:8px;padding:12px 14px;align-items:center;">
      ${s.affiche_url ? `<img class="list-poster" src="${s.affiche_url}">` : ''}
      <span class="ep-title" style="cursor:pointer;display:flex;flex-direction:column;gap:2px;align-items:flex-start;" onclick="openSerieDetail('${s.id}')">
        <span><strong>${escapeHtml(s.titre)}</strong> (${unwatchedCount(s)} à voir)${showRecommender && s.recommande_par ? ` <span style="font-size:11px;color:var(--accent);">· 👤 ${escapeHtml(s.recommande_par)}</span>` : ''}</span>
        <span style="font-size:12px;color:var(--muted);">S${next.saison} E${next.episode.numero} · ${escapeHtml(next.episode.titre||'')}</span>
        <span style="font-size:11px;color:var(--muted);">${formatDuration(getEpisodeDuration(next.episode, s))}${next.episode.date_diffusion ? ' · ' + next.episode.date_diffusion : ''}</span>
      </span>
      <input type="checkbox" class="quick-check" title="Marquer comme vu" onchange="markEpisodeWatchedQuick(this, '${s.id}', ${next.saison}, ${next.episode.numero})">
    </div>
  `).join('');
}

function renderSeries(){
  const filter = document.getElementById('series-filter').value;
  const sortValue = document.getElementById('series-sort').value;
  const showRecommender = !!getCfg().show_recommender;
  let list = state.series.slice();
  if(filter === 'stopped'){
    list = list.filter(s=>s.suivie === false);
  } else {
    list = list.filter(s=>s.suivie !== false); // par défaut, on masque les séries arrêtées
    if(filter === 'unfinished') list = list.filter(s=>unwatchedCount(s) > 0);
    if(filter === 'finished') list = list.filter(s=>unwatchedCount(s) === 0);
  }
  list = sortList(list, sortValue, 'serie');
  const c = document.getElementById('series-container');

  if(seriesView === 'episodes'){
    renderEpisodesQueueInto('series-container', list, showRecommender);
    return;
  }

  if(list.length === 0){
    c.innerHTML = '<div class="empty-state">Aucune série ici pour le moment. Clique sur "+ Ajouter une série".</div>';
    return;
  }

  if(seriesView === 'card'){
    c.innerHTML = '<div class="grid">' + list.map(s=>{
      const unw = unwatchedCount(s);
      const stopped = s.suivie === false;
      const badgeClass = stopped ? 'unwatched' : (unw>0?'unwatched':'watched');
      const badgeText = stopped ? '⏸ Arrêtée' : (unw>0? unw+' à voir' : 'À jour');
      return `
      <div class="card" onclick="openSerieDetailFromCard(this, '${s.id}')">
        <div style="position:absolute;top:6px;right:6px;display:flex;gap:4px;align-items:center;z-index:1;">
          ${priorityIconOnly(s)}
          <span class="badge ${badgeClass}" style="position:static;">${badgeText}</span>
        </div>
        ${hasExtraInfo(s) ? `<span class="badge" style="top:6px;left:6px;right:auto;background:rgba(0,0,0,.7);" title="${escapeHtml(s.recommande_par ? 'Recommandé par ' + s.recommande_par : (s.commentaire || 'Liens disponibles'))}">💬</span>` : ''}
        ${s.affiche_url ? `<img src="${s.affiche_url}" alt="">` : `<div class="no-poster">${escapeHtml(s.titre)}</div>`}
        <div class="info">
          <div class="title">${escapeHtml(s.titre)}</div>
          <div class="year">${totalCount(s)} épisodes</div>
          ${showRecommender && s.recommande_par ? `<div style="font-size:11px;color:var(--accent);margin-top:2px;">👤 ${escapeHtml(s.recommande_par)}</div>` : ''}
        </div>
      </div>`;
    }).join('') + '</div>';
  } else if(seriesView === 'compact'){
    c.innerHTML = '<div class="grid-compact">' + list.map(s=>{
      const unw = unwatchedCount(s);
      const stopped = s.suivie === false;
      const badgeClass = stopped ? 'unwatched' : (unw>0?'unwatched':'watched');
      const badgeText = stopped ? '⏸' : (unw>0? unw : '✓');
      return `
      <div class="card card-compact" onclick="openSerieDetailFromCard(this, '${s.id}')">
        <span class="badge ${badgeClass}">${badgeText}</span>
        ${s.affiche_url ? `<img src="${s.affiche_url}" alt="">` : `<div class="no-poster">${escapeHtml(s.titre)}</div>`}
        <div class="info">
          <div class="title">${escapeHtml(s.titre)}</div>
        </div>
      </div>`;
    }).join('') + '</div>';
  } else {
    c.innerHTML = `<table><thead><tr><th></th><th>Titre</th><th>Épisodes</th><th>Non vus</th><th>Priorité</th>${showRecommender?'<th>Recommandé par</th>':''}<th>Statut</th></tr></thead><tbody>
      ${list.map(s=>`
        <tr onclick="openSerieDetail('${s.id}')">
          <td>${s.affiche_url ? `<img class="list-poster" src="${s.affiche_url}">` : ''}</td>
          <td>${escapeHtml(s.titre)}</td>
          <td>${totalCount(s)}</td>
          <td>${unwatchedCount(s)}</td>
          <td>${priorityBadgeSmall(s)}</td>
          ${showRecommender?`<td>${escapeHtml(s.recommande_par||'')}</td>`:''}
          <td>${s.suivie === false ? '⏸ Arrêtée' : '✅ Suivie'}</td>
        </tr>
      `).join('')}
    </tbody></table>`;
  }
}

let openSeasonNumbers = new Set();

function openSerieDetail(id){
  openDetailType = 'serie';
  openDetailId = id;
  openSeasonNumbers = new Set();
  const s = state.series.find(x=>String(x.id)===String(id));
  if(s){
    const saisons = (s.saisons||[]).slice().sort((a,b)=>a.numero-b.numero);
    const firstUnwatched = saisons.find(season => season.episodes.some(e=>!e.vu));
    if(firstUnwatched) openSeasonNumbers.add(firstUnwatched.numero);
  }
  renderSerieDetailModal();
  openModal('detail-modal');
}
function renderSerieDetailModal(){
  const s = state.series.find(x=>String(x.id)===String(openDetailId));
  if(!s) return;
  const key = 'serie:' + s.id;
  const draftItem = captureExtraDraft(s, key);
  const seasonsHtml = (s.saisons||[]).map(season=>{
    const unw = season.episodes.filter(e=>!e.vu && isEpisodeReleased(e)).length;
    const isOpen = openSeasonNumbers.has(season.numero);
    return `
    <div class="season-block">
      <div class="season-head" onclick="toggleSeasonBlock(this, ${season.numero})">
        <span>Saison ${season.numero} (${season.episodes.length} ép. — ${unw} non vus)</span>
        <span style="display:flex;align-items:center;gap:8px;">
          <button class="btn secondary" style="padding:4px 8px;font-size:12px;" onclick="event.stopPropagation(); markSeasonWatched('${s.id}', ${season.numero}, true)">Tout marquer vu</button>
          <button class="btn secondary" style="padding:4px 8px;font-size:12px;" onclick="event.stopPropagation(); markSeasonWatched('${s.id}', ${season.numero}, false)">Tout marquer non vu</button>
          <span>▾</span>
        </span>
      </div>
      <div class="episodes-wrap${isOpen?' open':''}">
        ${season.episodes.map(ep=>`
          <div class="episode-row">
            <input type="checkbox" ${ep.vu?'checked':''} onchange="toggleEpisode('${s.id}', ${season.numero}, ${ep.numero})">
            <span class="ep-title">${ep.numero}. ${escapeHtml(ep.titre||'')} ${ep.nouveau?'<span class="badge new" style="position:static;">Nouveau</span>':''} ${!isEpisodeReleased(ep)?'<span class="badge" style="position:static;background:var(--panel-2);color:var(--muted);">à venir</span>':''}</span>
            <span class="ep-date">${ep.date_diffusion||''}</span>
          </div>
        `).join('')}
      </div>
    </div>`;
  }).join('');

  document.getElementById('detail-content').innerHTML = `
    <div class="detail-header">
      ${s.affiche_url ? `<img src="${s.affiche_url}">` : ''}
      <div>
        <h2 style="margin:0 0 6px;">${escapeHtml(s.titre)}</h2>
        <div class="dh-meta">Genres : ${escapeHtml((s.genres||[]).join(', '))}</div>
        <div class="dh-meta">Casting : ${escapeHtml((s.casting||[]).slice(0,6).join(', '))}</div>
        ${s.tmdb_id ? `<div class="dh-meta"><a href="https://www.themoviedb.org/tv/${s.tmdb_id}" target="_blank">Voir sur TMDB ↗</a></div>` : ''}
        <p style="font-size:13px;color:var(--muted);max-width:480px;">${escapeHtml(s.synopsis||'')}</p>
        <button class="btn" onclick="checkSeriesUpdates('${s.id}')">🔄 Vérifier les nouveaux épisodes</button>
        <button class="btn secondary" onclick="toggleSerieTracking('${s.id}')">${s.suivie === false ? '▶️ Reprendre le suivi' : '⏸ Arrêter de suivre'}</button>
        <button class="btn danger" onclick="deleteSerie('${s.id}')">Supprimer</button>
        ${renderPriorityWidget(s, 'serie')}
        ${renderExtraInfoBlock(draftItem, 'serie')}
      </div>
    </div>
    <h3>Saisons</h3>
    ${seasonsHtml}
  `;
  lastRenderedDetailKey = key;
  resizeDetailFlipToContent();
}
function toggleSeasonBlock(headEl, seasonNum){
  headEl.nextElementSibling.classList.toggle('open');
  if(openSeasonNumbers.has(seasonNum)) openSeasonNumbers.delete(seasonNum);
  else openSeasonNumbers.add(seasonNum);
  resizeDetailFlipToContent();
}
function toggleEpisode(serieId, seasonNum, epNum){
  const s = state.series.find(x=>String(x.id)===String(serieId));
  if(!s) return;
  const season = s.saisons.find(sx=>sx.numero===seasonNum);
  const ep = season.episodes.find(e=>e.numero===epNum);
  ep.vu = !ep.vu;
  ep.nouveau = false;
  saveLocalState();
  openSeasonNumbers.add(seasonNum);
  renderSerieDetailModal();
  renderSeries();
}
function markEpisodeWatchedQuick(btnEl, serieId, seasonNum, epNum){
  const s = state.series.find(x=>String(x.id)===String(serieId));
  if(!s) return;
  const season = s.saisons.find(sx=>sx.numero===seasonNum);
  const ep = season?.episodes.find(e=>e.numero===epNum);
  if(!ep) return;

  const row = btnEl ? btnEl.closest('.quick-episode-row') : null;
  const fromAvoir = !!(row && row.closest('#avoir-series-container'));
  const applyChange = ()=>{
    ep.vu = true;
    ep.nouveau = false;
    saveLocalState();
    if(fromAvoir) renderAvoirSeries();
    else renderSeries(); // le prochain épisode non vu prend automatiquement sa place
  };

  if(row){
    row.classList.add('just-watched');
    setTimeout(applyChange, 280); // laisse le temps de voir l'animation avant le remplacement
  } else {
    applyChange();
  }
}
function deleteSerie(id){
  if(!confirm('Supprimer cette série ?')) return;
  state.series = state.series.filter(x=>String(x.id)!==String(id));
  saveLocalState();
  closeModal('detail-modal');
  renderSeries();
}
function toggleSerieTracking(id){
  const s = state.series.find(x=>String(x.id)===String(id));
  if(!s) return;
  s.suivie = (s.suivie === false) ? true : false;
  saveLocalState();
  renderSerieDetailModal();
  renderSeries();
  showToast(s.suivie === false ? "Suivi arrêté — la série n'apparaîtra plus dans la liste principale" : 'Suivi repris', 'success');
}
