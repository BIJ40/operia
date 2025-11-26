# Widgets Dashboard

## Widgets disponibles

### 1. WeatherWidget (Météo)
Affiche la météo en temps réel basée sur la géolocalisation ou une ville par défaut.

**Configuration requise :**
- Clé API OpenWeatherMap (gratuite)
- Ajouter la clé dans les secrets Supabase : `OPENWEATHER_API_KEY`
- S'inscrire sur : https://openweathermap.org/api

**Fonctionnalités :**
- Température actuelle
- Description météo
- Humidité et vitesse du vent
- Géolocalisation automatique

### 2. QuickNotesWidget (Notes rapides)
Widget de prise de notes rapides avec code couleur.

**Fonctionnalités :**
- Création/modification/suppression de notes
- 5 couleurs disponibles (jaune, bleu, vert, rose, violet)
- Stockage dans Supabase (user_quick_notes)
- Défilement automatique si nombreuses notes

### 3. CalendarWidget (Calendrier)
Calendrier mensuel avec préparation pour intégrations externes.

**État actuel :**
- Affichage du calendrier du mois en cours
- Navigation mois précédent/suivant
- Mise en évidence du jour actuel

**Intégrations futures (préparées) :**
- Google Calendar (OAuth2)
- Outlook/Microsoft 365 (OAuth2)
- iCloud Calendar (CalDAV)

La table `user_calendar_connections` est prête pour stocker les tokens d'accès de manière sécurisée.

## Utilisation dans le Dashboard

Ces widgets peuvent être ajoutés au dashboard via le menu de gestion des widgets (icône grille en haut à droite).

Chaque widget peut être :
- Redimensionné (1 à 4 blocs)
- Déplacé par drag-and-drop
- Supprimé du dashboard

## Sécurité

- Les tokens d'accès calendrier sont chiffrés dans Supabase
- RLS activée sur toutes les tables
- Les notes sont privées par utilisateur
