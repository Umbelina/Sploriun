import React, { useState, useEffect } from 'react';
import { LogOut, Bell } from 'lucide-react';
import { signOut, getUser, getProfile } from '../lib/auth';
import OwnerAvailability from './OwnerAvailability';
import OwnerServices from './OwnerServices';
import OwnerAgenda from './OwnerAgenda';

type TabType = 'disponibilidade' | 'servicos' | 'agenda' | 'notificacoes';

export default function OwnerApp() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>('disponibilidade');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const currentUser = await getUser();
        const currentProfile = await getProfile();
        setUser(currentUser);
        setProfile(currentProfile);
      } catch (err) {
        console.error('Error loading user:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      window.location.href = import.meta.env.BASE_URL;
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  if (!user) {
    const displayName = profile?.display_name || user.email || "Proprietário";
    const tenantId = profile?.tenant_id ?? user.id;
    { activeTab === 'disponibilidade' && <OwnerAvailability tenantId={tenantId} /> }

  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Painel do Proprietário</h1>
            <p className="text-sm text-gray-600">{profile?.display_name || 'Proprietário'}</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 hover:bg-gray-100 rounded-lg" title="Notificações">
              <Bell size={24} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium"
            >
              <LogOut size={18} />
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 flex gap-8">
          {[
            { id: 'disponibilidade', label: 'Disponibilidade' },
            { id: 'servicos', label: 'Serviços' },
            { id: 'agenda', label: 'Agenda' },
            { id: 'notificacoes', label: 'Notificações' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`py-4 font-medium border-b-2 transition ${activeTab === tab.id
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-600 hover:text-black'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'disponibilidade' && <OwnerAvailability tenantId={profile?.tenant_id} />}
        {activeTab === 'servicos' && <OwnerServices tenantId={profile?.tenant_id} />}
        {activeTab === 'agenda' && <OwnerAgenda tenantId={profile?.tenant_id} />}
        {activeTab === 'notificacoes' && (
          <div className="text-center py-12 text-gray-600">Notificações em breve...</div>
        )}
      </main>
    </div>
  );
}
