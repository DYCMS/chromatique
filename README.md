# Chromatique — Le code secret

**Version 1.1.1 · Règles `code-couleurs-1.0` · API provisoire `provisional-1`.**

Un jeu solo inspiré du Mastermind, sans dépendance, compte, suivi, serveur applicatif ni service d’IA intégré. Les couleurs sont toujours accompagnées d’un nom ou d’un symbole.

## Jouer et reprendre le projet

Décompresser le dossier et ouvrir `index.html` par double-clic. Garder `styles.css`, `game.js`, `extensions.js` et `app.js` à côté. Sélectionner une case, puis une couleur ; la palette passe automatiquement à la prochaine case vide. Les listes de chaque case permettent aussi de modifier une proposition. Valider pour obtenir les deux indices.

Au clavier, utiliser Tab, Entrée ou Espace ; dans les listes, les flèches choisissent une couleur. Aucun téléchargement n’est nécessaire pour jouer après récupération des fichiers. Pas de PWA ni de cache de service worker : la version publiée n’offre pas de garantie hors ligne.

Pour vérifier la logique, avec Node.js 18 ou plus :

```sh
npm test
```

Aucune installation de paquet n’est nécessaire pour ces tests. `game.js` contient le moteur et l’API provisoire ; `app.js` relie ce moteur aux commandes visibles ; `styles.css` définit l’apparence. Les tests sont dans `tests/`.

## Message de fin (version 1.0.1)

Un encadré affiche **Victoire !** avec le nombre d’essais, ou **Partie perdue** après dix propositions incorrectes. À la fin, le focus et la vue se déplacent sur cet encadré, qui propose aussi Nouvelle partie. Le redémarrage masque le résultat et efface son texte. Les tests d’interface vérifient son apparition, le blocage des propositions et sa disparition au redémarrage avec un DOM simulé.

## Lisibilité et redémarrage (version 1.0.2)

Chaque ligne de l’historique affiche « Bien placées » et « Mal placées » sous ses nombres. Une consigne indique la case sélectionnée et suit les clics sur la palette ou les cases et le focus des listes. Le titre du secret devient « Code trouvé ! » après une victoire, ou « Le code secret était… » après une défaite.

Après au moins un essai valide dans une partie encore en cours, les boutons de redémarrage demandent « Abandonner cette partie et recommencer ? ». Annuler conserve la partie, les indices, la proposition en cours et la sélection. Après une fin de partie ou avant le premier essai valide, le redémarrage est immédiat. L’API de test garde son redémarrage direct, sans dialogue.

Vérification de cette version : 25 tests automatiques (14 moteur/API et 11 avec DOM simulé), dont les libellés, la sélection, les titres et les deux réponses à la confirmation. La suite de navigateur a aussi été complétée, mais son exécution dans un navigateur réel reste à effectuer.

## Correction de la version 1.1.1

Les commandes automatiques sont maintenant placées juste sous le choix du mode, avant la zone de saisie. Le focus arrive sur « Démarrer la démonstration » et la consigne explique comment lancer la partie. Le test navigateur contrôle aussi ce placement, le coup unique, la pause, la reprise et les commandes tactiles. Les 38 tests locaux passent ; la vérification Chromium est exécutée par GitHub avant publication.

## Extensions (version 1.1.0)

Le mode **Classique** reste sélectionné par défaut et conserve les règles communes. Le mode **Assisté** propose un bouton d’analyse et permet de préremplir une suggestion, que la personne choisit de valider. Le mode **Automatique** est une démonstration : jouer un coup, démarrer ou mettre en pause. Un changement de mode redémarre la partie, avec confirmation après au moins un essai valide.

Le solveur de `extensions.js` reçoit uniquement l’historique des propositions et les indices. Il filtre les 1 296 codes possibles et cherche une proposition qui départage les candidats restants (recherche sur au plus 48 propositions candidates). Il ne consulte jamais le secret de la partie ; aucun service d’IA ni clé API n’est utilisé. Sa réussite dans tous les cas en dix coups n’est pas garantie.

Le **chronomètre** mesure le temps écoulé depuis le début de la partie, y compris le temps passé dans un autre onglet ou une pause du joueur automatique. Il se fige à la fin et repart à zéro à la nouvelle partie. Il n’impose aucune limite.

Les **statistiques** présentent, séparément pour chaque mode, victoires, défaites, taux de réussite et moyenne des essais des victoires. L’**historique des parties terminées** conserve le résultat, la durée, le code révélé et tous les essais avec leurs indices. On peut le filtrer par mode et ouvrir chaque partie pour revoir ses essais.

Ces données sont stockées dans `localStorage` dans ce navigateur, avec une limite globale de **100 parties terminées** ; les statistiques portent sur ce même ensemble. Aucun compte, nom ou serveur n’intervient. Le bouton d’effacement demande confirmation. Les abandons et les parties avec `?test=1` sont exclus. Si le stockage est indisponible, un message l’indique et les données restent en mémoire jusqu’à fermeture de la page. Les parties en cours ne sont pas sauvegardées.

**Vérifications de la version :** 37 tests automatiques (moteur, solveur, chronomètre, stockage et interface avec DOM simulé). Ils couvrent notamment les occurrences répétées, six parties représentatives du joueur automatique, la séparation des modes, l’absence de doublons, la relecture des archives, le stockage bloqué, l’exclusion des tests et l’arrêt des actions programmées. Le workflow GitHub exécute aussi `tests/browser.cjs` avec Chromium avant de publier : contrôles visibles, confirmation, clavier, affichage mobile et toucher émulés, aide et démonstration automatique. Le 02/11/2026, les 37 tests, la suite Chromium (clavier et toucher émulé compris) et le déploiement ont tous réussi : https://github.com/DYCMS/chromatique/actions/runs/41431002118. Un téléphone réel reste à essayer.

La version classique précédente est sauvegardée sous le tag GitHub `v1.0.2`. La branche `extensions` conserve le travail de cette évolution.

## Règles et source

Source : annexe du document de cours **Projet — Code secret en couleurs, inspiré du Mastermind**, édition 2.1, mise à jour du 28/10/2026. Les règles du cours font foi.

Le secret contient quatre couleurs, tirées parmi `rouge`, `bleu`, `vert`, `jaune`, `orange`, `violet`, avec répétitions possibles. Il reste fixe et caché pendant la partie. Chaque proposition valide compte pour un des dix essais ; une proposition invalide ne change pas la partie. Les bien placées sont comptées d’abord, puis les mal placées parmi les occurrences restantes. Les nombres ne désignent aucune position. Quatre bien placées donnent la victoire, y compris au dixième essai. Sinon, dix propositions donnent une défaite. Après la fin, les propositions sont bloquées ; Nouvelle partie efface tout et tire un code. Le secret est révélé à la fin pour permettre de comprendre le résultat.

## Choix faits avec Codex

Codex a produit le code et les tests à partir des consignes. Une décision centrale est de garder **un seul moteur pour l’interface et l’API**, afin d’éviter un jeu visible et un jeu de test qui réagiraient différemment. Les notifications du moteur mettent à jour l’historique, les indices et le résultat après une action provenant de l’un ou de l’autre.

Le comptage utilise les occurrences restantes plutôt que « cette couleur existe-t-elle dans le secret ? ». Ce choix évite de compter plusieurs fois le même rouge. L’interface emploie à la fois la couleur, un symbole et un nom. Aucun outil d’IA n’intervient pendant une partie.

Ces décisions sont documentées pour pouvoir être expliquées et discutées ; leur présence ici ne remplace pas la compréhension personnelle du projet.

## Vérifications effectuées

Exécution le **02/11/2026** : **21 tests automatiques réussis** (`npm test`). Les 14 tests du moteur/API s’exécutent réellement dans Node.js ; les 7 tests d’interface exécutent `app.js` avec un **DOM simulé**, et ne prouvent ni le rendu CSS ni le fonctionnement d’un navigateur réel.

| Vérification | Résultat attendu avant exécution | Obtenu |
| --- | --- | --- |
| Secret rouge/bleu/vert/jaune ; proposition rouge/vert/bleu/orange | 1 bien placée, 2 mal placées | Conforme |
| Secret rouge/rouge/bleu/vert ; proposition quatre rouges | 2 bien placées, 0 mal placée | Conforme |
| Proposition incomplète, couleur inconnue, tableau creux | Refus explicite ; historique et compteur inchangés | Conforme |
| Neuf propositions incorrectes puis le secret | Victoire au dixième essai | Conforme |
| Dix propositions incorrectes | Défaite, dix lignes conservées, secret révélé | Conforme |
| Proposition après victoire ou défaite | Refus, état inchangé | Conforme |
| Nouvelle partie | Zéro essai, historique vide, secret caché, commandes réactivées | Conforme |
| Proposition envoyée par l’API | Même historique et mêmes indices dans l’interface | Conforme en DOM simulé |
| Comptage avec répétitions | Accord avec un second calcul indépendant | Conforme sur 5 184 couples secret/proposition |

Les tests vérifient aussi le tirage des six couleurs, les répétitions et la protection des copies de l’état public contre les modifications externes.

### Correction conservée : couleurs du secret révélé

**Avant**, commit `aee8b2c` : `.secret-pegs>span` imposait un fond gris aux quatre emplacements. Ce sélecteur a une priorité supérieure à `.peg`, qui donne la couleur au pion. Lors de la révélation, le nom et le symbole auraient été corrects, mais le fond serait resté gris. Défaut constaté par analyse de la cascade CSS, sans capture de navigateur.

**Après**, version `v1.0.0` : les dimensions restent communes ; le fond gris est limité à `.secret-pegs>span:not(.peg)`. Les pions révélés prennent donc leurs variables de couleur. Les 21 tests ont été relancés après le changement. Le test d’interface confirme que le pion rouge reçoit `--color: #c73c40`. La vérification de la couleur réellement calculée est prévue dans `tests/browser.cjs` ; elle reste à exécuter dans un vrai navigateur.

Pour cette vérification facultative :

```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
node tests/browser.cjs
```

Ce script vérifie les commandes visibles, les indices, l’état partagé avec l’API, la victoire au dixième essai, le clavier, le fond rouge révélé et une largeur mobile de 375 px avec toucher émulé. **Il n’a pas pu être exécuté ici** : Chromium est absent et son téléchargement est bloqué. Une émulation mobile ne remplace pas un essai sur un téléphone réel.

## API de test — provisoire, contrat 0.2 manquant

Le PDF exige une API 0.2 mais ne définit ni son nom global, ni ses fonctions, ni ses retours. Aucun modèle de cours n’a été fourni. **La conformité au contrat 0.2 n’est donc pas établie.** L’adaptation devra être faite après réception de ce contrat ; les règles du jeu restent indépendantes de cet adaptateur.

L’API actuelle est `window.codeSecret`. Sur l’application ouverte avec `?test=1` (par exemple `index.html?test=1`), elle permet d’imposer un secret. Un bandeau signale ce mode. En mode normal, imposer un secret est refusé. Le secret demeure caché dans l’état public jusqu’à la fin.

```js
codeSecret.newGame({ secret: ['rouge', 'rouge', 'bleu', 'vert'] });
codeSecret.submit(['rouge', 'rouge', 'rouge', 'rouge']);
// { ok: true, feedback: { wellPlaced: 2, misplaced: 0 }, state: ... }
codeSecret.getState();
codeSecret.newGame(); // nouveau tirage aléatoire
```

| Fonction | Retour |
| --- | --- |
| `newGame(options?)` | `{ok, state}` ou `{ok:false, error, state}` |
| `submit(array)` | `{ok, feedback, state}` ou `{ok:false, error, state}` |
| `getState()` | État copié : `status`, `attemptsUsed`, `attemptsRemaining`, `history`, `secret`, `palette`, `version`, `rules`, `maxAttempts` |

`status` vaut `playing`, `won` ou `lost`. Chaque ligne d’historique contient `attempt`, `guess`, `wellPlaced`, `misplaced`. `secret` vaut `null` pendant la partie, puis contient le code révélé. Les identifiants de couleurs sont exactement ceux de l’annexe, dans l’ordre requis. Les tests actuels concernent cette API provisoire, pas le contrat 0.2.

## Publication GitHub Pages et versions

**Dépôt :** https://github.com/DYCMS/chromatique

**Adresse du jeu :** https://dycms.github.io/chromatique/

GitHub est connecté et la source Pages est configurée sur GitHub Actions. Le premier déploiement a réussi le 02/11/2026 ; les tests ont également réussi sur GitHub. L’accès au site depuis un navigateur réel reste à vérifier. Le workflow `.github/workflows/pages.yml` lance les tests et ne publie que les quatre fichiers du jeu.

Les prochains envois sur la branche `main` déclenchent automatiquement les tests et la publication. Les résultats se consultent dans l’onglet **Actions** du dépôt. L’adresse effective est confirmée par le déploiement GitHub Pages. Ne pas publier de conversation, de document personnel, de vidéo ou de clé d’accès.

Les versions locales sont conservées dans `historique.git.bundle`, joint à l’archive. Pour les reprendre :

```sh
git clone historique.git.bundle chromatique-source
```

Le tag `jalon-1` repère cette première version vérifiée mais incomplète ; `v1.0.0` identifie la version logicielle. **Aucun tag `final` n’a été créé**, car la publication, le contrat 0.2 et les vérifications personnelles ne sont pas encore terminés. Le bundle est une sauvegarde des sources et de l’historique local, pas une publication sur GitHub.

## Ce qui reste à faire pour les rendus

- [ ] Fournir le contrat 0.2, adapter l’API et exécuter les tests de conformité sur l’application publiée.
- [x] Confirmer la réussite du premier déploiement GitHub Pages.
- [ ] Ouvrir le jeu à l’adresse indiquée et vérifier son fonctionnement dans un navigateur.
- [ ] Vérifier l’affichage et le clavier dans un navigateur réel ; exécuter `tests/browser.cjs` si possible.
- [ ] Essayer sur un téléphone réel : noter l’appareil, le navigateur et le résultat ici.
- [ ] Essayer le jeu d’un camarade et écrire quelques lignes de retour personnel.
- [ ] Enregistrer la capsule avec sa propre voix et sa compréhension du projet, puis la remettre sur Cyberlearn, jamais dans GitHub public.
- [ ] Après ces vérifications, créer et pousser le tag `final`.

Pour la capsule : montrer une partie, démontrer le cas des répétitions, expliquer un test et la correction CSS, puis justifier le moteur partagé et signaler une limite réelle. Les retours personnels, l’essai du camarade, l’appareil utilisé et la vidéo ne sont pas inventés par Codex.
