# Garage Auto HR

Gestion du garage à Conakry : ordre de réception, fiche d’atelier, rapport d’activité, grille de prix, achats et facture.

La réparation ne démarre qu’après encaissement de 70 % de la facture.

## Lancer

```bash
npm install
npm run dev
```

L’application écoute sur http://127.0.0.1:3847.

```bash
npm test
```

Les dossiers d’exemple sont recréés au premier lancement dans `data/garage.json`. Le bouton « Exemples » les restaure.

La comptabilité publie le statut vu par le client. La direction commente les dossiers.

Pour brancher Supabase, créez un access token puis renseignez `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`. La table est dans `supabase/migrations`.
