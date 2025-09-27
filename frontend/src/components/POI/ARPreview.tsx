import React from 'react';
import { motion } from 'framer-motion';
import { Eye, Zap, ArrowRight } from 'lucide-react';

interface ARPreviewProps {
  poiId: string;
  poiName: string;
}

export const ARPreview: React.FC<ARPreviewProps> = ({ poiId, poiName }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-br from-purple-600 to-indigo-800 rounded-2xl p-8 text-white"
    >
      <div className="text-center">
        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Eye className="w-10 h-10" />
        </div>
        
        <h2 className="text-2xl font-bold mb-4">Augmented Reality Experience</h2>
        <p className="text-white/80 mb-6">
          Step into history with our immersive AR experience featuring historical reconstructions, 
          interactive hotspots, and multi-language overlays.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/10 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Historical Reconstruction</h3>
            <p className="text-sm text-white/70">See how {poiName} looked in different eras</p>
          </div>
          
          <div className="bg-white/10 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Interactive Hotspots</h3>
            <p className="text-sm text-white/70">Touch points for detailed information</p>
          </div>
          
          <div className="bg-white/10 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Translation Overlay</h3>
            <p className="text-sm text-white/70">Real-time text translation</p>
          </div>
        </div>
        
        <button className="bg-white text-purple-600 px-8 py-3 rounded-full font-semibold hover:bg-white/90 transition-colors flex items-center gap-2 mx-auto">
          <Zap className="w-5 h-5" />
          Launch AR Experience
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
};