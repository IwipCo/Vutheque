/* =========================================================
   MODALS génériques
   ========================================================= */
function openModal(id){
  if(id === 'detail-modal'){ handleDetailModalOpen(); return; }
  document.getElementById(id).classList.add('open');
}
function closeModal(id){
  if(id === 'detail-modal'){ closeDetailFlip(); return; }
  if(id === 'search-modal'){ pendingNytimesIndex = null; }
  document.getElementById(id).classList.remove('open');
}
document.querySelectorAll('.modal-overlay').forEach(ov=>{
  ov.addEventListener('click', (e)=>{ if(e.target === ov) closeModal(ov.id); });
});
function openAddForCurrentTab(){
  const activeNav = document.querySelector('#main-nav button.active');
  const view = activeNav ? activeNav.dataset.view : 'films';
  if(view === 'series') openSearchModal('tv');
  else openSearchModal('movie'); // par défaut (films, dashboard, ou paramètres) on propose d'ajouter un film
}

/* Filet de sécurité : force l'enregistrement des infos complémentaires en cours de
   frappe si l'app passe en arrière-plan (changement d'app, verrouillage d'écran...),
   un cas fréquent sur mobile où le clavier ne déclenche pas toujours un blur propre. */
document.addEventListener('visibilitychange', ()=>{
  if(document.hidden) flushExtraInfoIfPending();
});
window.addEventListener('pagehide', flushExtraInfoIfPending);

/* =========================================================
   RACCOURCIS CLAVIER
   N : nouveau film / série (selon l'onglet actif)
   V : marquer vu / non vu (fiche film ouverte)
   Echap : fermer la fenêtre ouverte
   ========================================================= */
document.addEventListener('keydown', (e)=>{
  const tag = (e.target.tagName || '').toLowerCase();
  const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;

  if(e.key === 'Escape'){
    document.querySelectorAll('.modal-overlay.open').forEach(ov=>closeModal(ov.id));
    if(detailFlipOpen) closeDetailFlip();
    return;
  }

  if(typing) return; // on ne déclenche jamais N/V pendant une saisie

  if(e.key === 'n' || e.key === 'N'){
    const activeNav = document.querySelector('#main-nav button.active');
    if(!activeNav) return;
    e.preventDefault();
    openAddForCurrentTab();
  }

  if(e.key === 'v' || e.key === 'V'){
    if(!detailFlipOpen || !openDetailId) return;
    if(openDetailType === 'film'){
      e.preventDefault();
      toggleFilmWatched(openDetailId);
    } else if(openDetailType === 'nytimes'){
      e.preventDefault();
      toggleNytimesWatched(openDetailId);
    }
  }
});
