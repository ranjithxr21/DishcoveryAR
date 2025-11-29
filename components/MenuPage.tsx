
import React from 'react';
import { MenuItem, User } from '../types';
import { ChefHat, Utensils, ScanLine, MapPin, Instagram, Globe, Facebook, Image as ImageIcon } from 'lucide-react';

interface MenuPageProps {
  menuItems: MenuItem[];
  onViewAR: (item: MenuItem) => void;
  onOpenAdmin: () => void;
  user: User | null;
  onLogout: () => void;
}

const MenuPage: React.FC<MenuPageProps> = ({ menuItems, onViewAR, onOpenAdmin, user }) => {
  const profile = user?.profile || {};
  const hasSocials = profile.instagram || profile.facebook || profile.website;

  return (
    <div className="h-full bg-[#121212] text-white overflow-y-auto no-scrollbar pb-24">
      {/* Hero Section */}
      <div className="relative h-80 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#121212]/50 to-[#121212] z-10"></div>
        <img 
          src={profile.ambienceUrls?.[0] || "https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1000&auto=format&fit=crop"} 
          alt="Restaurant Ambiance" 
          className="w-full h-full object-cover opacity-80"
        />
        <div className="absolute bottom-0 left-0 p-8 z-20 w-full max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
               <p className="text-brand-400 font-medium tracking-widest text-xs uppercase mb-2">Welcome to</p>
               <h1 className="text-4xl md:text-6xl font-bold mb-2 tracking-tight">{profile.name || 'Dishcovery'}</h1>
               {profile.address && (
                   <div className="flex items-center gap-2 text-gray-300 text-sm">
                       <MapPin size={16} className="text-brand-500" />
                       {profile.address}
                   </div>
               )}
            </div>
            
            {hasSocials && (
                <div className="flex gap-3">
                    {profile.instagram && (
                        <a href={profile.instagram} target="_blank" rel="noreferrer" className="p-2 bg-white/10 rounded-full hover:bg-brand-600 transition-colors text-white">
                            <Instagram size={20} />
                        </a>
                    )}
                    {profile.facebook && (
                        <a href={profile.facebook} target="_blank" rel="noreferrer" className="p-2 bg-white/10 rounded-full hover:bg-blue-600 transition-colors text-white">
                            <Facebook size={20} />
                        </a>
                    )}
                    {profile.website && (
                        <a href={profile.website} target="_blank" rel="noreferrer" className="p-2 bg-white/10 rounded-full hover:bg-green-600 transition-colors text-white">
                            <Globe size={20} />
                        </a>
                    )}
                </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-12">
        
        {/* Menu Grid */}
        <div>
            <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-4">
            <Utensils className="text-brand-500" size={24} />
            <h2 className="text-2xl font-bold">Our Menu</h2>
            </div>

            {menuItems.length === 0 ? (
            <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/10 border-dashed">
                <ChefHat className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                <p className="text-gray-400 text-lg">The kitchen is preparing the menu...</p>
                {user && (
                    <button onClick={onOpenAdmin} className="mt-4 text-brand-400 hover:text-brand-300 font-medium hover:underline">
                        Go to Dashboard to add items
                    </button>
                )}
            </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {menuItems.map((item) => (
                <div key={item.id} className="bg-[#1e1e1e] rounded-2xl overflow-hidden border border-white/5 shadow-xl hover:border-brand-500/30 transition-all group flex flex-col">
                    <div className="h-56 overflow-hidden relative bg-gray-800">
                    <img 
                        src={item.targetImageUrl || "https://via.placeholder.com/400x300?text=No+Image"} 
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-sm font-bold border border-white/10 shadow-lg">
                        ${item.price.toFixed(2)}
                    </div>
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                    <div className="mb-3">
                        <h3 className="text-xl font-bold text-white leading-tight mb-1">{item.name}</h3>
                        <p className="text-gray-400 text-sm line-clamp-2">{item.description}</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-6 mt-auto">
                        {item.tags.map(tag => (
                        <span key={tag} className="text-[10px] font-bold uppercase tracking-wider bg-white/5 text-gray-400 px-2 py-1 rounded border border-white/5">
                            {tag}
                        </span>
                        ))}
                        {item.calories && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-white/5 text-gray-400 px-2 py-1 rounded border border-white/5">
                            {item.calories} kcal
                        </span>
                        )}
                    </div>

                    <button 
                        onClick={() => onViewAR(item)}
                        disabled={!item.modelUrl || !item.compiledTarget}
                        className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                        item.modelUrl && item.compiledTarget 
                            ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-900/20' 
                            : 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
                        }`}
                    >
                        <ScanLine size={18} />
                        {item.modelUrl && item.compiledTarget ? 'View in AR' : 'AR Unavailable'}
                    </button>
                    </div>
                </div>
                ))}
            </div>
            )}
        </div>

        {/* Ambience Gallery */}
        {profile.ambienceUrls && profile.ambienceUrls.length > 0 && (
            <div>
                <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-4">
                    <ImageIcon className="text-brand-500" size={24} />
                    <h2 className="text-2xl font-bold">Ambience</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {profile.ambienceUrls.map((url, index) => (
                        <div key={index} className="aspect-square rounded-xl overflow-hidden border border-white/5 group cursor-zoom-in">
                            <img src={url} alt={`Ambience ${index + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        </div>
                    ))}
                </div>
            </div>
        )}
        
      </div>
    </div>
  );
};

export default MenuPage;
