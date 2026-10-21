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
├── api/                       # fonctions serveur : alertes WhatsApp, abonnés, réseau, plan par IA
├── server/                    # accès base de données, WhatsApp, Rodium (IA), serveur local
├── prisma/                    # schéma et migrations de la base
├── scripts/
│   └── fetch-osm.ts           # relève les activités de chaque zone dans OpenStreetMap
└── src/
    ├── data/
    │   ├── network.ts         # réseau : zones, conduites, château d'eau
    │   ├── geo.ts             # coordonnées réelles, contours, tracé des conduites
    │   ├── osm-activities.ts  # écoles, marchés, santé, restaurants… par zone (OpenStreetMap, généré)
    │   ├── profiles.ts        # profil de chaque zone : mélange des sources d'eau, crues, activités
    │   ├── history.ts         # 7 jours d'historique simulé
    │   └── sources.ts         # donnée simulée -> vraie source future
    ├── engine/                # TypeScript pur, testé seul
    │   ├── slots.ts           # la journée : 9 créneaux de 2 h
    │   ├── events.ts          # les 12 causes (types, libellés, valeurs par défaut)
    │   ├── causes.ts          # catalogue des causes et effet de chacune sur la journée
    │   ├── periods.ts         # contexte de la journée : marché, vacances, fête, chaleur…
    │   ├── activities.ts      # activités des habitants : volumes, profils horaires
    │   ├── demand.ts          # modèle de demande en eau par zone, heure et période
    │   ├── waterTypes.ts      # robinet, forage, puits, eau stockée
    │   ├── impact.ts          # impact de la journée sur chaque type d'eau et sur les foyers
    │   ├── conditions.ts      # situation d'une journée pour le moteur de répartition
    │   ├── forecast.ts        # répartition « sans HydroGraph » (les plus proches d'abord)
    │   ├── rounds.ts          # tours d'eau HydroGraph (créneau garanti, équité)
    │   ├── explain.ts         # attribution : ce que chaque cause explique, zone par zone
    │   ├── equity.ts          # indice d'équité (vue mairie)
    │   ├── messages.ts        # messages aux familles
    │   └── __tests__/         # 60 tests
    ├── store/                 # état partagé (causes, période, mode de carte) et calculs dérivés
    ├── components/            # carte, fiche de zone, tiroir d'incidents, timelapse, etc.
    └── views/                 # carte, opérateur, mairie, familles
```

---

## 5. Modèle de données

Les types ci-dessous sont ceux du code (voir `src/data` et `src/engine`).

```ts
// data/network.ts
export interface Zone {
  id: ZoneId                // 'Z1' à 'Z6'
  name: string
  households: number        // nombre de foyers (simulé, modifiable depuis l'écran Opérateur)
  demand: number            // demande de référence au réseau, creux de journée (unités de débit simulées)
  depth: number             // distance au château d'eau, en sauts de conduite (0 = proche)
  wells: boolean
}

// engine/events.ts : douze causes, cumulables
export type EventType =
  | 'power_cut' | 'voltage_drop' | 'pump_failure'          // énergie et pompes
  | 'maintenance' | 'pipe_burst' | 'leak'                  // réseau
  | 'heavy_rain' | 'flood'                                 // météo
  | 'dry_season' | 'heat_wave'                             // ressource
  | 'market_day' | 'festival'                              // demande

export interface HydroEvent {
  type: EventType
  startsAt: number          // heure de début (0-24)
  durationH: number
  pipe?: PipeId             // pour « tuyau cassé »
  zones?: ZoneId[]          // pour les causes locales (panne de forage, inondation)
}

// engine/periods.ts : le contexte de la journée
export interface PeriodContext {
  id: string; label: string
  dow: number               // 0 = dimanche … 6 = samedi
  month: number
  schoolInSession: boolean; marketDay: boolean; festival: boolean
  tempC: number
}

// data/profiles.ts : le profil de chaque zone
export interface ZoneProfile {
  hhSize: number
  mix: { network: number; borehole: number; well: number }   // part des foyers par source (simulé)
  storageHours: number                                       // autonomie de la réserve à domicile
  floodExposure: number                                      // exposition aux crues (simulé)
  counts: OsmCounts                                          // écoles, marchés, santé… (OpenStreetMap, réel)
}

// engine/forecast.ts
export interface ZoneForecast {
  zone: ZoneId
  status: 'ok' | 'warn' | 'risk'
  hoursOfWater: number      // heures d'eau au robinet sur la journée
  slots: Slot[]             // créneaux de service
  qualityRisk: boolean      // trop de foyers exposés à une eau à risque
  impact?: ZoneImpact       // impact par type d'eau : part des foyers, heures, risque sanitaire, repli
}

// engine/impact.ts
export interface TypeImpact {
  type: 'network' | 'borehole' | 'well' | 'stored'
  nominal: number           // part des foyers, un jour normal
  share: number             // part aujourd'hui, repli compris
  hours: number             // heures d'accès dans la journée
  quality: number           // risque sanitaire 0..1
  level: 'good' | 'watch' | 'risk'
  note: string
}

// engine/explain.ts
export interface CauseShare {
  cause: EventType | 'period'
  hoursLost: number         // heures d'eau perdues à cause d'elle (négatif : gagnées)
  exposedDelta: number      // points de foyers exposés en plus
}

export interface Slot { start: number; end: number; guaranteed?: boolean }
```

### Transparence des sources (critère de réussite n°3)

Chaque donnée simulée porte sa vraie source future. La liste est dans `src/data/sources.ts` et s'affiche dans « D'où viennent les données ? » : calendrier, données publiques (météo, annonces), **activités des habitants** (OpenStreetMap réel + volumes simulés), **types d'eau et qualité** (simulés), habitants, capteurs, partenariat opérateur, fond de carte. Chaque cause du catalogue (`causes.ts`) porte aussi sa vraie source future.

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

Tout le moteur est en **TypeScript pur**, sans dépendance à React, pour être testé seul. Il se lit en quatre couches : **ce qui se passe** (causes et période), **combien d'eau on demande** (activités des habitants), **comment on la répartit** (réseau, tours d'eau), **ce que cela change pour chaque type d'eau** (impact et familles).

### 7.1 Graphe (`graph.ts`)

- `downstream(zone)` : toutes les zones qui dépendent d'une zone (ex. `downstream('Z2') = [Z4, Z6]`).
- `pathFromTower(zone)` : la liste des conduites traversées.
- `isReachable(zone, brokenPipes)` : vrai si aucune conduite cassée n'est sur le chemin.

### 7.2 Les causes (`events.ts`, `causes.ts`)

Douze causes, **cumulables** le même jour. Chacune est une petite fonction qui modifie le scénario de la journée (capacité du château d'eau, conduites coupées, courant, nappe, qualité, contexte). Une cause ajoutée à `CAUSES` apparaît toute seule dans le tiroir « Simuler des incidents ».

| Groupe | Cause | Effet principal |
|---|---|---|
| Énergie et pompes | Coupure de courant | Station à 25 % pendant la coupure ; forages sur réseau électrique à l'arrêt |
| | Tension électrique trop basse | Station à 65 % le soir ; forages moins productifs |
| | Panne de pompe ou de forage | Station à 50 % ; forages des zones désignées à 0 |
| Réseau | Travaux de l'opérateur | Station à 70 % pendant les travaux |
| | Tuyau cassé | Conduite coupée : zones en aval sans eau, eau qui revient suspecte |
| | Fuites sur le réseau | Station à 85 %, pression perdue en bout de réseau |
| Météo | Forte pluie | Puits et eau stockée à risque ; la pluie recueillie allonge la réserve |
| | Inondation | Puits, forages, réseau et réserves à risque dans les zones basses |
| Ressource | Saison sèche | Puits qui tarissent, forages moins productifs, demande agricole en hausse |
| | Pic de chaleur | On consomme plus, l'eau stockée se dégrade plus vite |
| Demande | Jour de marché | Demande des marchés × 2,5 |
| | Fête ou jour férié | Demande des ménages et de la restauration en hausse |

La **période** (`periods.ts`) est le contexte de la journée : huit jeux de réglages (mercredi ordinaire, jour de marché, vendredi, samedi, dimanche, vacances scolaires, jour de fête, pic de chaleur). Les causes de situation (marché, fête, chaleur, saison sèche) modifient ce contexte.

### 7.3 Le modèle de demande (`activities.ts`, `demand.ts`, `data/profiles.ts`)

Il répond à : **quelles zones vont consommer le plus d'eau, et à quelle heure ?**

```text
demande(zone, heure, période) = somme sur les activités de
    unités × volume par unité × variation selon la période × profil horaire
```

| Activité | Unités (source) | Ce qui la fait varier |
|---|---|---|
| Ménages | foyers × 5 personnes | week-end, chaleur, fête ; double pointe matin et soir |
| Écoles, université | nombre d'établissements (OpenStreetMap) | présentes en semaine, absentes en vacances et le dimanche |
| Santé | nombre d'établissements (OpenStreetMap) | constante |
| Marchés | nombre de marchés (OpenStreetMap) | jour de marché |
| Restauration, hôtels | nombre d'établissements (OpenStreetMap) | week-end, fête |
| Lavage auto | nombre de sites (OpenStreetMap) | samedi, saison sèche (poussière) |
| Mosquées, églises | nombre de lieux (OpenStreetMap) | vendredi pour les mosquées, dimanche pour les églises |
| Maraîchage | nombre de parcelles (OpenStreetMap) | saison sèche : arrosage × 3 |
| Artisanat et ateliers | nombre de sites (OpenStreetMap) | jours ouvrés |

- **Données réelles** : le nombre d'équipements par zone vient d'OpenStreetMap (`npx tsx scripts/fetch-osm.ts`, relevé du 21/10/2026). **La couverture est inégale** : Ouèdo et Hêvié sont très peu cartographiées, donc leur demande repose presque entièrement sur les ménages.
- **Hypothèses de calage** (à valider avec la SoNEB et par des relevés de compteurs) : volume par unité (30 L par habitant et par jour, 2 m³ par école, 45 m³ pour l'université, 40 m³ par marché…), profils horaires, variations de période.
- **Lien avec la répartition** : `zone.demand` reste le niveau de référence du réseau (modifiable depuis l'écran Opérateur). Le modèle donne la **forme** : l'indice de demande d'un créneau (1 = creux de journée) vaut la demande du créneau divisée par la demande moyenne des créneaux creux d'un jour ordinaire.

### 7.4 Les quatre types d'eau (`waterTypes.ts`, `impact.ts`)

Une famille ne boit pas qu'au robinet. Chaque zone a un **mélange simulé** de sources (robinet, forage, puits) et une réserve à domicile. Chaque cause touche ces types différemment, et c'est ce qui se voit dans l'onglet « Types d'eau » de la fiche de zone.

| Type d'eau | Ce qui le fait manquer | Ce qui le rend dangereux |
|---|---|---|
| **Robinet** (réseau SoNEB) | courant, pompe, pression, conduite cassée, rationnement | conduite cassée, crues, pression basse |
| **Forage / borne fontaine** | courant, nappe, panne de pompe | crues |
| **Puits** | nappe qui baisse en saison sèche | pluie, crues, densité de bâtiments (base plus élevée) |
| **Eau stockée** | la réserve (10 h) couvre la coupure du robinet, pas toute la journée | chaleur, durée de stockage, source qui la remplit |

Quand le robinet coule peu, **les foyers se rabattent** (40 % vers un forage, 60 % vers un puits). C'est le mécanisme clé : la coupure de courant seule ne pollue rien, la pluie seule ne touche presque que les puits, mais **les deux ensemble** poussent les familles vers des puits pollués. HydroGraph calcule la part des foyers exposés, et une zone passe en **alerte qualité** quand elle dépasse 30 %.

Seuils du risque sanitaire (0 à 1) : sûre sous 0,3 ; à surveiller de 0,3 à 0,55 ; à risque au-delà. Toutes les constantes sont des hypothèses de calage, à valider avec des analyses de qualité de l'eau.

### 7.5 Répartition : sans HydroGraph, puis tours d'eau (`forecast.ts`, `rounds.ts`)

La journée de service va de 5 h à 23 h en **9 créneaux de 2 h**. À chaque créneau, le débit ne suffit pas à servir toutes les zones.

- **Sans HydroGraph** (`forecast`) : le réseau sert les zones dans l'ordre, des plus proches du château d'eau aux plus éloignées, et **s'arrête au premier manque de débit**. Sauter une zone proche pour en servir une plus loin ferait gagner des heures à une zone quand la capacité baisse : ce défaut, révélé par un test, est corrigé.
- **Tours d'eau HydroGraph** (`planRounds`) : un créneau est réservé d'avance à la zone la plus éloignée encore reliée (`guaranteed`), puis chaque créneau va d'abord aux zones **les moins servies jusque-là**, la distance départageant les ex æquo.

| Heures d'eau au robinet | Statut |
|---|---|
| ≥ 14 h | `ok` (vert) |
| 6 h à 13 h | `warn` (orange) |
| < 6 h | `risk` (rouge) |

Une zone en alerte qualité est déclassée d'un cran. La `confidence` affichée est plus basse en bout de réseau et quand une cause est en cours.

### 7.6 Attribution des causes (`explain.ts`)

Pour chaque zone, on rejoue la journée **en retirant une cause à la fois** et on mesure ce qu'elle changeait : heures d'eau perdues, et points de foyers exposés en plus. La période compte comme une cause. C'est ce qui produit « −4 h : coupure de courant » ou « +72 pts de foyers exposés : forte pluie » dans la fiche de zone. Les parts ne s'additionnent pas toujours exactement (deux causes peuvent s'amplifier), d'où l'écart global affiché à part.

### 7.7 Équité (`equity.ts`)

Pour la vue mairie, sur 7 jours : classement des zones « régulièrement oubliées » et **indice d'équité de 0 à 100** : `100 × (1 − écart / 24)`.

### 7.8 Tests (Vitest, 60 tests)

| Domaine | Ce que les tests garantissent |
|---|---|
| Graphe, prévision | chemins et zones en aval, déterminisme, créneau garanti, zone coupée jamais servie |
| Causes | chacune a libellé, valeur par défaut et source ; un événement seul = une liste |
| Demande | référence = 1 ; écoles absentes en vacances ; mosquées le vendredi, églises le dimanche ; marché ; chaleur ; pic matin ou soir |
| Types d'eau | la pluie pollue les puits mais pas le robinet ; la coupure retire des heures au robinet et aux forages, pas aux puits ; saison sèche ; rupture ; repli ; inondation des zones basses |
| Cumul | coupure + pluie alertent des zones que la pluie seule n'alerte pas ; ajouter une cause n'améliore jamais une zone |
| Attribution | la pluie explique des foyers exposés, la coupure des heures, la période apparaît |

---

## 8. Écrans et composants

### Navigation

Menu en haut, dans le cadre : **Carte · Opérateur · Mairie · Familles**, plus le bouton pilule « Mode démo ».

### 8.1 Accueil

- Scène d'eau réaliste, titre **HYDROGRAPH** à moitié immergé, sous-titre « LA MÉTÉO DE L'EAU ».
- Bouton **« Voir la carte du jour »** et, dans la navigation, **« ▶ Lancer la démo »** (mode guidé).

### 8.2 Carte du jour : F1, F2, F3

- **Quatre tuiles** qui changent avec le mode : zones bien servies, heures d'eau moyennes, zones à risque, écart entre quartiers (mode *Disponibilité*) ; ou demande totale, zone la plus gourmande, pic de la ville, écart avec un mercredi ordinaire (mode *Demande prévue*).
- **Barre de vue** : *Disponibilité* ou *Demande prévue*, et la **période** (mercredi ordinaire, jour de marché, vacances…). Pas de boutons d'événements en permanence : ce serait un outil de démo, pas un produit.
- **Vraie carte 3D d'Abomey-Calavi** : en mode *Disponibilité*, hauteur et couleur = heures d'eau ; en mode *Demande prévue*, bleu pâle à bleu profond = eau demandée.
- **Fiche de zone** flottante, avec trois onglets :
  - *Aujourd'hui* : heures, créneaux, **les causes cumulées avec les heures perdues par cause**, conseil, confiance ;
  - *Types d'eau* : robinet, forage, puits, réserve — part des foyers, heures d'accès, risque sanitaire, repli des foyers, foyers exposés ;
  - *Demande* : qui consomme (par activité), heure par heure, et selon la période.
- **Timelapse** : lecture de la journée de 5 h à 22 h ; en mode *Demande*, les zones montent et descendent avec la consommation.
- **Simuler des incidents** (bouton dans l'en-tête) : tiroir de démonstration avec les 12 causes, cumulables. Une notification s'affiche, puis le bouton **« Recalculer les tours d'eau »** balaie la carte.
- **« D'où viennent les données ? »** : chaque donnée simulée et sa vraie source future.

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

Le bouton **« ▶ Lancer la démo »** joue ces étapes, avec la phrase à dire affichée (flèches ← → pour avancer).

| Min | Action | Ce qu'on dit |
|---|---|---|
| 0:00 | Accueil, carte du jour | « Au Bénin, l'eau existe sur le papier, pas toujours au robinet. HydroGraph est la météo de l'eau. » |
| 0:30 | Timelapse | « Heure par heure, on voit quelles zones ont l'eau. Les quartiers en bout de réseau sont servis en dernier. » |
| 1:00 | Zone Hêvié, onglet « Aujourd'hui » | « En bout de réseau : quelques heures d'eau seulement. La fiche donne les causes et un conseil. » |
| 1:40 | Mode « Demande prévue », période « Jour de marché » | « Le modèle part des activités des habitants (écoles, marchés, santé, restauration…) pour prévoir où l'on consomme le plus, et à quelle heure. » |
| 2:20 | Simuler : coupure de courant + forte pluie | « Deux causes le même jour. Elles touchent des types d'eau différents. » |
| 3:00 | Onglet « Types d'eau » | « Quand le robinet coule moins, les familles se rabattent sur les puits, et c'est là que la pluie pollue. On voit qui est exposé. » |
| 3:40 | « Recalculer les tours d'eau » | « HydroGraph recalcule : Hêvié reçoit un créneau garanti et l'écart entre quartiers fond. » |
| 4:10 | Vue familles, puis vue mairie | « Chaque famille est prévenue. La mairie voit les quartiers oubliés : on mesure le service réellement reçu. » |
| 4:45 | « D'où viennent les données ? » | « Tout est simulé, mais chaque donnée a sa vraie source. Demain : signalements d'habitants, données publiques, un pilote. » |

**Plan B** : si le déploiement échoue, `dist/` ouvert en local ; si tout échoue, une vidéo d'écran enregistrée la veille.

---

## 12. Checklist de validation

Reprend les critères du cahier des charges.

- [ ] Chaque cause change **au moins une couleur ou un risque sanitaire** sur la carte (pluie : le risque, pas le débit)
- [ ] La zone la plus éloignée (Z6) reçoit un créneau garanti après une coupure
- [ ] Chaque donnée simulée affiche sa **vraie source future**
- [ ] Un jury non technique comprend la démo **sans explication**
- [ ] Les couleurs ont aussi une icône et un libellé
- [ ] Le niveau de confiance est visible sur les prévisions
- [ ] « Tout effacer » (tiroir d'incidents) ramène à la journée normale
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
| 2 | Moteur : graphe, prévision, tours d'eau, équité, messages | Fait |
| 3 | Vraie carte 3D d'Abomey-Calavi (MapLibre), zones en relief, conduites animées, fiche de zone flottante | Fait |
| 4 | Effets visibles sur la carte (château d'eau qui vacille, pluie, rupture), notifications, bouton « Recalculer » | Fait |
| 5 | Vue opérateur : plan avant/après, créneau garanti | Fait |
| 6 | Messages aux familles (français, WhatsApp/SMS, voix du navigateur) | Fait. Fon, goun, yoruba : en attente de relecture |
| 7 | Vue mairie : indice d'équité, quartiers oubliés | Fait |
| 8 | Timelapse de la journée sur la carte | Fait |
| 9 | Panneau « D'où viennent les données ? » (critère n°3) | Fait |
| 10 | Mode démo guidé (script en 8 étapes) | Fait |
| 11 | **Modèle en profondeur** : 12 causes cumulables, 4 types d'eau (robinet, forage, puits, réserve), repli des foyers, attribution des heures perdues par cause | Fait |
| 12 | **Modèle de demande** : activités des habitants (données OpenStreetMap), profils horaires, 8 périodes, vue « Demande prévue » (60 tests) | Fait |
| 13 | Calibrage avec de vraies données (compteurs, qualité de l'eau), relecture des traductions, vérification des chiffres, déploiement, répétition | À faire |

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

# Serveur local des alertes, abonnés et réseau (base de données et clés dans .env)
npm run api

# Rafraîchir les activités des zones depuis OpenStreetMap (écrit src/data/osm-activities.ts)
npx tsx scripts/fetch-osm.ts
```

> Un clone neuf doit d'abord faire `npm install` : le build lance `prisma generate`.
> Le script OpenStreetMap peut échouer quand le service Overpass est saturé : il garde un cache par zone dans `scripts/.osm-cache.json` et reprend là où il s'est arrêté.

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
