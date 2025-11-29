
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { User, SystemSettings } from '../types';
import { LogOut, Users, ShieldCheck, BadgeDollarSign, Loader2, Crown, Lock, X, CheckCircle, Settings as SettingsIcon, Save, Clock, Check, XCircle } from 'lucide-react';

interface SuperAdminDashboardProps {
  user: User;
  onLogout: () => void;
}

const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'plans'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Settings State
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // Password Change Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [isPassLoading, setIsPassLoading] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [userList, settingsData] = await Promise.all([
          api.getUsers(),
          api.getSystemSettings()
      ]);
      setUsers(userList);
      setSettings(settingsData);
    } catch (err) {
      setError('Failed to fetch data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePlanChange = async (userId: number, currentPlan: 'free' | 'paid') => {
    const newPlan = currentPlan === 'free' ? 'paid' : 'free';
    try {
      await api.updateUserPlan(userId, newPlan);
      // Update local state: change plan AND clear upgrade flag if becoming paid
      setUsers(users.map(u => u.id === userId ? { ...u, plan: newPlan, upgradeRequested: newPlan === 'paid' ? false : u.upgradeRequested } : u));
    } catch (err) {
      alert('Failed to update plan. Please try again.');
    }
  };

  const handleRejectUpgrade = async (userId: number) => {
      try {
          await api.rejectUpgradeRequest(userId);
          setUsers(users.map(u => u.id === userId ? { ...u, upgradeRequested: false } : u));
      } catch (err) {
          alert('Failed to reject request');
      }
  };

  const handleSettingsSave = async () => {
      if (!settings) return;
      setSavingSettings(true);
      try {
          await api.updateSystemSettings(settings);
          alert("Settings updated successfully!");
      } catch (err) {
          alert("Failed to save settings");
      } finally {
          setSavingSettings(false);
      }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
      e.preventDefault();
      setPassError('');
      setPassSuccess('');

      if (newPassword !== confirmPassword) {
          setPassError("New passwords don't match");
          return;
      }
      if (newPassword.length < 6) {
          setPassError("Password must be at least 6 characters");
          return;
      }

      setIsPassLoading(true);
      try {
          await api.changePassword(currentPassword, newPassword);
          setPassSuccess("Password updated successfully!");
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setTimeout(() => {
              setShowPasswordModal(false);
              setPassSuccess('');
          }, 2000);
      } catch (err: any) {
          setPassError(err.message || "Failed to update password");
      } finally {
          setIsPassLoading(false);
      }
  };

  return (
    <div className="absolute inset-0 w-full h-full bg-slate-50 text-slate-900 font-sans flex flex-col">
      
      {/* Change Password Modal */}
      {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                  <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
                      <h3 className="font-bold flex items-center gap-2 text-lg text-slate-800"><Lock size={18} className="text-primary-600"/> Change Password</h3>
                      <button onClick={() => setShowPasswordModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                  </div>
                  <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
                      {passError && <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded text-sm">{passError}</div>}
                      {passSuccess && <div className="bg-green-50 border border-green-100 text-green-600 p-3 rounded text-sm flex items-center gap-2"><CheckCircle size={16}/> {passSuccess}</div>}
                      
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Current Password</label>
                          <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">New Password</label>
                          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Confirm New Password</label>
                          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                      </div>
                      <button type="submit" disabled={isPassLoading} className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-md">
                          {isPassLoading ? <Loader2 className="animate-spin" size={16}/> : 'Update Password'}
                      </button>
                  </form>
              </div>
          </div>
      )}

      <header className="bg-white px-8 py-4 flex justify-between items-center border-b border-slate-200 flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-100 rounded-lg text-yellow-600"><Crown size={24} /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Super Admin</h1>
            <p className="text-xs text-slate-500">Logged in as {user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <button 
                onClick={() => setShowPasswordModal(true)}
                className="bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
            >
                <Lock size={16} /> Password
            </button>
            <button
              onClick={onLogout}
              className="bg-red-50 border border-red-100 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <LogOut size={16} /> Logout
            </button>
        </div>
      </header>
      
      {/* Navigation Tabs */}
      <div className="px-8 pt-6 flex gap-8 border-b border-slate-200 bg-slate-50">
          <button 
            onClick={() => setActiveTab('users')}
            className={`pb-3 px-1 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'users' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
              <Users size={18}/> User Management
          </button>
          <button 
            onClick={() => setActiveTab('plans')}
            className={`pb-3 px-1 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'plans' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
              <SettingsIcon size={18}/> System Configuration
          </button>
      </div>

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          
          {isLoading ? (
            <div className="text-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-primary-600 mx-auto" />
              <p className="text-slate-500 mt-2">Loading data...</p>
            </div>
          ) : error ? (
            <div className="text-center py-20 text-red-500">{error}</div>
          ) : activeTab === 'users' ? (
            // --- USER MANAGEMENT ---
            <div>
                <div className="flex justify-between items-end mb-6">
                   <h2 className="text-2xl font-bold text-slate-900">User Accounts</h2>
                   <span className="text-sm font-medium text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">Total Users: {users.length}</span>
                </div>
                
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase tracking-wider text-xs">Email</th>
                        <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase tracking-wider text-xs">Role</th>
                        <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase tracking-wider text-xs">Plan</th>
                        <th className="px-6 py-4 text-center font-bold text-slate-500 uppercase tracking-wider text-xs">Actions</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                    {users.map((u) => (
                        <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${u.upgradeRequested ? 'bg-yellow-50' : ''}`}>
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-2 font-medium text-slate-700">
                                {u.email}
                                {u.upgradeRequested && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full border border-yellow-200 flex items-center gap-1 font-bold"><Clock size={10}/> Upgrade Requested</span>}
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                u.role === 'superadmin' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                            {u.role}
                            </span>
                        </td>
                        <td className="px-6 py-4">
                            <span className={`flex items-center gap-1.5 font-medium ${
                                u.plan === 'paid' ? 'text-green-600' : 'text-slate-500'
                            }`}>
                            {u.plan === 'paid' ? <BadgeDollarSign size={16} /> : <ShieldCheck size={16} />}
                            {u.plan.charAt(0).toUpperCase() + u.plan.slice(1)}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                            {u.role !== 'superadmin' && (
                                <>
                                    {u.upgradeRequested ? (
                                        <div className="flex justify-center gap-2">
                                            <button 
                                                onClick={() => handlePlanChange(u.id, 'free')}
                                                className="bg-green-100 hover:bg-green-200 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                                                title="Approve Upgrade"
                                            >
                                                <Check size={14}/> Approve
                                            </button>
                                            <button 
                                                onClick={() => handleRejectUpgrade(u.id)}
                                                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                                                title="Reject Request"
                                            >
                                                <XCircle size={14}/> Reject
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handlePlanChange(u.id, u.plan)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                                            u.plan === 'paid' ? 'bg-primary-600' : 'bg-slate-200'
                                            }`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                                            u.plan === 'paid' ? 'translate-x-6' : 'translate-x-1'
                                            }`} />
                                        </button>
                                    )}
                                </>
                            )}
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            </div>
          ) : (
            // --- PLAN CONFIGURATION ---
            settings && (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">Global Plan Limits</h2>
                            <p className="text-slate-500 text-sm">Control resource allocation for all users.</p>
                        </div>
                        <button 
                            onClick={handleSettingsSave}
                            disabled={savingSettings}
                            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-primary-100 transition-all"
                        >
                            {savingSettings ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} Save Configuration
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Free Plan */}
                        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-700"><ShieldCheck size={24} className="text-slate-400"/> Free Plan</h3>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Max Menu Items</label>
                                    <input 
                                        type="number" 
                                        value={settings.plans.free.maxMenuItems} 
                                        onChange={(e) => setSettings({...settings, plans: {...settings.plans, free: {...settings.plans.free, maxMenuItems: parseInt(e.target.value) || 0}}})}
                                        className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none text-slate-800 font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Max Upload Size (MB)</label>
                                    <input 
                                        type="number" 
                                        value={settings.plans.free.maxUploadSizeMB} 
                                        onChange={(e) => setSettings({...settings, plans: {...settings.plans, free: {...settings.plans.free, maxUploadSizeMB: parseInt(e.target.value) || 0}}})}
                                        className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none text-slate-800 font-medium"
                                    />
                                </div>
                                <div className="flex items-center justify-between pt-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <span className="text-sm font-medium text-slate-700">Allow Watermark Removal</span>
                                    <button 
                                        onClick={() => setSettings({...settings, plans: {...settings.plans, free: {...settings.plans.free, canRemoveWatermark: !settings.plans.free.canRemoveWatermark}}})}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.plans.free.canRemoveWatermark ? 'bg-green-500' : 'bg-slate-300'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${settings.plans.free.canRemoveWatermark ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Paid Plan */}
                        <div className="bg-white rounded-xl border-2 border-primary-100 p-6 shadow-md relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 bg-primary-100 text-primary-700 rounded-bl-xl text-[10px] font-bold uppercase tracking-wider">Pro Tier</div>
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-primary-700"><BadgeDollarSign size={24}/> Paid Plan</h3>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Max Menu Items</label>
                                    <input 
                                        type="number" 
                                        value={settings.plans.paid.maxMenuItems} 
                                        onChange={(e) => setSettings({...settings, plans: {...settings.plans, paid: {...settings.plans.paid, maxMenuItems: parseInt(e.target.value) || 0}}})}
                                        className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none text-slate-800 font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Max Upload Size (MB)</label>
                                    <input 
                                        type="number" 
                                        value={settings.plans.paid.maxUploadSizeMB} 
                                        onChange={(e) => setSettings({...settings, plans: {...settings.plans, paid: {...settings.plans.paid, maxUploadSizeMB: parseInt(e.target.value) || 0}}})}
                                        className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none text-slate-800 font-medium"
                                    />
                                </div>
                                <div className="flex items-center justify-between pt-2 p-3 bg-primary-50/50 rounded-lg border border-primary-100">
                                    <span className="text-sm font-medium text-slate-700">Allow Watermark Removal</span>
                                    <button 
                                        onClick={() => setSettings({...settings, plans: {...settings.plans, paid: {...settings.plans.paid, canRemoveWatermark: !settings.plans.paid.canRemoveWatermark}}})}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.plans.paid.canRemoveWatermark ? 'bg-primary-600' : 'bg-slate-300'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${settings.plans.paid.canRemoveWatermark ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )
          )}
        </div>
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
