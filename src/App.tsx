import React from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { BottomNav } from './components/layout/BottomNav';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { LoginScreen } from './components/auth/LoginScreen';
import { ForceChangePasswordModal } from './components/auth/ForceChangePasswordModal';
import { NewMemberModal } from './components/team/NewMemberModal';
import { Dashboard } from './components/screens/Dashboard';
import { MySchedule } from './components/screens/MySchedule';
import { SchedulesScreen } from './components/screens/SchedulesScreen';
import { SetlistsScreen } from './components/screens/SetlistsScreen';
import { SongsScreen } from './components/screens/SongsScreen';
import { TeamScreen } from './components/screens/TeamScreen';
import { AvailabilityScreen } from './components/screens/AvailabilityScreen';
import { NotificationsScreen } from './components/screens/NotificationsScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';

const AppContent: React.FC = () => {
  const {
    isAuthenticated,
    mustChangePassword,
    activeTab,
    openNewMemberModal,
    setOpenNewMemberModal,
  } = useApp();

  // If not authenticated, show Mobile-First Login Screen
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  const renderScreen = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'minha-escala':
        return <MySchedule />;
      case 'escalas':
        return <SchedulesScreen />;
      case 'repertorios':
        return <SetlistsScreen />;
      case 'louvores':
        return <SongsScreen />;
      case 'equipe':
        return <TeamScreen />;
      case 'disponibilidade':
        return <AvailabilityScreen />;
      case 'notificacoes':
        return <NotificationsScreen />;
      case 'configuracoes':
        return <SettingsScreen />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors selection:bg-indigo-500 selection:text-white relative">
      {/* Obligatory Password Change Modal on 1st access or reset */}
      {mustChangePassword && <ForceChangePasswordModal />}

      {/* Global New Member Modal for Master Admin */}
      <NewMemberModal
        isOpen={openNewMemberModal}
        onClose={() => setOpenNewMemberModal(false)}
      />

      {/* Offline Indicator Alert */}
      <OfflineIndicator />

      {/* Main Top Header */}
      <Header />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Main View Area */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          {renderScreen()}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
