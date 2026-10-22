# HydroGraph — Feuille de route de test et scénarios d'utilisation

> Ce document complète le [README](./README.md). Il sert à vérifier que tout fonctionne avant la démo, et à préparer les réponses aux questions du jury. Cochez au fur et à mesure (`- [ ]` → `- [x]`).

---

## Sommaire

1. [Avant de commencer](#1-avant-de-commencer)
2. [Tests techniques (moteur, build, serveur)](#2-tests-techniques-moteur-build-serveur)
3. [Écran par écran](#3-écran-par-écran)
4. [Scénarios transverses](#4-scénarios-transverses)
5. [Scénarios d'utilisation par profil](#5-scénarios-dutilisation-par-profil)
6. [MétéEau, le chatbot : grille de questions à tester](#6-météeau-le-chatbot--grille-de-questions-à-tester)
7. [Cas limites et pannes à vérifier](#7-cas-limites-et-pannes-à-vérifier)
8. [Responsive : mobile et PC](#8-responsive--mobile-et-pc)
9. [Limites connues (à dire au jury avant qu'on vous le demande)](#9-limites-connues-à-dire-au-jury-avant-quon-vous-le-demande)
10. [Répétition chronométrée de la démo](#10-répétition-chronométrée-de-la-démo)
11. [Checklist finale, 30 minutes avant](#11-checklist-finale-30-minutes-avant)

---

## 1. Avant de commencer

### 1.1 Variables d'environnement (`.env`, et dans Vercel pour la prod)

| Variable | Sert à | Si absente |
|---|---|---|
| `DATABASE_URL` | Neon (abonnés, réseau, historique, notifications) | `/api/*` répond 503 ou erreur |
| `RODIUM_API_KEY`, `RODIUM_API_URL`, `RODIUM_MODEL` | Plan IA (Opérateur) et MétéEau (chatbot) | Repli automatique, pas d'erreur visible |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | Envoi réel WhatsApp | Mode « dry-run », rien n'est envoyé, pas d'erreur |
| `WHATSAPP_VERIFY_TOKEN` | Webhook Meta (STOP/START, accusés) | Le webhook refuse la vérification Meta |
| `ALERTS_LIVE` | `true` = alerte envoyée à tous les abonnés vérifiés ; absente = testeurs réels seulement | - |

- [ ] `.env` local rempli (copier `.env.example`)
- [ ] Les mêmes variables sont dans Vercel → Settings → Environment Variables, pour la version en ligne
- [ ] Après tout changement de variable dans Vercel : **Redeploy**, sinon elle n'est pas prise en compte

### 1.2 Démarrer le projet

```bash
npm install          # lance aussi prisma generate (postinstall)
npm run dev           # http://localhost:5173 — l'appli
npm run api           # http://localhost:8787 — alertes, abonnés, réseau, IA, chatbot
```

- [ ] `npm run dev` démarre sans erreur dans le terminal
- [ ] `npm run api` affiche `API locale sur http://localhost:8787`
- [ ] La page s'ouvre, l'eau du héros s'anime (pas d'écran blanc, pas d'erreur dans la console navigateur)

---

## 2. Tests techniques (moteur, build, serveur)

À lancer dans l'ordre, avant toute démo ou tout déploiement.

```bash
npx tsc -b            # typage : doit être muet (aucune sortie = ok)
npx oxlint             # lint : doit être muet
npx vitest run          # 60+ tests du moteur
npm run build           # build de production (utile hors connexion)
```

- [ ] `tsc -b` : aucune erreur
- [ ] `oxlint` : aucun avertissement
- [ ] `vitest run` : tous les tests passent (moteur, causes, demande, équité, chatbot, IA)
- [ ] `npm run build` réussit, dossier `dist/` généré
- [ ] `npm run preview` (sert `dist/`) : l'appli marche identique à `npm run dev`

### 2.1 Base de données (Neon)

- [ ] `npx prisma studio` ouvre une page et montre les tables : `Subscriber`, `NetworkZone`, `NetworkPipe`, `TowerConfig`, `HistoryPoint`, `Notification`, `NetworkEvent`, `VerificationCode`
- [ ] `npx prisma db seed` (ou `npx tsx prisma/seed.ts`) se rejoue sans erreur et sans dupliquer les abonnés
- [ ] `GET /api/network` renvoie le réseau (tour, 6 zones, 6 conduites)
- [ ] `GET /api/history` renvoie l'historique 7 jours par zone
- [ ] `GET /api/subscribers` renvoie la liste, **numéros masqués** (`•• •• •• XX`), jamais en clair

### 2.2 API testée en ligne de commande (sans ouvrir le navigateur)

```bash
curl -s http://localhost:8787/api/network
curl -s http://localhost:8787/api/history
curl -s http://localhost:8787/api/subscribers
curl -s -X POST http://localhost:8787/api/plan/ai -H 'content-type: application/json' -d '{"event":null}'
curl -s -X POST http://localhost:8787/api/chat -H 'content-type: application/json' -d '{"messages":[{"role":"user","content":"test"}],"snapshot":{}}'
```

- [ ] Les quatre répondent en JSON, sans erreur 500
- [ ] `/api/plan/ai` : `source` vaut `ai` (IA utilisée) ou `fallback` (repli propre, jamais une erreur brute)
- [ ] `/api/chat` renvoie `{ reply, action }`

---

## 3. Écran par écran

### 3.1 Accueil

- [ ] La scène d'eau WebGL s'anime (surface, reflets, bulles) ; sur un appareil sans WebGL2, le dégradé de secours (`.water-fallback`) s'affiche à la place, sans erreur
- [ ] Le titre **HYDROGRAPH** apparaît coupé par la vague, moitié clair moitié immergé
- [ ] Clic sur **« Voir la carte du jour »** → fait défiler jusqu'au panneau
- [ ] Clic sur **« ▶ Lancer la démo »** → ouvre le mode démo guidé à l'étape 1

### 3.2 Carte du jour (`CarteView`)

- [ ] Les 4 tuiles changent bien selon le mode (*Disponibilité* ↔ *Demande prévue*)
- [ ] Barre **Disponibilité / Demande prévue** : bascule correctement, la légende sous la barre change avec
- [ ] Sélecteur de **période** (8 options) : change la demande affichée en mode *Demande prévue*
- [ ] La carte 3D charge (fond CARTO visible) ; le **château d'eau** est repéré avec son étiquette, sous le point bleu pulsant
- [ ] Clic sur une zone (carte ou étiquette) → sélectionne la zone, la fiche se met à jour
- [ ] **Timelapse** (`TimeBar`) : bouton lecture fait défiler 5 h → 22 h, les zones changent de couleur/hauteur en direct
- [ ] **« ⚡ Simuler des incidents »** : le tiroir s'ouvre, les 12 causes sont cliquables par groupe (Énergie, Réseau, Météo, Ressource, Demande), le compteur sur le bouton suit le nombre de causes actives
- [ ] Plusieurs causes cumulées en même temps : le toast de notification les cite toutes, **« Cumulé avec N autre(s) cause(s) »** apparaît à partir de la 2e
- [ ] **« Tout effacer »** (dans le tiroir) → revient à une journée normale, toast disparu
- [ ] **« Recalculer les tours d'eau »** → animation de calcul (1,4 s), bascule vers « Tours d'eau HydroGraph actifs », **« Voir sans »** repasse en arrière
- [ ] Courbe **7 jours** (Z1 vs Z6) se met à jour avec la valeur du jour
- [ ] **« D'où viennent les données ? »** ouvre le panneau des sources, sans erreur

### 3.3 Fiche de zone (`ZoneCard`)

- [ ] Onglet **Aujourd'hui** : heures, créneaux, causes avec heures perdues/gagnées par cause (`−4 h`, `+2 h`, ou foyers exposés en plus), conseil, niveau de confiance, badge **★ Créneau garanti** quand actif, badge **Risque qualité de l'eau** quand actif
- [ ] Onglet **Types d'eau** : les 4 types (robinet, forage, puits, réserve) affichent part des foyers, heures, risque, repli
- [ ] Onglet **Demande** : activités par zone, heure par heure, change avec la période
- [ ] Changer de zone pendant qu'un onglet non `today` est ouvert : l'onglet reste sélectionné, le contenu se met à jour pour la nouvelle zone

### 3.4 Vue Opérateur (`OperatorView`)

- [ ] Plan **Sans HydroGraph** vs **Tours d'eau recalculés** côte à côte, écart entre zones affiché avant/après
- [ ] **« Demander un plan à l'IA »** : la jauge d'eau (`WaterLoader`) s'anime pendant le calcul, se bloque à 100 % une fraction de seconde, puis affiche soit le plan IA validé (badge vert + explication d'une phrase), soit le repli avec la raison en clair
- [ ] Plan de distribution du jour : liste triée par heure de premier créneau
- [ ] **« Modifier le réseau »** (section repliable) : charge le réseau depuis l'API, édition de la tour (nom, capacité, lng/lat), des 6 zones, des 6 conduites ; **Enregistrer** écrit en base et recharge la page
- [ ] Modifier une valeur puis recharger sans enregistrer → la modification non enregistrée disparaît (comportement attendu)

### 3.5 Vue Mairie (`CityHallView`)

- [ ] Indice d'équité (0-100) affiché en gros, avec l'écart en heures entre la zone la mieux et la moins bien servie
- [ ] Classement « Quartiers régulièrement oubliés » : barres colorées proportionnelles aux heures moyennes
- [ ] Carte 3D en dégradé d'équité (moyenne 7 jours), légende visible
- [ ] Les chiffres changent bien si on revient à la Carte, qu'on simule une cause, puis qu'on revient à la Mairie (recalcul, pas de valeurs figées)

### 3.6 Messages aux familles (`FamilyView`)

- [ ] Sélecteur de zone, de langue (Français actif ; Fon/Goun/Yoruba affichent le badge « traduction à valider »), de canal (WhatsApp/SMS)
- [ ] Le téléphone-maquette affiche le message, qui change avec la zone et les causes actives
- [ ] **« ▶ Écouter le message vocal »** : lit le message en français (Web Speech API) ; silencieux sans erreur si le navigateur ne supporte pas la synthèse vocale
- [ ] Liste des abonnés de la zone chargée depuis l'API, numéros **masqués**, total et personnes touchées corrects
- [ ] **« Simuler la diffusion »** : affiche un exemple de message, sans appel réseau d'envoi
- [ ] **« Envoyer aux testeurs »** : appelle `/api/alerts/send`, rapporte le statut par testeur (`sent`, `dry-run`, ou erreur en clair)

### 3.7 Mode démo guidé (`DemoTour`)

- [ ] Les 10 étapes s'enchaînent, le texte à dire change, la pastille de progression avance
- [ ] Flèches ← → du clavier avancent/reculent ; Échap ferme
- [ ] Chaque étape **applique vraiment** l'état attendu (zone, onglet, causes, mode, plan) — vérifier notamment l'étape « Plusieurs causes à la fois » (coupure + pluie cumulées) et l'étape équité

### 3.8 Panneau « D'où viennent les données ? »

- [ ] Chaque source simulée affiche sa vraie source future (voir `src/data/sources.ts`)
- [ ] Se ferme proprement (clic extérieur, bouton fermer)

---

## 4. Scénarios transverses

| Scénario | Étapes | Résultat attendu |
|---|---|---|
| Cumul de causes qui s'amplifient | Simuler coupure de courant **puis** forte pluie | Des zones passent en alerte qualité que la pluie seule ne déclenche pas (repli des foyers vers des puits pollués) |
| Ajouter une cause n'améliore jamais une zone | Noter les heures d'une zone, ajouter n'importe quelle cause | Les heures ne remontent jamais (sauf recalcul des tours d'eau) |
| Tuyau cassé isole le bout de réseau | Simuler « Tuyau cassé » | Zones en aval de la conduite à 0 h, les autres zones inchangées |
| Recalcul après incident | Simuler une cause, puis « Recalculer les tours d'eau » | Écart entre zones réduit, créneau garanti sur la zone la plus éloignée encore reliée |
| Jour de marché / vacances / fête | Changer la période dans la barre | Demande prévue change de forme (pic différent), la carte en mode *Demande* le montre |
| Plan IA incohérent (test de robustesse) | Demander un plan IA plusieurs fois de suite | Jamais de plan qui dépasse la capacité du château d'eau ou sert une zone coupée (garanti par `priorityRounds`, voir `src/engine/__tests__/aiPlan.test.ts`) |
| Modification réseau puis retour | Changer la capacité du château d'eau dans l'éditeur, enregistrer, observer la carte après le rechargement | Le changement se reflète partout (carte, Opérateur, Mairie) |
| Chat qui pilote l'affichage | Dans MétéEau : « Montre-moi la situation si la conduite casse » | Réponse cohérente, et la carte bascule sur la cause « Tuyau cassé » (action appliquée) |

---

## 5. Scénarios d'utilisation par profil

### 5.1 La famille (vue Familles + WhatsApp)

1. Une famille à Hêvié s'inscrit avec son numéro (`POST /api/subscribers`), reçoit un code à 6 chiffres sur WhatsApp.
2. Elle valide le code (`POST /api/subscribers/verify`) → confirmation de bienvenue envoyée.
3. Une coupure de courant est détectée (simulée) → l'opérateur ou MétéEau déclenche une alerte.
4. La famille reçoit un message avec l'horaire et un conseil, en français (langues locales : badge à valider).
5. Elle répond **STOP** → désabonnement confirmé par retour WhatsApp, elle ne reçoit plus d'alerte.
6. Elle répond **START** → réabonnement confirmé.

- [ ] Les 6 étapes testées avec Alan (0146000922) ou Happy (0158111896), les deux seuls numéros réels autorisés tant que `ALERTS_LIVE` n'est pas activé

### 5.2 L'opérateur

1. Ouvre la vue Opérateur un matin normal : plan du jour visible.
2. Un signalement de conduite cassée arrive → simule « Tuyau cassé » dans le tiroir d'incidents.
3. Consulte l'écart avant/après, clique « Recalculer les tours d'eau ».
4. Demande un second avis à l'IA (« Demander un plan à l'IA »), compare.
5. Diffuse l'alerte aux abonnés concernés (vue Familles).
6. Met à jour la capacité du château d'eau après une réparation (éditeur réseau).

### 5.3 La mairie

1. Ouvre la vue Mairie en fin de semaine.
2. Identifie la zone la plus souvent oubliée (classement + carte d'équité).
3. Compare l'indice d'équité avant/après une semaine de tours d'eau actifs.
4. Utilise ce chiffre dans un argumentaire (ex. réunion avec la SoNEB).

### 5.4 Le jury / un visiteur non technique

1. Arrive sur l'accueil, clique « ▶ Lancer la démo ».
2. Suit les 10 étapes sans qu'on ait besoin d'expliquer quoi que ce soit (règle d'or du README : compréhensible en 30 secondes).
3. Pose une question libre à **MétéEau** (« Pourquoi Hêvié manque d'eau ? », « C'est quoi l'indice d'équité ? ») plutôt que de chercher dans l'interface.
4. Demande « D'où viennent vraiment ces chiffres ? » → panneau des sources.

---

## 6. MétéEau, le chatbot : grille de questions à tester

| Catégorie | Exemple de question | Doit... |
|---|---|---|
| Situation actuelle | « Quelle est la situation aujourd'hui ? » | Résumer l'état réellement affiché (zone, causes, heures), pas un exemple générique |
| Explication d'une zone | « Pourquoi Hêvié manque d'eau ? » | Citer la profondeur, les causes actives, l'historique si pertinent |
| Hypothèse réseau | « Et si la conduite vers Ouèdo casse ? » | Expliquer correctement qui est en aval (utiliser le graphe du réseau), proposer l'action si demandé |
| Hypothèse hors simulation | « Et si la conduite entre Godomey et le centre casse ? » (conduite non simulable) | Expliquer conceptuellement, **dire clairement** qu'elle ne peut afficher que la conduite par défaut (Togba → Ouèdo) |
| Pilotage par la voix | « Montre-moi un jour de marché » / « Recalcule les tours d'eau » | Changer l'affichage (action), le confirmer dans sa réponse |
| Question hors périmètre | « Quelle est la météo à Paris demain ? » | Dire qu'elle ne sait pas plutôt qu'inventer |
| Question technique projet | « Quelles sont vos sources de données ? », « Comment fonctionne l'indice d'équité ? » | Répondre avec les connaissances du projet (README condensé dans le prompt système) |
| Robustesse | Poser 5-6 questions à la suite, changer de zone/cause entre deux | Le contexte envoyé à chaque message reflète l'état courant, pas l'historique figé |

- [ ] Testé sur mobile (le panneau prend tout l'écran, clavier ne masque pas le champ de saisie)
- [ ] Testé sans `RODIUM_API_KEY` configurée → message de repli clair, pas d'erreur bloquante
- [ ] Bulle 💧 accessible (focus clavier, `aria-label` présent)

---

## 7. Cas limites et pannes à vérifier

| Panne simulée | Comment la provoquer | Résultat attendu |
|---|---|---|
| Pas de connexion internet | Couper le Wi-Fi après le premier chargement | La carte bascule sur le schéma SVG de secours (`CityMap`), un message l'indique |
| Serveur API non lancé | Ne pas lancer `npm run api` | L'appli reste utilisable (toutes les données simulées sont déjà embarquées côté client), seuls les appels réseau (abonnés, IA, chat, envoi WhatsApp) affichent une erreur claire, jamais un écran blanc |
| Neon injoignable | Couper `DATABASE_URL` ou attendre un cold-start | Erreur `ETIMEDOUT` possible au premier appel (connu, Neon serverless) ; réessayer une fois suffit en général |
| Clé Rodium absente/fausse | Vider `RODIUM_API_KEY` | Plan IA et MétéEau répondent en mode repli, jamais d'erreur brute affichée à l'utilisateur |
| WebGL indisponible | Désactiver l'accélération matérielle du navigateur | Dégradé `.water-fallback` à l'accueil, schéma SVG sur la carte |
| `prefers-reduced-motion` activé | Réglage système | Toutes les animations (bulles, vagues, jauge IA, ping du château d'eau) s'arrêtent, le contenu reste lisible |
| Numéro WhatsApp béninois mal formaté | Inscription avec un numéro à 8 ou 10 chiffres | Les deux formats acceptés (`toE164`/`toWhatsApp`, testés) |
| Double inscription du même numéro | Réinscrire un numéro déjà abonné | Mise à jour (upsert), pas de doublon en base |

---

## 8. Responsive : mobile et PC

Tester au minimum sur ces largeurs (DevTools → mode responsive, ou vrais appareils) :

| Largeur | Profil | Points à vérifier |
|---|---|---|
| ~375 px | Téléphone étroit | Menu de navigation en grille 4 colonnes, fiche de zone sous la carte (pas flottante), MétéEau en quasi plein écran, boutons pleine largeur |
| ~768 px | Tablette | Bascule entre layout mobile et desktop autour de `sm`/`md`/`lg` (Tailwind) |
| ~1024 px+ | PC, vidéoprojecteur | Fiche de zone flottante à droite de la carte, textes ≥ 18 px sur les vues clés (exigence du README), MétéEau en carte flottante 380 px |
| ~1920 px | Grand écran de présentation | Rien ne s'étire de façon disproportionnée, le panneau garde une largeur max raisonnable |

- [ ] Aucune barre de défilement horizontale indésirable à aucune largeur
- [ ] La bulle MétéEau ne recouvre jamais un bouton d'action important (vérifier sur chaque vue)
- [ ] Le clavier mobile n'empêche pas d'envoyer un message dans MétéEau ou de remplir le formulaire d'inscription

---

## 9. Limites connues (à dire au jury avant qu'on vous le demande)

- Toutes les données du réseau, de la demande et de l'historique sont **simulées** pour la démo ; chaque donnée a une vraie source future documentée (`src/data/sources.ts`, panneau « D'où viennent les données ? »).
- Les traductions fon, goun, yoruba ne sont pas encore relues par un locuteur natif (badge affiché).
- L'édition du réseau (Opérateur) modifie les zones et conduites **existantes**, elle n'en crée ni n'en supprime pas (leur position géographique sur la carte n'est pas éditable depuis l'écran, voir `src/data/geo.ts`).
- L'action « tuyau cassé » du chatbot et du tiroir d'incidents ne peut casser que la conduite par défaut du réseau (Togba → Ouèdo, `P3`).
- L'envoi WhatsApp réel est limité aux deux testeurs tant que `ALERTS_LIVE` n'est pas activé et qu'aucun numéro professionnel n'est enregistré chez Meta.
- Le plan proposé par l'IA (Opérateur) peut être rejeté d'un calcul erroné sans que ce soit un bug : c'est le garde-fou qui fonctionne (voir README §7.5 et `src/engine/__tests__/aiPlan.test.ts`).
- Les chiffres de contexte (populations, volumes, hypothèses de calage) sont à vérifier dans les sources d'origine avant une présentation officielle (checklist §12 du README).

---

## 10. Répétition chronométrée de la démo

Suivre le script du README (§11), jouer avec le mode démo guidé (`▶ Lancer la démo`), chronomètre en main :

| Étape | Budget | Vérifier |
|---|---|---|
| Accueil → carte | 0:30 | Pas de temps mort au chargement |
| Timelapse | 0:30 | Lecture fluide, pas de saccade |
| Zone Hêvié | 0:40 | La fiche s'ouvre instantanément |
| Demande prévue, jour de marché | 0:40 | Changement de mode visible immédiatement |
| Coupure + pluie cumulées | 0:40 | Les deux badges de cause apparaissent |
| Types d'eau | 0:40 | Onglet clair sans explication supplémentaire |
| Recalcul des tours d'eau | 0:30 | Animation puis résultat net |
| Familles puis Mairie | 0:50 | Transition fluide entre vues |
| Sources | 0:35 | Panneau lisible, se ferme bien |
| **Total** | **~5:00** | Répéter 3 fois, chronométré, avant le jour J |

- [ ] 1re répétition chronométrée
- [ ] 2e répétition chronométrée, corrections appliquées
- [ ] 3e répétition chronométrée, prête pour le jour J
- [ ] Plan B préparé : `dist/` ouvert en local ; vidéo d'écran de secours enregistrée

---

## 11. Checklist finale, 30 minutes avant

- [ ] `npm run build` relancé une dernière fois, aucune erreur
- [ ] Déploiement Vercel à jour (dernier commit poussé et déployé, pas un ancien build)
- [ ] Variables d'environnement Vercel vérifiées (section 1.1)
- [ ] Connexion internet testée sur place (fond de carte + API) ; partage de connexion de secours prêt
- [ ] `npm run api` lancé si la démo tourne en local
- [ ] Batterie/alimentation de l'ordinateur de présentation vérifiée
- [ ] Zoom du navigateur réglé pour le vidéoprojecteur (textes lisibles au fond de la salle)
- [ ] Mode « Ne pas déranger » activé (pas de notification pendant la démo)
- [ ] Les deux testeurs WhatsApp (Alan, Happy) prévenus qu'une démo est en cours (pour ne pas être surpris par un message test)
