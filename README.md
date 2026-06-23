# Argent Clair 💰
> **Voir. Comprendre. Maîtriser.**

Application mobile de suivi des dépenses personnelles — PWA hors ligne, sans compte, sans serveur.

![Version](https://img.shields.io/badge/version-1.0.0-C8522A)
![Licence](https://img.shields.io/badge/licence-Propriétaire-3D2010)
![PWA](https://img.shields.io/badge/PWA-compatible-4CAF7D)

---

## 📱 Accéder à l'application

**URL de production :**  
`https://VOTRE_USERNAME.github.io/argent-clair/`

> Remplacez `VOTRE_USERNAME` par votre nom d'utilisateur GitHub.

---

## 🗂 Structure du projet

```
argent-clair/
├── index.html        → Application complète (HTML + CSS + JS)
├── manifest.json     → Configuration PWA (nom, icône, couleurs)
├── sw.js             → Service Worker (mode hors ligne)
├── icon-192.svg      → Icône 192×192 (écran d'accueil)
├── icon-512.svg      → Icône 512×512 (splash screen)
└── README.md         → Ce fichier
```

---

## ✨ Fonctionnalités

### Version Gratuite
- ✅ Saisie rapide en 3 étapes (clavier numérique natif)
- ✅ 5 catégories de dépenses adaptées au contexte africain
- ✅ Tableau de bord : total jour / semaine / mois
- ✅ Top 2 catégories dominantes avec alerte si > 50% du budget
- ✅ Historique filtrable (aujourd'hui / semaine / mois / tout)
- ✅ Analyse : graphique 30 jours, total année, moyenne mensuelle, poste le plus fréquent
- ✅ Modification et suppression des dépenses
- ✅ Thème clair / sombre
- ✅ 100% hors ligne après première visite
- ✅ Données stockées localement (IndexedDB)

### Version Premium (5 000 FCFA — paiement unique)
- ⭐ Export des données en JSON (sauvegarde complète)
- ⭐ Export en CSV (compatible Excel / Google Sheets)
- ⭐ Import des données (restauration après changement de téléphone)
- ⭐ Budgets mensuels par catégorie avec alertes visuelles
- ⭐ Filtre "Cette année" dans l'historique
- ⭐ Catégories personnalisées (créer, modifier, supprimer)

---

## 🔑 Génération de codes Premium

Les codes Premium sont générés et validés **localement** — aucun serveur requis.

### Dans la console du navigateur (F12 → Console) :

```javascript
// Générer un code aléatoire
generateCode()
// → "A3BK-MN7P-QR2X"

// Générer un code avec préfixe personnalisé (ex: pour identifier le client)
generateCode("CLIENT01")
// → "CLIEN-T010-0XYZ"
```

### Processus de vente :
1. Client paie 5 000 FCFA par MTN Money / Orange Money / Wave
2. Tu reçois la confirmation de paiement
3. Tu génères un code via la console
4. Tu envoies le code par WhatsApp au client
5. Le client l'entre dans Réglages → Activer Premium

> ⚠️ **Ne jamais modifier** la constante `SALT = 'AC2024CAMER'` dans `index.html` après déploiement — cela invaliderait tous les codes existants.

---

## 🚀 Déploiement sur GitHub Pages

### Première mise en ligne

1. Créer un dépôt GitHub nommé `argent-clair` (public)
2. Uploader les 5 fichiers : `index.html`, `manifest.json`, `sw.js`, `icon-192.svg`, `icon-512.svg`
3. Aller dans **Settings → Pages**
4. Source : **Deploy from a branch** → branche `main` → dossier `/ (root)`
5. Cliquer **Save** — attendre 2 à 3 minutes
6. L'URL apparaît : `https://VOTRE_USERNAME.github.io/argent-clair/`

### Mise à jour de l'application

1. Dans le dépôt GitHub, cliquer sur le fichier à modifier
2. Cliquer sur l'icône ✏️ (crayon)
3. Modifier et cliquer **Commit changes**
4. Ou uploader une nouvelle version du fichier via **Add file → Upload files**
5. GitHub Pages se met à jour automatiquement en 1 à 2 minutes

### Mise à jour du Service Worker (cache)

Si vous modifiez `index.html`, incrémentez le numéro de version dans `sw.js` :

```javascript
// sw.js — ligne 6
const CACHE_NAME = 'argent-clair-v2'; // ← changer v1 en v2, etc.
```

---

## 🔐 Protection des données sensibles

Ce projet utilise **GitHub Actions** pour injecter les informations sensibles au moment du déploiement. Elles ne sont **jamais dans le code source**.

| Secret GitHub | Contenu | Placeholder dans index.html |
|--------------|---------|----------------------------|
| `PREMIUM_SALT` | Sel de validation des codes Premium | `%%PREMIUM_SALT%%` |
| `WHATSAPP_NUMBER` | Numéro au format `237XXXXXXXXX` | `237XXXXXXXXX` |

**Configuration :** voir `GUIDE-SECRETS-GITHUB.md`

> ⚠️ Ne jamais hardcoder ces valeurs dans le code source.

---

## 🛡️ Données sensibles — ce qu'il faut protéger

| Élément | Sensibilité | Action |
|---------|------------|--------|
| `SALT` dans `index.html` | 🔴 Critique | Ne jamais partager, ne jamais modifier |
| `PREMIUM_KEY` (localStorage) | 🟡 Moyen | Clé de stockage local — ne pas renommer |
| Codes Premium générés | 🔴 Critique | Usage unique par client — tenir un registre |
| Numéro de téléphone Mobile Money | 🔴 Critique | À renseigner dans le modal Premium de `index.html` |

> Les données des utilisateurs (dépenses) restent **sur leur téléphone uniquement**. Vous n'y avez jamais accès.

---

## 📐 Architecture technique

```
┌─────────────────────────────────────┐
│           index.html                │
│  ┌──────────┐  ┌─────────────────┐  │
│  │   CSS    │  │   JavaScript    │  │
│  │ ~21k     │  │ ~36k            │  │
│  └──────────┘  └────────┬────────┘  │
└───────────────────────┬─┼───────────┘
                        │ │
              ┌─────────┘ └──────────┐
              ▼                      ▼
        IndexedDB              localStorage
      (dépenses)          (thème, premium, budgets,
                           catégories custom)
```

**Flux de données :**
- Toutes les écritures passent par IndexedDB (transactions atomiques)
- Les préférences et l'état Premium sont en localStorage
- Le Service Worker met en cache tous les assets à la première visite
- Zéro appel réseau après le chargement initial

---

## 🔧 Personnalisation

### Changer le numéro Mobile Money (modal Premium)

Dans `index.html`, rechercher `+237 6XX XXX XXX` et remplacer par votre numéro.

### Changer le prix affiché

Rechercher `5 000 FCFA` dans `index.html` et remplacer par le montant souhaité.  
*(Le prix est purement informatif — la validation du code est indépendante du prix affiché.)*

### Ajouter une catégorie par défaut

Dans `index.html`, section `const CATS = [...]`, ajouter :
```javascript
{ id:'sante', name:'Santé', icon:'🏥', details:['Médicaments','Consultation','Pharmacie','Mutuelle'] }
```

---

## 📊 Compatibilité

| Plateforme | Navigateur | Installation PWA | Hors ligne |
|-----------|-----------|-----------------|-----------|
| Android | Chrome | ✅ Automatique | ✅ |
| Android | Firefox | ⚠️ Manuelle | ✅ |
| iPhone / iPad | Safari | ✅ Via "Sur l'écran d'accueil" | ✅ |
| iPhone / iPad | Chrome | ❌ Non supporté | ✅ |
| Desktop | Chrome / Edge | ✅ | ✅ |
| Desktop | Firefox | ⚠️ | ✅ |

> Sur iPhone, l'installation **doit** se faire depuis Safari. Chrome sur iOS ne supporte pas l'installation PWA (limitation Apple).

---

## 📝 Changelog

### v1.0.0 (2025)
- Lancement initial
- Saisie 3 étapes avec clavier numérique natif
- 5 catégories contexte Afrique francophone
- Tableau de bord, historique, analyse
- Mode Premium avec codes d'activation locaux
- Export JSON + CSV, Import, Budgets, Catégories personnalisées
- Thème clair (Crème & Corail) / sombre (Charbon & Braise)
- PWA — hors ligne, installable Android & iOS

---

## 👩‍💼 Auteure

**Armelle TSEGUI** — Data & BI Analyst  
Brand : **Data & Décision** · Yaoundé, Cameroun  
Contact : via WhatsApp pour l'activation Premium

---

*Argent Clair — Voir. Comprendre. Maîtriser.*
