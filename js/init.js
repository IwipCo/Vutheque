/* =========================================================
   INIT
   ========================================================= */
document.getElementById('app-version-settings').textContent = 'v' + APP_VERSION;
loadConfigFromUrlIfPresent();
loadLocalState();
renderFilms();
renderSeries();
renderAvoirSeries();

// Au démarrage (chargement de la page ou F5), si la synchro GitHub est configurée,
// on va chercher la dernière version distante pour ne pas repartir sur des données
// potentiellement obsolètes (modifiées depuis un autre appareil).
(async function autoLoadOnStartup(){
  const cfg = getCfg();
  if(cfg.gh_owner && cfg.gh_repo && cfg.gh_token){
    await ghLoad();
    renderAvoirSeries();
    if(document.getElementById('avoir-films-panel')?.style.display !== 'none' &&
       document.getElementById('avoir-tab-films')?.classList.contains('active')){
      renderAvoirFilms();
    }
  }
})();
