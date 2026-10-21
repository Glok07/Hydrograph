# HydroGraph : la météo de l'eau

> Chaque jour, pour chaque zone, HydroGraph dit si l'eau viendra, à quelle heure, et si le partage entre quartiers est juste.

Ce README est la feuille de route de construction. Il découle du [cahier des charges](./HydroGraph_cahier_des_charges.docx) (version du 20 octobre 2026). **Échéance : démo jeudi 22 octobre 2026, 5 minutes.**

---

## Sommaire

1. [Ce qu'on construit](#1-ce-quon-construit)
2. [Direction artistique](#2-direction-artistique)
3. [Stack technique](#3-stack-technique)
4. [Structure du projet](#4-structure-du-projet)
5. [Modèle de données](#5-modèle-de-données)
6. [Le terrain simulé : la ville de Calavi](#6-le-terrain-simulé--la-ville-de-hydropolis)
7. [Le moteur](#7-le-moteur)
8. [Écrans et composants](#8-écrans-et-composants)
9. [Messages aux familles](#9-messages-aux-familles)
10. [Plan de travail jusqu'à jeudi](#10-plan-de-travail-jusquà-jeudi)
11. [Script de démo](#11-script-de-démo-5-minutes)
12. [Checklist de validation](#12-checklist-de-validation)
13. [Après la démo](#13-après-la-démo)
14. [Lancer le projet](#14-lancer-le-projet)

---

## 1. Ce qu'on construit

Une application web **front-only** (pas de serveur) qui simule une ville de six zones alimentées par un château d'eau.

| Dans la démo | Hors démo (planifié) |
|---|---|
| Carte par zones colorée (F1) | Alertes qualité (F8) |
| Fiche de zone (F2) | Suivi de la ressource (F9) |
| 3 événements : coupure de courant, forte pluie, tuyau cassé (F3) | Vrais signalements, capteurs, données SoNEB/SBEE |
| Recalcul des tours d'eau (F4) | Extension aux AEV rurales |
| Messages aux familles, texte + vocal simulé (F5) | Pilote en commune |
| Vue opérateur (F6) | |
| Vue mairie, carte d'équité (F7) | |

**Idée qui nous distingue** : mesurer le service *réellement reçu* par chaque quartier, et garantir un créneau à la zone en bout de réseau.

**Règle d'or de la démo** : elle doit se comprendre en 30 secondes par un jury non technique. Si un écran demande une explication, on le simplifie.

---

## 2. Direction artistique

**Clair, aérien, une seule couleur d'accent.** L'eau est le seul élément « photographique » ; tout le reste est une interface claire et sobre, lisible sur un vidéoprojecteur.

### Principes

- **Accueil réaliste** : une scène d'eau calculée en WebGL (surface qui ondule, ménisque brillant, rayons, reflets, bulles). Le titre géant **HYDROGRAPH** est coupé par la vague ; la partie immergée est déformée par la réfraction. L'eau se fond en bas dans la page claire.
- **Page claire** : fond blanc bleuté, cartes blanches ou en verre dépoli clair, ombres douces bleutées.
- **Un seul accent** : bleu océan `#1d6fe0` pour les actions (boutons, curseur, interrupteurs, conduites).
- **Texte bleu marine** `#0b2545`, jamais de noir pur.
- **Chiffres d'abord** : gros nombres, petite légende dessous.
- **Carte claire** : fond OpenStreetMap Positron, lac bleu ciel, routes blanches ; les zones colorées sont les seuls éléments saturés.

### Tokens de design (`src/index.css`)

| Token | Valeur | Usage |
|---|---|---|
| `ink` | `#0b2545` | Texte, éléments sélectionnés |
| `blue` | `#1d6fe0` | Accent unique : actions, eau qui circule |
| `mist` | `#eef4fb` | Fond des zones de carte |
| `ok` | `#10b981` | Eau toute la journée |
| `warn` | `#f59e0b` | Eau par créneaux |
| `risk` | `#ef4444` | Risque de manque, rupture |
| `accent` | `#f97316` | Risque qualité de l'eau |

Classes utilitaires : `.glass` (verre clair), `.card` (carte blanche), `.pill`, `.pill-solid` (bleu), `.pill-light` (blanc).

### Typographie

- Titres et chiffres : **Montserrat** (600-800). Corps : **Inter** (400-600).
- Sous-titre de l'accueil : capitales fines très espacées.

### Mouvement

1. L'eau de l'accueil bouge en continu (shader), les bulles montent jusqu'à la surface.
2. Les zones de la carte changent de couleur et de hauteur en douceur ; l'eau circule dans les conduites.
3. Les événements ont un effet visible : château d'eau qui clignote, pluie sur la carte, onde rouge sur la rupture.
4. Le timelapse fait défiler la journée heure par heure.

Toutes les animations s'arrêtent avec `prefers-reduced-motion`.

### Accessibilité

Les couleurs ne portent jamais seules l'information : chaque zone a aussi une icône et un libellé (« Eau toute la journée », « Par créneaux », « Risque de manque »).

---

## 3. Stack technique

Choix guidés par une contrainte : **deux jours, pas de backend, démo fiable hors connexion**.

| Besoin | Choix | Pourquoi |
|---|---|---|
| Framework | **React + TypeScript + Vite** | Démarrage rapide, typage utile pour le moteur |
| Style | **Tailwind CSS 4** (plugin Vite, pas de `tailwind.config`) + variables CSS | Glassmorphism rapide à écrire |
| Carte | **MapLibre GL** + fond CARTO (OpenStreetMap), relief 3D | Vraie carte d'Abomey-Calavi ; schéma SVG de secours hors ligne |
| Animations | **Framer Motion** | Transitions de couleur et d'entrée |
| Courbes | **Recharts** ou SVG maison | Courbe des 7 jours |
| État | **Zustand** | Petit store partagé entre les vues |
| Voix | **Web Speech API** (`speechSynthesis`) | Message vocal simulé sans service externe |
| Données | **Fichiers JSON/TS locaux** | Simulation, pas de serveur |
| Tests | **Vitest** | Tester le moteur, c'est le cœur |
| Déploiement | **Vercel** ou **Netlify** (site statique) | Lien partageable pour le jury |

> MapLibre 6 charge son worker à part : `setWorkerUrl` est appelé dans `RealMap.tsx`, ne pas l'enlever.

---

## 4. Structure du projet

```
hydrograph/
├── README.md
├── HydroGraph_cahier_des_charges.docx
├── package.json
├── vite.config.ts
├── public/
│   ├── logo.svg
│   ├── bg-underwater.jpg          # fond sous-marin, optimisé < 400 Ko
│   └── audio/                     # (optionnel) voix pré-enregistrées fon/goun/yoruba
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── styles/
    │   ├── tokens.css             # variables de la DA
    │   └── glass.css
    ├── data/
    │   ├── network.ts             # graphe : zones, conduites, source
    │   ├── calendar.ts            # heures de pointe, saisons, marchés
    │   ├── history.ts             # 7 jours d'historique simulé
    │   └── sources.ts             # donnée simulée -> vraie source future
    ├── engine/
    │   ├── graph.ts               # parcours du graphe, dépendances
    │   ├── events.ts              # effets des événements
    │   ├── forecast.ts            # prévision par zone
    │   ├── rounds.ts              # tours d'eau (F4)
    │   ├── equity.ts              # indicateurs d'équité (F7)
    │   ├── messages.ts            # génération des messages (F5)
    │   └── __tests__/
    ├── store/
    │   └── useHydro.ts            # état global (événement actif, plan, historique)
    ├── components/
    │   ├── Frame.tsx              # grand cadre arrondi
    │   ├── NavBar.tsx
    │   ├── Hero.tsx               # titre géant + CTA
    │   ├── CityMap.tsx            # SVG des 6 zones + conduites (F1)
    │   ├── ZoneCard.tsx           # fiche de zone (F2)
    │   ├── EventPanel.tsx         # boutons d'événements (F3)
    │   ├── RoundsTimeline.tsx     # frise des tours d'eau (F4, F6)
    │   ├── MessagePreview.tsx     # téléphone avec le message (F5)
    │   ├── StatTile.tsx           # tuile chiffre + légende
    │   ├── EquityMap.tsx          # vue mairie (F7)
    │   └── SourceBadge.tsx        # étiquette « source future : SoNEB »
    └── views/
        ├── Home.tsx
        ├── MapView.tsx
        ├── OperatorView.tsx
        ├── CityHallView.tsx
        └── FamilyView.tsx
```

---

## 5. Modèle de données

```ts
// data/network.ts
export type ZoneId = 'Z1' | 'Z2' | 'Z3' | 'Z4' | 'Z5' | 'Z6';

export interface Zone {
  id: ZoneId;
  name: string;
  households: number;       // nombre de foyers
  demandPeak: number;       // demande en heure de pointe (m3/h)
  demandBase: number;       // demande hors pointe (m3/h)
  depth: number;            // distance au château d'eau, en sauts de conduite (0 = proche)
  languages: Lang[];        // langues des messages
  path: string;             // tracé SVG
  centroid: [number, number];
}

export interface Pipe {
  id: string;               // 'P1'...
  from: ZoneId | 'TOWER';
  to: ZoneId;
  broken: boolean;          // modifié par l'événement « tuyau cassé »
}

export interface Network {
  tower: { capacity: number };   // débit total du château d'eau (m3/h)
  zones: Zone[];
  pipes: Pipe[];
}

export type Lang = 'fr' | 'fon' | 'goun' | 'yoruba';

// engine/events.ts
export type EventType =
  | 'power_cut'      // coupure de courant      (démo)
  | 'heavy_rain'     // forte pluie             (démo)
  | 'pipe_burst'     // tuyau cassé             (démo)
  | 'peak_hour'      // heure de pointe         (calendrier)
  | 'dry_season'     // saison sèche            (après)
  | 'market_day';    // jour de marché          (après)

export interface HydroEvent {
  type: EventType;
  startedAt: number;        // heure de la journée (0-24)
  durationH: number;
  origin?: ZoneId;          // pour « tuyau cassé »
}

// engine/forecast.ts
export type Status = 'ok' | 'warn' | 'risk';

export interface ZoneForecast {
  zone: ZoneId;
  status: Status;
  hoursOfWater: number;     // heures d'eau prévues sur la journée
  slots: Slot[];            // créneaux de service
  reason: string;           // « Coupure de courant : la pompe est à l'arrêt »
  advice: string;           // « Remplissez vos bidons avant 14 h »
  confidence: number;       // 0-1, affiché en clair (« confiance moyenne »)
  qualityRisk: boolean;     // vrai après forte pluie ou tuyau cassé
}

export interface Slot { start: number; end: number; guaranteed?: boolean }
```

### Transparence des sources (critère de réussite n°3)

Chaque donnée simulée porte sa vraie source future :

```ts
// data/sources.ts
export const SOURCES = {
  calendar:    { demo: 'Calendrier codé en dur',       real: 'Calendrier officiel + jours de marché',  badge: 'Disponible' },
  weather:     { demo: 'Pluie simulée',                real: 'API météo (ex. Open-Meteo)',             badge: 'Immédiat' },
  outages:     { demo: 'Coupure déclenchée au clic',   real: 'Annonces SoNEB / SBEE (scraping)',       badge: 'À automatiser' },
  residents:   { demo: 'Réponses simulées',            real: 'WhatsApp, SMS, code court',              badge: 'Dès le lancement' },
  sensors:     { demo: '—',                            real: 'Capteurs de pression bas coût (SMS)',    badge: 'À fabriquer' },
  operator:    { demo: '—',                            real: 'Données de pompage SoNEB / SBEE',        badge: 'À négocier' },
} as const;
```

Le composant `SourceBadge` affiche une petite pastille « Simulé · vraie source : API météo » à côté de chaque donnée dans la démo.

---

## 6. Le terrain : Abomey-Calavi sur une vraie carte

La carte est réelle : fond **CARTO / OpenStreetMap** rendu avec **MapLibre GL**, repeint dans les bleus de la DA, en 3D inclinée. Les **positions des localités sont réelles** (OpenStreetMap, Nominatim). **Le tracé des conduites, les contours des zones et tous les chiffres sont simulés** : à dire à l'oral.

```
                [ CHÂTEAU D'EAU (simulé) ]
                           │ P0
                  Z1  Abomey-Calavi centre       depth 0
                  ┌────────┴────────┐
               P1 │                 │ P2
           Z2 Togba             Z3 Godomey        depth 1   (ouest / sud)
               P3 │                 │ P4
           Z4 Ouèdo             Z5 Cococodji      depth 2
               P5 │
           Z6 Hêvié   ← BOUT DE RÉSEAU            depth 3
```

| Zone | Nom | Coordonnées OSM | Depth | Particularité |
|---|---|---|---|---|
| Z1 | Abomey-Calavi centre | 6.4539, 2.3542 | 0 | Toujours servie |
| Z2 | Togba | 6.4651, 2.3049 | 1 | |
| Z3 | Godomey | 6.3854, 2.3432 | 1 | |
| Z4 | Ouèdo | 6.4524, 2.2671 | 2 | Puits : sensible à la pluie |
| Z5 | Cococodji | 6.3875, 2.2721 | 2 | Puits |
| **Z6** | **Hêvié** | 6.4499, 2.2406 | 3 | **Zone la plus éloignée, oubliée. Héroïne de la démo** |

**État de départ (sans HydroGraph)** : 18 h / 18 h / 18 h / 10 h / 10 h / **0 h** pour Z1 à Z6. Avec les tours d'eau : 12 h partout, Hêvié avec un créneau garanti.

Fichiers : `src/data/network.ts` (réseau), `geo.ts` (coordonnées, contours, conduites), `layout.ts` (schéma de secours hors ligne), `history.ts` (six jours simulés).

> ⚠️ **Connexion requise** pour le fond de carte. Sans réseau, la carte bascule automatiquement sur le schéma du réseau. Prévoir un partage de connexion le jour J.

---

## 7. Le moteur

Tout le moteur est en **TypeScript pur**, sans dépendance à React, pour être testé seul.

### 7.1 Graphe (`graph.ts`)

- `downstream(zone)` : toutes les zones qui dépendent d'une zone (ex. `downstream('Z2') = [Z4, Z6]`).
- `pathFromTower(zone)` : la liste des conduites traversées.
- `isReachable(zone, brokenPipes)` : vrai si une conduite cassée n'est pas sur le chemin.

C'est ce qui répond à « quelles zones sont touchées par un événement ».

### 7.2 Événements (`events.ts`)

| Événement | Effet sur le réseau | Effet sur la qualité |
|---|---|---|
| **Coupure de courant** | Capacité du château d'eau divisée par 4 pendant `durationH` (ex. 4 h) | — |
| **Forte pluie** | Aucun effet sur le débit | `qualityRisk = true` pour les zones à puits (Z5, Z6) et message « traiter l'eau » |
| **Tuyau cassé** (P3 par défaut) | La conduite devient `broken` : Z4 et Z6 perdent leur alimentation | `qualityRisk = true` en aval de la casse |
| Heure de pointe (calendrier) | Demande × 1,5 de 6 h-8 h et 18 h-20 h ; Z4 et Z6 perdent de la pression | — |

Chaque événement est une fonction pure : `(network, event) → network modifié`. L'état précédent n'est jamais muté, pour pouvoir **revenir à la normale** d'un clic.

### 7.3 Prévision (`forecast.ts`)

Pour chaque zone :

1. Calculer le débit disponible à l'entrée de la zone (capacité de la tour moins ce que consomment les zones amont).
2. Si une conduite du chemin est cassée → 0 h d'eau.
3. Appliquer les pointes : réduire le débit de bout de réseau aux heures concernées.
4. Convertir en `hoursOfWater` et en `status` :

| Heures d'eau prévues | Statut |
|---|---|
| ≥ 14 h | `ok` (vert) |
| 6 h à 13 h | `warn` (orange) |
| < 6 h | `risk` (rouge) |

5. Calculer la `confidence` : 0,9 pour le calendrier seul, plus basse si l'événement est « annoncé » plutôt que « confirmé », plus basse en bout de réseau. Toujours **afficher** la confiance en clair, ce qui répond au risque « prévisions inexactes ».

### 7.4 Tours d'eau (`rounds.ts`) : l'idée qui nous distingue

La journée de service va de 5 h à 23 h, en **créneaux de 2 h** (9 créneaux). À chaque créneau, le débit disponible ne suffit pas à servir toutes les zones : il faut choisir.

**Algorithme (glouton avec priorité d'équité)**

```text
pour chaque créneau t de 5h à 23h :
    débit_dispo = capacité(t)            # réduit pendant une coupure
    pour chaque zone non coupée, calculer un score :
        score = w1 * heures_sans_eau_cumulées(zone)     # équité : celui qui attend le plus passe d'abord
              + w2 * depth(zone)                         # bout de réseau favorisé
              + w3 * demande(zone, t)                    # pointes
    trier les zones par score décroissant
    servir les zones dans l'ordre tant que débit_dispo >= demande(zone, t)
        (en passant par les conduites : servir une zone suppose que les conduites amont sont ouvertes)

# Garantie : la zone de depth maximale reçoit au moins un créneau garanti
# si le débit total le permet, en réservant le créneau avant le glouton.
si aucune zone depth max n'est servie :
    échanger avec la zone au score le plus bas servie dans le créneau le plus proche
    marquer le créneau comme guaranteed = true
```

Paramètres de départ à ajuster à l'oeil : `w1 = 1.0`, `w2 = 0.6`, `w3 = 0.3`.

**Critère de réussite testé** : après une coupure de courant, `Z6` reçoit au moins un créneau `guaranteed`, même quand `Z1` a tout le reste. Voir les tests ci-dessous.

### 7.5 Équité (`equity.ts`)

Pour la vue mairie, sur 7 jours :

- `avgHoursWithoutWater(zone)` : 24 moins les heures d'eau, moyennées.
- `equityGap` : écart entre la zone la mieux servie et la moins bien servie, en heures.
- `forgottenRank` : classement des zones « régulièrement oubliées » (nombre de jours où la zone est dans le dernier quart).
- Un **indice d'équité de 0 à 100** : `100 × (1 − gap / 24)`, simple à lire pour un élu.

### 7.6 Tests obligatoires (Vitest)

| Test | Attendu |
|---|---|
| Coupure de courant | Au moins une zone change de statut |
| Forte pluie | Au moins une zone passe en `qualityRisk` |
| Tuyau cassé P3 | Z4 et Z6 passent en rouge, Z1/Z2/Z3/Z5 inchangées |
| Tours d'eau après coupure | Z6 a un créneau `guaranteed` |
| Retour à la normale | Le réseau revient à l'état initial |
| Aucun événement | Le plan est identique d'une exécution à l'autre (déterminisme) |

---

## 8. Écrans et composants

### Navigation

Menu en haut, dans le cadre : **Carte · Opérateur · Mairie · Familles**, plus le bouton pilule « Mode démo ».

### 8.1 Accueil

- Scène d'eau réaliste, titre **HYDROGRAPH** à moitié immergé, sous-titre « LA MÉTÉO DE L'EAU ».
- Bouton **« Voir la carte du jour »** et, dans la navigation, **« ▶ Lancer la démo »** (mode guidé).

### 8.2 Carte du jour : F1, F2, F3

- Quatre tuiles : zones bien servies, heures d'eau moyennes, zones à risque, écart entre quartiers.
- **Vraie carte 3D d'Abomey-Calavi** : zones en relief (hauteur = heures d'eau), conduites où l'eau circule, château d'eau.
- **Fiche de zone** flottante à droite : statut, heures, créneaux, raison, conseil, confiance.
- **Timelapse** en bas de la carte : lecture de la journée de 5 h à 22 h ; seules les zones qui ont l'eau à cette heure restent colorées et en relief.
- **Événements** : notification en haut à gauche, puis bouton **« Recalculer les tours d'eau »** qui balaie la carte.
- Bouton **« D'où viennent les données ? »** : chaque donnée simulée et sa vraie source future (critère n°3).

### 8.2 bis Mode démo guidé

Le script de la section 11 joué en 8 étapes, avec la phrase à dire affichée : vue d'ensemble, timelapse, Hêvié, coupure, recalcul, familles, mairie, sources. Flèches ← → du clavier pour avancer, Échap pour quitter.

### 8.3 Vue opérateur (`OperatorView`) : F4, F6

- **Plan du jour** : frise horaire de 5 h à 23 h, une ligne par zone, blocs colorés = créneaux servis. Créneaux garantis marqués d'une étoile.
- Panneau « **Avant / Après** » : le plan d'avant l'événement et le plan recalculé, côte à côte, avec les créneaux déplacés surlignés.
- Liste « Secteurs à servir » dans l'ordre, avec l'heure.
- Mention : « Moins d'appels, plaintes géolocalisées » en pied de page (le positionnement « outil de l'opérateur »).

### 8.4 Messages aux familles (`FamilyView`) : F5

- Maquette de **téléphone** en verre, avec un fil WhatsApp et un fil SMS.
- Sélecteur de langue : **Français · Fon · Goun · Yoruba**.
- Bouton « Écouter » qui lit le message avec la synthèse vocale du navigateur.
- Le message est généré pour la zone sélectionnée et change quand l'événement change.
- Étiquette « Envoi simulé · vrai canal : WhatsApp Business / SMS ».

### 8.5 Vue mairie (`CityHallView`) : F7

- Carte SVG en **dégradé d'équité** : plus la zone est souvent privée d'eau, plus elle est foncée/corail.
- Grande tuile : **indice d'équité** (ex. `62 / 100`) et l'écart entre meilleure et pire zone (ex. « 14 h d'écart »).
- Classement « **Quartiers régulièrement oubliés** » (liste Z-1, Z-2 comme la liste « Hotspots » de la référence) avec durée moyenne sans eau.
- Courbe sur 7 jours des heures d'eau, Z6 contre Z1.
- Phrase de synthèse en langage simple : « Hêvié reçoit en moyenne 1,1 h d'eau par jour, contre 17,6 h à Abomey-Calavi centre. »

---

## 9. Messages aux familles

Modèle à trous, par langue et par type d'événement. Message court, une idée, un conseil.

**Exemple : coupure de courant, zone Z6, français**

> 💧 Hêvié : coupure de courant à la station. L'eau reviendra **entre 16 h et 18 h**. Remplissez vos bidons avant 15 h et couvrez-les.

**Exemple : forte pluie, zone Z5, français**

> 🌧 Zogbo-Nord : forte pluie prévue. L'eau des puits peut être sale. **Faites bouillir ou traitez l'eau** avant de la boire.

**Règles d'écriture**

- 160 caractères ou moins pour le SMS.
- Toujours : *quoi*, *quand*, *que faire*.
- Pas de jargon (pas de « débit », « pression », « réseau »).

> ⚠️ **Traductions** : les versions fon, goun et yoruba doivent être **relues par un locuteur natif** avant la présentation. En attendant, afficher un petit badge « traduction à valider » plutôt que d'afficher du texte faux. La synthèse vocale du navigateur ne lit pas ces langues correctement : prévoir soit des enregistrements voix (`public/audio/`), soit une lecture en français uniquement avec la mention « voix locale à venir ».

---

## 10. Plan de travail jusqu'à jeudi

Aujourd'hui : mercredi 21 octobre. Démo jeudi 22. Priorité absolue : **un flux complet qui marche**, puis la beauté.

### Mercredi

| Bloc | Tâche | Résultat |
|---|---|---|
| 1 | `npm create vite`, Tailwind, tokens de DA, cadre + fond sous-marin | Page vide mais belle |
| 2 | `network.ts`, `graph.ts`, `forecast.ts` + tests | Les 6 zones ont un statut |
| 3 | `CityMap.tsx` (SVG des zones et conduites) + `ZoneCard` | **F1 + F2 : on voit la carte et on clique** |
| 4 | `events.ts` + `EventPanel` | **F3 : la carte se recolore** |
| 5 | `rounds.ts` + `RoundsTimeline` + tests | **F4 : Z6 reçoit un créneau garanti** |
| 6 | `messages.ts` + `MessagePreview` (français d'abord) | **F5 en français** |

### Jeudi matin (avant la démo)

| Bloc | Tâche |
|---|---|
| 7 | Vue mairie : `equity.ts`, `EquityMap`, courbe |
| 8 | Page d'accueil (titre géant, tuiles, eau réaliste) |
| 9 | Langues locales (si traductions relues), voix |
| 10 | Pastilles de sources, textes, légendes |
| 11 | **Répétition de la démo chronométrée, 3 fois** ; déploiement ; copie hors-ligne (`npm run build` + dossier `dist`) |

### Si on manque de temps, on coupe dans cet ordre

1. Langues locales autres que le français
2. Animations des conduites
3. Courbe sur 7 jours
4. Voix

**On ne coupe jamais** : la carte, les trois événements, le recalcul des tours d'eau, la vue mairie.

---

## 11. Script de démo (5 minutes)

| Min | Action | Ce qu'on dit |
|---|---|---|
| 0:00 | Accueil, clic sur « Voir la carte du jour » | « Au Bénin, l'eau existe sur le papier, pas toujours au robinet. HydroGraph est la météo de l'eau. » |
| 0:30 | Carte : six zones colorées | « Voici une ville, six zones. Vert, l'eau toute la journée. Rouge, risque de manque. » |
| 1:00 | Toucher Z6 | « Hêvié, en bout de réseau : 0 heure d'eau, la raison, et un conseil pour les familles. » |
| 1:45 | Clic sur ⚡ Coupure de courant | « La pompe s'arrête. Regardez les zones changer de couleur. » |
| 2:30 | Vue opérateur, avant/après | « HydroGraph recalcule les tours d'eau. Même après la coupure, la zone la plus éloignée reçoit un créneau garanti. » |
| 3:15 | Vue familles, message | « Chaque famille est prévenue, écrit ou vocal, dans sa langue. » |
| 3:45 | 🌧 Forte pluie, puis 🔧 tuyau cassé (rapide) | « Autre événement, autre conséquence : ici, un risque de qualité. » |
| 4:15 | Vue mairie | « Pour la mairie : quels quartiers sont régulièrement oubliés. On mesure le service réellement reçu, pas seulement les ouvrages. » |
| 4:45 | Slide ou parole de clôture | « Tout ceci est simulé. Demain : signalements d'habitants par WhatsApp, données publiques, puis un pilote dans une commune. » |

**Plan B** : si le déploiement échoue, `dist/` ouvert en local ; si tout échoue, une vidéo d'écran enregistrée la veille.

---

## 12. Checklist de validation

Reprend les critères du cahier des charges.

- [ ] Chaque événement (coupure, pluie, tuyau cassé) change **au moins une couleur** sur la carte
- [ ] La zone la plus éloignée (Z6) reçoit un créneau garanti après une coupure
- [ ] Chaque donnée simulée affiche sa **vraie source future**
- [ ] Un jury non technique comprend la démo **sans explication**
- [ ] Les couleurs ont aussi une icône et un libellé
- [ ] Le niveau de confiance est visible sur les prévisions
- [ ] « Revenir à la normale » fonctionne
- [ ] Tests du moteur au vert
- [ ] Fonctionne hors connexion (build local)
- [ ] Lisible sur grand écran de projection (textes ≥ 18 px sur les vues clés)
- [ ] Traductions locales relues ou badge « à valider » affiché
- [ ] Les chiffres du contexte (84,3 %, 23,9 %, etc.) vérifiés dans les sources d'origine

---

## 13. Après la démo

| Phase | Période | Contenu |
|---|---|---|
| 2. Prototype réel | 0-3 mois | Signalements d'habitants (WhatsApp/SMS) sur une zone, premières données publiques (météo, annonces de coupures) |
| 3. Pilote | 3-9 mois | Une commune, un opérateur partenaire, premiers capteurs |
| 4. Extension | 9-18 mois | Qualité de l'eau (F8), ressource (F9), AEV rurales |

**Indicateurs de suivi** : précision des horaires prévus contre réels ; part des zones couvertes par des signalements ; familles prévenues par jour ; durée moyenne sans eau par zone et écart entre meilleure et pire zone.

**Hypothèse à tester** : une dizaine de réponses d'habitants par zone suffisent pour savoir ce qui s'y passe.

---

## État d'avancement (21 octobre 2026)

| Bloc | Contenu | État |
|---|---|---|
| 1 | Fondations, DA claire, accueil réaliste (shader WebGL : surface, rayons, reflets ; titre immergé avec réfraction) | Fait |
| 2 | Moteur : graphe, événements, prévision, tours d'eau, équité, messages (17 tests) | Fait |
| 3 | Vraie carte 3D d'Abomey-Calavi (MapLibre), zones en relief, conduites animées, fiche de zone flottante | Fait |
| 4 | Événements avec effets sur la carte (château d'eau qui vacille, pluie, rupture), notifications, bouton « Recalculer » | Fait |
| 5 | Vue opérateur : plan avant/après, créneau garanti | Fait |
| 6 | Messages aux familles (français, WhatsApp/SMS, voix du navigateur) | Fait. Fon, goun, yoruba : en attente de relecture |
| 7 | Vue mairie : indice d'équité, quartiers oubliés | Fait |
| 8 | Timelapse de la journée sur la carte | Fait |
| 9 | Panneau « D'où viennent les données ? » (critère n°3) | Fait |
| 10 | Mode démo guidé (script en 8 étapes) | Fait |
| 11 | Relecture des traductions, vérification des chiffres, déploiement, répétition | À faire |

Liens directs pour la démo : `/#operateur`, `/#mairie`, `/#familles`.

---

## 14. Lancer le projet

```bash
# Installation
npm install

# Développement
npm run dev           # http://localhost:5173

# Tests du moteur
npm run test

# Build statique (pour la démo hors-ligne et le déploiement)
npm run build
npm run preview
```

Initialisation du projet (une seule fois) :

```bash
npm create vite@latest hydrograph -- --template react-ts
cd hydrograph
npm install zustand framer-motion recharts
npm install -D tailwindcss postcss autoprefixer vitest
npx tailwindcss init -p
```

---

## Décisions ouvertes

| Question | Qui tranche | Quand |
|---|---|---|
| Zone réelle qui sert de modèle (arrondissement de Cotonou, Calavi, ville moyenne) | Équipe | Avant jeudi, sinon garder Calavi |
| Relecture des traductions fon, goun, yoruba | Locuteur natif de l'équipe | Mercredi soir |
| Taux de desserte urbain SoNEB actuel | Recherche dans le rapport d'origine | Avant la présentation |
| Voix : enregistrements ou synthèse du navigateur | Équipe | Jeudi matin, si le temps le permet |
