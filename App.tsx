
import React, { useState, useEffect } from 'react';
import ARView from './components/ARView';
import AdminDashboard from './components/AdminDashboard';
import MenuPage from './components/MenuPage';
import LoginPage from './components/LoginPage';
import SignUpPage from './components/SignUpPage';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import LandingPage from './components/LandingPage';
import UserSettings from './components/UserSettings';
import Header from './components/Header';
import { MenuItem, ViewMode, User } from './types';
import { api } from './services/api';
import { loadScripts } from './utils/scriptLoader';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.LANDING);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [activeARItem, setActiveARItem] = useState<MenuItem | null>(null);
  
  const [arLibProgress, setArLibProgress] = useState(0);
  const [arLibReady, setArLibReady] = useState(false);

  useEffect(() => {
    const checkAuthAndInit = async () => {
      try {
        const user = await api.checkSession();
        if (user) {
            setCurrentUser(user);
            // If user is already logged in, stay on current logic or default to Admin
            if (viewMode === ViewMode.LANDING) {
                if (user.role === 'superadmin') {
                    setViewMode(ViewMode.SUPERADMIN);
                } else {
                    setViewMode(ViewMode.ADMIN);
                }
            }
        }
      } catch (e) {
        console.error("Session check failed");
      } finally {
        setAuthChecked(true);
      }
    };
    checkAuthAndInit();
  }, []);
  
  // Fetch menu items only when needed
  useEffect(() => {
      if(viewMode === ViewMode.MENU || viewMode === ViewMode.ADMIN) {
          api.getMenu().then(setMenuItems).catch(console.error);
      }
  }, [currentUser, viewMode]);

  useEffect(() => {
      // Load AR libraries once, regardless of login state
      if (!window.MINDAR) {
        const bootstrapperCode = `
          import * as THREE from 'three';
          import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
          import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
          import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

          const ThreeMutable = { ...THREE };
          ThreeMutable.GLTFLoader = GLTFLoader;
          ThreeMutable.OrbitControls = OrbitControls;
          ThreeMutable.DRACOLoader = DRACOLoader;
          window.THREE = ThreeMutable;
          
          import { Compiler } from 'mind-ar/mindar-image.prod.js';
          import { MindARThree } from 'mind-ar/mindar-image-three.prod.js';
          
          window.MINDAR = { IMAGE: { Compiler, MindARThree } };
        `;

        loadScripts([{ content: bootstrapperCode, type: 'module' }], setArLibProgress)
          .then(() => setTimeout(() => setArLibReady(true), 200));
      } else {
        setArLibProgress(100);
        setArLibReady(true);
      }
  }, []);
  
  const handleLoginSuccess = (user: User) => {
      setCurrentUser(user);
      if (user.role === 'superadmin') {
          setViewMode(ViewMode.SUPERADMIN);
      } else {
          setViewMode(ViewMode.ADMIN);
      }
  };
  
  const handleLogout = async () => {
      await api.logout();
      setCurrentUser(null);
      setViewMode(ViewMode.LANDING);
  };

  const handleViewAR = (item: MenuItem) => {
    setActiveARItem(item);
    setViewMode(ViewMode.AR);
  };

  const handleBackFromAR = () => {
    setActiveARItem(null);
    setViewMode(ViewMode.MENU);
  };

  if (!authChecked) {
      return (
          <div className="h-screen w-screen flex items-center justify-center bg-[#121212] text-white">
              <div className="flex flex-col items-center">
                <Loader2 className="w-10 h-10 animate-spin text-brand-500 mb-4" />
                <p className="text-gray-400">Loading Dishcovery...</p>
              </div>
          </div>
      )
  }

  // Determine background color based on view mode
  // Admin, SuperAdmin, and Settings get Light Mode (slate-50 handled in component)
  // Menu, Landing, AR get Dark Mode (black/gray-900)
  const isLightMode = viewMode === ViewMode.ADMIN || viewMode === ViewMode.SUPERADMIN || viewMode === ViewMode.SETTINGS;
  const mainClass = `flex-1 relative overflow-hidden flex flex-col ${isLightMode ? '' : 'bg-[#121212]'}`;

  return (
    <div className={`h-screen w-screen overflow-hidden flex flex-col font-sans ${isLightMode ? 'bg-slate-50' : 'bg-[#121212]'}`}>
      
      {/* Header is hidden in AR View to maximize screen space */}
      {viewMode !== ViewMode.AR && (
          <Header 
            user={currentUser} 
            currentView={viewMode}
            onNavigate={setViewMode}
            onLogout={handleLogout}
          />
      )}

      <main className={mainClass}>
        
        {viewMode === ViewMode.LANDING && (
            <LandingPage onNavigate={setViewMode} />
        )}

        {viewMode === ViewMode.LOGIN && (
            <LoginPage onLoginSuccess={handleLoginSuccess} onNavigate={setViewMode} />
        )}

        {viewMode === ViewMode.SIGNUP && (
            <SignUpPage onLoginSuccess={handleLoginSuccess} onNavigate={setViewMode} />
        )}

        {viewMode === ViewMode.MENU && (
          <MenuPage 
            menuItems={menuItems} 
            onViewAR={handleViewAR}
            onOpenAdmin={() => setViewMode(ViewMode.ADMIN)}
            user={currentUser}
            onLogout={handleLogout}
          />
        )}

        {viewMode === ViewMode.AR && (
          <ARView 
            activeItem={activeARItem} 
            onBack={handleBackFromAR}
          />
        )}

        {/* Protected Admin View */}
        {viewMode === ViewMode.ADMIN && currentUser && (
          <div className="h-full w-full relative">
            <AdminDashboard 
              menuItems={menuItems} 
              setMenuItems={setMenuItems} 
              refreshItems={() => api.getMenu().then(setMenuItems)}
              arLibraryProgress={arLibProgress}
              arLibraryReady={arLibReady}
              currentUser={currentUser}
              onUpdateUser={setCurrentUser}
            />
          </div>
        )}
        
        {/* Protected Super Admin View */}
        {viewMode === ViewMode.SUPERADMIN && currentUser && currentUser.role === 'superadmin' && (
            <SuperAdminDashboard user={currentUser} onLogout={handleLogout} />
        )}

        {/* Settings View */}
        {viewMode === ViewMode.SETTINGS && currentUser && (
            <UserSettings 
                user={currentUser} 
                onUpdateUser={setCurrentUser} 
                onNavigate={setViewMode} 
            />
        )}

      </main>
    </div>
  );
};

export default App;
