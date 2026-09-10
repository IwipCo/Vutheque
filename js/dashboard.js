/* =========================================================
   DASHBOARD
   ========================================================= */
function watchedCount(serie){
  let n=0;
  (serie.saisons||[]).forEach(s=> s.episodes.forEach(e=>{ if(e.vu) n++; }));
  return n;
}

function getFilmDuration(f){
  return f.duree || 110; // estimation moyenne si TMDB n'a pas fourni la durée du film
}

function renderTopDirectors(){
  const counts = {};
  [...state.films, ...state.nytimes].forEach(f=>{
    if(!f.vu) return;
    const dir = (f.realisateur||'').trim();
    if(!dir) return;
    counts[dir] = (counts[dir]||0) + 1;
  });
  const rows = Object.entries(counts)
    .map(([name,count])=>({name,count}))
    .sort((a,b)=>b.count-a.count)
    .slice(0,5);
  const c = document.getElementById('dash-top-directors');
  if(rows.length === 0){
    c.innerHTML = '<div class="empty-state">Pas encore de films vus avec réalisateur renseigné.</div>';
    return;
  }
  const max = Math.max(1, rows[0].count);
  c.innerHTML = rows.map(r=>`
    <div class="dash-row">
      <div class="label">${escapeHtml(r.name)}</div>
      <div class="dash-bar-bg"><div class="dash-bar" style="width:${Math.max(6,(r.count/max)*100)}%">${r.count} film${r.count>1?'s':''}</div></div>
    </div>
  `).join('');
}

function renderDashboard(){
  const totalFilms = state.films.length;
  const filmsWatched = state.films.filter(f=>f.vu).length;
  const nytimesAdded = state.nytimes.length;
  const nytimesWatched = state.nytimes.filter(f=>f.vu).length;

  let filmMinutesWatched = 0;
  state.films.forEach(f=>{ if(f.vu) filmMinutesWatched += getFilmDuration(f); });
  state.nytimes.forEach(f=>{ if(f.vu) filmMinutesWatched += getFilmDuration(f); });

  document.getElementById('stat-cards-films').innerHTML = `
    <div class="stat-card"><div class="num">${filmsWatched}/${totalFilms}</div><div class="lbl">Films vus (Ma liste)</div></div>
    <div class="stat-card"><div class="num">${nytimesWatched}/100</div><div class="lbl">Films vus (100 NYTimes)</div></div>
    <div class="stat-card"><div class="num">${formatDurationWithHours(filmMinutesWatched)}</div><div class="lbl">Temps de films vu au total</div></div>
  `;

  renderTopDirectors();

  const totalSeries = state.series.length;
  let totalEp=0, unwEp=0, unwMinutes=0, watchedMinutes=0;
  state.series.forEach(s=>{
    totalEp += totalCount(s);
    unwEp += unwatchedCount(s);
    unwMinutes += unwatchedDurationMinutes(s);
    watchedMinutes += watchedDurationMinutes(s);
  });

  document.getElementById('stat-cards-series').innerHTML = `
    <div class="stat-card"><div class="num">${totalSeries}</div><div class="lbl">Séries suivies</div></div>
    <div class="stat-card"><div class="num">${totalEp - unwEp}/${totalEp}</div><div class="lbl">Épisodes vus</div></div>
    <div class="stat-card"><div class="num">${unwEp}</div><div class="lbl">Épisodes à voir</div></div>
    <div class="stat-card"><div class="num">${formatDurationWithHours(unwMinutes)}</div><div class="lbl">Temps restant estimé</div></div>
    <div class="stat-card"><div class="num">${formatDurationWithHours(watchedMinutes)}</div><div class="lbl">Temps regardé au total</div></div>
  `;

  // Graphique 1 : épisodes non vus
  const unwRows = state.series
    .filter(s => s.suivie !== false)
    .map(s => ({ titre: s.titre, id: s.id, count: unwatchedCount(s), minutes: unwatchedDurationMinutes(s) }))
    .filter(r => r.count > 0)
    .sort((a,b) => b.count - a.count);
  const unwMax = unwRows.length ? Math.max(1, unwRows[0].count) : 1;
  const chart = document.getElementById('dash-chart');
  if(unwRows.length===0){
    chart.innerHTML = '<div class="empty-state">Tout est à jour 🎉</div>';
  } else {
    chart.innerHTML = unwRows.map(r=>`
      <div class="dash-row" onclick="openSerieDetail('${r.id}')">
        <div class="label">${escapeHtml(r.titre)}</div>
        <div class="dash-bar-bg"><div class="dash-bar" style="width:${Math.max(6,(r.count/unwMax)*100)}%">${r.count}${r.minutes ? ' · ' + formatDuration(r.minutes) : ''}</div></div>
      </div>
    `).join('');
  }

  // Graphique 2 : épisodes vus
  const watchedRows = state.series
    .map(s => ({ titre: s.titre, id: s.id, count: watchedCount(s), minutes: watchedDurationMinutes(s) }))
    .filter(r => r.count > 0)
    .sort((a,b) => b.count - a.count);
  const watchedMax = watchedRows.length ? Math.max(1, watchedRows[0].count) : 1;
  const chartWatched = document.getElementById('dash-chart-watched');
  if(watchedRows.length===0){
    chartWatched.innerHTML = '<div class="empty-state">Aucun épisode vu pour le moment.</div>';
  } else {
    chartWatched.innerHTML = watchedRows.map(r=>`
      <div class="dash-row" onclick="openSerieDetail('${r.id}')">
        <div class="label">${escapeHtml(r.titre)}</div>
        <div class="dash-bar-bg"><div class="dash-bar" style="width:${Math.max(6,(r.count/watchedMax)*100)}%;background:linear-gradient(90deg, var(--accent-2), var(--accent));">${r.count}${r.minutes ? ' · ' + formatDuration(r.minutes) : ''}</div></div>
      </div>
    `).join('');
  }

  // Top 5 réalisateurs, Ma liste + 100 NYTimes réunis
  const directorCounts = {};
  [...state.films, ...state.nytimes].forEach(f=>{
    const name = (f.realisateur || '').trim();
    if(!name) return;
    directorCounts[name] = (directorCounts[name] || 0) + 1;
  });
  const topDirectors = Object.entries(directorCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a,b) => b.count - a.count)
    .slice(0, 5);
  const topDirectorsMax = topDirectors.length ? Math.max(1, topDirectors[0].count) : 1;
  const dashTopDirectors = document.getElementById('dash-top-directors');
  if(topDirectors.length === 0){
    dashTopDirectors.innerHTML = '<div class="empty-state">Pas encore assez de films avec réalisateur renseigné.</div>';
  } else {
    dashTopDirectors.innerHTML = topDirectors.map(r=>`
      <div class="dash-row">
        <div class="label">${escapeHtml(r.name)}</div>
        <div class="dash-bar-bg"><div class="dash-bar" style="width:${Math.max(6,(r.count/topDirectorsMax)*100)}%;background:linear-gradient(90deg, var(--warn), var(--danger));">${r.count} film${r.count>1?'s':''}</div></div>
      </div>
    `).join('');
  }
}
