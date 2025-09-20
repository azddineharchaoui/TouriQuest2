import React from 'react';

/**
 * Composant exemple montrant comment utiliser les assets statiques
 * du dossier public dans les composants React
 */
export function AssetsExamples() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Exemples d'Utilisation des Assets Statiques
      </h1>

      {/* Section Images */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-700">Images du Maroc</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <img 
              src="/images/morocco/marrakech.jpg" 
              alt="Place Jemaa el-Fna, Marrakech"
              className="w-full h-48 object-cover rounded-lg shadow-md"
              onError={(e) => {
                e.currentTarget.src = "https://via.placeholder.com/400x300?text=Marrakech";
              }}
            />
            <p className="text-sm text-gray-600">Place Jemaa el-Fna, Marrakech</p>
          </div>
          
          <div className="space-y-2">
            <img 
              src="/images/morocco/casablanca.jpg" 
              alt="Mosquée Hassan II, Casablanca"
              className="w-full h-48 object-cover rounded-lg shadow-md"
              onError={(e) => {
                e.currentTarget.src = "https://via.placeholder.com/400x300?text=Casablanca";
              }}
            />
            <p className="text-sm text-gray-600">Mosquée Hassan II, Casablanca</p>
          </div>
          
          <div className="space-y-2">
            <img 
              src="/images/morocco/fes.jpg" 
              alt="Médina de Fès"
              className="w-full h-48 object-cover rounded-lg shadow-md"
              onError={(e) => {
                e.currentTarget.src = "https://via.placeholder.com/400x300?text=Fès";
              }}
            />
            <p className="text-sm text-gray-600">Médina de Fès</p>
          </div>
        </div>
      </section>

      {/* Section Équipe */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-700">Équipe TouriQuest</h2>
        <div className="flex space-x-6">
          <div className="text-center">
            <img 
              src="/images/team/azeddine.jpg" 
              alt="Azeddine - CEO"
              className="w-20 h-20 rounded-full object-cover mx-auto mb-2 border-4 border-orange-200"
              onError={(e) => {
                e.currentTarget.src = "https://via.placeholder.com/80x80?text=CEO";
              }}
            />
            <p className="text-sm font-medium">Azeddine</p>
            <p className="text-xs text-gray-600">CEO & Founder</p>
          </div>
          
          <div className="text-center">
            <img 
              src="/images/team/fatima.jpg" 
              alt="Fatima - Guide Expert"
              className="w-20 h-20 rounded-full object-cover mx-auto mb-2 border-4 border-orange-200"
              onError={(e) => {
                e.currentTarget.src = "https://via.placeholder.com/80x80?text=Guide";
              }}
            />
            <p className="text-sm font-medium">Fatima</p>
            <p className="text-xs text-gray-600">Guide Expert</p>
          </div>
          
          <div className="text-center">
            <img 
              src="/images/team/youssef.jpg" 
              alt="Youssef - Développeur"
              className="w-20 h-20 rounded-full object-cover mx-auto mb-2 border-4 border-orange-200"
              onError={(e) => {
                e.currentTarget.src = "https://via.placeholder.com/80x80?text=Dev";
              }}
            />
            <p className="text-sm font-medium">Youssef</p>
            <p className="text-xs text-gray-600">Développeur</p>
          </div>
        </div>
      </section>

      {/* Section Vidéos */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-700">Vidéos Promotionnelles</h2>
        
        <div className="bg-gray-100 rounded-lg p-6">
          <h3 className="text-lg font-medium mb-3">Vidéo de Présentation TouriQuest</h3>
          <video 
            src="/videos/promotional/touriquest-intro.mp4"
            poster="/images/morocco/atlas-mountains.jpg"
            controls
            className="w-full max-w-2xl rounded-lg shadow-lg"
            onError={(e) => {
              console.log("Vidéo non trouvée - remplacée par une image placeholder");
            }}
          >
            <source src="/videos/promotional/touriquest-intro.webm" type="video/webm" />
            <source src="/videos/promotional/touriquest-intro.mp4" type="video/mp4" />
            Votre navigateur ne supporte pas la lecture vidéo.
          </video>
          <p className="text-sm text-gray-600 mt-2">
            Découvrez les merveilles du Maroc avec TouriQuest
          </p>
        </div>

        <div className="bg-gray-100 rounded-lg p-6">
          <h3 className="text-lg font-medium mb-3">Tour du Sahara</h3>
          <video 
            src="/videos/tours/sahara-adventure.mp4"
            poster="/images/experiences/sahara-sunset.jpg"
            controls
            className="w-full max-w-2xl rounded-lg shadow-lg"
          >
            Votre navigateur ne supporte pas la lecture vidéo.
          </video>
          <p className="text-sm text-gray-600 mt-2">
            Aventure inoubliable dans les dunes du Sahara
          </p>
        </div>
      </section>

      {/* Section Documents */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-700">Documents Téléchargeables</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a 
            href="/documents/morocco-travel-guide.pdf" 
            download
            className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-black font-bold mr-4">
              PDF
            </div>
            <div>
              <h3 className="font-medium text-gray-800">Guide de Voyage au Maroc</h3>
              <p className="text-sm text-gray-600">Conseils et informations pratiques</p>
            </div>
          </a>
          
          <a 
            href="/documents/touriquest-brochure.pdf" 
            download
            className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center text-black font-bold mr-4">
              PDF
            </div>
            <div>
              <h3 className="font-medium text-gray-800">Brochure TouriQuest</h3>
              <p className="text-sm text-gray-600">Nos services et offres</p>
            </div>
          </a>
        </div>
      </section>

      {/* Section Icônes */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-700">Icônes et Favicons</h2>
        
        <div className="flex space-x-6">
          <div className="text-center">
            <img 
              src="/icons/favicon.ico" 
              alt="Favicon TouriQuest"
              className="w-8 h-8 mx-auto mb-2"
              onError={(e) => {
                e.currentTarget.src = "https://via.placeholder.com/32x32?text=ICO";
              }}
            />
            <p className="text-xs text-gray-600">Favicon</p>
          </div>
          
          <div className="text-center">
            <img 
              src="/icons/logo-192.png" 
              alt="Logo TouriQuest 192px"
              className="w-12 h-12 mx-auto mb-2"
              onError={(e) => {
                e.currentTarget.src = "https://via.placeholder.com/192x192?text=192";
              }}
            />
            <p className="text-xs text-gray-600">Logo 192px</p>
          </div>
          
          <div className="text-center">
            <img 
              src="/icons/logo-512.png" 
              alt="Logo TouriQuest 512px"
              className="w-16 h-16 mx-auto mb-2"
              onError={(e) => {
                e.currentTarget.src = "https://via.placeholder.com/512x512?text=512";
              }}
            />
            <p className="text-xs text-gray-600">Logo 512px</p>
          </div>
        </div>
      </section>

      {/* Informations techniques */}
      <section className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          Informations Techniques
        </h2>
        <div className="space-y-2 text-sm text-gray-600">
          <p><strong>Base URL:</strong> Tous les assets sont servis depuis la racine du domaine</p>
          <p><strong>Cache:</strong> Les fichiers statiques sont automatiquement mis en cache par le navigateur</p>
          <p><strong>Format d'URL:</strong> /[dossier]/[fichier].[extension]</p>
          <p><strong>Erreur 404:</strong> Utilisez l'attribut onError pour les images de fallback</p>
        </div>
      </section>
    </div>
  );
}

export default AssetsExamples;