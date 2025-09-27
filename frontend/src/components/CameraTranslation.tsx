import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  X, 
  Scan, 
  Languages, 
  Volume2, 
  Copy, 
  Download,
  RotateCcw,
  Zap,
  Eye,
  Square,
  Play,
  Pause,
  Settings,
  Flashlight,
  FlashlightOff,
  Focus,
  Grid3X3,
  Loader2,
  CheckCircle,
  AlertCircle,
  Info,
  BookOpen,
  Globe
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Slider } from './ui/slider';

interface CameraTranslationProps {
  onClose?: () => void;
  targetLanguage?: string;
}

interface DetectedText {
  text: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  language?: string;
}

interface TranslationResult {
  original: string;
  translated: string;
  confidence: number;
  sourceLanguage: string;
  targetLanguage: string;
  culturalNotes?: string[];
  alternatives?: string[];
}

export function CameraTranslation({ onClose, targetLanguage = 'en' }: CameraTranslationProps) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [detectedTexts, setDetectedTexts] = useState<DetectedText[]>([]);
  const [translations, setTranslations] = useState<TranslationResult[]>([]);
  const [selectedTextIndex, setSelectedTextIndex] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Camera settings
  const [settings, setSettings] = useState({
    flashEnabled: false,
    autoFocus: true,
    continuousScanning: false,
    showGrid: true,
    enhanceText: true,
    ocrLanguage: 'auto',
    translationMode: 'instant' as 'instant' | 'manual',
    confidenceThreshold: 0.7
  });
  
  // Camera state
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [zoom, setZoom] = useState([1]);
  const [isFlashSupported, setIsFlashSupported] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  
  // Initialize camera
  const startCamera = async () => {
    try {
      setCameraError(null);
      
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          focusMode: settings.autoFocus ? 'continuous' : 'manual'
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
        
        // Check flash support
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities();
        setIsFlashSupported('torch' in capabilities);
        
        if (settings.continuousScanning) {
          startContinuousScanning();
        }
      }
    } catch (error) {
      setCameraError('Camera access denied or not available');
      console.error('Camera error:', error);
    }
  };
  
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsCameraActive(false);
    setIsScanning(false);
    streamRef.current = null;
  };
  
  const toggleFlash = async () => {
    if (!streamRef.current || !isFlashSupported) return;
    
    const track = streamRef.current.getVideoTracks()[0];
    try {
      // Use the torch capability if available
      if ('torch' in track.getCapabilities()) {
        await track.applyConstraints({
          advanced: [{
            torch: !settings.flashEnabled
          } as any]
        });
      }
      setSettings(prev => ({ ...prev, flashEnabled: !prev.flashEnabled }));
    } catch (error) {
      console.error('Flash toggle error:', error);
    }
  };
  
  const captureAndProcess = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsProcessing(true);
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    
    try {
      // Extract text using OCR
      const ocrResult = await performOCR(imageData);
      setDetectedTexts(ocrResult);
      
      // Auto-translate if enabled
      if (settings.translationMode === 'instant' && ocrResult.length > 0) {
        const translationPromises = ocrResult
          .filter(text => text.confidence >= settings.confidenceThreshold)
          .map(text => translateText(text.text));
          
        const translationResults = await Promise.all(translationPromises);
        setTranslations(translationResults);
      }
      
    } catch (error) {
      console.error('OCR processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const startContinuousScanning = () => {
    setIsScanning(true);
    
    const scanInterval = setInterval(async () => {
      if (isCameraActive && settings.continuousScanning) {
        await captureAndProcess();
      } else {
        clearInterval(scanInterval);
      }
    }, 2000); // Scan every 2 seconds
  };
  
  const performOCR = async (imageData: string): Promise<DetectedText[]> => {
    // Mock OCR implementation - in production, this would call a real OCR service
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockResults: DetectedText[] = [
          {
            text: 'Restaurant Le Petit Bistro',
            confidence: 0.95,
            boundingBox: { x: 100, y: 50, width: 300, height: 40 },
            language: 'fr'
          },
          {
            text: 'Ouvert 12h-22h',
            confidence: 0.88,
            boundingBox: { x: 120, y: 100, width: 200, height: 25 },
            language: 'fr'
          },
          {
            text: 'Menu du jour: 15€',
            confidence: 0.92,
            boundingBox: { x: 110, y: 140, width: 180, height: 30 },
            language: 'fr'
          }
        ];
        resolve(mockResults);
      }, 1000);
    });
  };
  
  const translateText = async (text: string): Promise<TranslationResult> => {
    try {
      const response = await fetch('/api/v1/ai/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          text,
          targetLanguage,
          sourceLanguage: 'auto',
          includeCulturalContext: true,
          includeAlternatives: true
        })
      });
      
      if (!response.ok) throw new Error('Translation failed');
      
      const result = await response.json();
      
      return {
        original: text,
        translated: result.translatedText,
        confidence: result.confidence || 0.9,
        sourceLanguage: result.detectedLanguage || 'unknown',
        targetLanguage,
        culturalNotes: result.culturalNotes || [],
        alternatives: result.alternatives || []
      };
    } catch (error) {
      console.error('Translation error:', error);
      return {
        original: text,
        translated: `[Translation Error] ${text}`,
        confidence: 0,
        sourceLanguage: 'unknown',
        targetLanguage
      };
    }
  };
  
  const speakText = (text: string, language: string) => {
    if (window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = `${language}-${language.toUpperCase()}`;
      window.speechSynthesis.speak(utterance);
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };
  
  const downloadImage = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = `translation_${Date.now()}.jpg`;
      link.href = canvasRef.current.toDataURL();
      link.click();
    }
  };
  
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);
  
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <Camera className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Camera Translation</h2>
          {isProcessing && (
            <Badge variant="outline" className="animate-pulse">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Processing...
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Camera View */}
      <div className="flex-1 relative bg-black">
        {!isCameraActive ? (
          <div className="flex items-center justify-center h-full">
            <Card className="w-80">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center space-x-2">
                  <Scan className="h-5 w-5" />
                  <span>Camera Translation</span>
                </CardTitle>
                <CardDescription>
                  Point your camera at text to translate signs, menus, and documents in real-time
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {cameraError && (
                  <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-700">{cameraError}</span>
                  </div>
                )}
                
                <div className="text-center">
                  <Button onClick={startCamera} size="lg">
                    <Camera className="h-5 w-5 mr-2" />
                    Start Camera
                  </Button>
                </div>
                
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>Supports 100+ languages</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>Real-time translation</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>Cultural context included</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            {/* Video Stream */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: `scale(${zoom[0]})` }}
            />
            
            {/* Hidden canvas for image capture */}
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Grid Overlay */}
            {settings.showGrid && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="w-full h-full grid grid-cols-3 grid-rows-3 opacity-30">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="border border-white/50" />
                  ))}
                </div>
              </div>
            )}
            
            {/* Text Detection Overlays */}
            <div ref={overlayRef} className="absolute inset-0 pointer-events-none">
              {detectedTexts.map((textBox, index) => (
                <div
                  key={index}
                  className={`absolute border-2 ${
                    selectedTextIndex === index 
                      ? 'border-yellow-400 bg-yellow-400/20' 
                      : 'border-green-400 bg-green-400/10'
                  }`}
                  style={{
                    left: `${(textBox.boundingBox.x / (canvasRef.current?.width || 1)) * 100}%`,
                    top: `${(textBox.boundingBox.y / (canvasRef.current?.height || 1)) * 100}%`,
                    width: `${(textBox.boundingBox.width / (canvasRef.current?.width || 1)) * 100}%`,
                    height: `${(textBox.boundingBox.height / (canvasRef.current?.height || 1)) * 100}%`
                  }}
                >
                  <div className="absolute -top-6 left-0 bg-black/70 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    {textBox.text}
                  </div>
                  <div className="absolute -bottom-6 right-0 bg-blue-500 text-white text-xs px-1 py-0.5 rounded">
                    {Math.round(textBox.confidence * 100)}%
                  </div>
                </div>
              ))}
            </div>
            
            {/* Camera Controls */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={toggleFlash}
                  disabled={!isFlashSupported}
                >
                  {settings.flashEnabled ? (
                    <Flashlight className="h-4 w-4" />
                  ) : (
                    <FlashlightOff className="h-4 w-4" />
                  )}
                </Button>
                
                <Button variant="secondary" size="icon">
                  <Focus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">
                  {detectedTexts.length} text(s) found
                </Badge>
                
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => setSettings(prev => ({ ...prev, showGrid: !prev.showGrid }))}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                
                <Button variant="secondary" size="icon" onClick={stopCamera}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Bottom Controls */}
            <div className="absolute bottom-4 left-4 right-4">
              <div className="flex items-center justify-center space-x-4">
                {/* Zoom Control */}
                <div className="flex items-center space-x-2 bg-black/70 text-white px-3 py-2 rounded-lg">
                  <span className="text-sm">Zoom</span>
                  <Slider
                    value={zoom}
                    onValueChange={setZoom}
                    min={1}
                    max={3}
                    step={0.1}
                    className="w-20"
                  />
                </div>
                
                {/* Capture Button */}
                <Button
                  size="lg"
                  onClick={captureAndProcess}
                  disabled={isProcessing}
                  className="rounded-full h-16 w-16"
                >
                  {isProcessing ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Scan className="h-6 w-6" />
                  )}
                </Button>
                
                {/* Continuous Scan Toggle */}
                <div className="flex items-center space-x-2 bg-black/70 text-white px-3 py-2 rounded-lg">
                  <Switch
                    checked={settings.continuousScanning}
                    onCheckedChange={(checked) => {
                      setSettings(prev => ({ ...prev, continuousScanning: checked }));
                      if (checked) {
                        startContinuousScanning();
                      } else {
                        setIsScanning(false);
                      }
                    }}
                  />
                  <Label className="text-sm text-white">Auto-scan</Label>
                </div>
              </div>
            </div>
            
            {/* Processing Indicator */}
            {isScanning && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="bg-blue-500/20 border-4 border-blue-400 rounded-full p-4 animate-pulse">
                  <Scan className="h-8 w-8 text-blue-400" />
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Translation Results */}
      {translations.length > 0 && (
        <div className="border-t bg-background max-h-60 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Translation Results</h3>
              <Button variant="ghost" size="sm" onClick={downloadImage}>
                <Download className="h-4 w-4 mr-2" />
                Save Image
              </Button>
            </div>
            
            <div className="space-y-3">
              {translations.map((translation, index) => (
                <Card key={index} className="hover:bg-muted/50 transition-colors">
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {translation.sourceLanguage} → {translation.targetLanguage}
                        </Badge>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => speakText(translation.original, translation.sourceLanguage)}
                          >
                            <Volume2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(translation.translated)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Original:</span>
                          <p className="font-medium">{translation.original}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Translation:</span>
                          <p className="font-medium text-primary">{translation.translated}</p>
                        </div>
                      </div>
                      
                      {translation.culturalNotes && translation.culturalNotes.length > 0 && (
                        <div className="flex items-start space-x-2 mt-2 p-2 bg-blue-50 rounded-lg">
                          <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                          <div>
                            <span className="text-sm font-medium text-blue-900">Cultural Context:</span>
                            <p className="text-xs text-blue-700">{translation.culturalNotes[0]}</p>
                          </div>
                        </div>
                      )}
                      
                      {translation.alternatives && translation.alternatives.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          <span>Alternatives: </span>
                          {translation.alternatives.slice(0, 2).join(', ')}
                        </div>
                      )}
                      
                      <Progress 
                        value={translation.confidence * 100} 
                        className="h-1"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}