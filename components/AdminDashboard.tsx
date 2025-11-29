import React, { useState, useEffect, useRef } from 'react';
import { MenuItem, ModelConfig, LibraryItem, User, ExportConfig, SystemSettings, RestaurantProfile } from '../types';
import { api } from '../services/api';
import ModelPreview from './ModelPreview';
import { Plus, Trash2, Loader2, Save, Upload, Box, ScanLine, Pencil, X, CheckCircle, AlertCircle, WifiOff, Move3d, RotateCw, Scaling, Eye, EyeOff, Library, Search, Settings, Copyright, Download, Palette, Layout, Globe, Instagram, Phone, MapPin, ShieldCheck, BadgeDollarSign, Square, Circle, Image as ImageIcon, PieChart, Copy, CheckSquare, Square as SquareIcon, Maximize2, Minimize2, Grid3x3, RefreshCcw, RotateCcw, ChevronDown, ChevronUp, DollarSign, UtensilsCrossed } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface AdminDashboardProps {
  menuItems: MenuItem[];
  setMenuItems: React.Dispatch<React.SetStateAction<MenuItem[]>>;
  refreshItems: () => void;
  arLibraryProgress: number;
  arLibraryReady: boolean;
  currentUser: User;
  onUpdateUser: (user: User) => void;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

const defaultModelConfig: ModelConfig = {
  scale: 1,
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
};

const SingleAxisControl: React.FC<{
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (val: number) => void;
    unit?: string;
}> = ({ label, value, min, max, step, onChange, unit }) => (
    <div className="flex items-center gap-3 mb-2">
        <span className="text-xs font-medium text-slate-500 w-24 flex-shrink-0 uppercase tracking-wide">{label}</span>
        <input 
            type="range" 
            min={min} 
            max={max} 
            step={step} 
            value={value} 
            onChange={(e) => onChange(parseFloat(e.target.value))} 
            className="flex-grow h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
        />
        <div className="relative w-16">
            <input 
                type="number" 
                step={step}
                value={value} 
                onChange={(e) => onChange(parseFloat(e.target.value))} 
                className="w-full px-2 py-1 text-xs border border-slate-300 rounded-md text-right focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-slate-700 font-mono bg-white"
            />
        </div>
    </div>
);

const dataURLtoFile = (dataurl: string, filename: string) => {
    const arr = dataurl.split(',');
    const match = arr[0].match(/:(.*?);/);
    const mime = match ? match[1] : 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  menuItems, 
  setMenuItems, 
  arLibraryReady,
  currentUser,
  onUpdateUser
}) => {
  const [activeTab, setActiveTab] = useState<'menu' | 'branding'>('menu');

  // --- MENU STATE ---
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentFormId, setCurrentFormId] = useState<string>('');
  
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [calories, setCalories] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  
  const [targetImageFile, setTargetImageFile] = useState<File | null>(null);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [targetImageUrl, setTargetImageUrl] = useState('');
  const [modelUrl, setModelUrl] = useState('');
  const [compiledTargetData, setCompiledTargetData] = useState<string | null>(null);
  const [modelConfig, setModelConfig] = useState<ModelConfig>(defaultModelConfig);

  const [processing, setProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);
  const [showShadows, setShowShadows] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);
  const [showTransformControls, setShowTransformControls] = useState(false);

  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [libSearch, setLibSearch] = useState('');
  
  const [newLibName, setNewLibName] = useState('');
  const [newLibCategory, setNewLibCategory] = useState('');
  const [newLibCredits, setNewLibCredits] = useState('');
  const [newLibFile, setNewLibFile] = useState<File | null>(null);
  const [newLibFileUrl, setNewLibFileUrl] = useState(''); 
  const [generatedThumbnail, setGeneratedThumbnail] = useState<File | null>(null);

  // --- BRANDING STATE ---
  const [brandingProfile, setBrandingProfile] = useState<RestaurantProfile>(currentUser.profile || {});
  const [uploadingBrandAsset, setUploadingBrandAsset] = useState<'logo' | 'hero' | null>(null);
  const [isSavingBranding, setIsSavingBranding] = useState(false);

  useEffect(() => {
      api.getSystemSettings().then(setSettings).catch(console.error);
      // Sync local branding state with user profile on mount/update
      setBrandingProfile(currentUser.profile || {});
  }, [currentUser]);

  useEffect(() => {
      if (showLibraryModal) {
          api.getLibraryItems().then(setLibraryItems).catch(console.error);
      }
  }, [showLibraryModal]);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    const newToast = { id: Date.now(), message, type };
    setToasts(prev => [...prev, newToast]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== newToast.id)), 4000);
  };

  const planLimits = settings ? settings.plans[currentUser.plan] : { maxMenuItems: 10, maxUploadSizeMB: 15, canRemoveWatermark: false };
  const itemsUsed = menuItems.length;
  const isLimitReached = itemsUsed >= planLimits.maxMenuItems && !editingId;

  // --- MENU FUNCTIONS ---
  const resetForm = () => {
      setIsAdding(false);
      setEditingId(null);
      setCurrentFormId('');
      setName('');
      setPrice('');
      setDescription('');
      setCalories('');
      setTags([]);
      setTagInput('');
      setTargetImageFile(null);
      setModelFile(null);
      setTargetImageUrl('');
      setModelUrl('');
      setCompiledTargetData(null);
      setModelConfig(defaultModelConfig);
      setAutoRotate(false);
      setShowGrid(true);
      setShowTransformControls(false);
  };
  
  const handleStartAdding = () => {
    if (isLimitReached) {
        showToast(`Plan limit reached. Upgrade to add more.`, 'error');
        return;
    }
    resetForm();
    setCurrentFormId(uuidv4());
    setIsAdding(true);
  };

  const handleEdit = (item: MenuItem) => {
    resetForm();
    setIsAdding(true);
    setEditingId(item.id);
    setCurrentFormId(item.id);
    setName(item.name);
    setPrice(String(item.price));
    setDescription(item.description);
    setCalories(String(item.calories || ''));
    setTags(item.tags);
    setTargetImageUrl(item.targetImageUrl || '');
    setModelUrl(item.modelUrl || '');
    setCompiledTargetData(item.compiledTarget as string || null);
    setModelConfig(item.modelConfig || defaultModelConfig);
  };

  const toggleSelect = (id: string) => {
      const newSelected = new Set(selectedIds);
      if (newSelected.has(id)) newSelected.delete(id);
      else newSelected.add(id);
      setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
      if (selectedIds.size === menuItems.length) setSelectedIds(new Set());
      else setSelectedIds(new Set(menuItems.map(i => i.id)));
  };

  const handleBulkDelete = async () => {
      if (selectedIds.size === 0) return;
      if (!confirm(`Delete ${selectedIds.size} items?`)) return;
      setProcessing(true);
      setProcessingMessage("Deleting items...");
      try {
          await api.deleteBatchMenuItems(Array.from(selectedIds));
          setMenuItems(menuItems.filter(i => !selectedIds.has(i.id)));
          setSelectedIds(new Set());
          showToast(`Deleted ${selectedIds.size} items`, 'success');
      } catch (err) {
          showToast("Failed to delete selected items", "error");
      } finally {
          setProcessing(false);
      }
  };

  const handleDuplicate = async (ids: string[]) => {
      if (ids.length === 0) return;
      if (itemsUsed + ids.length > planLimits.maxMenuItems) {
          showToast(`Cannot duplicate. Plan limit reached.`, 'error');
          return;
      }
      setProcessing(true);
      setProcessingMessage("Duplicating...");
      try {
          const res = await api.duplicateMenuItems(ids);
          setMenuItems([...res.items, ...menuItems]); 
          showToast(`Duplicated ${ids.length} item(s)`, 'success');
      } catch (err: any) {
          showToast(err.message || "Failed to duplicate", "error");
      } finally {
          setProcessing(false);
      }
  };

  const handleTargetImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && arLibraryReady) {
        if (file.size > planLimits.maxUploadSizeMB * 1024 * 1024) {
            showToast(`File too large. Max ${planLimits.maxUploadSizeMB}MB`, 'error');
            return;
        }
        setTargetImageFile(file);
        setProcessing(true);
        setProcessingMessage('Compiling AR Target...');
        try {
            const compiler = new window.MINDAR.IMAGE.Compiler();
            const imageBitmap = await createImageBitmap(file);
            await compiler.compileImageTargets([imageBitmap], (progress: number) => {
                setProcessingMessage(`Compiling... ${Math.round(progress * 100)}%`);
            });
            const exportedBuffer = await compiler.exportData();
            const reader = new FileReader();
            reader.onload = () => {
                const base64String = (reader.result as string).split(',')[1];
                setCompiledTargetData(base64String);
            };
            reader.readAsDataURL(new Blob([exportedBuffer]));
            setTargetImageUrl(URL.createObjectURL(file));
        } catch(err) {
            showToast("Failed to compile AR target.", "error");
        } finally {
            setProcessing(false);
        }
    }
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > planLimits.maxUploadSizeMB * 1024 * 1024) {
            showToast(`File too large. Max ${planLimits.maxUploadSizeMB}MB`, 'error');
            return;
          }
          setModelFile(file);
          setModelUrl(URL.createObjectURL(file));
      }
  };

  const handleLibFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if(e.target.files?.[0]) {
          const file = e.target.files[0];
          setNewLibFile(file);
          setNewLibFileUrl(URL.createObjectURL(file));
          setGeneratedThumbnail(null); 
      }
  };

  const onLibModelLoad = (captureFn: () => string | undefined) => {
      const dataUrl = captureFn();
      if (dataUrl) {
          const file = dataURLtoFile(dataUrl, `thumb-${Date.now()}.png`);
          setGeneratedThumbnail(file);
      }
  };

  const handleLibraryUpload = async () => {
      if (!newLibFile || !newLibName) {
          showToast("Name and File are required", "error");
          return;
      }
      setProcessing(true);
      setProcessingMessage("Uploading...");
      try {
          const modelUploadUrl = await api.uploadFile(newLibFile, 'model', 'library_assets');
          let thumbUrl = '';
          if (generatedThumbnail) {
              thumbUrl = await api.uploadFile(generatedThumbnail, 'image', 'library_assets');
          }
          const newItem: LibraryItem = {
              id: uuidv4(),
              userId: currentUser.id,
              name: newLibName,
              category: newLibCategory || 'Uncategorized',
              modelUrl: modelUploadUrl,
              thumbnailUrl: thumbUrl,
              credits: newLibCredits
          };
          await api.saveLibraryItem(newItem);
          setLibraryItems([...libraryItems, newItem]);
          showToast("Added to library!", "success");
          setNewLibName(''); setNewLibCategory(''); setNewLibCredits(''); setNewLibFile(null); setNewLibFileUrl(''); setGeneratedThumbnail(null);
      } catch (e) {
          showToast("Failed to upload", "error");
      } finally {
          setProcessing(false);
      }
  };

  const handleLibrarySelect = (item: LibraryItem) => {
      setModelUrl(item.modelUrl);
      setModelFile(null);
      if (!name) setName(item.name);
      setShowLibraryModal(false);
      showToast(`Selected "${item.name}"`, 'success');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) {
        showToast("Name/Price required.", "error");
        return;
    }
    setProcessing(true);
    setProcessingMessage('Saving...');
    try {
        let finalTargetUrl = targetImageUrl;
        if (targetImageFile) {
            finalTargetUrl = await api.uploadFile(targetImageFile, 'image', currentFormId);
        }
        let finalModelUrl = modelUrl;
        if (modelFile) {
            finalModelUrl = await api.uploadFile(modelFile, 'model', currentFormId);
        }
        const newItem: MenuItem = {
            id: currentFormId,
            userId: currentUser.id,
            name,
            price: parseFloat(price),
            description,
            calories: calories ? parseInt(calories) : undefined,
            tags,
            targetImageUrl: finalTargetUrl,
            modelUrl: finalModelUrl,
            compiledTarget: compiledTargetData || undefined,
            modelConfig,
        };
        await api.saveMenuItem(newItem);
        if (editingId) {
            setMenuItems(menuItems.map(item => item.id === editingId ? newItem : item));
        } else {
            setMenuItems([newItem, ...menuItems]);
        }
        showToast(`Saved "${name}"`, 'success');
        resetForm();
    } catch (error: any) {
        showToast("Error saving item", "error");
    } finally {
        setProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
      setProcessing(true);
      try {
          await api.deleteMenuItem(id);
          setMenuItems(menuItems.filter(item => item.id !== id));
          showToast("Deleted", "success");
      } catch (err) {
          showToast("Failed to delete", "error");
      } finally {
          setProcessing(false);
          setShowConfirmDelete(null);
      }
  };
  
  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
        e.preventDefault();
        setTags([...tags, tagInput.trim()]);
        setTagInput('');
    }
  };
  const removeTag = (tagToRemove: string) => {
      setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // --- BRANDING FUNCTIONS ---
  const handleBrandingChange = (key: keyof RestaurantProfile, value: any) => {
      setBrandingProfile(prev => ({ ...prev, [key]: value }));
  };

  const handleBrandingFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'hero') => {
      const file = e.target.files?.[0];
      if (file) {
          try {
              setUploadingBrandAsset(type);
              const url = await api.uploadFile(file, 'image', 'site_assets');
              if (type === 'logo') handleBrandingChange('logoUrl', url);
              else handleBrandingChange('heroUrl', url);
              showToast("Asset uploaded", 'success');
          } catch (err) {
              showToast("Upload failed", 'error');
          } finally {
              setUploadingBrandAsset(null);
          }
      }
  };

 const saveBranding = async () => {
      setIsSavingBranding(true);
      try {
          const updatedUser = await api.updateProfile(currentUser.email, brandingProfile);
          onUpdateUser(updatedUser);
          showToast("Branding settings saved!", 'success');
      } catch(err: any) {
          console.error("Save Branding Error:", err); // Log the full error
          showToast(err.message || "Failed to save settings", 'error'); // Show specific message
      } finally {
          setIsSavingBranding(false);
      }
  };

  const performExport = async () => {
      // Map RestaurantProfile to ExportConfig
      const config: ExportConfig = {
          title: brandingProfile.name,
          color: brandingProfile.brandColor || '#4f46e5',
          font: brandingProfile.font || 'sans',
          theme: brandingProfile.theme || 'paper',
          logoUrl: brandingProfile.logoUrl,
          heroUrl: brandingProfile.heroUrl,
          borderRadius: brandingProfile.borderRadius || '8px',
          phone: brandingProfile.phone,
          address: brandingProfile.address,
          instagram: brandingProfile.instagram,
          isPaid: currentUser.plan === 'paid'
      };
      showToast("Building package...", 'info');
      await api.exportWebsite(config);
  };

  const isFormVisible = isAdding || editingId;
  const radiusOptions = [
      { label: 'Sharp', value: '0px', icon: Square },
      { label: 'Soft', value: '8px', icon: Square },
      { label: 'Round', value: '16px', icon: Circle },
      { label: 'Pill', value: '9999px', icon: Circle },
  ];

  return (
    <div className="absolute inset-0 w-full h-full bg-slate-50 text-gray-900 font-sans overflow-hidden flex flex-col">
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className={`flex items-center gap-3 px-4 py-2 rounded-lg shadow-lg border animate-in slide-in-from-right-2 fade-in ${toast.type === 'success' ? 'bg-green-100 border-green-200 text-green-800' : 'bg-red-100 border-red-200 text-red-800'}`}>
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
        ))}
      </div>

      {processing && (
        <div className="fixed inset-0 bg-black/50 z-[200] flex flex-col items-center justify-center backdrop-blur-sm">
            <div className="bg-white p-6 rounded-xl shadow-2xl flex flex-col items-center animate-in zoom-in-95">
                <Loader2 className="w-10 h-10 animate-spin text-primary-600 mb-4" />
                <p className="text-lg font-medium text-gray-800">{processingMessage}</p>
            </div>
        </div>
      )}

      {/* Library Modal */}
      {showLibraryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
              <div className="bg-white rounded-xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-900">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800"><Library className="text-primary-600"/> 3D Model Library</h2>
                      <button onClick={() => setShowLibraryModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24}/></button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
                      <div className="absolute opacity-0 pointer-events-none" style={{ width: '200px', height: '200px', overflow: 'hidden' }}>{newLibFileUrl && (<ModelPreview targetImageUrl="" modelUrl={newLibFileUrl} config={defaultModelConfig} enabled={true} showShadows={false} arReady={arLibraryReady} onModelLoad={onLibModelLoad} />)}</div>
                      <div className="mb-8 bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2"><Upload size={16}/> Upload New</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <div><label className="block text-xs font-medium text-slate-500 mb-1">Name</label><input type="text" value={newLibName} onChange={(e) => setNewLibName(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Name" /></div>
                              <div><label className="block text-xs font-medium text-slate-500 mb-1">Category</label><input type="text" value={newLibCategory} onChange={(e) => setNewLibCategory(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Category" /></div>
                              <div><label className="block text-xs font-medium text-slate-500 mb-1">Credits</label><input type="text" value={newLibCredits} onChange={(e) => setNewLibCredits(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Creator" /></div>
                          </div>
                          <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                              <div className="flex items-center gap-3">
                                  <button onClick={() => document.getElementById('lib-upload')?.click()} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors">{newLibFile ? <CheckCircle size={16}/> : <Upload size={16}/>} {newLibFile ? 'File Selected' : 'Select GLB'}</button>
                                  <input id="lib-upload" type="file" accept=".glb,.gltf" className="hidden" onChange={handleLibFileChange} />
                                  {generatedThumbnail && <span className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle size={12}/> Thumb Ready</span>}
                              </div>
                              {newLibFile && <button onClick={handleLibraryUpload} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-sm transition-all">Upload</button>}
                          </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {libraryItems.map(item => (
                              <div key={item.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden group hover:shadow-lg transition-all cursor-pointer relative" onClick={() => handleLibrarySelect(item)}>
                                  <div className="h-36 bg-slate-100 flex items-center justify-center relative overflow-hidden">
                                      {item.thumbnailUrl ? (<img src={item.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>) : (<Box size={32} className="text-slate-400"/>)}
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><span className="bg-white text-slate-900 text-xs px-3 py-1 rounded-full font-bold shadow-sm">Select</span></div>
                                  </div>
                                  <div className="p-3"><h4 className="font-bold text-sm truncate text-slate-800">{item.name}</h4><span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{item.category}</span></div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* FULLSCREEN PREVIEW OVERLAY */}
      {isFullscreenPreview && (
          <div className="fixed inset-0 z-[200] bg-slate-100 flex text-slate-900">
              <div className="flex-grow relative h-full">
                  <div className="absolute top-4 left-4 z-10 flex gap-2"><button onClick={() => setIsFullscreenPreview(false)} className="bg-white/90 p-2 rounded-lg shadow-md"><Minimize2 size={20} /></button></div>
                  <ModelPreview key="fullscreen" targetImageUrl={targetImageUrl} modelUrl={modelUrl} config={modelConfig} arReady={arLibraryReady} showShadows={showShadows} enabled={true} autoRotate={autoRotate} showGrid={showGrid} />
              </div>
              <div className="w-96 bg-white border-l border-slate-200 h-full overflow-y-auto p-6 shadow-xl flex-shrink-0">
                  <div className="space-y-8 mt-12">
                      <div><SingleAxisControl label="Scale" value={modelConfig.scale} min={0.1} max={5.0} step={0.01} onChange={(v) => setModelConfig(c => ({...c, scale: v}))} unit="x" /></div>
                      <div>
                          <div className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider flex items-center gap-1"><Move3d size={12}/> Position</div>
                          <SingleAxisControl label="Horizontal (X)" value={modelConfig.position.x} min={-2} max={2} step={0.01} onChange={(v) => setModelConfig(c => ({...c, position: {...c.position, x: v}}))} />
                          <SingleAxisControl label="Depth (Z)" value={modelConfig.position.z} min={-2} max={2} step={0.01} onChange={(v) => setModelConfig(c => ({...c, position: {...c.position, z: v}}))} />
                          <SingleAxisControl label="Vertical (Y)" value={modelConfig.position.y} min={-2} max={2} step={0.01} onChange={(v) => setModelConfig(c => ({...c, position: {...c.position, y: v}}))} />
                      </div>
                      <div>
                          <div className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider flex items-center gap-1"><RotateCw size={12}/> Rotation</div>
                          <SingleAxisControl label="Spin (Y)" value={modelConfig.rotation.y} min={-3.14} max={3.14} step={0.1} onChange={(v) => setModelConfig(c => ({...c, rotation: {...c.rotation, y: v}}))} unit="rad" />
                          <SingleAxisControl label="Tilt (X)" value={modelConfig.rotation.x} min={-3.14} max={3.14} step={0.1} onChange={(v) => setModelConfig(c => ({...c, rotation: {...c.rotation, x: v}}))} unit="rad" />
                          <SingleAxisControl label="Roll (Z)" value={modelConfig.rotation.z} min={-3.14} max={3.14} step={0.1} onChange={(v) => setModelConfig(c => ({...c, rotation: {...c.rotation, z: v}}))} unit="rad" />
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* MAIN HEADER & TABS */}
      <div className="flex-shrink-0 px-8 pt-8 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 border-b border-slate-200">
         <div>
             <h1 className="text-3xl font-bold text-slate-900">Menu Dashboard</h1>
             <p className="text-slate-500 text-sm">Create menu items and customize your site.</p>
         </div>
         <div className="flex gap-2">
             <button 
                onClick={() => setActiveTab('menu')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'menu' ? 'bg-white text-primary-600 shadow-md' : 'text-slate-500 hover:bg-white/50'}`}
             >
                 <UtensilsCrossed size={18}/> Menu Items
             </button>
             <button 
                onClick={() => setActiveTab('branding')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'branding' ? 'bg-white text-primary-600 shadow-md' : 'text-slate-500 hover:bg-white/50'}`}
             >
                 <Palette size={18}/> Branding & Design
             </button>
         </div>
      </div>

      {/* TAB CONTENT */}
      <div className="flex-1 overflow-hidden p-8 max-w-[1600px] mx-auto w-full">
        
        {/* --- MENU TAB --- */}
        {activeTab === 'menu' && (
            <div className={`h-full transition-all duration-300 ${isFormVisible ? 'grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8' : 'flex flex-col'}`}>
                
                {/* Left Column: Item List */}
                <div className={isFormVisible ? 'hidden lg:flex flex-col h-full overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-sm' : 'flex flex-col h-full overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-sm'}>
                    <div className="flex justify-between items-center p-6 border-b border-slate-100 flex-shrink-0 bg-white">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${isLimitReached ? 'bg-red-50 text-red-600 border-red-100' : 'bg-primary-50 text-primary-700 border-primary-100'}`}><PieChart size={14} /><span>{itemsUsed} / {planLimits.maxMenuItems} Items</span></div>
                        <div className="flex items-center gap-2">
                            <button onClick={performExport} className="text-slate-500 hover:text-primary-600 text-xs font-bold flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                                Quick Export <Upload size={14} />
                            </button>
                            <button onClick={handleStartAdding} disabled={isLimitReached} className={`bg-primary-600 hover:bg-primary-700 text-white p-2 rounded-lg shadow-md transition-all disabled:opacity-50`}><Plus size={20}/></button>
                        </div>
                    </div>
                    
                    {selectedIds.size > 0 && (<div className="bg-primary-50 border-b border-primary-100 p-3 flex justify-between items-center"><span className="text-sm font-medium text-primary-800 ml-2">{selectedIds.size} selected</span><div className="flex gap-2"><button onClick={() => handleDuplicate(Array.from(selectedIds))} className="text-primary-700 hover:bg-primary-100 p-1.5 rounded transition-colors"><Copy size={16}/></button><button onClick={handleBulkDelete} className="text-red-600 hover:bg-red-100 p-1.5 rounded transition-colors"><Trash2 size={16}/></button></div></div>)}
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {menuItems.length === 0 ? (<div className="flex flex-col items-center justify-center h-full text-center text-slate-400"><p>Menu empty.</p><button onClick={handleStartAdding} className="mt-2 text-sm text-primary-600 font-bold hover:underline">Add Dish</button></div>) : 
                            menuItems.map(item => (
                                <div key={item.id} className={`relative flex items-center gap-4 p-3 rounded-xl border transition-all group ${selectedIds.has(item.id) ? 'bg-primary-50 border-primary-300 shadow-sm' : 'bg-white border-slate-100 hover:border-primary-200 hover:shadow-md'}`}>
                                    <button onClick={() => toggleSelect(item.id)} className={`p-1 rounded transition-colors ${selectedIds.has(item.id) ? 'text-primary-600' : 'text-slate-300 hover:text-slate-500'}`}>{selectedIds.has(item.id) ? <CheckSquare size={20}/> : <SquareIcon size={20}/>}</button>
                                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0"><img src={item.targetImageUrl || `https://via.placeholder.com/100x100.png?text=${item.name.charAt(0)}`} className="w-full h-full object-cover" /><div className={`absolute bottom-0 left-0 right-0 h-1 ${item.compiledTarget ? 'bg-green-500' : 'bg-amber-400'}`}></div></div>
                                    <div className="flex-grow min-w-0"><h3 className="font-semibold text-slate-800 truncate">{item.name}</h3><p className="text-xs text-slate-500 font-mono">${item.price.toFixed(2)}</p></div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => handleEdit(item)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"><Pencil size={14}/></button></div>
                                </div>
                            ))
                        }
                    </div>
                </div>

                {/* Right Column: Editor Form */}
                {isFormVisible && (
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col h-full overflow-hidden relative">
                    <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-white sticky top-0 z-20">
                        <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">{editingId ? <Pencil size={18} className="text-primary-500"/> : <Plus size={18} className="text-primary-500"/>} {editingId ? 'Edit Dish' : 'New Dish'}</h2>
                        <div className="flex gap-2"><button type="button" onClick={resetForm} className="text-slate-400 hover:text-slate-600 px-3 py-1.5 text-sm font-medium">Cancel</button><button onClick={handleSubmit} disabled={processing} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-md transition-all flex items-center gap-2">{processing ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Save</button></div>
                    </div>

                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto bg-slate-50/50">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-0 h-full">
                        <div className="p-6 space-y-6 border-r border-slate-100 bg-white h-full overflow-y-auto">
                            <div className="space-y-4">
                                <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Name</label><input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none" required placeholder="Dish Name" /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Price</label><div className="relative"><DollarSign size={14} className="absolute left-3 top-3 text-slate-400"/><input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2.5 pl-8 text-sm text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none" required placeholder="0.00" /></div></div>
                                    <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Calories</label><input type="number" value={calories} onChange={e => setCalories(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="0" /></div>
                                </div>
                                <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Description</label><textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2.5 h-24 resize-none text-sm text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Description..."></textarea></div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tags</label>
                                <div className="flex flex-wrap gap-2 mb-2">{tags.map(tag => (<span key={tag} className="bg-primary-50 text-primary-700 text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1 border border-primary-100">#{tag} <button type="button" onClick={() => removeTag(tag)} className="text-primary-400 hover:text-red-500"><X size={12}/></button></span>))}</div>
                                <input type="text" placeholder="Add tag..." value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                            </div>
                        </div>

                        <div className="p-6 space-y-6 bg-slate-50/50 h-full overflow-y-auto">
                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm relative group">
                                <div className="absolute top-3 right-3 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button type="button" onClick={() => setAutoRotate(!autoRotate)} className="p-1.5 rounded-md bg-white text-slate-500 shadow-sm hover:text-primary-600"><RefreshCcw size={14}/></button>
                                    <button type="button" onClick={() => setShowGrid(!showGrid)} className="p-1.5 rounded-md bg-white text-slate-500 shadow-sm hover:text-primary-600"><Grid3x3 size={14}/></button>
                                    <button type="button" onClick={() => setIsFullscreenPreview(true)} className="p-1.5 rounded-md bg-white text-slate-500 shadow-sm hover:text-primary-600"><Maximize2 size={14}/></button>
                                </div>
                                <div className="h-56 relative bg-slate-100">
                                    {(targetImageUrl || modelUrl) ? (<ModelPreview targetImageUrl={targetImageUrl} modelUrl={modelUrl} config={modelConfig} arReady={arLibraryReady} showShadows={showShadows} autoRotate={autoRotate} showGrid={showGrid} />) : (<div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400"><Move3d size={40} className="mb-2 opacity-20"/><p className="text-xs font-medium">Preview Area</p></div>)}
                                </div>
                            </div>

                            {/* TRANSFORM CONTROLS */}
                            {(modelUrl && targetImageUrl) && (
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <button type="button" onClick={() => setShowTransformControls(!showTransformControls)} className="w-full flex items-center justify-between p-3 bg-white hover:bg-slate-50 transition-colors text-left border-b border-slate-100">
                                        <div className="flex items-center gap-2"><Settings size={14} className="text-primary-600"/><h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">3D Positioning</h4></div>
                                        {showTransformControls ? <ChevronUp size={14} className="text-slate-400"/> : <ChevronDown size={14} className="text-slate-400"/>}
                                    </button>
                                    {showTransformControls && (
                                        <div className="p-4 bg-slate-50 animate-fade-in">
                                            <div className="flex justify-end mb-2"><button type="button" onClick={() => setModelConfig(defaultModelConfig)} className="text-[10px] text-primary-600 hover:underline flex items-center gap-1"><RotateCcw size={10}/> Reset</button></div>
                                            <div className="mb-4"><SingleAxisControl label="Scale" value={modelConfig.scale} min={0.1} max={5.0} step={0.05} onChange={(v) => setModelConfig(c => ({...c, scale: v}))} unit="x" /></div>
                                            <div className="mb-4">
                                                <SingleAxisControl label="Horizontal (X)" value={modelConfig.position.x} min={-2} max={2} step={0.01} onChange={(v) => setModelConfig(c => ({...c, position: {...c.position, x: v}}))} />
                                                <SingleAxisControl label="Depth (Z)" value={modelConfig.position.z} min={-2} max={2} step={0.01} onChange={(v) => setModelConfig(c => ({...c, position: {...c.position, z: v}}))} />
                                                <SingleAxisControl label="Vertical (Y)" value={modelConfig.position.y} min={-2} max={2} step={0.01} onChange={(v) => setModelConfig(c => ({...c, position: {...c.position, y: v}}))} />
                                            </div>
                                            <div>
                                                <SingleAxisControl label="Spin (Y)" value={modelConfig.rotation.y} min={-3.14} max={3.14} step={0.1} onChange={(v) => setModelConfig(c => ({...c, rotation: {...c.rotation, y: v}}))} unit="rad" />
                                                <SingleAxisControl label="Tilt (X)" value={modelConfig.rotation.x} min={-3.14} max={3.14} step={0.1} onChange={(v) => setModelConfig(c => ({...c, rotation: {...c.rotation, x: v}}))} unit="rad" />
                                                <SingleAxisControl label="Roll (Z)" value={modelConfig.rotation.z} min={-3.14} max={3.14} step={0.1} onChange={(v) => setModelConfig(c => ({...c, rotation: {...c.rotation, z: v}}))} unit="rad" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ASSETS */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className={`border-2 border-dashed rounded-xl p-3 text-center transition-all relative group ${targetImageUrl ? 'bg-white border-green-200' : 'bg-slate-50 border-slate-300 hover:border-primary-300'}`}>
                                    <label className="text-[10px] font-bold text-slate-500 mb-2 block flex items-center justify-center gap-1"><ScanLine size={10}/> TARGET IMAGE</label>
                                    <div className="relative h-20 flex items-center justify-center rounded-lg overflow-hidden bg-slate-100 mb-2">
                                        {targetImageUrl ? (<img src={targetImageUrl} className="w-full h-full object-cover"/>) : (<Upload size={20} className="text-slate-300"/>)}
                                        <input type="file" accept="image/*" onChange={handleTargetImageChange} className="absolute inset-0 opacity-0 cursor-pointer"/>
                                    </div>
                                    <span className="text-[10px] font-medium text-primary-600">{targetImageUrl ? 'Change File' : 'Upload JPG/PNG'}</span>
                                </div>
                                <div className={`border-2 border-dashed rounded-xl p-3 text-center transition-all relative group ${modelUrl ? 'bg-white border-green-200' : 'bg-slate-50 border-slate-300 hover:border-primary-300'}`}>
                                    <label className="text-[10px] font-bold text-slate-500 mb-2 block flex items-center justify-center gap-1"><Box size={10}/> 3D MODEL</label>
                                    <div className="relative h-20 flex items-center justify-center rounded-lg overflow-hidden bg-slate-100 mb-2">
                                        {modelUrl ? (<div className="text-green-600 flex flex-col items-center"><CheckCircle size={20}/><span className="text-[9px] font-bold mt-1">READY</span></div>) : (<Upload size={20} className="text-slate-300"/>)}
                                        <input type="file" accept=".glb,.gltf" onChange={handleModelChange} className="absolute inset-0 opacity-0 cursor-pointer z-10"/>
                                    </div>
                                    <div className="flex justify-center gap-2 text-[10px]"><span className="text-primary-600 font-medium cursor-pointer pointer-events-none">Upload GLB</span><span className="text-slate-300">|</span><button type="button" onClick={(e) => { e.stopPropagation(); setShowLibraryModal(true); }} className="text-blue-600 font-bold hover:underline z-20">Library</button></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    </form>
                </div>
                )}
            </div>
        )}

        {/* --- BRANDING TAB --- */}
        {activeTab === 'branding' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-full overflow-y-auto p-8">
                <div className="max-w-3xl mx-auto space-y-10">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">Brand Identity</h2>
                            <p className="text-slate-500 mt-1">Customize how your exported menu looks.</p>
                        </div>
                        <button 
                            onClick={saveBranding} 
                            disabled={isSavingBranding} 
                            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {isSavingBranding ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>} Save Changes
                        </button>
                    </div>

                    {/* VISUAL IDENTITY */}
                    <div className="space-y-6">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Visual Style</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Restaurant Name</label>
                                <input 
                                    type="text" 
                                    value={brandingProfile.name || ''} 
                                    onChange={(e) => handleBrandingChange('name', e.target.value)}
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-slate-800"
                                    placeholder="e.g. The Burger Joint"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Brand Color</label>
                                <div className="flex gap-3">
                                    <input 
                                        type="color" 
                                        value={brandingProfile.brandColor || '#4f46e5'} 
                                        onChange={(e) => handleBrandingChange('brandColor', e.target.value)}
                                        className="w-12 h-12 rounded-xl cursor-pointer border border-slate-200 p-1 bg-white"
                                    />
                                    <input 
                                        type="text" 
                                        value={brandingProfile.brandColor || '#4f46e5'} 
                                        onChange={(e) => handleBrandingChange('brandColor', e.target.value)}
                                        className="flex-1 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none uppercase font-mono text-slate-600"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Theme</label>
                                <div className="flex flex-col gap-2">
                                    {['midnight', 'paper', 'luxury'].map(t => (
                                        <label key={t} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${brandingProfile.theme === t ? 'border-primary-600 bg-primary-50' : 'border-slate-200 hover:border-slate-300'}`}>
                                            <input type="radio" name="theme" checked={brandingProfile.theme === t} onChange={() => handleBrandingChange('theme', t)} className="text-primary-600 focus:ring-primary-500" />
                                            <span className="capitalize font-medium text-slate-700">{t}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                             <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Button Style</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {radiusOptions.map((opt) => (
                                        <button 
                                            key={opt.value} 
                                            onClick={() => handleBrandingChange('borderRadius', opt.value)} 
                                            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${brandingProfile.borderRadius === opt.value ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                                        >
                                            <opt.icon size={20} />
                                            <span className="text-[10px] font-bold mt-1">{opt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                             <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Typography</label>
                                <div className="flex flex-col gap-2">
                                    {[{ id: 'sans', label: 'Modern Sans' }, { id: 'serif', label: 'Classic Serif' }, { id: 'mono', label: 'Tech Mono' }].map(f => (
                                        <button 
                                            key={f.id} 
                                            onClick={() => handleBrandingChange('font', f.id)} 
                                            className={`px-4 py-3 text-left rounded-xl border transition-all text-sm ${brandingProfile.font === f.id ? 'border-primary-600 bg-primary-50 text-primary-700 font-bold' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ASSETS */}
                    <div className="space-y-6">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Brand Assets</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Logo Upload */}
                            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center">
                                <label className="block text-sm font-bold text-slate-700 mb-4">Website Logo</label>
                                {brandingProfile.logoUrl ? (
                                    <div className="relative inline-block group">
                                        <img src={brandingProfile.logoUrl} className="h-16 object-contain mx-auto mb-4" />
                                        <button onClick={() => handleBrandingChange('logoUrl', '')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"><X size={14}/></button>
                                    </div>
                                ) : (
                                    <div className="h-16 flex items-center justify-center mb-4"><ImageIcon size={32} className="text-slate-300"/></div>
                                )}
                                <label className="cursor-pointer bg-white border border-slate-300 hover:border-primary-400 text-slate-600 hover:text-primary-600 px-4 py-2 rounded-lg text-sm font-bold transition-all inline-flex items-center gap-2 shadow-sm">
                                    {uploadingBrandAsset === 'logo' ? <Loader2 className="animate-spin" size={16}/> : <Upload size={16}/>} 
                                    {brandingProfile.logoUrl ? 'Change Logo' : 'Upload Logo'}
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleBrandingFileUpload(e, 'logo')} />
                                </label>
                            </div>

                            {/* Hero Upload */}
                            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center">
                                <label className="block text-sm font-bold text-slate-700 mb-4">Hero Background</label>
                                {brandingProfile.heroUrl ? (
                                    <div className="relative inline-block group w-full h-16">
                                        <img src={brandingProfile.heroUrl} className="w-full h-full object-cover rounded-lg mb-4" />
                                        <button onClick={() => handleBrandingChange('heroUrl', '')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"><X size={14}/></button>
                                    </div>
                                ) : (
                                    <div className="h-16 bg-slate-200 rounded-lg mb-4 flex items-center justify-center"><ImageIcon size={24} className="text-slate-400"/></div>
                                )}
                                <label className="cursor-pointer bg-white border border-slate-300 hover:border-primary-400 text-slate-600 hover:text-primary-600 px-4 py-2 rounded-lg text-sm font-bold transition-all inline-flex items-center gap-2 shadow-sm">
                                    {uploadingBrandAsset === 'hero' ? <Loader2 className="animate-spin" size={16}/> : <Upload size={16}/>} 
                                    {brandingProfile.heroUrl ? 'Change Image' : 'Upload Image'}
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleBrandingFileUpload(e, 'hero')} />
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* CONTACT INFO */}
                    <div className="space-y-6">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Contact Details (Footer)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Instagram Handle</label>
                                <div className="relative">
                                    <Instagram size={16} className="absolute left-3 top-3 text-slate-400"/>
                                    <input type="text" value={brandingProfile.instagram || ''} onChange={(e) => handleBrandingChange('instagram', e.target.value)} className="w-full pl-10 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" placeholder="@username"/>
                                </div>
                            </div>
                             <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Phone Number</label>
                                <div className="relative">
                                    <Phone size={16} className="absolute left-3 top-3 text-slate-400"/>
                                    <input type="text" value={brandingProfile.phone || ''} onChange={(e) => handleBrandingChange('phone', e.target.value)} className="w-full pl-10 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" placeholder="+1 234 567 890"/>
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Physical Address</label>
                                <div className="relative">
                                    <MapPin size={16} className="absolute left-3 top-3 text-slate-400"/>
                                    <input type="text" value={brandingProfile.address || ''} onChange={(e) => handleBrandingChange('address', e.target.value)} className="w-full pl-10 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" placeholder="123 Main St, New York, NY"/>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* EXPORT ACTION */}
                    <div className="bg-primary-50 rounded-2xl p-8 text-center border border-primary-100">
                        <h3 className="text-xl font-bold text-primary-900 mb-2">Ready to Publish?</h3>
                        <p className="text-primary-700 mb-6 max-w-lg mx-auto">Export your configured menu as a standalone website package. Your current branding settings above will be applied.</p>
                        <button onClick={performExport} className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-primary-200 transition-all flex items-center gap-3 mx-auto">
                            <Download size={24}/> Export Website Now
                        </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;