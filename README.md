# Chromatique — Remise J1

Version du jeu : **1.1.1** · Dossier préparé le **2 novembre 2026** pour J1, le **20 novembre 2026 au soir** (heure exacte sur Cyberlearn).

- **Dépôt :** https://github.com/DYCMS/chromatique
- **Application :** https://dycms.github.io/chromatique/
- **Code publié repris dans cette archive :** [commit `2d85d825`](https://github.com/DYCMS/chromatique/tree/2d85d825f5b562c34831b49c767bfac8ad68ec17).
- **Version de la remise :** tag Git `jalon-1`, inclus dans `historique.git.bundle`. Il désigne le jeu ci-dessus et ce README actualisé. Ce tag est local à l’archive : il n’est pas encore publié sur GitHub.

Le fichier `historique.git.bundle` mentionné ci-dessous est fourni dans le ZIP de remise Cyberlearn, pas dans les fichiers du dépôt en ligne.

## 1. Jouer et reprendre le projet

Ouvrir `index.html` par double-clic, en conservant les autres fichiers à côté. Aucun serveur ni téléchargement n’est nécessaire pour jouer. Le mode Classique est choisi au départ. Les modes Assisté et Automatique sont des extensions séparées.

`game.js` contient le moteur, `app.js` les commandes et l’affichage, `extensions.js` les aides et les statistiques, et `styles.css` la présentation. Les tests sont dans `tests/` et la publication dans `.github/workflows/pages.yml`.

Pour reprendre l’historique Git inclus :

```sh
git clone historique.git.bundle chromatique-source
cd chromatique-source
git checkout jalon-1
npm test
```

Node.js 18 ou plus est nécessaire pour les tests, pas pour jouer. Le bundle contient aussi le prototype initial et la correction CSS de départ. Les évolutions publiées ensuite se consultent dans l’historique GitHub ; le commit de préparation J1 importe leur état vérifié, sans reconstruire leur historique distant.

## 2. Règles et source

Source : **Projet — Code secret en couleurs, inspiré du Mastermind**, édition 2.1, mise à jour du 28/10/2026, annexe **code-couleurs-1.0**. Les règles du cours font foi.

Le programme tire quatre couleurs parmi rouge, bleu, vert, jaune, orange et violet. Les répétitions sont possibles et le code reste fixe. Chaque proposition valide consomme un des dix essais. Une proposition invalide est refusée sans modifier la partie. Les indices comptent d’abord les couleurs bien placées, puis les mal placées parmi les occurrences restantes : une occurrence ne compte qu’une fois. Quatre bien placées donnent la victoire, même au dixième essai. Sinon, dix essais donnent une défaite. Après la fin, les propositions sont bloquées. « Nouvelle partie » tire un code et efface essais, indices et historique de la partie.

## 3. Une décision prise avec Codex

Le choix principal a été de garder **un seul moteur pour l’interface et l’API de test**. Sans cela, les tests pourraient réussir sur une logique différente de celle utilisée à l’écran. Ici, une proposition envoyée par l’API met aussi à jour les essais, les indices et le résultat visibles. Cette décision est vérifiée dans `tests/core.test.cjs` et `tests/interface.test.cjs`.

Codex a aidé à écrire le code, les tests et les corrections. Le jeu ne fait appel à aucun service d’IA. L’aide et le joueur automatique utilisent seulement les propositions précédentes et leurs indices. Les couleurs portent aussi un nom ou un symbole. Les statistiques restent locales et sont séparées par mode.

## 4. Correction expliquée et preuves avant/après

**Problème :** en mode automatique, les cases de saisie étaient désactivées mais les boutons de lancement se trouvaient sous le formulaire. Il était donc difficile de comprendre comment commencer.

- **Avant :** dans [l’ancienne version de `index.html`](https://github.com/DYCMS/chromatique/blob/29f78cddb3293c4f3196784e4998710f40086dce/index.html), la section `automatic-panel` suit le formulaire de proposition.
- **Après :** dans [la version corrigée](https://github.com/DYCMS/chromatique/blob/2d85d825f5b562c34831b49c767bfac8ad68ec17/index.html), elle suit directement le choix du mode, avant la grille du jeu. La consigne indique comment lancer la démonstration et le focus arrive sur son bouton.
- **Même situation à vérifier :** sélectionner Automatique sans avoir joué. Attendu : commandes repérables avant la saisie, puis premier essai au clic. Obtenu après correction : conforme dans Chromium. Le placement et le focus sont contrôlés dans `tests/browser.cjs` ; la consigne et le premier coup sont aussi contrôlés dans `tests/interface.test.cjs`.

Le premier test de pause employait un code trouvé dès le deuxième coup : il tentait de mettre en pause une partie déjà gagnée. Le scénario a été corrigé avec un code demandant plusieurs coups, en conservant les vérifications de pause et de reprise. Le [premier contrôle en échec](https://github.com/DYCMS/chromatique/actions/runs/41434100907) et le [contrôle corrigé réussi](https://github.com/DYCMS/chromatique/actions/runs/41434485862) restent consultables. Le déploiement a été bloqué tant que le contrôle échouait.

## 5. Premiers tests : attendu et obtenu

**38 tests automatiques réussis**, relancés sur les sources de cette archive. La [vérification GitHub du 02/11/2026](https://github.com/DYCMS/chromatique/actions/runs/41434485862) confirme aussi la réussite des tests, de Chromium et du déploiement. Les preuves sont les tests du projet et cette exécution ; aucun rapport séparé n’est ajouté.

| Essai | Résultat attendu | Obtenu | Preuve |
|---|---|---|---|
| Secret rouge/bleu/vert/jaune ; proposition rouge/vert/bleu/orange | 1 bien placée, 2 mal placées | Conforme | `tests/core.test.cjs` |
| Secret rouge/rouge/bleu/vert ; quatre rouges proposés | 2 bien placées, 0 mal placée | Conforme | `tests/core.test.cjs` |
| Proposition incomplète ou couleur inconnue | Refus expliqué, compteur et historique inchangés | Conforme | `tests/core.test.cjs`, `tests/interface.test.cjs` |
| Neuf erreurs puis le bon code | Victoire au dixième essai | Conforme | `tests/core.test.cjs`, `tests/browser.cjs` |
| Dix erreurs puis une nouvelle proposition | Défaite ; aucun changement après la fin | Conforme | `tests/core.test.cjs`, `tests/interface.test.cjs` |
| Nouvelle partie | Historique vide, zéro essai, secret caché | Conforme | `tests/interface.test.cjs` |
| Automatique : un coup, pause, reprise | Un seul coup sur demande, arrêt pendant la pause, puis poursuite jusqu’à la fin | Conforme | `tests/browser.cjs` |

Les tests avec DOM simulé vérifient la logique de l’interface. Chromium complète cette vérification avec le rendu CSS, le clavier et un écran de 375 px avec toucher émulé. Pour relancer cette dernière suite :

```sh
npm install --no-save --package-lock=false playwright@1.62.1
npx playwright install chromium
node tests/browser.cjs
```

### Essai sur un smartphone réel

Retour communiqué par l’auteur le **02/11/2026**, après ses essais sur un **Huawei (modèle exact non précisé)**, avec **Google, DuckDuckGo et Firefox** (noms indiqués par l’auteur).

L’affichage, le choix des couleurs, la validation des propositions, le bouton « Nouvelle partie » et le mode automatique ont donné les résultats attendus. Aucun problème n’a été signalé sur ces points. Il s’agit d’un essai manuel réalisé par l’auteur, distinct des tests automatisés et de l’émulation tactile. Les versions du système et des navigateurs ainsi que la date exacte des essais n’ont pas été précisées.

## 6. Limites et questions ouvertes

- **API commune 0.2 :** le contrat détaillé n’a pas été fourni. L’API actuelle `window.codeSecret` est provisoire ; sa conformité n’est pas établie. Il faut obtenir le contrat, adapter l’API et vérifier l’application publiée avant J2. Le mode `?test=1` permet d’imposer un secret avec `newGame({secret:[...]})` ; `submit([...])` envoie une proposition et `getState()` lit l’état.
- **Portée de l’essai mobile :** les cinq comportements décrits ci-dessus ont été vérifiés sur le Huawei de l’auteur. Cela ne garantit pas le fonctionnement sur tous les téléphones ; le modèle exact et les versions des navigateurs restent à préciser.
- **Extensions :** le solveur a été testé sur plusieurs parties, sans garantie exhaustive de victoire en dix coups. Les parties en cours ne sont pas sauvegardées. Les statistiques concernent les 100 dernières parties terminées de ce navigateur.
- **Avant remise :** relire ce README, vérifier personnellement les deux liens et publier le tag `jalon-1` avec le README actualisé. Pour reprendre exactement ce dossier dans le dépôt, le bundle contient le commit et le tag de remise ; ne pas remplacer un tag existant sans vérifier sa cible.

Cette remise J1 peut donc encore être améliorée, en particulier sur la conformité à l’API du cours. Elle ne contient ni conversation, ni vidéo, ni retour personnel inventé. La capsule et le retour sur le jeu d’un camarade concernent J2.
