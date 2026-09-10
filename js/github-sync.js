/* =========================================================
   EXPORT / IMPORT / GITHUB
   ========================================================= */
function exportJSON(){
  const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'vutheque-data.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Export terminé', 'success');
}
function importJSON(file){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (e)=>{
    try{
      const data = JSON.parse(e.target.result);
      if(!data.films || !data.series) throw new Error('Format invalide');
      if(!data.nytimes) data.nytimes = [];
      state = data;
      saveLocalState();
      renderFilms();
      renderSeries();
      renderNytimesList();
      showToast('Import réussi', 'success');
    }catch(err){
      showToast("Erreur d'import : " + err.message, 'error');
    }
  };
  reader.readAsText(file);
}
function resetAll(){
  if(!confirm('Cela efface toutes les données locales (films/séries/liste NYTimes). Continuer ?')) return;
  state = {films:[], series:[], nytimes:[]};
  saveLocalState();
  setLastRemoteSha(null);
  renderFilms();
  renderSeries();
  renderNytimesList();
  showToast('Données réinitialisées', 'success');
}

function utf8_to_b64(str){
  return btoa(unescape(encodeURIComponent(str)));
}
function b64_to_utf8(str){
  return decodeURIComponent(escape(atob(str)));
}

let ghSaveInProgress = false;
let ghSavePending = false;
const LS_SYNC_SHA = 'watchlist_last_remote_sha';
function getLastRemoteSha(){ return localStorage.getItem(LS_SYNC_SHA); }
function setLastRemoteSha(sha){
  if(sha) localStorage.setItem(LS_SYNC_SHA, sha);
  else localStorage.removeItem(LS_SYNC_SHA);
}

async function ghSave(silent){
  const cfg = getCfg();
  if(!cfg.gh_owner || !cfg.gh_repo || !cfg.gh_token){
    if(!silent) showToast("Configure d'abord GitHub dans les Paramètres", 'error');
    return;
  }

  // Si une sauvegarde est déjà en cours, on ne lance pas de requête concurrente
  // (c'est la cause la plus fréquente d'erreur "409 sha invalide") : on note juste
  // qu'une nouvelle sauvegarde sera nécessaire juste après celle en cours.
  if(ghSaveInProgress){
    ghSavePending = true;
    return;
  }
  ghSaveInProgress = true;

  const path = cfg.gh_path || 'data.json';
  const branch = cfg.gh_branch || 'main';
  const apiUrl = `https://api.github.com/repos/${cfg.gh_owner}/${cfg.gh_repo}/contents/${path}`;
  if(!silent) showToast('Sauvegarde sur GitHub...', '');

  try{
    const result = await ghSaveAttempt(apiUrl, branch, cfg, silent);
    if(result === 'cancelled'){
      showToast('Sauvegarde annulée — charge la version distante avant de réessayer', '');
    } else if(result === 'conflict-skipped'){
      showToast('⚠️ Sauvegarde auto interrompue : le fichier a changé sur GitHub (autre appareil ?). Sauvegarde manuellement pour résoudre.', 'error');
    } else {
      document.getElementById('last-save-note').textContent = 'Dernière sauvegarde GitHub : ' + new Date().toLocaleString() + (silent ? ' (auto)' : '');
      showToast(silent ? 'Sauvegarde automatique effectuée ✅' : 'Sauvegardé sur GitHub ✅', 'success');
    }
  }catch(err){
    showToast('Erreur GitHub' + (silent ? ' (auto)' : '') + ' : ' + err.message, 'error');
  }finally{
    ghSaveInProgress = false;
    if(ghSavePending){
      ghSavePending = false;
      ghSave(true); // on rejoue la sauvegarde manquée, silencieusement
    }
  }
}

// Effectue GET (sha) + PUT. En cas de conflit 409 (sha périmé, ex: fichier modifié
// entre-temps sur GitHub, depuis un autre onglet/appareil, ou plusieurs modifications
// rapprochées), on retente jusqu'à 3 fois avec un sha frais et un petit délai aléatoire
// avant d'abandonner et de remonter une erreur claire.
//
// Garde-fou anti-écrasement (option 1) : avant d'écrire, on compare le sha distant
// actuel à celui qu'on avait vu la dernière fois qu'on a chargé/sauvegardé avec
// succès. S'ils diffèrent, quelqu'un d'autre (un autre appareil/onglet) a modifié
// le fichier entre-temps : on demande confirmation (sauvegarde manuelle) ou on
// abandonne silencieusement (sauvegarde automatique), plutôt que d'écraser sans prévenir.
async function ghSaveAttempt(apiUrl, branch, cfg, silent){
  const maxAttempts = 3;
  for(let attempt = 1; attempt <= maxAttempts; attempt++){
    let sha = null;
    // cache:'no-store' + paramètre unique : on veut TOUJOURS le sha le plus récent,
    // jamais une réponse mise en cache par le navigateur (source probable des conflits persistants).
    const getRes = await fetch(apiUrl + '?ref=' + branch + '&_=' + Date.now(), {
      cache: 'no-store',
      headers: { 'Authorization': 'Bearer ' + cfg.gh_token, 'Accept':'application/vnd.github+json' }
    });
    if(getRes.ok){
      const getData = await getRes.json();
      sha = getData.sha;
    } else if(getRes.status === 401 || getRes.status === 403){
      throw new Error('Accès refusé (' + getRes.status + ') — vérifie que ton token GitHub est valide et a bien les droits sur ce dépôt.');
    } else if(getRes.status !== 404){
      throw new Error('Lecture du fichier échouée (' + getRes.status + ')');
    }

    if(attempt === 1){
      const known = getLastRemoteSha();
      if(known && sha && known !== sha){
        if(silent){
          return 'conflict-skipped';
        }
        const proceed = confirm(
          "Le fichier sur GitHub a été modifié depuis ta dernière synchronisation sur cet appareil " +
          "(probablement depuis un autre appareil ou onglet).\n\n" +
          "Écraser quand même avec la version de cet appareil ?\n\n" +
          "Annuler pour charger d'abord la version distante (via \"Charger depuis GitHub\")."
        );
        if(!proceed) return 'cancelled';
      }
    }

    const content = utf8_to_b64(JSON.stringify(state, null, 2));
    const putRes = await fetch(apiUrl, {
      method:'PUT',
      cache: 'no-store',
      headers: { 'Authorization': 'Bearer ' + cfg.gh_token, 'Accept':'application/vnd.github+json' },
      body: JSON.stringify({
        message: 'Mise à jour watchlist - ' + new Date().toISOString(),
        content,
        branch,
        sha: sha || undefined
      })
    });
    if(putRes.ok){
      const putData = await putRes.json().catch(()=>({}));
      setLastRemoteSha(putData?.content?.sha || null);
      return 'ok';
    }

    if(putRes.status === 409 && attempt < maxAttempts){
      await new Promise(r => setTimeout(r, 250 + Math.random() * 350)); // petit délai avant de retenter avec un sha frais
      continue;
    }
    const errData = await putRes.json().catch(()=>({}));
    const hint = putRes.status === 409
      ? ' (conflit persistant : peut-être un autre onglet/appareil qui sauvegarde en même temps)'
      : (putRes.status === 422 ? ' (fichier peut-être trop volumineux pour cette méthode, ou branche/chemin invalide)' : '');
    throw new Error((errData.message || ('Erreur ' + putRes.status)) + hint);
  }
  throw new Error('Échec de la sauvegarde après plusieurs tentatives.');
}

async function ghLoad(){
  const cfg = getCfg();
  if(!cfg.gh_owner || !cfg.gh_repo || !cfg.gh_token){
    showToast("Configure d'abord GitHub dans les Paramètres", 'error');
    return;
  }
  const path = cfg.gh_path || 'data.json';
  const branch = cfg.gh_branch || 'main';
  const apiUrl = `https://api.github.com/repos/${cfg.gh_owner}/${cfg.gh_repo}/contents/${path}?ref=${branch}&_=${Date.now()}`;
  showToast('Chargement depuis GitHub...', '');
  try{
    const res = await fetch(apiUrl, {
      cache: 'no-store',
      headers: { 'Authorization': 'Bearer ' + cfg.gh_token, 'Accept':'application/vnd.github+json' }
    });
    if(!res.ok) throw new Error('Erreur ' + res.status);
    const data = await res.json();
    const jsonStr = b64_to_utf8(data.content.replace(/[\n\r]/g, ''));
    const parsed = JSON.parse(jsonStr);
    if(!parsed.films || !parsed.series) throw new Error('Format invalide dans le fichier distant');
    if(!parsed.nytimes) parsed.nytimes = [];
    state = parsed;
    saveLocalState();
    setLastRemoteSha(data.sha);
    renderFilms();
    renderSeries();
    renderNytimesList();
    showToast('Données chargées depuis GitHub ✅', 'success');
  }catch(err){
    showToast('Erreur GitHub : ' + err.message, 'error');
  }
}
