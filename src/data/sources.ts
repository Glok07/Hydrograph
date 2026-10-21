/**
 * Chaque donnée simulée et sa vraie source future (critère de réussite n°3 du cahier des charges).
 * Ordre : de la plus simple à brancher à la plus ambitieuse.
 */
export interface DataSource {
  id: string
  name: string
  demo: string
  real: string
  when: string
  inDemo: 'Oui' | 'Simulé' | 'Non'
}

export const SOURCES: DataSource[] = [
  { id: 'calendar', name: 'Calendrier', demo: 'Huit périodes types codées en dur : jour de la semaine, marché, vacances, fête, saison sèche', real: 'Calendrier des saisons, des jours fériés, des marchés et du calendrier scolaire', when: 'Immédiate', inDemo: 'Oui' },
  { id: 'public', name: 'Données publiques', demo: 'Douze causes (coupure, pluie, tuyau cassé, sécheresse…) déclenchées au clic, températures moyennes par mois', real: 'API météo, annonces de coupures SoNEB et SBEE récupérées automatiquement', when: 'Immédiate, à automatiser', inDemo: 'Simulé' },
  { id: 'activities', name: 'Activités des habitants', demo: 'Nombre d’écoles, de marchés, de centres de santé, de restaurants, de lieux de culte et d’hôtels par zone : relevés OpenStreetMap (réels, couverture inégale). Volumes d’eau par activité : hypothèses simulées', real: 'Recensement des établissements, compteurs et relevés de consommation de l’opérateur', when: 'Immédiate (OpenStreetMap) ; compteurs à négocier', inDemo: 'Simulé' },
  { id: 'watertypes', name: 'Types d’eau et qualité', demo: 'Mélange robinet / forage / puits de chaque zone, exposition aux crues et risque sanitaire : simulés', real: 'Enquêtes ménages nationales, analyses de qualité de l’eau, cartographie des zones inondables, niveaux de nappe', when: 'À collecter sur le terrain', inDemo: 'Simulé' },
  { id: 'residents', name: 'Habitants', demo: 'Historique de 7 jours inventé', real: 'Messages WhatsApp, SMS ou code court : « l’eau coule » / « pas d’eau »', when: 'Dès le lancement', inDemo: 'Simulé' },
  { id: 'sensors', name: 'Capteurs bas coût', demo: 'Aucune', real: 'Capteur de pression sur un robinet, envoi par SMS, quelques capteurs par zone', when: 'À fabriquer', inDemo: 'Non' },
  { id: 'operator', name: 'Partenariat opérateur', demo: 'Réseau, débits et foyers inventés', real: 'Données de pompage et de coupures de la SoNEB et de la SBEE', when: 'À négocier', inDemo: 'Non' },
  { id: 'map', name: 'Fond de carte', demo: 'Réel : OpenStreetMap via CARTO, localités placées d’après OpenStreetMap', real: 'Contours officiels des secteurs de desserte SoNEB', when: 'Avec le partenariat', inDemo: 'Oui' },
]
