# Chromatique

Jeu solo de code secret réalisé avec Codex. **Version 1.2.0**, intégrant le contrat commun **API 0.2** le 06/11/2026.

- Dépôt : https://github.com/DYCMS/chromatique
- Jeu : https://dycms.github.io/chromatique/
- Mode de test : https://dycms.github.io/chromatique/?test=1
- Remise J1 déjà repérée : [tag jalon-1](https://github.com/DYCMS/chromatique/tree/jalon-1), version 1.1.1 au commit `c57407eb98964255049a9aa39c535311bfd97a66`. Ce tag conserve la première version vérifiée ; l’intégration de l’API 0.2 est une évolution ultérieure sur `main`. L’API peut encore être en préparation à J1.

## Règles et source

Référence : **Projet — Code secret en couleurs**, édition 2.2, mise à jour du 03/11/2026, annexe **code-couleurs-1.0**. Pour l’API : **API commune de test**, contrat 0.2, édition Google 1.5 du 28/10/2026. La remise suit aussi **Évaluation du projet**, version 1.3 du 03/11/2026.

Quatre couleurs parmi rouge, bleu, vert, jaune, orange et violet, avec répétitions possibles, sont à retrouver en dix essais. Le code reste fixe. Une proposition invalide est refusée sans consommer d’essai. Les bien placées sont comptées d’abord, puis les mal placées parmi les occurrences restantes : chaque occurrence compte une seule fois. Quatre bien placées donnent la victoire, même au dixième essai. Dix propositions sans victoire donnent une défaite. Après la fin, les propositions ne changent plus la partie. « Nouvelle partie » remet les essais et l’historique à zéro et tire un code.

## Choix pris avec Codex

Le choix central est de garder **un seul moteur pour l’écran et l’API**. Une proposition envoyée par le professeur met ainsi à jour les mêmes essais et indices qu’une saisie manuelle. Les tests vérifient les deux sens, y compris les refus et les redémarrages. Codex a aidé à programmer le jeu, écrire les tests et corriger les défauts ; aucun service d’IA n’intervient pendant une partie.

Les couleurs portent aussi un nom ou un symbole. Le mode Classique conserve les règles communes. Les modes Assisté et Automatique, le chronomètre, les statistiques et les archives sont facultatifs. Le solveur utilise seulement les essais et leurs indices. Les statistiques restent locales, séparées par mode, et limitées aux 100 dernières parties terminées. Les parties de test ne sont pas enregistrées.

## Utilisation et reprise

Ouvrir `index.html` en conservant les fichiers voisins ; aucun serveur n’est requis pour jouer localement. `game.js` contient le moteur et les adaptateurs, `app.js` les commandes et l’affichage, `extensions.js` les extensions, `styles.css` la présentation et `tests/` les vérifications. La publication GitHub Pages est décrite dans `.github/workflows/pages.yml`.

Avec Node.js 18 ou plus, `npm test` relance les tests. Pour les suites dans Chromium :

```sh
npm install --no-save --package-lock=false playwright@1.62.1
npx playwright install chromium
node tests/browser.cjs
node tests/api02-browser.cjs
```

Le workflow exécute ces suites avant publication et relance `tests/api02-browser.cjs` sur l’URL publique après le déploiement.

## Accès à l’API commune 0.2

L’objet `window.codeSecretTest` est exposé uniquement avec `?test=1`, une fois l’interface prête. L’état initial est `not-started`. Sans ce paramètre, l’objet est absent et une partie normale commence. En mode test, le secret ne figure ni dans l’état du contrat ni dans une révélation séparée à l’écran, y compris après la défaite. La révélation habituelle du jeu reste réservée au mode normal.

```js
const api = window.codeSecretTest;
api.version; // "0.2"
api.getConfig(); // règles, palette et limites communes
await api.startGame({secret: ['rouge', 'rouge', 'bleu', 'vert']});
const state = await api.submitGuess(['rouge', 'bleu', 'rouge', 'vert']);
// state.attempts === 1 ; state.lastResult : 2 bien placées, 2 mal placées
api.getState();
```

`getConfig()` et `getState()` sont synchrones ; `startGame()` et `submitGuess()` renvoient des promesses. Il faut attendre les mutations. Les états contiennent `status`, `attempts`, `history`, `lastGuess`, `lastResult` et `lastError`. Les refus de proposition suivent l’ordre du contrat : partie non démarrée, terminée, type, longueur, couleur. Ils ne modifient que `lastError`. Un démarrage invalide rejette la promesse avec `Error.code` et ne change ni l’état ni l’écran. L’adaptateur interne historique `window.codeSecret` reste disponible pour les extensions ; le point d’entrée du contrôle enseignant est exclusivement `window.codeSecretTest`.

## Vérifications et correction

**Version 1.2.0, 06/11/2026 : 57 tests locaux réussis.** Les résultats du navigateur et du contrôle sur le site public sont consultables dans [GitHub Actions](https://github.com/DYCMS/chromatique/actions). Leur réussite doit être confirmée pour le commit remis ; les tests locaux seuls ne prouvent pas le fonctionnement de la publication.

| Comportement et action | Attendu | Obtenu localement | Preuve |
|---|---|---|---|
| T01 à T09 du contrat | Indices exacts, 1 essai, statut et historique cohérents | Conforme | `tests/api02.test.cjs` |
| Secret rouge rouge bleu vert ; proposer rouge bleu rouge vert | 2 bien placées, 2 mal placées, une même partie à l’écran | Conforme avec DOM simulé | `tests/interface.test.cjs` |
| Proposition absente, tableau creux, longueur ou couleur invalide | Premier refus dans l’ordre prescrit, aucun essai consommé | Conforme | `tests/api02.test.cjs` |
| Démarrage invalide après un refus | Promesse rejetée ; état, même lastError, inchangé | Conforme | `tests/api02.test.cjs` |
| Neuf erreurs puis le bon code ; dix erreurs | Victoire à 10 ; défaite à 10 ; blocage ensuite | Conforme | `tests/api02.test.cjs` |
| Modifier entrées et résultats retournés | Aucun effet sur la partie | Conforme | `tests/api02.test.cjs` |

La suite `tests/api02-browser.cjs` confronte aussi les résultats à l’écran : T01 à T09, saisie manuelle relue via l’API, refus visibles, démarrage invalide sans changement du DOM, victoire, défaite, redémarrage, absence de révélation et absence de l’API hors mode test. `tests/browser.cjs` conserve les vérifications du clavier, du toucher émulé, de l’aide et de la démonstration automatique.

**Correction avant/après conservée.** En 1.1.1, les boutons automatiques étaient placés sous la saisie, ce qui donnait l’impression que le mode était bloqué. Ils ont été remontés sous le sélecteur, avec une consigne et le focus sur le lancement. [Source avant](https://github.com/DYCMS/chromatique/blob/29f78cddb3293c4f3196784e4998710f40086dce/index.html) ; [source après](https://github.com/DYCMS/chromatique/blob/2d85d825f5b562c34831b49c767bfac8ad68ec17/index.html) ; [vérification réussie](https://github.com/DYCMS/chromatique/actions/runs/41434485862). Le même choix du mode a été vérifié avant et après correction.

L’intégration 0.2 corrige aussi un écart de l’ancien adaptateur : il ne fournissait pas `codeSecretTest` et démarrait immédiatement une partie en mode test. Le nouvel adaptateur respecte l’état initial imposé ; les tests couvrent cette différence. Un refus au premier essai conserve maintenant la saisie et le chronomètre ; seul le message d’erreur change.

## Essai sur téléphone et limites

L’auteur a signalé le 02/11/2026 des essais réussis sur **Huawei P30, modèle ELE-L29, EMUI 12.0.0**, avec **Google, DuckDuckGo et Firefox** : affichage, choix des couleurs, validation, nouvelle partie et mode automatique. Ces essais concernent la version antérieure à l’intégration 0.2 ; ils ne sont pas présentés comme un nouveau test de la version 1.2.0. Les versions des navigateurs et la date exacte des essais n’ont pas été précisées.

Il reste à refaire un essai personnel de cette version sur téléphone, à essayer le jeu d’un camarade pour J2 et à préparer la capsule individuelle de 4 à 5 minutes. Le solveur n’a pas de garantie exhaustive de victoire en dix coups ; une partie en cours n’est pas sauvegardée. Les tests réalisés ne prouvent pas l’absence de tout défaut et ne remplacent pas le contrôle de l’enseignant.

## Remise

Pour J1, Cyberlearn reçoit **jalon1_nomdefamille.docx** contenant les deux liens et le tag `jalon-1`. Le code, le README et les preuves restent sur GitHub. Aucun ZIP, rapport supplémentaire, extrait de conversation ou vidéo n’est demandé à J1. Pour J2 : document des liens avec le tag `final` et capsule déposée séparément. Les heures exactes sont celles de Cyberlearn. Les documents personnels et la vidéo ne sont pas publiés dans ce dépôt.
