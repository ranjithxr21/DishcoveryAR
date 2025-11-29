
import React, { useState } from 'react';
import { User, ViewMode, RestaurantProfile } from '../types';
import { api } from '../services/api';
import { UserCog, Lock, Mail, Loader2, CheckCircle, AlertCircle, ShieldCheck, BadgeDollarSign, Clock, Store, Globe, Instagram, Facebook, Trash2, ImagePlus, X, Save } from 'lucide-react';

interface UserSettingsProps {
  user: User;
  onUpdateUser: (user: User) => void;
  onNavigate: (view: ViewMode) => void;
}

const UserSettings: React.FC<UserSettingsProps> = ({ user, onUpdateUser, onNavigate }) => {
  const [email, setEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Restaurant Profile State
  const [profile, setProfile] = useState<RestaurantProfile>(user.profile || {});
  const [newAmbienceFile, setNewAmbienceFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      setMsg(null);
      setLoading(true);
      try {
          // Upload ambience image if present
          let updatedProfile = { ...profile };
          if (newAmbienceFile) {
              const url = await api.uploadFile(newAmbienceFile, 'image', 'site_assets');
              updatedProfile.ambienceUrls = [...(updatedProfile.ambienceUrls || []), url];
          }

          const updatedUser = await api.updateProfile(email, updatedProfile);
          onUpdateUser(updatedUser);
          setProfile(updatedUser.profile || {});
          setNewAmbienceFile(null);
          setMsg({ text: "Profile updated successfully!", type: 'success' });
      } catch (err: any) {
          setMsg({ text: err.message || "Failed to update profile", type: 'error' });
      } finally {
          setLoading(false);
      }
  };

  const removeAmbienceImage = async (urlToRemove: string) => {
      const updatedUrls = (profile.ambienceUrls || []).filter(url => url !== urlToRemove);
      setProfile({ ...profile, ambienceUrls: updatedUrls });
      // Note: We trigger a save immediately to persist the deletion
      try {
          const updatedUser = await api.updateProfile(email, { ...profile, ambienceUrls: updatedUrls });
          onUpdateUser(updatedUser);
      } catch(e) { console.error(e); }
  };

  const handleRequestUpgrade = async () => {
      setLoading(true);
      setMsg(null);
      try {
          const updatedUser = await api.requestUpgrade();
          onUpdateUser(updatedUser);
          setMsg({ text: "Upgrade request submitted! An admin will review it.", type: 'success' });
      } catch (err: any) {
          setMsg({ text: err.message || "Failed to submit request", type: 'error' });
      } finally {
          setLoading(false);
      }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      setMsg(null);
      if (newPassword !== confirmPassword) {
          setMsg({ text: "New passwords do not match", type: 'error' });
          return;
      }
      if (newPassword.length < 6) {
          setMsg({ text: "Password must be at least 6 characters", type: 'error' });
          return;
      }
      setLoading(true);
      try {
          await api.changePassword(currentPassword, newPassword);
          setMsg({ text: "Password changed successfully!", type: 'success' });
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
      } catch (err: any) {
          setMsg({ text: err.message || "Failed to change password", type: 'error' });
      } finally {
          setLoading(false);
      }
  };

  return (
    // Use absolute inset-0 to cover dark background
    <div className="absolute inset-0 w-full h-full bg-slate-50 text-slate-900 font-sans overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-3 text-slate-900">
                    <UserCog className="text-primary-600" size={32} /> Account Settings
                </h1>
                <p className="text-slate-500">Manage your restaurant profile, subscription, and security.</p>
            </div>

            {msg && (
                <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 shadow-sm border animate-fade-in ${msg.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    {msg.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    {msg.text}
                </div>
            )}

            <div className="grid grid-cols-1 gap-8">
                
                {/* PLAN INFO */}
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800">Subscription Plan</h2>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-full ${user.plan === 'paid' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                {user.plan === 'paid' ? <BadgeDollarSign size={24} /> : <ShieldCheck size={24} />}
                            </div>
                            <div>
                                <p className="font-bold text-lg capitalize text-slate-900">{user.plan} Plan</p>
                                <p className="text-slate-500 text-sm">
                                    {user.plan === 'paid' ? 'Active Pro Subscription' : 'Standard Features'}
                                </p>
                            </div>
                        </div>
                        {user.plan === 'free' && (
                            <button 
                                onClick={handleRequestUpgrade}
                                disabled={user.upgradeRequested || loading}
                                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 shadow-sm ${
                                    user.upgradeRequested 
                                    ? 'bg-amber-100 text-amber-700 border border-amber-200 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-primary-600 to-primary-500 text-white hover:shadow-md'
                                }`}
                            >
                                {user.upgradeRequested ? (
                                    <><Clock size={16}/> Pending Approval</>
                                ) : (
                                    <>Upgrade to Pro</>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* RESTAURANT PROFILE */}
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                    <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-800"><Store size={20} className="text-primary-500"/> Restaurant Profile</h2>
                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                        
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Restaurant Name</label>
                                <input type="text" value={profile.name || ''} onChange={e => setProfile({...profile, name: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all" placeholder="e.g. The Tasty Spoon" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email Address</label>
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Address</label>
                                <input type="text" value={profile.address || ''} onChange={e => setProfile({...profile, address: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all" placeholder="123 Main St, City" />
                            </div>
                        </div>

                        {/* Socials */}
                        <div className="space-y-4 border-t border-slate-100 pt-4">
                             <h3 className="text-sm font-bold text-slate-700">Social Links</h3>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                 <div className="relative">
                                     <Globe size={16} className="absolute left-3 top-3 text-slate-400"/>
                                     <input type="text" placeholder="Website URL" value={profile.website || ''} onChange={e => setProfile({...profile, website: e.target.value})} className="w-full pl-10 p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"/>
                                 </div>
                                 <div className="relative">
                                     <Instagram size={16} className="absolute left-3 top-3 text-slate-400"/>
                                     <input type="text" placeholder="Instagram URL" value={profile.instagram || ''} onChange={e => setProfile({...profile, instagram: e.target.value})} className="w-full pl-10 p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"/>
                                 </div>
                                 <div className="relative">
                                     <Facebook size={16} className="absolute left-3 top-3 text-slate-400"/>
                                     <input type="text" placeholder="Facebook URL" value={profile.facebook || ''} onChange={e => setProfile({...profile, facebook: e.target.value})} className="w-full pl-10 p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"/>
                                 </div>
                             </div>
                        </div>

                        {/* Ambience Gallery */}
                        <div className="space-y-4 border-t border-slate-100 pt-4">
                            <h3 className="text-sm font-bold text-slate-700">Ambience Gallery</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {profile.ambienceUrls?.map((url, idx) => (
                                    <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200">
                                        <img src={url} className="w-full h-full object-cover" />
                                        <button type="button" onClick={() => removeAmbienceImage(url)} className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"><Trash2 size={14}/></button>
                                    </div>
                                ))}
                                <label className="border-2 border-dashed border-slate-300 rounded-lg aspect-square flex flex-col items-center justify-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors text-slate-400 hover:text-primary-600">
                                    {newAmbienceFile ? (
                                        <div className="text-center px-2">
                                            <CheckCircle size={24} className="mx-auto mb-2 text-green-500"/>
                                            <span className="text-xs font-medium text-green-600 break-all line-clamp-2">{newAmbienceFile.name}</span>
                                        </div>
                                    ) : (
                                        <>
                                            <ImagePlus size={24} className="mb-2"/>
                                            <span className="text-xs font-bold">Add Photo</span>
                                        </>
                                    )}
                                    <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && setNewAmbienceFile(e.target.files[0])} />
                                </label>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-slate-100">
                            <button type="submit" disabled={loading} className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-bold shadow-md transition-all disabled:opacity-50 flex items-center gap-2">
                                {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18}/>} Save Profile
                            </button>
                        </div>
                    </form>
                </div>

                {/* PASSWORD */}
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                    <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-800"><Lock size={20} className="text-slate-500"/> Security</h2>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Current Password</label>
                            <input 
                                type="password" 
                                value={currentPassword} 
                                onChange={(e) => setCurrentPassword(e.target.value)} 
                                required
                                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">New Password</label>
                                <input 
                                    type="password" 
                                    value={newPassword} 
                                    onChange={(e) => setNewPassword(e.target.value)} 
                                    required
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Confirm New Password</label>
                                <input 
                                    type="password" 
                                    value={confirmPassword} 
                                    onChange={(e) => setConfirmPassword(e.target.value)} 
                                    required
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end pt-4">
                            <button type="submit" disabled={loading} className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold shadow-md transition-all disabled:opacity-50 flex items-center gap-2">
                                {loading && <Loader2 className="animate-spin" size={16} />} Update Password
                            </button>
                        </div>
                    </form>
                </div>

            </div>
        </div>
    </div>
  );
};

export default UserSettings;
