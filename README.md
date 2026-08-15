# Vutheque

https://iwipco.github.io/Vutheque/

# 🎬 Vuthèque

Vuthèque est une application personnelle de suivi de films et séries : que dois-je voir, qu'ai-je déjà vu, quels épisodes me manque-t-il ? Elle tient dans un seul fichier HTML, hébergé gratuitement sur GitHub Pages, sans aucun serveur ni base de données à gérer.

Aucune inscription, aucun compte, aucune pub : tes données t'appartiennent et restent sous ton contrôle.

## ✨ Fonctionnalités

- **4 pages principales** : 👀 À voir · 🎬 Films · 📺 Séries · 📊 Tableau de bord
- **Recherche automatique** de films/séries via [TMDB](https://www.themoviedb.org/) : affiche, synopsis, casting, réalisateur/créateur, genres, durée, saisons et épisodes récupérés automatiquement
- **Suivi des séries épisode par épisode**, avec détection des nouveaux épisodes et exclusion automatique des épisodes pas encore diffusés
- **Vue "À voir"** : le prochain épisode de chaque série, et la liste des films non vus, pour savoir en un coup d'œil quoi regarder ensuite
- **Priorités** (Low / Normal / High / Urgent) pour classer ce qui presse
- **Tag "recommandé par"**, liens cliquables et commentaire libre sur chaque fiche
- **Découverte** : films actuellement au cinéma (France), films populaires du moment, séries tendances, séries avec nouveaux épisodes
- **Programme de cinéma** intégré (lien direct + aperçu RSS si disponible)
- **Tableau de bord** : statistiques de progression, temps de visionnage restant/déjà passé (en heures/jours/semaines/mois)
- **Sauvegarde sur GitHub** : export/import JSON manuel, ou synchronisation automatique vers un dépôt GitHub dédié, avec détection de conflit si le fichier a été modifié ailleurs
- **Installable comme une app** sur iPhone/iPad (Safari → "Sur l'écran d'accueil") et sur Windows/Edge
- **Raccourcis clavier** : `N` nouveau film/série, `V` marquer vu/non vu, `Échap` fermer une fenêtre

## 🚀 Installation

1. Crée un dépôt GitHub (public ou privé) et active **GitHub Pages** dessus (Settings → Pages → Deploy from branch).
2. Place ces fichiers à la racine du dépôt :
   - `index.html`
   - `manifest.json`
   - `apple-touch-icon.png`
   - `icon-512.png`
3. Ouvre l'URL de ton GitHub Pages : ton app est en ligne.

## ⚙️ Configuration

Tout se fait dans l'onglet **⚙️ Paramètres** de l'application.

### Clé API TMDB (obligatoire pour ajouter des films/séries)

1. Crée un compte gratuit sur [themoviedb.org](https://www.themoviedb.org/)
2. Va dans **Paramètres → API**, demande une clé (usage "application personnelle")
3. Colle la clé dans Paramètres → Clé API TMDB

### Synchronisation GitHub (optionnelle mais recommandée)

Pour retrouver tes données sur tous tes appareils :

1. Crée un **second dépôt GitHub**, dédié uniquement aux données (ex : `mes-films-series-data`), avec un fichier `data.json` contenant `{"films":[],"series":[]}`
2. Crée un token d'accès personnel **fine-grained**, restreint à ce seul dépôt, avec la permission **Contents: Read and write**
3. Renseigne le propriétaire, le nom du dépôt et le token dans Paramètres → Synchronisation GitHub
4. Active la sauvegarde automatique si tu veux qu'elle se fasse toute seule après chaque action

> Le dépôt de données est volontairement séparé du dépôt de code : le token n'a ainsi jamais accès au code de l'application.

### Programme de cinéma (optionnel)

Colle l'URL de la page "à l'affiche" ou "horaires" de ton cinéma dans Paramètres → Mon cinéma. Elle apparaîtra dans l'onglet Découvrir.

## 📱 Installer comme une application

**iPhone / iPad (Safari)** : ouvre le site → bouton Partager → "Sur l'écran d'accueil".

**Windows / Edge** : ouvre le site → menu (⋯) → "Applications" → "Installer ce site en tant qu'application".

## 🗂️ Structure des données

Toutes les données (films, séries, épisodes vus, priorités, commentaires...) sont stockées :
- **Localement** dans le `localStorage` du navigateur (instantané, hors ligne)
- **Sur GitHub** si la synchronisation est activée, dans un simple fichier `data.json` lisible et versionné comme n'importe quel fichier de code

Aucune donnée n'est envoyée à un serveur tiers, à l'exception des appels à l'API TMDB (recherche de films/séries) et à l'API GitHub (sauvegarde).

## ⚠️ Limites connues

- La sauvegarde automatique GitHub écrase le fichier distant (pas de fusion intelligente) ; un garde-fou avertit en cas de modification concurrente détectée, mais la résolution reste manuelle.
- Les durées d'épisodes dépendent des données fournies par TMDB (parfois absentes pour les séries peu renseignées) ; une estimation par défaut est utilisée si besoin.
- Le programme de cinéma dépend de l'autorisation CORS du site du cinéma : l'aperçu automatique peut ne pas fonctionner selon les cinémas, un lien direct reste toujours disponible.

## 🛠️ Stack technique

Un seul fichier HTML/CSS/JavaScript vanilla, sans framework ni dépendance à builder. Utilise l'API TMDB et l'API GitHub (Contents API) directement depuis le navigateur.
