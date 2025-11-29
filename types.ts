import React from 'react';

declare global {
  interface Window {
    MINDAR: any;
    THREE: any;
  }
}

export interface RestaurantProfile {
  name?: string;
  address?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  ambienceUrls?: string[];
  brandColor?: string;
  theme?: string;
  borderRadius?: string;
  font?: string;
  logoUrl?: string;
  heroUrl?: string;
  phone?: string;
}

export interface User {
  id: number;
  email: string;
  role: 'admin' | 'superadmin';
  plan: 'free' | 'paid';
  upgradeRequested?: boolean;
  profile?: RestaurantProfile;
}

export interface PlanLimits {
    maxMenuItems: number;
    maxUploadSizeMB: number;
    canRemoveWatermark: boolean;
}

export interface SystemSettings {
    plans: {
        free: PlanLimits;
        paid: PlanLimits;
    }
}

export interface ModelConfig {
  scale: number;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
}

export interface LibraryItem {
    id: string;
    userId: number;
    name: string;
    category: string;
    modelUrl: string;
    thumbnailUrl: string;
    credits?: string;
}

export interface MenuItem {
  id: string;
  userId: number;
  name: string;
  description: string;
  price: number;
  calories?: number;
  tags: string[];
  
  // Visual Assets
  targetImageUrl?: string; 
  modelUrl?: string;
  
  // Internal AR Data
  compiledTarget?: string | Blob; 
  
  // 3D Placement Configuration
  modelConfig?: ModelConfig;
}

export interface ExportConfig {
  title?: string;
  color?: string;
  theme?: string;
  font?: string;
  borderRadius?: string;
  phone?: string;
  address?: string;
  instagram?: string;
  isPaid?: boolean;
  logoUrl?: string;
  heroUrl?: string;
}

export enum ViewMode {
  LANDING = 'LANDING',
  LOGIN = 'LOGIN',
  SIGNUP = 'SIGNUP',
  MENU = 'MENU',
  AR = 'AR',
  ADMIN = 'ADMIN',
  SUPERADMIN = 'SUPERADMIN',
  SETTINGS = 'SETTINGS',
}