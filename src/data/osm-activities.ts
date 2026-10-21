// Généré par scripts/fetch-osm.ts : ne pas modifier à la main, relancer le script pour rafraîchir.
// Relevé du 21/10/2026 : les six zones. Couverture OpenStreetMap inégale (Ouèdo et Hêvié sont très peu cartographiées).
export interface OsmCounts {
  school: number
  university: number
  health: number
  market: number
  food: number
  lodging: number
  carwash: number
  mosque: number
  church: number
  worshipOther: number
  agri: number
  craft: number
  wells: number
  taps: number
  waterWorks: number
  buildings: number
}

export const OSM_ACTIVITIES: {
  source: string
  fetchedAt: string
  note: string
  zones: Record<string, { radiusKm: number; counts: OsmCounts }>
} = {
  "source": "OpenStreetMap (Overpass API), contributeurs OpenStreetMap, licence ODbL",
  "fetchedAt": "2026-10-21",
  "note": "Comptes d'objets cartographiés dans le rayon de chaque zone. Couverture inégale : indicateur d'activité, pas un recensement.",
  "zones": {
    "Z1": {
      "radiusKm": 1.5,
      "counts": {
        "school": 24,
        "university": 2,
        "health": 5,
        "market": 1,
        "food": 16,
        "lodging": 7,
        "carwash": 4,
        "mosque": 2,
        "church": 5,
        "worshipOther": 0,
        "agri": 0,
        "craft": 16,
        "wells": 3,
        "taps": 0,
        "waterWorks": 1,
        "buildings": 2464
      }
    },
    "Z2": {
      "radiusKm": 1.4,
      "counts": {
        "school": 5,
        "university": 0,
        "health": 1,
        "market": 1,
        "food": 3,
        "lodging": 0,
        "carwash": 0,
        "mosque": 0,
        "church": 1,
        "worshipOther": 2,
        "agri": 2,
        "craft": 3,
        "wells": 0,
        "taps": 0,
        "waterWorks": 0,
        "buildings": 1483
      }
    },
    "Z3": {
      "radiusKm": 1.8,
      "counts": {
        "school": 29,
        "university": 0,
        "health": 9,
        "market": 2,
        "food": 28,
        "lodging": 4,
        "carwash": 1,
        "mosque": 1,
        "church": 9,
        "worshipOther": 2,
        "agri": 3,
        "craft": 16,
        "wells": 1,
        "taps": 1,
        "waterWorks": 0,
        "buildings": 3482
      }
    },
    "Z4": {
      "radiusKm": 1.15,
      "counts": {
        "school": 1,
        "university": 0,
        "health": 0,
        "market": 0,
        "food": 0,
        "lodging": 0,
        "carwash": 0,
        "mosque": 0,
        "church": 0,
        "worshipOther": 0,
        "agri": 0,
        "craft": 0,
        "wells": 0,
        "taps": 0,
        "waterWorks": 0,
        "buildings": 801
      }
    },
    "Z5": {
      "radiusKm": 1.5,
      "counts": {
        "school": 6,
        "university": 0,
        "health": 2,
        "market": 1,
        "food": 4,
        "lodging": 5,
        "carwash": 0,
        "mosque": 1,
        "church": 0,
        "worshipOther": 2,
        "agri": 4,
        "craft": 12,
        "wells": 0,
        "taps": 0,
        "waterWorks": 1,
        "buildings": 2169
      }
    },
    "Z6": {
      "radiusKm": 1.15,
      "counts": {
        "school": 1,
        "university": 0,
        "health": 0,
        "market": 0,
        "food": 0,
        "lodging": 0,
        "carwash": 0,
        "mosque": 0,
        "church": 0,
        "worshipOther": 0,
        "agri": 0,
        "craft": 0,
        "wells": 0,
        "taps": 0,
        "waterWorks": 0,
        "buildings": 1248
      }
    }
  }
}
