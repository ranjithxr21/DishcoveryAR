import React, { useEffect, useRef, useState } from 'react';
import { MenuItem } from '../types';
import { ArrowLeft, Loader2, ScanLine, AlertCircle, ZoomIn, ZoomOut, RefreshCw, Hand, Move3d, CheckCircle2 } from 'lucide-react';

interface ARViewProps {
  activeItem: MenuItem | null;
  onBack: () => void;
}

const ARView: React.FC<ARViewProps> = ({ activeItem, onBack }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'idle' | 'initializing' | 'ready' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('Initializing...');
  const [isTracked, setIsTracked] = useState(false);
  
  // Transformation State
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  
  // Three.js References
  const userInteractionRef = useRef<any>(null); // Reference to the group handling User Scale/Rot
  
  // Touch Event References (for delta calculations)
  const touchStartPos = useRef<{x: number, y: number} | null>(null);
  const lastRotation = useRef<{x: number, y: number}>({ x: 0, y: 0 });
  const initialPinchDist = useRef<number | null>(null);
  const initialScaleOnPinch = useRef<number>(1.0);

  // Apply User Transforms to the 3D Object
  useEffect(() => {
    if (userInteractionRef.current) {
        // Apply Scale
        userInteractionRef.current.scale.set(scale, scale, scale);
        
        // Apply Rotation
        // Y rotation spins it on the table (Horizontal drag)
        // X rotation tilts it (Vertical drag)
        userInteractionRef.current.rotation.y = rotation.y;
        userInteractionRef.current.rotation.x = rotation.x;
    }
  }, [scale, rotation]);

  // Reset Function
  const handleReset = () => {
      setScale(1.0);
      setRotation({ x: 0, y: 0 });
      lastRotation.current = { x: 0, y: 0 };
  };

  useEffect(() => {
    let mindarThree: any = null;
    let isMounted = true;

    const startAR = async () => {
        if (!activeItem?.compiledTarget || !activeItem?.modelUrl || !isMounted) {
            if (isMounted) {
              setStatus('error');
              setStatusMessage("This item is missing AR data. Please update it in Admin Dashboard.");
            }
            return;
        }

        if (!containerRef.current) return;
        
        try {
            if (isMounted) {
              setStatus('initializing');
              setStatusMessage("Starting AR Engine...");
              setIsTracked(false);
            }

            if (!window.MINDAR || !window.MINDAR.IMAGE) {
                throw new Error("AR Library not loaded");
            }

            // 1. Create Data URL from compiledTarget (stored as Base64 string in DB)
            const binary = atob(activeItem.compiledTarget as string);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            const blob = new Blob([bytes]);
            const mindUrl = URL.createObjectURL(blob);

            // 2. Initialize MindAR Three
            mindarThree = new window.MINDAR.IMAGE.MindARThree({
                container: containerRef.current,
                imageTargetSrc: mindUrl,
                filterMinCF: 0.0001, 
                filterBeta: 0.001,
                uiLoading: "no",
                uiScanning: "no",
                uiError: "no",
            });
            
            const {renderer, scene, camera} = mindarThree;

            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = window.THREE.PCFSoftShadowMap;

            // 3. Add Lighting
            const light = new window.THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
            scene.add(light);
            
            const directionalLight = new window.THREE.DirectionalLight(0xffffff, 1);
            directionalLight.position.set(0, 1, 0);
            directionalLight.castShadow = true;
            directionalLight.shadow.mapSize.width = 1024;
            directionalLight.shadow.mapSize.height = 1024;
            directionalLight.shadow.bias = -0.0001;
            scene.add(directionalLight);

            const shadowGeo = new window.THREE.PlaneGeometry(10, 10);
            const shadowMat = new window.THREE.ShadowMaterial({ opacity: 0.3 });
            const shadowPlane = new window.THREE.Mesh(shadowGeo, shadowMat);
            shadowPlane.rotation.x = -Math.PI / 2;
            shadowPlane.receiveShadow = true;

            // 4. Load GLTF Model
            const loader = new window.THREE.GLTFLoader();
            if (window.THREE.DRACOLoader) {
                const dracoLoader = new window.THREE.DRACOLoader();
                dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
                loader.setDRACOLoader(dracoLoader);
            }

            loader.load(activeItem.modelUrl, (gltf: any) => {
                if (!isMounted) return;
                const model = gltf.scene;
                
                model.traverse((node: any) => {
                    if (node.isMesh) {
                        node.castShadow = true;
                        node.receiveShadow = true;
                    }
                });

                const modelWrapper = new window.THREE.Group();
                modelWrapper.rotation.x = Math.PI / 2;
                modelWrapper.add(shadowPlane);

                const userGroup = new window.THREE.Group();
                userInteractionRef.current = userGroup;

                modelWrapper.add(userGroup);
                userGroup.add(model);

                // --- AUTOMATIC SCALE CALCULATION ---
                // Calculate bounding box to normalize scale
                const box = new window.THREE.Box3().setFromObject(model);
                const size = new window.THREE.Vector3();
                box.getSize(size);
                
                // Get the largest dimension
                let maxDim = Math.max(size.x, size.y, size.z);
                
                // Safety check: if model is empty or point-sized, default to 1.0 to avoid Infinity
                if (maxDim < 0.001 || !Number.isFinite(maxDim)) {
                    maxDim = 1.0;
                }

                // Target size: fit model within approx 0.5 world units
                // MindAR world units typically match the physical width of the marker image (e.g. 1 unit width)
                const baseScale = 0.5 / maxDim;
                
                if (activeItem.modelConfig) {
                    const { scale, position, rotation } = activeItem.modelConfig;
                    const finalScale = baseScale * (scale || 1);
                    model.scale.set(finalScale, finalScale, finalScale);
                    const center = new window.THREE.Vector3();
                    box.getCenter(center);
                    model.position.sub(center.multiplyScalar(finalScale));
                    model.position.x += (position.x || 0);
                    model.position.y += (position.y || 0);
                    model.position.z += (position.z || 0);
                    model.rotation.x += (rotation.x || 0);
                    model.rotation.y += (rotation.y || 0);
                    model.rotation.z += (rotation.z || 0);
                } else {
                    model.scale.set(baseScale, baseScale, baseScale);
                    const center = new window.THREE.Vector3();
                    box.getCenter(center);
                    model.position.sub(center.multiplyScalar(baseScale));
                }

                const anchor = mindarThree.addAnchor(0);
                anchor.group.add(modelWrapper);

                anchor.onTargetFound = () => isMounted && setIsTracked(true);
                anchor.onTargetLost = () => isMounted && setIsTracked(false);
            });

            // 5. Start
            await mindarThree.start();
            
            renderer.setAnimationLoop(() => {
                if (isMounted) renderer.render(scene, camera);
            });
            
            if (isMounted) setStatus('ready');

        } catch (err) {
            console.error("AR Start Error:", err);
            if (isMounted) {
              setStatus('error');
              setStatusMessage("Could not start AR Camera. Check permissions.");
            }
        }
    };

    startAR();

    // The unified cleanup function
    return () => {
      isMounted = false;
      if (mindarThree) {
          try {
              mindarThree.stop();
              mindarThree.renderer.setAnimationLoop(null);
              
              // Clean up renderer's DOM element
              if (containerRef.current) {
                  containerRef.current.innerHTML = '';
              }

              // Fully stop camera tracks
              const video = document.querySelector('video');
              if (video?.srcObject) {
                  const stream = video.srcObject as MediaStream;
                  stream.getTracks().forEach(track => track.stop());
              }
              video?.remove();

          } catch (e) {
              console.error("AR Cleanup error", e);
          }
      }
    };

  }, [activeItem]);

  // --- GESTURE HANDLERS ---

  const handleTouchStart = (e: React.TouchEvent) => {
    // 1 Finger: Rotate
    if (e.touches.length === 1) {
        touchStartPos.current = { 
            x: e.touches[0].clientX, 
            y: e.touches[0].clientY 
        };
        // Store current rotation as base
        lastRotation.current = { ...rotation };
    }
    // 2 Fingers: Scale
    else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      initialPinchDist.current = dist;
      initialScaleOnPinch.current = scale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Rotation Logic (1 Finger)
    if (e.touches.length === 1 && touchStartPos.current) {
        const deltaX = e.touches[0].clientX - touchStartPos.current.x;
        const deltaY = e.touches[0].clientY - touchStartPos.current.y;
        
        // Sensitivity factor
        const speed = 0.01;

        setRotation({
            // Drag Horizontal -> Rotate Y (Spin)
            y: lastRotation.current.y + (deltaX * speed),
            // Drag Vertical -> Rotate X (Tilt)
            x: lastRotation.current.x + (deltaY * speed)
        });
    }
    // Pinch Logic (2 Fingers)
    else if (e.touches.length === 2 && initialPinchDist.current !== null) {
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      
      const factor = dist / initialPinchDist.current;
      const newScale = Math.min(Math.max(initialScaleOnPinch.current * factor, 0.1), 3.0);
      setScale(newScale);
    }
  };

  const handleTouchEnd = () => {
    touchStartPos.current = null;
    initialPinchDist.current = null;
  };

  if (!activeItem) return null;

  return (
    <div 
        className="relative w-full h-full bg-black overflow-hidden select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
    >
        
        {/* MindAR Container */}
        <div ref={containerRef} className="absolute inset-0 z-0 w-full h-full" />

        {/* Loading Overlay */}
        {(status === 'initializing' || status === 'idle') && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-900 text-white">
                <Loader2 className="w-12 h-12 animate-spin text-brand-500 mb-4" />
                <p className="text-lg font-medium">{statusMessage}</p>
                <p className="text-xs text-gray-400 mt-2">Loading 3D Engine...</p>
            </div>
        )}

        {/* Error Overlay */}
        {status === 'error' && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-900 text-white p-6 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <p className="text-lg font-medium mb-4">{statusMessage}</p>
                <button 
                    onClick={onBack}
                    className="px-6 py-2 bg-white text-black rounded-full font-bold"
                >
                    Back to Menu
                </button>
            </div>
        )}

        {/* UI Overlay (When Ready) */}
        {status === 'ready' && (
            <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between">
                
                {/* Header */}
                <div className="p-4 pt-6 bg-gradient-to-b from-black/80 to-transparent pointer-events-auto flex justify-between items-center transition-opacity duration-300">
                    <button 
                        onClick={onBack}
                        className="w-10 h-10 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className={`text-white font-bold drop-shadow-md transition-opacity duration-300 ${isTracked ? 'opacity-50' : 'opacity-100'}`}>{activeItem.name}</h1>
                    <button 
                        onClick={handleReset}
                        className="w-10 h-10 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                        title="Reset View"
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>

                {/* Scan Instructions - Hide when tracked */}
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-white/30 rounded-xl flex items-center justify-center pointer-events-none transition-all duration-500 ${isTracked ? 'opacity-0 scale-110' : 'opacity-50 scale-100'}`}>
                    <div className="w-full h-0.5 bg-brand-500 absolute animate-scan top-0 opacity-50 shadow-[0_0_10px_#d946ef]"></div>
                    <div className="text-center">
                        <ScanLine className="w-8 h-8 text-white/50 mx-auto mb-2" />
                        <p className="text-white/70 text-xs">Scan Menu Image</p>
                    </div>
                </div>

                {/* Controls & Info */}
                <div className="flex flex-col gap-2 p-6 pb-10 bg-gradient-to-t from-black/90 to-transparent">
                    
                    {/* Gesture Hint */}
                    <div className={`flex justify-center gap-6 text-white/60 text-[10px] mb-2 pointer-events-auto transition-opacity duration-500 ${isTracked ? 'opacity-100' : 'opacity-0'}`}>
                        <div className="flex items-center gap-1 bg-black/30 px-2 py-1 rounded-full backdrop-blur">
                            <Hand size={12} /> <span>1 Finger to Rotate</span>
                        </div>
                        <div className="flex items-center gap-1 bg-black/30 px-2 py-1 rounded-full backdrop-blur">
                            <Move3d size={12} /> <span>2 Fingers to Scale</span>
                        </div>
                    </div>

                    {/* Scale Slider */}
                    <div className={`pointer-events-auto flex items-center gap-3 bg-black/40 backdrop-blur-md rounded-full px-4 py-2 self-center mb-2 border border-white/10 shadow-lg transition-all duration-500 ${isTracked ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'}`}>
                        <button 
                            onClick={() => setScale(s => Math.max(0.1, s - 0.1))}
                            className="text-white/70 hover:text-white"
                        >
                            <ZoomOut size={16} />
                        </button>
                        <input 
                            type="range" 
                            min="0.1" 
                            max="3" 
                            step="0.1" 
                            value={scale} 
                            onChange={(e) => setScale(parseFloat(e.target.value))}
                            className="w-32 accent-brand-500 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                        />
                         <button 
                            onClick={() => setScale(s => Math.min(3.0, s + 0.1))}
                            className="text-white/70 hover:text-white"
                        >
                            <ZoomIn size={16} />
                        </button>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-xl p-4 text-white transition-all duration-300">
                        <div className="flex items-center gap-2 mb-1">
                            {isTracked ? <CheckCircle2 size={16} className="text-green-400" /> : <ScanLine size={16} className="text-brand-300 animate-pulse" />}
                            <p className={`text-sm font-medium ${isTracked ? 'text-green-400' : 'text-brand-300'}`}>
                                {isTracked ? 'Model Detected' : 'Scanning Active'}
                            </p>
                        </div>
                        <p className="text-xs text-gray-300">
                            {isTracked ? 'Use touch gestures to rotate and scale the food.' : `Point your camera at the "${activeItem.name}" photo on the menu.`}
                        </p>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default ARView;