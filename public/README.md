# Répertoire Public - Assets Statiques TouriQuest

Ce répertoire contient tous les fichiers statiques (images, vidéos, icônes, documents) qui sont servis directement par le serveur web.

## 📁 Structure des Dossiers

```
public/
├── images/          # Images statiques
│   ├── morocco/     # Photos du Maroc (villes, monuments, paysages)
│   ├── hotels/      # Photos d'hôtels et riads
│   ├── experiences/ # Photos d'expériences et activités
│   └── team/        # Photos de l'équipe
├── videos/          # Vidéos statiques
│   ├── tours/       # Vidéos de tours et visites
│   └── promotional/ # Vidéos promotionnelles
├── icons/           # Icônes et favicons
└── documents/       # Documents téléchargeables (brochures, guides)
```

## 🚀 Comment Utiliser les Assets Statiques

### Dans les composants React

Les fichiers dans le dossier `public` sont accessibles directement depuis la racine de l'URL :

```jsx
// Pour une image
<img src="/images/morocco/marrakech.jpg" alt="Marrakech" />

// Pour une vidéo
<video src="/videos/tours/sahara-adventure.mp4" controls />

// Pour un favicon
<link rel="icon" href="/icons/favicon.ico" />
```

### Exemples d'utilisation

#### Images responsive
```jsx
<img 
  src="/images/morocco/casablanca.jpg" 
  alt="Casablanca"
  className="w-full h-64 object-cover rounded-lg"
/>
```

#### Vidéo avec poster
```jsx
<video 
  src="/videos/promotional/touriquest-intro.mp4"
  poster="/images/morocco/atlas-mountains.jpg"
  controls
  className="w-full rounded-lg shadow-lg"
>
  Votre navigateur ne supporte pas la lecture vidéo.
</video>
```

#### Images de profil d'équipe
```jsx
<img 
  src="/images/team/azeddine.jpg" 
  alt="Azeddine - CEO"
  className="w-20 h-20 rounded-full object-cover"
/>
```

## 📝 Conventions de Nommage

### Images
- Utilisez des noms descriptifs en minuscules
- Séparez les mots avec des tirets (kebab-case)
- Exemple : `marrakech-medina-sunset.jpg`

### Vidéos
- Format : `[categorie]-[description].mp4`
- Exemple : `sahara-camel-trek.mp4`

### Formats Recommandés

#### Images
- **JPEG** : Photos générales (compression élevée)
- **PNG** : Images avec transparence, logos
- **WebP** : Format moderne, meilleure compression
- **SVG** : Icônes vectorielles

#### Vidéos
- **MP4** : Format principal (H.264)
- **WebM** : Format alternatif pour le web
- Résolution recommandée : 1920x1080 ou 1280x720

## 🔧 Optimisation

### Images
```bash
# Compression d'images (optionnel)
npm install -g imagemin-cli
imagemin public/images/**/*.jpg --out-dir=public/images/optimized --plugin=imagemin-mozjpeg
```

### Vidéos
```bash
# Compression vidéo avec FFmpeg (optionnel)
ffmpeg -i input.mp4 -c:v libx264 -crf 23 -c:a aac -b:a 128k output.mp4
```

## 🌐 Accès Direct

Tous les fichiers sont accessibles directement via URL :
- Images : `https://yourdomain.com/images/morocco/marrakech.jpg`
- Vidéos : `https://yourdomain.com/videos/tours/fes-tour.mp4`
- Documents : `https://yourdomain.com/documents/morocco-travel-guide.pdf`

## 📱 Responsive Images

Pour les images responsive, utilisez l'attribut `srcset` :

```jsx
<img 
  src="/images/morocco/marrakech.jpg"
  srcSet="
    /images/morocco/marrakech-small.jpg 480w,
    /images/morocco/marrakech-medium.jpg 768w,
    /images/morocco/marrakech-large.jpg 1200w
  "
  sizes="(max-width: 480px) 480px, (max-width: 768px) 768px, 1200px"
  alt="Marrakech"
/>
```

## 🔒 Sécurité

- Ne stockez jamais d'informations sensibles dans le dossier public
- Tous les fichiers sont accessibles publiquement
- Utilisez des noms de fichiers non-prédictibles pour du contenu privé

## 📈 Performance

- Optimisez la taille des images avant de les ajouter
- Utilisez des formats modernes (WebP, AVIF) quand possible
- Considérez l'utilisation d'un CDN pour les gros fichiers