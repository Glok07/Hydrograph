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
  { id: 'calendar', name: 'Calendrier', demo: 'Heures de pointe 6 h-8 h et 18 h-20 h codées en dur', real: 'Calendrier des saisons, jours de fête et de marché', when: 'Immédiate', inDemo: 'Oui' },
  { id: 'public', name: 'Données publiques', demo: 'Coupure, pluie et tuyau cassé déclenchés au clic', real: 'API météo, annonces de coupures SoNEB et SBEE récupérées automatiquement', when: 'Immédiate, à automatiser', inDemo: 'Simulé' },
  { id: 'residents', name: 'Habitants', demo: 'Historique de 7 jours inventé', real: 'Messages WhatsApp, SMS ou code court : « l’eau coule » / « pas d’eau »', when: 'Dès le lancement', inDemo: 'Simulé' },
  { id: 'sensors', name: 'Capteurs bas coût', demo: 'Aucune', real: 'Capteur de pression sur un robinet, envoi par SMS, quelques capteurs par zone', when: 'À fabriquer', inDemo: 'Non' },
  { id: 'operator', name: 'Partenariat opérateur', demo: 'Réseau, débits et foyers inventés', real: 'Données de pompage et de coupures de la SoNEB et de la SBEE', when: 'À négocier', inDemo: 'Non' },
  { id: 'map', name: 'Fond de carte', demo: 'Réel : OpenStreetMap via CARTO, localités placées d’après OpenStreetMap', real: 'Contours officiels des secteurs de desserte SoNEB', when: 'Avec le partenariat', inDemo: 'Oui' },
]
