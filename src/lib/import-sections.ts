import { supabase } from '@/integrations/supabase/client';

export interface SectionData {
  id: string;
  title: string;
  content: string;
  slug: string;
  colorPreset: string;
  order: number;
  icon: string;
}

export const sections: SectionData[] = [
  {
    id: 'tech-sec-1',
    title: 'Vue générale',
    slug: 'vue-generale',
    colorPreset: 'blue',
    order: 1,
    icon: 'Eye',
    content: `<h1>Application technicien – Vue générale</h1>
<p>L'<strong>application technicien</strong> est la vue terrain d'Apogée, spécialement conçue pour les intervenants.<br>
Ce n'est pas un outil séparé : c'est une <strong>vue simplifiée et sécurisée du CRM</strong>, avec des droits partiels, qui ne montre au technicien <strong>que ce qui le concerne directement</strong> :</p>
<ul>
<li>ses <strong>rendez-vous</strong> du jour et à venir ;</li>
<li>ses <strong>tâches</strong> internes ;</li>
<li>les <strong>informations utiles à l'intervention</strong> pour chaque mission (client, adresse, documents, consignes, formulaires à remplir, signatures, etc.).</li>
</ul>
<p>Tout repose sur le <strong>lien entre le rendez-vous, le type de rendez-vous et l'interface technicien</strong> :</p>
<ul>
<li>au bureau, on choisit un type de rendez-vous (À définir, Relevé technique, Travaux, Recherche de fuites, SAV, etc.) ;</li>
<li>côté technicien, l'écran s'adapte automatiquement : formulaire de RT, dépannage, travaux, PV spécifique à l'apporteur, etc.</li>
</ul>
<p>Presque <strong>tout ce que fait le technicien se passe dans le rendez-vous</strong>.<br>
Chaque action est <strong>synchronisée automatiquement</strong> avec Apogée : le bureau suit en temps réel le statut des interventions, les documents générés, les photos, les signatures et les sommes perçues.</p>`
  },
  {
    id: 'tech-sec-2',
    title: 'Accès et périmètre',
    slug: 'acces-et-perimetre',
    colorPreset: 'blue',
    order: 2,
    icon: 'Lock',
    content: `<h1>Accès et périmètre de l'application technicien</h1>
<h2>Connexion et droits</h2>
<ol>
<li>Le technicien ouvre l'application terrain Apogée sur sa tablette/téléphone.</li>
<li>Il se connecte avec son <strong>identifiant personnel</strong>.</li>
<li>Une fois connecté :
<ul>
<li>il ne voit <strong>que les rendez-vous qui lui sont attribués</strong> ;</li>
<li>il ne voit que les <strong>tâches qui le concernent</strong> ;</li>
<li>il n'accède qu'aux informations autorisées par ses droits.</li>
</ul>
</li>
</ol>
<p>L'objectif est double :</p>
<ul>
<li>sécuriser les données (accès limité à son périmètre) ;</li>
<li>simplifier l'interface pour le terrain (aucun "bruit" inutile).</li>
</ul>
<h2>Écran d'accueil et planning du jour</h2>
<p>À l'ouverture, l'application affiche immédiatement :</p>
<ul>
<li><strong>son planning du jour</strong> ;</li>
<li>la liste de ses <strong>rendez-vous du jour</strong> ;</li>
<li>ses <strong>tâches à traiter</strong>.</li>
</ul>
<p>Chaque rendez-vous du jour affiche au minimum :</p>
<ul>
<li>l'<strong>heure</strong> ;</li>
<li>le <strong>type d'intervention</strong> (RT, Travaux, À définir, Dépannage, etc.) ;</li>
<li>le <strong>nom du client</strong> ;</li>
<li>la <strong>ville</strong> ;</li>
<li>éventuellement un <strong>pictogramme</strong> ;</li>
<li>le <strong>statut</strong> (Planifié, En cours, RT en cours, Réalisé, À reprogrammer…).</li>
</ul>
<h2>Menu principal</h2>
<p>Depuis le menu latéral, le technicien peut :</p>
<ul>
<li>accéder à <strong>Mes rendez-vous</strong><br>
→ liste de tous ses rendez-vous à venir ou passés ;</li>
<li>ouvrir <strong>Planning</strong><br>
→ vue globale de son organisation (jour/semaine) ;</li>
<li>consulter <strong>Tâches</strong><br>
→ liste de toutes les tâches internes qui lui sont attribuées, avec possibilité de filtrer par importance et de répondre.</li>
</ul>`
  },
  {
    id: 'tech-sec-3',
    title: 'Fiche rendez-vous',
    slug: 'fiche-rendez-vous',
    colorPreset: 'blue',
    order: 3,
    icon: 'FileText',
    content: `<h1>Fiche rendez-vous côté technicien</h1>
<h2>Accéder au détail d'un rendez-vous</h2>
<p>Depuis le planning ou la liste <strong>Mes rendez-vous</strong> :</p>
<ol>
<li>Le technicien clique une première fois sur le rendez-vous souhaité.</li>
<li>Il visualise un premier niveau d'information :
<ul>
<li><strong>statut</strong> du rendez-vous (ex. Planifié) ;</li>
<li><strong>apporteur</strong> (si présent) ;</li>
<li><strong>client</strong> ;</li>
<li><strong>adresse d'intervention</strong> (cliquable pour ouvrir le GPS) ;</li>
<li><strong>visites prévues</strong> ;</li>
<li><strong>ordre de mission</strong> (PDF) s'il existe.</li>
</ul>
</li>
<li>Il clique sur <strong>Accéder</strong> pour ouvrir la fiche détaillée du rendez-vous.</li>
</ol>
<h2>Contenu de la fiche rendez-vous</h2>
<p>Sur l'écran détaillé d'un rendez-vous, le technicien voit :</p>
<ul>
<li>l'<strong>apporteur</strong> ;</li>
<li>le <strong>client</strong> ;</li>
<li>le <strong>résumé du rendez-vous</strong> (type, univers, contexte) ;</li>
<li>l'<strong>ordre de mission</strong> au format PDF (s'il existe) ;</li>
<li>un bloc <strong>Documents associés</strong> qui ouvre la <strong>médiathèque du rendez-vous</strong><br>
(ex. demande d'intervention, PV vierge, documents apporteur…) ;</li>
<li>éventuellement un accès au <strong>journal du rendez-vous</strong> (peu utilisé, le suivi se fait plutôt au niveau du journal de dossier).</li>
</ul>
<p>C'est également sur cet écran que se trouvent les <strong>deux boutons clés</strong> :</p>
<ul>
<li><strong>Je commence</strong><br>
→ le technicien démarre effectivement l'intervention ;</li>
<li><strong>Je ne peux pas</strong><br>
→ le technicien signale qu'il est dans l'impossibilité de réaliser l'intervention.</li>
</ul>`
  },
  {
    id: 'tech-sec-4',
    title: 'Cas "Je ne peux pas"',
    slug: 'je-ne-peux-pas',
    colorPreset: 'red',
    order: 4,
    icon: 'XCircle',
    content: `<h1>Cas "Je ne peux pas" – Impossibilité d'intervenir</h1>
<p>Lorsque le technicien <strong>ne peut pas réaliser le rendez-vous</strong> (client absent, accès impossible, impossibilité technique, matériel manquant, etc.), il doit impérativement passer par le bouton <strong>Je ne peux pas</strong>.</p>
<h2>Procédure côté technicien</h2>
<ol>
<li>Le technicien clique sur <strong>Je ne peux pas</strong>.</li>
<li>L'application lui demande la <strong>raison</strong> :
<ul>
<li><strong>Client absent</strong> ;</li>
<li><strong>Autre</strong> → dans ce cas, un champ libre oblige à saisir une <strong>raison détaillée</strong>.</li>
</ul>
</li>
<li>Il valide sa saisie.</li>
<li>Il confirme le bon d'intervention dans cet état ("non réalisé").</li>
</ol>
<h2>Effets automatiques dans Apogée</h2>
<p>Une fois la raison validée :</p>
<ul>
<li>le <strong>rendez-vous</strong> passe au statut <strong>À reprogrammer</strong> ;</li>
<li>le <strong>dossier</strong> passe au statut <strong>À statuer</strong> :<br>
quelqu'un au bureau doit prendre une décision (reprendre un rendez-vous, annuler, requalifier…) ;</li>
<li>sur le <strong>planning</strong>, le créneau apparaît en <strong>légèrement transparent</strong> pour signaler qu'il n'a pas été honoré ;</li>
<li>la <strong>raison saisie</strong> (client absent ou motif libre) est <strong>reportée dans le journal du dossier</strong>.</li>
</ul>
<p>Le rendez-vous <strong>reste réutilisable</strong> tant qu'aucune donnée d'intervention n'a été saisie.<br>
Le bureau pourra replanifier ce même rendez-vous sans perdre d'information.</p>`
  },
  {
    id: 'tech-sec-5',
    title: 'Bouton "Je commence"',
    slug: 'je-commence',
    colorPreset: 'green',
    order: 5,
    icon: 'PlayCircle',
    content: `<h1>Démarrer une intervention – Bouton "Je commence"</h1>
<p>Lorsque le technicien <strong>peut intervenir</strong>, il clique sur <strong>Je commence</strong>.</p>
<p>Ce bouton déclenche :</p>
<ul>
<li>l'ouverture de l'interface correspondant au <strong>type de rendez-vous</strong> (Relevé technique, À définir, Travaux, etc.) ;</li>
<li>la mise à jour éventuelle de certains <strong>statuts</strong> (par exemple, "RT en cours" pour un relevé technique).</li>
</ul>
<p>À partir de là, le comportement dépend du <strong>type de rendez-vous</strong>.</p>`
  },
  {
    id: 'tech-sec-6',
    title: 'Relevé Technique (RT)',
    slug: 'releve-technique',
    colorPreset: 'purple',
    order: 6,
    icon: 'ClipboardList',
    content: `<h1>Rendez-vous de type Relevé Technique (RT)</h1>
<p>Un rendez-vous de <strong>type Relevé Technique</strong> sert à préparer un <strong>devis</strong> :</p>
<ul>
<li>on y décrit la situation ;</li>
<li>on prend des mesures, des photos ;</li>
<li>on renseigne toutes les informations nécessaires au chiffrage ;</li>
<li>il n'y a <strong>pas de notion de "travaux réalisés"</strong> dans ce type : c'est une visite préparatoire.</li>
</ul>
<h2>Signature de documents avant travaux</h2>
<p>Pour certains apporteurs (ex. <strong>PNT</strong>), des documents doivent être signés <strong>avant</strong> de démarrer le relevé.</p>
<h3>Étapes côté technicien</h3>
<ol>
<li>Cliquer sur <strong>Je commence</strong> sur un rendez-vous de type Relevé technique.</li>
<li>Dans le bloc <strong>Documents à faire signer</strong>, ouvrir le <strong>menu déroulant</strong>.</li>
<li>Sélectionner le <strong>premier document</strong> (ex. attestation de TVA).</li>
<li>Vérifier le <strong>pré-remplissage</strong> (coordonnées, références, cases à cocher).</li>
<li>Cocher les éléments requis.</li>
<li>Cliquer sur <strong>Faire signer le document</strong>.</li>
<li>Le <strong>PDF est généré</strong>.</li>
<li>Faire <strong>signer le client</strong> en bas du document directement sur la tablette.</li>
<li>Cliquer sur <strong>Générer le document signé</strong>.</li>
</ol>
<p><strong>Résultat :</strong></p>
<ul>
<li>le PDF signé est automatiquement rangé dans les <strong>documents associés du rendez-vous</strong> ;</li>
<li>il apparaît également dans les <strong>documents du dossier</strong>.</li>
</ul>
<h2>Choix du type de chiffrage</h2>
<p>Une fois les documents préalables signés, le technicien descend sur le bloc <strong>Je fais un RT</strong>.</p>
<p>Il doit :</p>
<ol>
<li>Choisir le <strong>type de chiffrage</strong>, c'est-à-dire le <strong>modèle de relevé</strong> adapté :
<ul>
<li>par exemple, en vitrerie : <em>Double vitrage</em>, <em>Simple vitrage</em>, <em>Relevé technique standard</em>.</li>
</ul>
</li>
<li>Le système affiche alors le <strong>formulaire correspondant</strong> au modèle choisi.</li>
</ol>
<h2>Remplissage du relevé technique</h2>
<p>Le technicien se laisse guider par le formulaire et doit <strong>compléter toutes les zones</strong> :</p>
<ul>
<li><strong>description du problème constaté</strong> ;</li>
<li><strong>détails techniques</strong> selon l'univers (dimensions, métrés, matériaux, état existant) ;</li>
<li><strong>photos obligatoires ou recommandées</strong> ;</li>
<li><strong>observations diverses</strong> ;</li>
<li><strong>remarques utiles pour le devis</strong> ;</li>
<li><strong>M° prévu</strong> (temps prévu) et <strong>nombre de techniciens prévus</strong>.</li>
</ul>
<p>Il peut <strong>ajouter autant de photos qu'il le souhaite</strong>.<br>
Toutes les photos sont automatiquement envoyées dans la <strong>médiathèque du rendez-vous</strong>.</p>
<h2>Plusieurs chiffrages dans un même rendez-vous</h2>
<p>Si le dossier comporte <strong>plusieurs besoins distincts</strong> (ex. vitrage + cumulus), le technicien peut :</p>
<ol>
<li>Compléter un premier bloc de chiffrage.</li>
<li>Cliquer sur <strong>Ajouter un deuxième chiffrage</strong>.</li>
<li>Sélectionner un <strong>second type de chiffrage</strong>.</li>
<li>Remplir un <strong>deuxième formulaire</strong> complet.</li>
</ol>
<p>Chaque chiffrage remontera au bureau et pourra être transformé en <strong>devis distinct</strong>.</p>
<h2>Bouton "Non terminé" sur un RT</h2>
<p>Si le relevé n'est <strong>pas complètement rempli</strong> :</p>
<ol>
<li>Le technicien clique sur <strong>Non terminé</strong>.</li>
</ol>
<p><strong>Conséquences :</strong></p>
<ul>
<li>le <strong>rendez-vous</strong> passe au statut <strong>RT en cours</strong> ;</li>
<li>le <strong>dossier</strong> passe au statut <strong>Devis à faire – RT en cours</strong> ;</li>
<li>aucun PDF de relevé n'est généré à ce stade ;</li>
<li>le relevé est <strong>conservé tel quel</strong> et pourra être complété plus tard.</li>
</ul>
<h2>Validation du relevé technique</h2>
<p>Quand le relevé est <strong>entièrement complété</strong> :</p>
<ol>
<li>Le technicien clique sur <strong>Valider le relevé technique</strong>.</li>
</ol>
<p><strong>Conséquences :</strong></p>
<ul>
<li>un <strong>PDF de relevé technique</strong> est généré automatiquement ;</li>
<li>ce PDF est rangé dans les <strong>documents associés du dossier</strong> ;</li>
<li>le dossier est positionné sur un statut qui permet au <strong>bureau de préparer le devis</strong>.</li>
</ul>`
  },
  {
    id: 'tech-sec-7',
    title: 'Type "À définir"',
    slug: 'a-definir',
    colorPreset: 'yellow',
    order: 7,
    icon: 'HelpCircle',
    content: `<h1>Rendez-vous de type "À définir"</h1>
<p>Le type <strong>À définir</strong> est pensé pour les premières visites ou les contextes où le technicien doit <strong>décider sur place</strong> de la suite :</p>
<ul>
<li>Dépannage immédiat si possible ;</li>
<li>Relevé technique si un devis est nécessaire.</li>
</ul>
<p>Il est <strong>particulièrement adapté</strong> pour :</p>
<ul>
<li>les <strong>assisteurs</strong> ;</li>
<li>les <strong>maintenanceurs</strong> ;</li>
<li>la <strong>gestion locative</strong>.</li>
</ul>
<h2>Démarrage sur un rendez-vous "À définir"</h2>
<ol>
<li>Le technicien ouvre le rendez-vous.</li>
<li>Il voit l'onglet <strong>Intervention</strong> et le bouton <strong>Je commence</strong>.</li>
<li>En cliquant sur <strong>Je commence</strong>, l'application lui propose un <strong>choix</strong> :
<ul>
<li><strong>Je dépanne</strong></li>
<li><strong>Relevé technique (RT)</strong></li>
</ul>
</li>
</ol>
<h3>Si le technicien choisit "Relevé technique"</h3>
<p>Le comportement est <strong>strictement identique</strong> à celui d'un rendez-vous de type RT.</p>
<h3>Si le technicien choisit "Je dépanne"</h3>
<p>Le <strong>formulaire de dépannage</strong> est <strong>adapté à l'apporteur</strong>.<br>
Les blocs standards sont :</p>
<ul>
<li><strong>Constat technicien</strong> ;</li>
<li><strong>Photo avant</strong> ;</li>
<li><strong>Travaux réalisés</strong> ;</li>
<li><strong>Photo après</strong>.</li>
</ul>
<h4>Exemple – Maintenanceur</h4>
<ol>
<li>Saisir le <strong>constat technicien</strong>.</li>
<li>Prendre une <strong>photo avant</strong> intervention.</li>
<li>Décrire les <strong>travaux réalisés</strong>.</li>
<li>Prendre une <strong>photo après</strong>.</li>
</ol>
<h4>Exemple – Agence immobilière (locataire / bailleur)</h4>
<ol>
<li>Le technicien choisit s'il dépanne pour un <strong>locataire</strong> ou pour un <strong>bailleur</strong>.</li>
<li>Il complète les mêmes blocs (constat, photo avant, travaux, photo après).</li>
</ol>
<h2>Gestion des fournitures</h2>
<p>Si le technicien a utilisé des <strong>fournitures</strong> :</p>
<ol>
<li>Il coche la case <strong>J'ai utilisé des fournitures</strong>.</li>
<li>Il a alors deux options :
<ul>
<li><strong>Texte libre</strong> : détailler les fournitures consommées ;</li>
<li><strong>Base article</strong> :
<ol>
<li>Cliquer sur le <strong>"+ jaune"</strong>.</li>
<li>Rechercher dans la <strong>base article</strong> (ex. "raccord").</li>
<li>Sélectionner l'article utilisé.</li>
<li>L'application affiche le <strong>prix de vente</strong>.</li>
</ol>
</li>
</ul>
</li>
</ol>
<h2>Saisie des horaires et fin de dépannage</h2>
<ol>
<li>Le technicien saisit l'<strong>heure d'arrivée</strong>.</li>
<li>Il saisit l'<strong>heure de départ</strong>.</li>
<li>Le <strong>temps passé</strong> est calculé automatiquement.</li>
<li>Il indique le <strong>nombre de techniciens présents</strong>.</li>
<li>Il clique sur <strong>Terminer</strong>.</li>
</ol>
<p><strong>Conséquences :</strong></p>
<ul>
<li>un <strong>bon d'intervention interne</strong> est généré au format PDF ;</li>
<li>la <strong>signature client</strong> est demandée (selon le modèle) ;</li>
<li>le <strong>document signé</strong> est archivé dans les <strong>documents associés</strong> du dossier.</li>
</ul>`
  },
  {
    id: 'tech-sec-8',
    title: 'Type "Travaux"',
    slug: 'travaux',
    colorPreset: 'green',
    order: 8,
    icon: 'Wrench',
    content: `<h1>Rendez-vous de type "Travaux"</h1>
<p>Les rendez-vous de type <strong>Travaux</strong> sont utilisés lorsque <strong>un devis a été validé</strong> et que les travaux doivent être réalisés.</p>
<h2>Principe général</h2>
<p>Sur un rendez-vous de type Travaux :</p>
<ol>
<li>Le technicien clique sur <strong>Je commence</strong>.</li>
<li>L'application affiche un <strong>formulaire Travaux</strong>, adapté au <strong>type d'apporteur</strong>.</li>
</ol>
<p>L'objectif :</p>
<ul>
<li>tracer précisément les <strong>travaux réellement réalisés</strong> ;</li>
<li>savoir si les travaux sont <strong>conformes au devis</strong> ;</li>
<li>générer les <strong>bons / PV</strong> demandés ;</li>
<li>disposer de toutes les pièces pour la <strong>facturation</strong>.</li>
</ul>
<h2>Cas d'un apporteur local</h2>
<ol>
<li>Le technicien indique si les travaux sont <strong>conformes au devis</strong> (Oui/Non).</li>
<li>S'ils ne le sont pas, il décrit les <strong>modifications</strong>.</li>
<li>Il décrit les <strong>travaux réellement réalisés</strong>.</li>
<li>Il ajoute des <strong>photos</strong> (avant / après).</li>
<li>Il renseigne l'<strong>heure d'arrivée</strong> et l'<strong>heure de départ</strong>.</li>
<li>Il clique sur <strong>Terminer</strong>.</li>
</ol>
<p>Apogée génère alors un <strong>bon d'intervention</strong> (BI) qui peut être signé par le client.</p>
<h2>Cas d'un apporteur national – Exemple Viaren</h2>
<ol>
<li>Le technicien peut saisir un <strong>bloc interne</strong> (remarques pour le bureau).</li>
<li>Il indique si les travaux sont <strong>conformes au devis</strong>.</li>
<li>Il ajoute une <strong>photo après travaux</strong>.</li>
<li>Il renseigne ses <strong>horaires</strong>.</li>
<li>Il remplit les champs demandés par l'<strong>apporteur</strong>.</li>
<li>Il clique sur <strong>Terminer / Faire signer le document</strong>.</li>
</ol>
<p>Apogée génère le <strong>procès-verbal Viaren</strong> (PV) et propose la <strong>signature client</strong>.</p>
<h2>Particularité Dynaren et SPPF</h2>
<p>Pour ces apporteurs, Apogée <strong>ne recrée pas</strong> le PV :</p>
<ol>
<li>Le <strong>PDF du PV vierge</strong> (reçu par mail) est inséré dans les documents du dossier.</li>
<li>L'application utilise <strong>ce modèle précis</strong> pour le remplissage et la signature.</li>
</ol>
<h2>Cas Domus – PV Travaux</h2>
<ol>
<li>Le technicien clique sur <strong>Faire signer ce document – Domus PV Travaux</strong>.</li>
<li>Il renseigne :
<ul>
<li>la <strong>date de début de travaux</strong> ;</li>
<li>la <strong>date de fin de travaux</strong> ;</li>
<li>les informations sur la <strong>franchise</strong> ;</li>
<li>toutes les autres informations demandées.</li>
</ul>
</li>
<li>Il clique sur <strong>Terminer l'intervention</strong>.</li>
</ol>
<p>Apogée génère automatiquement le <strong>procès-verbal de réception de travaux Domus</strong> et le propose à la signature.</p>`
  },
  {
    id: 'tech-sec-9',
    title: 'Bouton "Non terminé"',
    slug: 'non-termine',
    colorPreset: 'orange',
    order: 9,
    icon: 'AlertCircle',
    content: `<h1>Gestion avancée du bouton "Non terminé"</h1>
<p>L'option <strong>Non terminé</strong> ne se comporte <strong>pas</strong> de la même façon selon le <strong>type d'intervention</strong>.</p>
<h2>"Non terminé" dans un Relevé Technique</h2>
<p>Lorsque le technicien clique sur <strong>Non terminé</strong> dans un RT :</p>
<ol>
<li>Le rendez-vous passe en <strong>RT en cours</strong>.</li>
<li>Le dossier passe en <strong>Devis à faire – RT en cours</strong>.</li>
<li>Aucun PDF n'est généré.</li>
<li>Le relevé est <strong>conservé tel quel</strong>, pour être repris plus tard.</li>
</ol>
<h2>"Non terminé" dans des Travaux</h2>
<h3>Question sur la création d'un nouveau RT</h3>
<p>Lorsque le technicien clique sur <strong>Non terminé</strong> :</p>
<ol>
<li>L'application lui demande :<br>
<strong>« Souhaitez-vous faire un nouveau relevé technique ? »</strong></li>
<li>Si le technicien répond <strong>Oui</strong>, l'application pose une seconde question :<br>
<strong>« Voulez-vous créer un nouveau dossier pour ce relevé technique ? »</strong></li>
</ol>
<p><strong>Point clé :</strong></p>
<ul>
<li>le <strong>nouveau relevé technique</strong> ne sera <strong>pas rattaché au dossier en cours</strong> ;</li>
<li>un <strong>nouveau dossier indépendant</strong> peut être créé, générant une <strong>nouvelle demande</strong>.</li>
</ul>
<h4>Conséquences si le technicien choisit de faire un nouveau RT</h4>
<ul>
<li>le <strong>dossier initial</strong> passe en <strong>À statuer</strong> ;</li>
<li>un <strong>nouveau dossier</strong> est créé ;</li>
<li>ce nouveau dossier s'ouvre directement en mode <strong>Relevé technique</strong>.</li>
</ul>
<h3>Comportement par défaut sans nouveau RT</h3>
<p>Si le technicien <strong>ne souhaite pas</strong> faire un nouveau RT :</p>
<ul>
<li>le <strong>rendez-vous</strong> passe en <strong>Réalisé</strong>, même si les travaux ne sont <strong>pas entièrement terminés</strong> ;</li>
<li>le <strong>dossier</strong> passe en <strong>À statuer</strong> ;</li>
<li>sur le planning, le rendez-vous apparaît avec la mention <strong>« BI travaux non terminé »</strong>.</li>
</ul>
<p>Le technicien peut cliquer sur <strong>Remonter une information</strong> pour expliquer la situation.</p>
<h2>Points d'attention</h2>
<ul>
<li><strong>"Non terminé" ne signifie pas "je reprendrai plus tard sur ce même rendez-vous"</strong> :
<ul>
<li>en RT, oui, on reprend le même relevé ;</li>
<li>en Travaux, on clôt quand même le rendez-vous comme <strong>Réalisé</strong> et on passe le dossier en <strong>À statuer</strong>.</li>
</ul>
</li>
<li>La création d'un <strong>nouveau dossier</strong> suite à un "Non terminé" Travaux est <strong>toujours explicitement demandée</strong>.</li>
<li>Le bureau doit <strong>systématiquement traiter</strong> les dossiers passés en <strong>À statuer</strong>.</li>
</ul>`
  },
  {
    id: 'tech-sec-10',
    title: 'Photos et médiathèque',
    slug: 'photos-mediatheque',
    colorPreset: 'cyan',
    order: 10,
    icon: 'Image',
    content: `<h1>Photos, documents et médiathèque</h1>
<h2>Ajout de photos</h2>
<p>Dans les différents écrans (RT, Dépannage, Travaux), le technicien peut :</p>
<ul>
<li>prendre une <strong>photo</strong> directement depuis l'application ;</li>
<li>importer une <strong>photo existante</strong> depuis la galerie du téléphone.</li>
</ul>
<p>Une fois validées :</p>
<ul>
<li>les photos remontent dans la <strong>médiathèque</strong> du rendez-vous ;</li>
<li>elles sont classées et <strong>rangées automatiquement</strong> par passage.</li>
</ul>
<p>Chaque photo peut être associée à un <strong>commentaire</strong> :</p>
<ul>
<li>ces commentaires sont visibles par le bureau ;</li>
<li>ils aident à la rédaction du <strong>devis</strong> ou à la <strong>facturation</strong>.</li>
</ul>
<h2>Médiathèque technicien → bureau</h2>
<p>Tout ce que le technicien envoie (photos, PV signés, documents divers) :</p>
<ul>
<li>est automatiquement rangé dans la <strong>médiathèque du rendez-vous</strong> ;</li>
<li>le bureau n'a <strong>aucune manipulation supplémentaire</strong> à faire ;</li>
<li>les documents sont <strong>classés proprement</strong>.</li>
</ul>
<h2>Signatures clients</h2>
<p>Dans de nombreuses situations (RT, BI, PV apporteur), le technicien doit faire <strong>signer le client</strong> :</p>
<ol>
<li>Le PDF est généré.</li>
<li>Une zone de <strong>signature client</strong> apparaît en bas.</li>
<li>Le client signe directement sur la tablette.</li>
<li>Le technicien génère le <strong>document signé</strong>.</li>
<li>Le PDF signé est archivé dans les <strong>documents associés du rendez-vous et du dossier</strong>.</li>
</ol>`
  },
  {
    id: 'tech-sec-11',
    title: 'Commentaires et journal',
    slug: 'commentaires-journal',
    colorPreset: 'indigo',
    order: 11,
    icon: 'MessageSquare',
    content: `<h1>Commentaires technicien et journal du dossier</h1>
<h2>Commentaires dans le relevé</h2>
<p>En bas de ses écrans d'intervention (RT, Dépannage, Travaux), le technicien peut :</p>
<ul>
<li>ajouter des <strong>commentaires</strong> ;</li>
<li>préciser un contexte particulier ;</li>
<li>remonter des <strong>informations complémentaires</strong>.</li>
</ul>
<p>Ces commentaires :</p>
<ul>
<li>apparaissent automatiquement dans le <strong>journal du dossier</strong> ;</li>
<li>facilitent la communication entre le <strong>terrain</strong> et le <strong>bureau</strong>.</li>
</ul>
<h2>Fonction "Remonter une information"</h2>
<p>Dans certains écrans (notamment Travaux avec "Non terminé") :</p>
<ul>
<li>le technicien dispose d'un bouton <strong>Remonter une information</strong> ;</li>
<li>ce bouton permet d'envoyer un message clair au bureau :
<ul>
<li>pourquoi les travaux ne sont pas terminés ;</li>
<li>quel matériel manque ;</li>
<li>quelles décisions sont à prendre.</li>
</ul>
</li>
</ul>
<p>Le message est <strong>sauvegardé dans le journal du dossier</strong>, ce qui garantit la traçabilité.</p>`
  },
  {
    id: 'tech-sec-12',
    title: 'Sommes perçues',
    slug: 'sommes-percues',
    colorPreset: 'teal',
    order: 12,
    icon: 'DollarSign',
    content: `<h1>Sommes perçues et reçus de paiement</h1>
<p>Lorsqu'un technicien <strong>encaisse une somme sur place</strong> (franchise, acompte, etc.), l'application permet de traiter cela proprement.</p>
<h2>Bloc "Sommes perçues"</h2>
<p>Sur un dossier où une <strong>franchise</strong> ou un montant à réclamer est renseigné :</p>
<ol>
<li>Sur l'onglet Intervention, après <strong>Je commence</strong>, le technicien accède au bloc <strong>Sommes perçues</strong>.</li>
<li>Il clique sur <strong>Perçu</strong>.</li>
<li>Il sélectionne le <strong>mode de règlement</strong> (espèces, chèque, carte bancaire).</li>
<li>Il utilise la <strong>flèche verte</strong> pour <strong>ajouter une photo du règlement</strong> (photo du chèque, ticket CB).</li>
<li>Il <strong>enregistre</strong>.</li>
</ol>
<p>Cette information est immédiatement <strong>répercutée dans le dossier</strong> et alimente la partie <strong>règlements</strong>.</p>
<h2>Génération d'un reçu de paiement</h2>
<p>En bas de l'écran, un bouton <strong>Reçu</strong> permet de :</p>
<ol>
<li>Générer un <strong>reçu de paiement</strong> correspondant à la somme perçue.</li>
<li>Envoyer ce reçu directement au client par mail en cliquant sur l'<strong>arobase vert</strong>.</li>
</ol>
<p>Le client reçoit ainsi une preuve de paiement, par exemple :<br>
<em>"Franchise de X € bien perçue."</em></p>
<p>C'est un élément clé pour :</p>
<ul>
<li>la transparence avec le client ;</li>
<li>la cohérence entre terrain et gestion.</li>
</ul>`
  },
  {
    id: 'tech-sec-13',
    title: 'Tâches technicien',
    slug: 'taches-technicien',
    colorPreset: 'rose',
    order: 13,
    icon: 'CheckSquare',
    content: `<h1>Tâches dans l'application technicien</h1>
<p>Dans le <strong>menu principal</strong>, le technicien dispose d'un accès à ses <strong>tâches</strong>.</p>
<h2>Consultation des tâches</h2>
<p>L'écran Tâches lui permet de :</p>
<ul>
<li>voir la liste des <strong>tâches qui lui sont attribuées</strong> ;</li>
<li>filtrer les tâches en fonction de leur <strong>importance</strong> ou de leur état.</li>
</ul>
<p>Exemples de tâches :</p>
<ul>
<li>demande d'information complémentaire ;</li>
<li>remarque du bureau ;</li>
<li>rappel sur une action à vérifier ;</li>
<li>consigne spécifique pour une intervention future.</li>
</ul>
<h2>Traitement et réponse</h2>
<p>Depuis l'application :</p>
<ul>
<li>le technicien peut <strong>répondre</strong> directement à une tâche ;</li>
<li>l'information remonte dans le <strong>journal du dossier</strong> ;</li>
<li>il visualise en un seul point ce qu'il lui reste à faire <strong>en plus des rendez-vous</strong>.</li>
</ul>
<p>L'application technicien devient ainsi un <strong>point unique</strong> pour les <strong>rendez-vous</strong> et les <strong>tâches</strong>.</p>`
  },
  {
    id: 'tech-sec-14',
    title: 'Synchronisation',
    slug: 'synchronisation',
    colorPreset: 'green',
    order: 14,
    icon: 'RefreshCw',
    content: `<h1>Synchronisation automatique</h1>
<p>À chaque fois que le technicien :</p>
<ul>
<li>ajoute une <strong>photo</strong> ;</li>
<li>rédige un <strong>commentaire</strong> ;</li>
<li>fait <strong>signer</strong> un document ;</li>
<li>valide un <strong>relevé technique</strong> ;</li>
<li>termine une <strong>intervention</strong> ;</li>
<li>déclare une <strong>somme perçue</strong> ;</li>
</ul>
<p>l'application <strong>synchronise automatiquement</strong> les données avec Apogée.</p>
<p>Si la connexion est :</p>
<ul>
<li><strong>bonne</strong> → la synchronisation est quasi <strong>instantanée</strong> ;</li>
<li><strong>mauvaise ou absente</strong> → les données sont mises <strong>en attente</strong> et seront envoyées automatiquement <strong>dès que la connexion revient</strong>.</li>
</ul>`
  },
  {
    id: 'tech-sec-15',
    title: 'Finalisation intervention',
    slug: 'finalisation-intervention',
    colorPreset: 'blue',
    order: 15,
    icon: 'CheckCircle',
    content: `<h1>Finalisation de l'intervention</h1>
<h2>Clôturer un RT</h2>
<p>Sur un <strong>relevé technique</strong>, la fin de mission côté technicien se fait via :</p>
<ul>
<li><strong>Valider le relevé technique</strong> → génération du PDF RT, dossier prêt pour devis ;</li>
<li>ou <strong>Non terminé</strong> → RT en cours, devis à faire, relevé à reprendre plus tard.</li>
</ul>
<h2>Déclarer un dépannage réalisé</h2>
<p>Sur un rendez-vous de type <strong>Dépannage</strong> :</p>
<ol>
<li>Le technicien remplit : constat, travaux réalisés, photos avant/après, fournitures, horaires.</li>
<li>Il clique sur <strong>Dépannage réalisé</strong> ou <strong>Terminer</strong>.</li>
</ol>
<p><strong>Conséquences :</strong></p>
<ul>
<li>l'intervention est marquée comme <strong>réalisée</strong> ;</li>
<li>le bureau voit immédiatement le changement de statut ;</li>
<li>un <strong>bon d'intervention</strong> est généré et archivé.</li>
</ul>
<h2>Finalisation globale</h2>
<p>Lorsque le technicien quitte le chantier, les bonnes pratiques sont :</p>
<ol>
<li>Vérifier que tous les champs obligatoires sont remplis.</li>
<li>Vérifier que les <strong>photos</strong> nécessaires sont bien prises.</li>
<li>Faire <strong>signer le client</strong> si un document le prévoit.</li>
<li>Cliquer sur <strong>Terminer</strong>, <strong>Valider le RT</strong> ou <strong>Dépannage réalisé</strong>.</li>
<li>S'assurer que la <strong>synchronisation</strong> a bien été effectuée.</li>
</ol>
<p>Une fois la validation faite :</p>
<ul>
<li>le <strong>statut du rendez-vous</strong> passe en <strong>Réalisé</strong> ;</li>
<li>le <strong>bureau</strong> peut enchaîner sur la préparation de <strong>devis</strong>, la <strong>facturation</strong> ou la <strong>clôture</strong>.</li>
</ul>`
  },
  {
    id: 'tech-sec-16',
    title: 'Bonnes pratiques terrain',
    slug: 'bonnes-pratiques-terrain',
    colorPreset: 'purple',
    order: 16,
    icon: 'BookOpen',
    content: `<h1>Bonnes pratiques terrain – Synthèse</h1>
<h2>Avant et pendant l'intervention</h2>
<ul>
<li>Toujours <strong>cliquer sur "Je commence"</strong> dès l'arrivée sur site.</li>
<li>Toujours relire les <strong>consignes</strong> (infos pour technicien, remarques internes, documents associés).</li>
<li>Toujours prendre <strong>plusieurs photos</strong>, même si ce n'est pas explicitement obligatoire.</li>
</ul>
<h2>Relevé technique</h2>
<ul>
<li>Toujours <strong>décrire précisément</strong> la situation (problème constaté, état existant, contraintes, mesures).</li>
<li>Toujours compléter le <strong>type de chiffrage</strong> adapté.</li>
<li>Utiliser <strong>"Non terminé"</strong> si le relevé ne peut pas être finalisé.</li>
<li>Ne jamais quitter un RT sans soit <strong>Valider</strong>, soit le marquer <strong>RT en cours</strong>.</li>
</ul>
<h2>Travaux</h2>
<ul>
<li>Toujours indiquer si les travaux sont <strong>conformes au devis</strong>.</li>
<li>En cas de non-conformité : cocher <strong>Non</strong> et expliquer clairement <strong>pourquoi</strong>.</li>
<li>Toujours prendre des <strong>photos avant/après</strong>.</li>
<li>Bien utiliser le <strong>"Non terminé" Travaux</strong> en comprenant ses impacts.</li>
</ul>
<h2>Sommes perçues</h2>
<ul>
<li>Toujours déclarer les <strong>sommes perçues</strong> dans le bloc dédié (mode de règlement, photo du règlement).</li>
<li>Toujours générer un <strong>reçu</strong> et l'envoyer au client si nécessaire.</li>
</ul>
<h2>Gestion des impossibilités</h2>
<ul>
<li>Ne jamais laisser un rendez-vous planifié alors que le passage a échoué.</li>
<li>Utiliser systématiquement <strong>Je ne peux pas</strong> avec un <strong>motif précis</strong>.</li>
</ul>
<h2>Communication avec le bureau</h2>
<ul>
<li>Utiliser les <strong>commentaires</strong> et <strong>Remonter une information</strong> pour expliquer les situations.</li>
<li>Renseigner systématiquement les <strong>horaires</strong> (arrivée / départ).</li>
</ul>
<h2>Synchronisation</h2>
<ul>
<li>Ne jamais quitter un chantier sans vérifier que l'intervention est <strong>validée</strong> et <strong>synchronisée</strong>.</li>
</ul>`
  }
];

export async function importSections(categoryId: string) {
  try {
    const { data, error } = await supabase.functions.invoke('import-sections', {
      body: { categoryId, sections }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erreur lors de l\'importation:', error);
    throw error;
  }
}
