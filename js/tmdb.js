/* =========================================================
   TMDB - RECHERCHE ET AJOUT
   ========================================================= */
const TMDB_IMG = 'https://image.tmdb.org/t/p/w342';

function openSearchModal(type){
  currentSearchType = type;
  pendingNytimesIndex = null;
  document.getElementById('search-modal-title').textContent = type==='movie' ? 'Rechercher un film' : 'Rechercher une série';
  document.getElementById('search-input').value = '';
  document.getElementById('search-results').innerHTML = '';
  document.getElementById('tmdb-link-input').value = '';
  openModal('search-modal');
  document.getElementById('search-input').focus();
}
document.getElementById('search-input').addEventListener('keydown', (e)=>{
  if(e.key === 'Enter') doSearch();
});
document.getElementById('tmdb-link-input').addEventListener('keydown', (e)=>{
  if(e.key === 'Enter') addFromTmdbLink();
});

async function doSearch(){
  const cfg = getCfg();
  if(!cfg.tmdb_key){
    showToast('Configure ta clé API TMDB dans les Paramètres', 'error');
    return;
  }
  const query = document.getElementById('search-input').value.trim();
  if(!query) return;
  const resultsEl = document.getElementById('search-results');
  resultsEl.innerHTML = 'Recherche en cours...';
  try{
    const url = `https://api.themoviedb.org/3/search/${currentSearchType}?api_key=${cfg.tmdb_key}&language=fr-FR&query=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if(!res.ok) throw new Error('Erreur TMDB ('+res.status+')');
    const data = await res.json();
    if(!data.results || data.results.length===0){
      resultsEl.innerHTML = '<div class="empty-state">Aucun résultat</div>';
      return;
    }
    lastSearchResults = data.results.slice(0,10);
    resultsEl.innerHTML = lastSearchResults.map((r, idx)=>{
      const title = currentSearchType==='movie' ? r.title : r.name;
      const date = currentSearchType==='movie' ? r.release_date : r.first_air_date;
      const year = date ? date.substring(0,4) : '';
      const poster = r.poster_path ? TMDB_IMG + r.poster_path : '';
      const overview = r.overview ? escapeHtml(r.overview) : 'Pas de résumé disponible.';
      const note = r.vote_average ? '★ ' + r.vote_average.toFixed(1) : '';
      return `
        <div class="search-result" style="flex-direction:column;align-items:stretch;">
          <div style="display:flex;gap:12px;align-items:center;">
            ${poster ? `<img src="${poster}">` : `<div style="width:46px;height:69px;background:var(--panel-2);border-radius:4px;"></div>`}
            <div class="sr-info" style="cursor:pointer;" onclick="toggleSearchOverview(${idx})">
              <div class="sr-title">${escapeHtml(title)} <span style="color:var(--muted);font-weight:400;">(résumé ▾)</span></div>
              <div class="sr-year">${year}${note ? ' · ' + note : ''}${currentSearchType==='movie' ? `<span id="sr-director-${idx}"></span>` : ''}</div>
            </div>
            <button class="btn" onclick="addFromTmdb(${r.id})">Ajouter</button>
          </div>
          <div id="sr-overview-${idx}" style="display:none;font-size:12px;color:var(--muted);margin-top:8px;padding-left:58px;">${overview}</div>
        </div>
      `;
    }).join('');
    if(currentSearchType === 'movie'){
      // Le réalisateur n'est pas fourni par l'endpoint de recherche : on va le chercher
      // séparément pour chaque résultat, sans bloquer l'affichage initial.
      lastSearchResults.forEach((r, idx)=>{
        fetch(`https://api.themoviedb.org/3/movie/${r.id}?api_key=${cfg.tmdb_key}&language=fr-FR&append_to_response=credits`)
          .then(res => res.ok ? res.json() : null)
          .then(d => {
            if(!d) return;
            const director = (d.credits?.crew||[]).find(c=>c.job==='Director');
            const el = document.getElementById('sr-director-' + idx);
            if(el && director) el.textContent = ' · ' + director.name;
          })
          .catch(()=>{});
      });
    }
  }catch(err){
    resultsEl.innerHTML = '<div class="empty-state">Erreur : '+escapeHtml(err.message)+'</div>';
  }
}
function toggleSearchOverview(idx){
  const el = document.getElementById('sr-overview-' + idx);
  if(el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function parseTmdbLink(input){
  // Formats acceptés : https://www.themoviedb.org/movie/12345-titre, /tv/12345-titre, ou juste l'ID
  const match = input.match(/themoviedb\.org\/(movie|tv)\/(\d+)/);
  if(match) return { type: match[1], id: parseInt(match[2], 10) };
  if(/^\d+$/.test(input.trim())) return { type: currentSearchType, id: parseInt(input.trim(), 10) };
  return null;
}
async function addFromTmdbLink(){
  const cfg = getCfg();
  if(!cfg.tmdb_key){
    showToast('Configure ta clé API TMDB dans les Paramètres', 'error');
    return;
  }
  const raw = document.getElementById('tmdb-link-input').value.trim();
  if(!raw) return;
  const parsed = parseTmdbLink(raw);
  if(!parsed){
    showToast('Lien TMDB non reconnu. Format attendu : https://www.themoviedb.org/movie/12345-titre', 'error');
    return;
  }
  currentSearchType = parsed.type;
  await addFromTmdb(parsed.id);
}

async function addFromTmdb(tmdbId){
  const cfg = getCfg();
  showToast('Récupération des informations...', '');
  try{
    if(currentSearchType === 'movie'){
      const url = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${cfg.tmdb_key}&language=fr-FR&append_to_response=credits,external_ids`;
      const res = await fetch(url);
      const d = await res.json();
      const director = (d.credits?.crew||[]).find(c=>c.job==='Director');
      const film = {
        id: 'm'+d.id,
        tmdb_id: d.id,
        imdb_id: d.external_ids?.imdb_id || null,
        titre: d.title,
        annee: d.release_date ? d.release_date.substring(0,4) : null,
        realisateur: director ? director.name : '',
        affiche_url: d.poster_path ? TMDB_IMG + d.poster_path : '',
        synopsis: d.overview || '',
        genres: (d.genres||[]).map(g=>g.name),
        casting: (d.credits?.cast||[]).slice(0,10).map(c=>c.name),
        duree: d.runtime || null,
        vu: false,
        priorite: 'normal',
        date_ajout: new Date().toISOString()
      };
      if(pendingNytimesIndex !== null){
        // Ajout depuis l'onglet 100 NYTimes : collection totalement séparée de "Ma liste"
        const idx = pendingNytimesIndex;
        pendingNytimesIndex = null;
        if(state.nytimes.find(f=>f.tmdb_id===d.id)){
          showToast('Ce film est déjà dans ta liste NYTimes', 'error');
          return;
        }
        film.nytimes_index = idx;
        state.nytimes.push(film);
        saveLocalState();
        renderNytimesList();
        showToast('Film ajouté à la liste NYTimes : ' + film.titre, 'success');
        closeModal('search-modal');
        return;
      }
      if(state.films.find(f=>f.tmdb_id===d.id)){
        showToast('Ce film est déjà dans ta liste', 'error');
        return;
      }
      state.films.push(film);
      saveLocalState();
      renderFilms();
      showToast('Film ajouté : ' + film.titre, 'success');
      closeModal('search-modal');
    } else {
      const url = `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${cfg.tmdb_key}&language=fr-FR&append_to_response=credits,external_ids`;
      const res = await fetch(url);
      const d = await res.json();
      if(state.series.find(s=>s.tmdb_id===d.id)){
        showToast('Cette série est déjà dans ta liste', 'error');
        return;
      }
      const saisons = [];
      for(const season of (d.seasons||[])){
        if(season.season_number === 0) continue; // on saute les "Spécials" par défaut
        const seasonUrl = `https://api.themoviedb.org/3/tv/${tmdbId}/season/${season.season_number}?api_key=${cfg.tmdb_key}&language=fr-FR`;
        const sres = await fetch(seasonUrl);
        const sd = await sres.json();
        saisons.push({
          numero: season.season_number,
          episodes: (sd.episodes||[]).map(ep=>({
            numero: ep.episode_number,
            titre: ep.name,
            date_diffusion: ep.air_date,
            duree: ep.runtime || null,
            vu: false,
            nouveau: false
          }))
        });
      }
      const dureeMoyenne = (d.episode_run_time && d.episode_run_time.length)
        ? Math.round(d.episode_run_time.reduce((a,b)=>a+b,0) / d.episode_run_time.length)
        : null;
      const serie = {
        id: 's'+d.id,
        tmdb_id: d.id,
        imdb_id: d.external_ids?.imdb_id || null,
        titre: d.name,
        annee: d.first_air_date ? d.first_air_date.substring(0,4) : null,
        createur: (d.created_by||[]).map(c=>c.name).join(', '),
        affiche_url: d.poster_path ? TMDB_IMG + d.poster_path : '',
        synopsis: d.overview || '',
        genres: (d.genres||[]).map(g=>g.name),
        casting: (d.credits?.cast||[]).slice(0,10).map(c=>c.name),
        date_ajout: new Date().toISOString(),
        suivie: true,
        priorite: 'normal',
        duree_moyenne_ep: dureeMoyenne,
        saisons
      };
      state.series.push(serie);
      saveLocalState();
      renderSeries();
      showToast('Série ajoutée : ' + serie.titre, 'success');
      closeModal('search-modal');
    }
  }catch(err){
    showToast("Erreur lors de l'ajout : " + err.message, 'error');
  }
}

// Coeur de la vérification pour UNE série. Ne fait ni toast ni rendu : c'est à l'appelant de le faire.
// Retourne le nombre de nouveaux épisodes trouvés.
async function fetchSeriesUpdates(s, cfg){
  const url = `https://api.themoviedb.org/3/tv/${s.tmdb_id}?api_key=${cfg.tmdb_key}&language=fr-FR`;
  const res = await fetch(url);
  if(!res.ok) throw new Error('Erreur TMDB (' + res.status + ') pour "' + s.titre + '"');
  const d = await res.json();
  if(d.episode_run_time && d.episode_run_time.length){
    s.duree_moyenne_ep = Math.round(d.episode_run_time.reduce((a,b)=>a+b,0) / d.episode_run_time.length);
  }
  let newCount = 0;
  for(const season of (d.seasons||[])){
    if(season.season_number === 0) continue;
    let localSeason = s.saisons.find(sx=>sx.numero===season.season_number);
    const seasonUrl = `https://api.themoviedb.org/3/tv/${s.tmdb_id}/season/${season.season_number}?api_key=${cfg.tmdb_key}&language=fr-FR`;
    const sres = await fetch(seasonUrl);
    const sd = await sres.json();
    if(!localSeason){
      localSeason = { numero: season.season_number, episodes: [] };
      s.saisons.push(localSeason);
    }
    (sd.episodes||[]).forEach(ep=>{
      const exists = localSeason.episodes.find(e=>e.numero===ep.episode_number);
      if(!exists){
        localSeason.episodes.push({
          numero: ep.episode_number,
          titre: ep.name,
          date_diffusion: ep.air_date,
          duree: ep.runtime || null,
          vu: false,
          nouveau: true
        });
        newCount++;
      } else {
        // Épisode déjà connu : on rafraîchit son titre/date/durée (ex: titre provisoire
        // remplacé une fois l'épisode diffusé), sans jamais toucher à son statut vu/nouveau.
        if(ep.name && exists.titre !== ep.name) exists.titre = ep.name;
        if(ep.air_date && exists.date_diffusion !== ep.air_date) exists.date_diffusion = ep.air_date;
        if(exists.duree == null && ep.runtime) exists.duree = ep.runtime;
      }
    });
    localSeason.episodes.sort((a,b)=>a.numero-b.numero);
  }
  s.saisons.sort((a,b)=>a.numero-b.numero);
  return newCount;
}

async function checkSeriesUpdates(serieId){
  const cfg = getCfg();
  const s = state.series.find(x=>String(x.id)===String(serieId));
  if(!s) return;
  showToast('Vérification des nouveautés...', '');
  try{
    const newCount = await fetchSeriesUpdates(s, cfg);
    saveLocalState();
    renderSerieDetailModal();
    renderSeries();
    showToast(newCount>0 ? `${newCount} nouvel(aux) épisode(s) trouvé(s)` : 'Aucun nouvel épisode', newCount>0?'success':'');
  }catch(err){
    showToast('Erreur : ' + err.message, 'error');
  }
}

async function checkAllSeriesUpdates(){
  const cfg = getCfg();
  if(!cfg.tmdb_key){
    showToast('Configure ta clé API TMDB dans les Paramètres', 'error');
    return;
  }
  if(state.series.length === 0){
    showToast('Aucune série à vérifier', '');
    return;
  }
  const btn = document.getElementById('btn-check-all');
  if(btn){ btn.disabled = true; btn.textContent = '🔄 Vérification en cours...'; }
  let totalNew = 0;
  let errors = 0;
  for(const s of state.series){
    try{
      totalNew += await fetchSeriesUpdates(s, cfg);
    }catch(err){
      errors++;
    }
  }
  saveLocalState();
  renderSeries();
  if(openDetailId) renderSerieDetailModal();
  if(btn){ btn.disabled = false; btn.textContent = '🔄 Vérifier toutes les séries'; }
  let msg = totalNew>0 ? `${totalNew} nouvel(aux) épisode(s) au total` : 'Aucun nouvel épisode';
  if(errors>0) msg += ` (${errors} série(s) en erreur)`;
  showToast(msg, totalNew>0?'success':(errors>0?'error':''));
}

async function refreshAllMetadata(){
  const cfg = getCfg();
  if(!cfg.tmdb_key){
    showToast('Configure ta clé API TMDB dans les Paramètres', 'error');
    return;
  }
  const total = state.films.length + state.series.length + state.nytimes.length;
  if(total === 0){
    showToast('Aucune fiche à rafraîchir', '');
    return;
  }
  const btn = document.getElementById('btn-refresh-metadata');
  if(btn){ btn.disabled = true; btn.textContent = '🔄 Rafraîchissement en cours...'; }
  let updated = 0, errors = 0;

  async function refreshFilmObject(f){
    const url = `https://api.themoviedb.org/3/movie/${f.tmdb_id}?api_key=${cfg.tmdb_key}&language=fr-FR&append_to_response=credits,external_ids`;
    const res = await fetch(url);
    if(!res.ok) throw new Error('Erreur ' + res.status);
    const d = await res.json();
    const director = (d.credits?.crew||[]).find(c=>c.job==='Director');
    f.titre = d.title || f.titre;
    f.annee = d.release_date ? d.release_date.substring(0,4) : f.annee;
    f.realisateur = director ? director.name : f.realisateur;
    f.affiche_url = d.poster_path ? TMDB_IMG + d.poster_path : f.affiche_url;
    f.synopsis = d.overview || f.synopsis;
    f.genres = (d.genres||[]).map(g=>g.name);
    f.casting = (d.credits?.cast||[]).slice(0,10).map(c=>c.name);
    f.imdb_id = d.external_ids?.imdb_id || f.imdb_id;
    if(d.runtime) f.duree = d.runtime;
  }

  for(const f of state.films){
    try{
      await refreshFilmObject(f);
      updated++;
    }catch(err){
      errors++;
    }
  }

  for(const f of state.nytimes){
    try{
      await refreshFilmObject(f);
      updated++;
    }catch(err){
      errors++;
    }
  }

  for(const s of state.series){
    try{
      const url = `https://api.themoviedb.org/3/tv/${s.tmdb_id}?api_key=${cfg.tmdb_key}&language=fr-FR&append_to_response=credits,external_ids`;
      const res = await fetch(url);
      if(!res.ok) throw new Error('Erreur ' + res.status);
      const d = await res.json();
      s.titre = d.name || s.titre;
      s.annee = d.first_air_date ? d.first_air_date.substring(0,4) : s.annee;
      const createur = (d.created_by||[]).map(c=>c.name).join(', ');
      if(createur) s.createur = createur;
      s.affiche_url = d.poster_path ? TMDB_IMG + d.poster_path : s.affiche_url;
      s.synopsis = d.overview || s.synopsis;
      s.genres = (d.genres||[]).map(g=>g.name);
      s.casting = (d.credits?.cast||[]).slice(0,10).map(c=>c.name);
      s.imdb_id = d.external_ids?.imdb_id || s.imdb_id;
      if(d.episode_run_time && d.episode_run_time.length){
        s.duree_moyenne_ep = Math.round(d.episode_run_time.reduce((a,b)=>a+b,0) / d.episode_run_time.length);
      }
      if(s.suivie === undefined) s.suivie = true;
      updated++;
    }catch(err){
      errors++;
    }
  }

  saveLocalState();
  renderFilms();
  renderSeries();
  renderNytimesList();
  if(openDetailId) renderSerieDetailModal();
  if(btn){ btn.disabled = false; btn.textContent = '🔄 Rafraîchir les métadonnées (films & séries)'; }
  let msg = `${updated} fiche(s) mise(s) à jour`;
  if(errors>0) msg += ` (${errors} en erreur)`;
  showToast(msg, errors>0 && updated===0 ? 'error' : 'success');
}

/* =========================================================
   DECOUVRIR - recommandations TMDB (sorties, tendances, notes)
   ========================================================= */
let discoverLoaded = false;
let discoverData = { nowPlaying: [], trendingMovies: [], trendingTv: [], onAir: [] };

// sortBy : 'vote' (note décroissante, défaut), 'date' (sortie la plus récente en premier,
// pour "au cinéma" où la fraîcheur prime sur la note), ou 'popularity' (on garde l'ordre
// renvoyé par TMDB, déjà classé par tendance/pertinence — ne pas re-trier par note ici).
// Genres de films masqués dans l'onglet Découvrir (TMDB : 27 = Horreur / Épouvante).
const DISCOVER_EXCLUDED_MOVIE_GENRES = [27];

// excludeGenreIds : liste d'identifiants de genres TMDB à écarter (ex: [27] pour l'horreur).
async function fetchTmdbList(url, sortBy, excludeGenreIds){
  sortBy = sortBy || 'vote';
  const res = await fetch(url);
  if(!res.ok) throw new Error('Erreur TMDB (' + res.status + ')');
  const data = await res.json();
  let results = data.results || [];
  if(excludeGenreIds && excludeGenreIds.length){
    results = results.filter(r => !(r.genre_ids || []).some(g => excludeGenreIds.includes(g)));
  }

  if(sortBy === 'popularity'){
    return results.slice(0, 12);
  }

  const minVotes = sortBy === 'date' ? 3 : 20; // les sorties très récentes ont peu de votes, seuil plus bas
  let filtered = results.filter(r => (r.vote_count||0) >= minVotes);
  if(filtered.length < 4) filtered = results; // évite une section vide si peu de votes

  if(sortBy === 'date'){
    filtered = filtered.slice().sort((a,b) => {
      const da = a.release_date || a.first_air_date || '';
      const db = b.release_date || b.first_air_date || '';
      return db.localeCompare(da); // le plus récent en premier
    });
  } else {
    filtered = filtered.slice().sort((a,b) => (b.vote_average||0) - (a.vote_average||0));
  }
  return filtered.slice(0, 12);
}

function renderDiscoverLoading(){
  ['discover-now-playing','discover-trending-movies','discover-trending-tv','discover-on-air'].forEach(id=>{
    document.getElementById(id).innerHTML = '<div class="empty-state">Chargement...</div>';
  });
}

async function loadDiscoverContent(force){
  if(discoverLoaded && !force) return;
  const cfg = getCfg();
  if(!cfg.tmdb_key){
    showToast('Configure ta clé API TMDB dans les Paramètres', 'error');
    return;
  }
  renderDiscoverLoading();
  try{
    const [nowPlaying, trendingMovies, trendingTv, onAir] = await Promise.all([
      fetchTmdbList(`https://api.themoviedb.org/3/movie/now_playing?api_key=${cfg.tmdb_key}&language=fr-FR&region=FR&page=1`, 'date', DISCOVER_EXCLUDED_MOVIE_GENRES),
      fetchTmdbList(`https://api.themoviedb.org/3/trending/movie/week?api_key=${cfg.tmdb_key}&language=fr-FR`, 'popularity', DISCOVER_EXCLUDED_MOVIE_GENRES),
      fetchTmdbList(`https://api.themoviedb.org/3/trending/tv/week?api_key=${cfg.tmdb_key}&language=fr-FR`, 'popularity'),
      fetchTmdbList(`https://api.themoviedb.org/3/tv/on_the_air?api_key=${cfg.tmdb_key}&language=fr-FR`, 'vote')
    ]);
    discoverData = { nowPlaying, trendingMovies, trendingTv, onAir };
    renderDiscoverSection('discover-now-playing', nowPlaying, 'movie');
    renderDiscoverSection('discover-trending-movies', trendingMovies, 'movie');
    renderDiscoverSection('discover-trending-tv', trendingTv, 'tv');
    renderDiscoverSection('discover-on-air', onAir, 'tv');
    discoverLoaded = true;
  }catch(err){
    showToast('Erreur lors du chargement des recommandations : ' + err.message, 'error');
  }
}

function renderDiscoverSection(containerId, items, type){
  const c = document.getElementById(containerId);
  if(!items || items.length===0){
    c.innerHTML = '<div class="empty-state">Rien à afficher pour le moment.</div>';
    return;
  }
  c.innerHTML = items.map(r=>{
    const title = type==='movie' ? r.title : r.name;
    const dateStr = type==='movie' ? r.release_date : r.first_air_date;
    const year = dateStr ? dateStr.substring(0,4) : '';
    const poster = r.poster_path ? TMDB_IMG + r.poster_path : '';
    const note = r.vote_average ? r.vote_average.toFixed(1) : '?';
    const alreadyAdded = type==='movie'
      ? state.films.some(f=>f.tmdb_id===r.id)
      : state.series.some(s=>s.tmdb_id===r.id);
    return `
      <div class="discover-card" style="cursor:pointer;" onclick="openDiscoverDetail(event, ${r.id}, '${type}')">
        <div style="position:relative;">
          <span class="note-badge">★ ${note}</span>
          ${poster ? `<img src="${poster}" alt="">` : `<div class="no-poster">${escapeHtml(title)}</div>`}
        </div>
        <div class="info">
          <div class="title">${escapeHtml(title)}</div>
          <div class="meta">${year}</div>
          ${alreadyAdded
            ? `<button class="btn secondary" disabled style="opacity:.6;">Déjà dans ta liste</button>`
            : `<button class="btn" onclick="event.stopPropagation(); quickAddFromDiscover(${r.id}, '${type}')">+ Ajouter</button>`}
        </div>
      </div>
    `;
  }).join('');
}

async function quickAddFromDiscover(tmdbId, type){
  currentSearchType = type;
  await addFromTmdb(tmdbId);
  renderDiscoverSection('discover-now-playing', discoverData.nowPlaying, 'movie');
  renderDiscoverSection('discover-trending-movies', discoverData.trendingMovies, 'movie');
  renderDiscoverSection('discover-trending-tv', discoverData.trendingTv, 'tv');
  renderDiscoverSection('discover-on-air', discoverData.onAir, 'tv');
}

function findDiscoverItem(tmdbId, type){
  const pools = type === 'movie' ? [discoverData.nowPlaying, discoverData.trendingMovies] : [discoverData.trendingTv, discoverData.onAir];
  for(const pool of pools){
    const found = (pool||[]).find(x => x.id === tmdbId);
    if(found) return found;
  }
  return null;
}

function buildDiscoverDetailHtml(r, type){
  const title = type === 'movie' ? r.title : r.name;
  const dateStr = type === 'movie' ? r.release_date : r.first_air_date;
  const year = dateStr ? dateStr.substring(0,4) : '';
  const poster = r.poster_path ? TMDB_IMG + r.poster_path : '';
  const note = r.vote_average ? r.vote_average.toFixed(1) : '?';
  const alreadyAdded = type === 'movie'
    ? state.films.some(f=>f.tmdb_id===r.id)
    : state.series.some(s=>s.tmdb_id===r.id);
  const tmdbUrl = `https://www.themoviedb.org/${type}/${r.id}`;

  return `
    <button class="close-x" onclick="closeCardFlip()">✕</button>
    <div class="detail-header">
      ${poster ? `<img src="${poster}">` : ''}
      <div>
        <h2 style="margin:0 0 6px;">${escapeHtml(title)} ${year ? `(${year})` : ''}</h2>
        <div class="dh-meta">★ ${note} · <a href="${tmdbUrl}" target="_blank">Voir sur TMDB ↗</a></div>
        <p style="font-size:13px;color:var(--muted);max-width:480px;">${escapeHtml(r.overview || 'Pas de résumé disponible.')}</p>
        ${alreadyAdded
          ? `<button class="btn secondary" disabled style="opacity:.6;">Déjà dans ta liste</button>`
          : `<button class="btn" onclick="quickAddFromDiscover(${r.id}, '${type}').then(closeCardFlip)">+ Ajouter</button>`}
      </div>
    </div>
  `;
}

function openDiscoverDetail(e, tmdbId, type){
  const cardEl = e.currentTarget;
  const r = findDiscoverItem(tmdbId, type);
  if(!r) return;
  startCardFlip(cardEl, buildDiscoverDetailHtml(r, type));
}
