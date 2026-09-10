/* =========================================================
   ETAT / STOCKAGE
   ========================================================= */
const APP_VERSION = '0.49';

let state = { films: [], series: [], nytimes: [] };
let filmsView = 'card';
let seriesView = 'card';
let currentSearchType = 'movie';
let lastSearchResults = [];
let openDetailId = null;
let openDetailType = null;

const LS_STATE = 'watchlist_data';
const LS_CFG = 'watchlist_config';

function loadLocalState(){
  const raw = localStorage.getItem(LS_STATE);
  if(raw){
    try{ state = JSON.parse(raw); }catch(e){ state = {films:[], series:[], nytimes:[]}; }
  }
  if(!state.films) state.films = [];
  if(!state.series) state.series = [];
  if(!state.nytimes) state.nytimes = [];
}
function saveLocalState(){
  localStorage.setItem(LS_STATE, JSON.stringify(state));
  scheduleAutoSave();
}

let autoSaveTimer = null;
function scheduleAutoSave(){
  const cfg = getCfg();
  if(!cfg.auto_save) return;
  if(!cfg.gh_owner || !cfg.gh_repo || !cfg.gh_token) return;
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(()=>{ ghSave(true); }, 4000);
}
function getCfg(){
  const raw = localStorage.getItem(LS_CFG);
  return raw ? JSON.parse(raw) : {};
}
function setCfg(cfg){
  localStorage.setItem(LS_CFG, JSON.stringify(cfg));
}

function saveSettings(){
  const previous = getCfg();
  const cfg = {
    tmdb_key: document.getElementById('cfg-tmdb-key').value.trim(),
    cinema_url: document.getElementById('cfg-cinema-url').value.trim(),
    gh_owner: document.getElementById('cfg-gh-owner').value.trim(),
    gh_repo: document.getElementById('cfg-gh-repo').value.trim(),
    gh_branch: document.getElementById('cfg-gh-branch').value.trim() || 'main',
    gh_path: document.getElementById('cfg-gh-path').value.trim() || 'data.json',
    gh_token: document.getElementById('cfg-gh-token').value.trim(),
    auto_save: document.getElementById('cfg-auto-save').checked,
    show_recommender: document.getElementById('cfg-show-recommender').checked,
  };
  setCfg(cfg);
  // Si la cible du dépôt/fichier change, l'ancien repère de synchro n'a plus de sens.
  if(previous.gh_owner !== cfg.gh_owner || previous.gh_repo !== cfg.gh_repo ||
     previous.gh_branch !== cfg.gh_branch || previous.gh_path !== cfg.gh_path){
    setLastRemoteSha(null);
  }
  renderFilms();
  renderSeries();
  showToast('Paramètres enregistrés', 'success');
}
function loadSettingsIntoForm(){
  const cfg = getCfg();
  document.getElementById('cfg-tmdb-key').value = cfg.tmdb_key || '';
  document.getElementById('cfg-cinema-url').value = cfg.cinema_url || '';
  document.getElementById('cfg-gh-owner').value = cfg.gh_owner || '';
  document.getElementById('cfg-gh-repo').value = cfg.gh_repo || '';
  document.getElementById('cfg-gh-branch').value = cfg.gh_branch || 'main';
  document.getElementById('cfg-gh-path').value = cfg.gh_path || 'data.json';
  document.getElementById('cfg-gh-token').value = cfg.gh_token || '';
  document.getElementById('cfg-auto-save').checked = !!cfg.auto_save;
  document.getElementById('cfg-show-recommender').checked = !!cfg.show_recommender;
}

/* ---- Export / import / lien de configuration ---- */
function exportConfig(){
  const cfg = getCfg();
  const blob = new Blob([JSON.stringify(cfg, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'vutheque-config.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Paramètres exportés', 'success');
}
function importConfig(file){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (e)=>{
    try{
      const cfg = JSON.parse(e.target.result);
      setCfg(cfg);
      loadSettingsIntoForm();
      showToast('Paramètres importés', 'success');
    }catch(err){
      showToast("Erreur d'import des paramètres : " + err.message, 'error');
    }
  };
  reader.readAsText(file);
}
function cfgToUrlSafeB64(cfg){
  return utf8_to_b64(JSON.stringify(cfg)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function urlSafeB64ToCfg(str){
  let b64 = str.replace(/-/g,'+').replace(/_/g,'/');
  while(b64.length % 4) b64 += '=';
  return JSON.parse(b64_to_utf8(b64));
}
function generateConfigLink(){
  const cfg = getCfg();
  const encoded = cfgToUrlSafeB64(cfg);
  const base = location.origin + location.pathname;
  const link = base + '#cfg=' + encoded;
  document.getElementById('config-link-output').value = link;
  document.getElementById('config-link-box').style.display = 'block';
  showToast('Lien généré — garde-le privé', 'success');
}
function copyConfigLink(){
  const el = document.getElementById('config-link-output');
  el.select();
  navigator.clipboard.writeText(el.value).then(()=>{
    showToast('Lien copié', 'success');
  }).catch(()=>{
    showToast('Copie impossible, sélectionne et copie manuellement', 'error');
  });
}
function loadConfigFromUrlIfPresent(){
  const hash = location.hash;
  if(!hash || hash.indexOf('cfg=') === -1) return;
  try{
    const encoded = hash.split('cfg=')[1];
    const cfg = urlSafeB64ToCfg(decodeURIComponent(encoded));
    setCfg(cfg);
    showToast('Paramètres chargés depuis le lien', 'success');
  }catch(err){
    showToast('Lien de configuration invalide', 'error');
  }finally{
    // On retire le hash de l'URL/historique pour ne pas laisser le token visible
    history.replaceState(null, '', location.pathname + location.search);
  }
}

/* =========================================================
   NAVIGATION
   ========================================================= */
document.getElementById('main-nav').addEventListener('click', (e)=>{
  const btn = e.target.closest('button[data-view]');
  if(!btn) return;
  document.querySelectorAll('#main-nav button').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-' + btn.dataset.view).classList.add('active');
  if(btn.dataset.view === 'dashboard') renderDashboard();
  if(btn.dataset.view === 'avoir') renderAvoirSeries(); // l'onglet Séries est actif par défaut
});
document.getElementById('btn-settings').addEventListener('click', ()=>{
  document.querySelectorAll('#main-nav button').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-settings').classList.add('active');
  loadSettingsIntoForm();
});

function setFilmsView(v){
  filmsView = v;
  document.getElementById('films-view-card').classList.toggle('active', v==='card');
  document.getElementById('films-view-compact').classList.toggle('active', v==='compact');
  document.getElementById('films-view-list').classList.toggle('active', v==='list');
  renderFilms();
}
function setSeriesView(v){
  seriesView = v;
  document.getElementById('series-view-card').classList.toggle('active', v==='card');
  document.getElementById('series-view-compact').classList.toggle('active', v==='compact');
  document.getElementById('series-view-list').classList.toggle('active', v==='list');
  document.getElementById('series-view-episodes').classList.toggle('active', v==='episodes');
  renderSeries();
}

/* =========================================================
   TOAST
   ========================================================= */
let toastTimer;
function showToast(msg, type=''){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> t.classList.remove('show'), 3500);
}
