import React, { useEffect, useRef } from 'react';
import { ModelConfig } from '../types';

interface ModelPreviewProps {
    targetImageUrl: string;
    modelUrl: string;
    config: ModelConfig;
    enabled?: boolean;
    showShadows?: boolean;
    arReady?: boolean;
    autoRotate?: boolean;
    showGrid?: boolean;
    onModelLoad?: (captureFn: () => string | undefined) => void;
}

const ModelPreview: React.FC<ModelPreviewProps> = ({ 
    targetImageUrl, 
    modelUrl, 
    config, 
    enabled = true,
    showShadows = true,
    arReady = true,
    autoRotate = false,
    showGrid = true,
    onModelLoad
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<any>(null);
    const sceneRef = useRef<any>(null);
    const cameraRef = useRef<any>(null);
    const modelRef = useRef<any>(null);
    const shadowPlaneRef = useRef<any>(null);
    const dirLightRef = useRef<any>(null);
    const controlsRef = useRef<any>(null);
    const gridHelperRef = useRef<any>(null);
    const requestRef = useRef<number>(0);

    // Initialize Three.js Scene
    useEffect(() => {
        if (!enabled || !containerRef.current || !arReady || !window.THREE) return;

        const THREE = window.THREE;
        
        // Initial dimensions
        let width = containerRef.current.clientWidth;
        let height = containerRef.current.clientHeight;

        // Fallback dimensions if container is collapsed
        if (width === 0) width = 300;
        if (height === 0) height = 300;

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf0f0f0);
        sceneRef.current = scene;

        // Camera
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        camera.position.set(0, 1.5, 1.5);
        camera.lookAt(0, 0, 0);
        cameraRef.current = camera;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        
        // Shadow Map Settings
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        containerRef.current.innerHTML = ''; // Clear previous
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Controls
        if (THREE.OrbitControls) {
            const controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.minDistance = 0.5;
            controls.maxDistance = 10;
            
            // Auto Rotate Init
            controls.autoRotate = autoRotate;
            controls.autoRotateSpeed = 2.0;

            controlsRef.current = controls;
        }

        // Lights
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
        hemiLight.position.set(0, 20, 0);
        scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(2, 4, 2);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        dirLight.shadow.bias = -0.0001;
        scene.add(dirLight);
        dirLightRef.current = dirLight;

        // Grid Helper
        const gridHelper = new THREE.GridHelper(2, 20, 0x000000, 0xcccccc);
        gridHelper.material.opacity = 0.1;
        gridHelper.material.transparent = true;
        gridHelper.visible = showGrid;
        scene.add(gridHelper);
        gridHelperRef.current = gridHelper;
        
        // Axes Helper
        const axesHelper = new THREE.AxesHelper(0.5);
        axesHelper.visible = showGrid;
        scene.add(axesHelper);

        // Shadow Catcher Plane (Transparent, only receives shadows)
        const shadowGeo = new THREE.PlaneGeometry(10, 10);
        const shadowMat = new THREE.ShadowMaterial({ opacity: 0.3 });
        const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
        shadowPlane.rotation.x = -Math.PI / 2;
        shadowPlane.position.y = 0.001; // Slightly above zero to avoid z-fighting with image
        shadowPlane.receiveShadow = true;
        scene.add(shadowPlane);
        shadowPlaneRef.current = shadowPlane;

        // Load Marker Image as Plane
        if (targetImageUrl) {
            const textureLoader = new THREE.TextureLoader();
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = targetImageUrl;
            img.onload = () => {
                const texture = new THREE.Texture(img);
                texture.needsUpdate = true;
                texture.encoding = THREE.sRGBEncoding;
                
                const aspect = img.width / img.height;
                const planeGeom = new THREE.PlaneGeometry(1 * aspect, 1);
                const planeMat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
                const plane = new THREE.Mesh(planeGeom, planeMat);
                plane.rotation.x = -Math.PI / 2;
                plane.receiveShadow = true; // Image receives shadow too
                scene.add(plane);
            };
        }

        // Load 3D Model
        if (modelUrl && window.THREE.GLTFLoader) {
            const loader = new window.THREE.GLTFLoader();
            
            // Setup DRACO Loader
            if (window.THREE.DRACOLoader) {
                const dracoLoader = new window.THREE.DRACOLoader();
                dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
                loader.setDRACOLoader(dracoLoader);
            }

            loader.load(modelUrl, (gltf: any) => {
                const model = gltf.scene;
                
                // Enable shadows for model
                model.traverse((node: any) => {
                    if (node.isMesh) {
                        node.castShadow = true;
                        node.receiveShadow = true;
                    }
                });

                // Normalize Scale
                const box = new THREE.Box3().setFromObject(model);
                const size = new THREE.Vector3();
                box.getSize(size);
                const maxDim = Math.max(size.x, size.y, size.z);
                const baseScale = 0.5 / maxDim;
                model.scale.set(baseScale, baseScale, baseScale);
                
                // Center model
                const center = new THREE.Vector3();
                box.getCenter(center);
                model.position.sub(center.multiplyScalar(baseScale));

                const wrapper = new THREE.Group();
                wrapper.add(model);
                
                scene.add(wrapper);
                modelRef.current = wrapper;
                
                // Initial Config
                if (config) {
                    wrapper.position.set(config.position.x, config.position.y, config.position.z);
                    wrapper.rotation.set(config.rotation.x, config.rotation.y, config.rotation.z);
                    wrapper.scale.set(config.scale, config.scale, config.scale);
                }

                // Thumbnail capture logic
                if (onModelLoad) {
                    const capture = () => {
                        if (rendererRef.current && sceneRef.current && cameraRef.current) {
                            rendererRef.current.render(sceneRef.current, cameraRef.current);
                            return rendererRef.current.domElement.toDataURL('image/png');
                        }
                        return undefined;
                    };
                    // Use a small timeout to ensure the model is drawn on the canvas before capturing
                    setTimeout(() => {
                        onModelLoad(capture);
                    }, 100);
                }
            });
        }

        // --- RESIZE LOGIC ---
        const handleResize = () => {
             if (!containerRef.current || !camera || !renderer) return;
             const newWidth = containerRef.current.clientWidth;
             const newHeight = containerRef.current.clientHeight;
             
             if (newWidth === 0 || newHeight === 0) return;

             camera.aspect = newWidth / newHeight;
             camera.updateProjectionMatrix();
             renderer.setSize(newWidth, newHeight);
        };

        const resizeObserver = new ResizeObserver(() => {
            window.requestAnimationFrame(handleResize);
        });
        resizeObserver.observe(containerRef.current);

        // Force resize checks to handle CSS transitions
        handleResize();
        const transitionTimer = setTimeout(handleResize, 350); // Matches CSS transition duration

        // Animation Loop
        const animate = () => {
            requestRef.current = requestAnimationFrame(animate);
            if (controlsRef.current) controlsRef.current.update();
            renderer.render(scene, camera);
        };
        animate();

        return () => {
            cancelAnimationFrame(requestRef.current);
            clearTimeout(transitionTimer);
            resizeObserver.disconnect();
            if (controlsRef.current) controlsRef.current.dispose();
            if (rendererRef.current) rendererRef.current.dispose();
            if (containerRef.current) containerRef.current.innerHTML = '';
        };

    }, [targetImageUrl, modelUrl, enabled, arReady]);

    // Update Transforms
    useEffect(() => {
        if (modelRef.current && config) {
            modelRef.current.position.set(config.position.x, config.position.y, config.position.z);
            modelRef.current.rotation.set(config.rotation.x, config.rotation.y, config.rotation.z);
            modelRef.current.scale.set(config.scale, config.scale, config.scale);
        }
    }, [config]);

    // Update Shadows
    useEffect(() => {
        if (shadowPlaneRef.current && dirLightRef.current) {
            shadowPlaneRef.current.visible = showShadows;
            dirLightRef.current.castShadow = showShadows;
        }
    }, [showShadows]);

    // Update AutoRotate
    useEffect(() => {
        if (controlsRef.current) {
            controlsRef.current.autoRotate = autoRotate;
        }
    }, [autoRotate]);

    // Update Grid
    useEffect(() => {
        if (gridHelperRef.current) {
            gridHelperRef.current.visible = showGrid;
            // Also update any axes helper if we had stored it, or if it's implicitly part of what user considers 'grid'
        }
    }, [showGrid]);

    if (!enabled) {
        return (
            <div className="w-full h-full min-h-[250px] flex items-center justify-center bg-gray-100 text-gray-400 text-xs">
                Preview Paused
            </div>
        );
    }

    if (!arReady) {
        return (
            <div className="w-full h-full min-h-[250px] flex items-center justify-center bg-gray-100 text-gray-400 text-xs animate-pulse">
                Loading 3D Engine...
            </div>
        );
    }

    return (
        <div ref={containerRef} className="w-full h-full min-h-[250px] bg-gray-100 cursor-move" />
    );
};

export default ModelPreview;