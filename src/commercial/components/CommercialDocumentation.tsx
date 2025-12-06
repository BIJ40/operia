import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Type, Image, AlertCircle } from "lucide-react";

const TEXT_PLACEHOLDERS = [
  { tag: '{{AGENCE_NOM_LONG}}', field: 'agence_nom_long', description: 'Nom complet de l\'agence' },
  { tag: '{{BASELINE}}', field: 'baseline', description: 'Slogan / phrase d\'accroche' },
  { tag: '{{DATE_CREATION}}', field: 'date_creation', description: 'Date de création (ex: avril 2021)' },
  { tag: '{{RANG_AGENCE}}', field: 'rang_agence', description: 'Position dans le réseau' },
  { tag: '{{NB_TECHNICIENS}}', field: 'nb_techniciens', description: 'Nombre de techniciens' },
  { tag: '{{NB_ASSISTANTES}}', field: 'nb_assistantes', description: 'Nombre d\'assistantes' },
  { tag: '{{DESCRIPTION_EQUIPE}}', field: 'description_equipe', description: 'Description de l\'équipe' },
  { tag: '{{ZONES_INTERVENTION}}', field: 'zones_intervention', description: 'Zones géographiques couvertes' },
  { tag: '{{EMAIL_CONTACT}}', field: 'email_contact', description: 'Email de contact' },
  { tag: '{{PHONE_CONTACT}}', field: 'phone_contact', description: 'Numéro de téléphone' },
  { tag: '{{TEXTE_QUI_SOMMES_NOUS}}', field: 'texte_qui_sommes_nous', description: 'Section "Qui sommes-nous ?"' },
  { tag: '{{TEXTE_NOS_VALEURS}}', field: 'texte_nos_valeurs', description: 'Section "Nos valeurs"' },
  { tag: '{{TEXTE_NOS_ENGAGEMENTS}}', field: 'texte_nos_engagements', description: 'Section "Nos engagements"' },
  { tag: '{{TEXTE_NOS_COMPETENCES}}', field: 'texte_nos_competences', description: 'Section "Nos compétences"' },
  { tag: '{{TEXTE_COMMENT_CA_SE_PASSE}}', field: 'texte_comment_ca_se_passe', description: 'Section "Comment ça se passe ?"' },
];

const IMAGE_PLACEHOLDERS = [
  { tag: '{{LOGO_AGENCE}}', field: 'logo_agence_url', description: 'Logo de l\'agence' },
  { tag: '{{PHOTO_EQUIPE}}', field: 'photo_equipe_url', description: 'Photo de l\'équipe' },
  { tag: '{{PHOTO_LIEN_SUIVI}}', field: 'photo_lien_suivi_url', description: 'Capture du lien de suivi client' },
  { tag: '{{PHOTO_REALISATION1_AVANT}}', field: 'photo_realisation1_avant_url', description: 'Réalisation 1 - Photo avant' },
  { tag: '{{PHOTO_REALISATION1_APRES}}', field: 'photo_realisation1_apres_url', description: 'Réalisation 1 - Photo après' },
  { tag: '{{PHOTO_REALISATION2_AVANT}}', field: 'photo_realisation2_avant_url', description: 'Réalisation 2 - Photo avant' },
  { tag: '{{PHOTO_REALISATION2_APRES}}', field: 'photo_realisation2_apres_url', description: 'Réalisation 2 - Photo après' },
  { tag: '{{PHOTO_REALISATION3_AVANT}}', field: 'photo_realisation3_avant_url', description: 'Réalisation 3 - Photo avant' },
  { tag: '{{PHOTO_REALISATION3_APRES}}', field: 'photo_realisation3_apres_url', description: 'Réalisation 3 - Photo après' },
  { tag: '{{PHOTO_TEMOIGNAGE1}}', field: 'photo_temoignage1_url', description: 'Témoignage client 1' },
  { tag: '{{PHOTO_TEMOIGNAGE2}}', field: 'photo_temoignage2_url', description: 'Témoignage client 2' },
];

export function CommercialDocumentation() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Guide des variables PPTX
          </CardTitle>
          <CardDescription>
            Liste complète des placeholders à utiliser dans le template PowerPoint
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Text Placeholders */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Type className="h-5 w-5 text-blue-500" />
              Variables texte
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Placeholder</th>
                    <th className="text-left py-2 px-3 font-medium">Champ DB</th>
                    <th className="text-left py-2 px-3 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {TEXT_PLACEHOLDERS.map((item) => (
                    <tr key={item.tag} className="border-b border-muted/50">
                      <td className="py-2 px-3">
                        <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                          {item.tag}
                        </code>
                      </td>
                      <td className="py-2 px-3">
                        <Badge variant="outline" className="font-mono text-xs">
                          {item.field}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">
                        {item.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Separator />

          {/* Image Placeholders */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Image className="h-5 w-5 text-green-500" />
              Variables images
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Placeholder</th>
                    <th className="text-left py-2 px-3 font-medium">Champ DB</th>
                    <th className="text-left py-2 px-3 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {IMAGE_PLACEHOLDERS.map((item) => (
                    <tr key={item.tag} className="border-b border-muted/50">
                      <td className="py-2 px-3">
                        <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                          {item.tag}
                        </code>
                      </td>
                      <td className="py-2 px-3">
                        <Badge variant="outline" className="font-mono text-xs">
                          {item.field}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">
                        {item.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Separator />

          {/* Usage Instructions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Instructions d'utilisation
            </h3>
            
            <div className="space-y-3 text-sm">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <h4 className="font-medium">1. Préparer le template PPTX</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Ouvrez le fichier PowerPoint source</li>
                  <li>Remplacez les textes à personnaliser par les placeholders (ex: {"{{AGENCE_NOM_LONG}}"})</li>
                  <li>Pour les images, insérez un placeholder texte à l'emplacement souhaité</li>
                  <li>Sauvegardez en format .pptx</li>
                </ul>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <h4 className="font-medium">2. Uploader le template</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Allez dans l'onglet "Génération"</li>
                  <li>Cliquez sur "Remplacer" dans la section "Modèle maître"</li>
                  <li>Sélectionnez votre fichier .pptx</li>
                </ul>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <h4 className="font-medium">3. Configurer le profil agence</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Allez dans l'onglet "Configuration"</li>
                  <li>Remplissez tous les champs correspondant aux placeholders utilisés</li>
                  <li>Uploadez les images nécessaires</li>
                  <li>Enregistrez</li>
                </ul>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <h4 className="font-medium">4. Générer le PowerPoint</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Sélectionnez l'agence souhaitée</li>
                  <li>Cliquez sur "Générer le PowerPoint commercial"</li>
                  <li>Téléchargez le fichier généré</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
