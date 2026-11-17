import React, { useState, useEffect, useCallback } from 'react';
import {
  BoardVolunteerOpportunity,
  Community,
  CivicCartItem,
  CivicItem,
  Official,
  Report311,
  UserAlertPreference,
  VolunteerSignup,
  WatchlistEntry,
} from './types';
import { COMMUNITIES, INITIAL_311_REPORTS, OFFICIALS } from './data/mockData';
import {
  auth,
  loginWithGoogle,
  logoutUser,
  checkIsModerator,
  subscribeReports,
  createCloudReport,
  upvoteCloudReport,
  updateCloudReportStatus,
  respondToCloudReport,
  deleteCloudReport,
  subscribeWatchlist,
  addToCloudWatchlist,
  removeFromCloudWatchlist,
  subscribeUserActions,
  createCloudAction,
  completeCloudAction,
  deleteCloudAction,
  subscribeAlertPreferences,
  saveAlertPreferences,
  subscribeVolunteerSignups,
  saveVolunteerSignup,
  removeVolunteerSignup,
} from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomeDiscover } from './components/HomeDiscover';
import { CivicDetailView } from './components/CivicDetailView';
import { CivilsyAI } from './components/CivilsyAI';
import { CivicFix311 } from './components/CivicFix311';
import { OfficialsDirectory } from './components/OfficialsDirectory';
import { CivicsAcademy } from './components/CivicsAcademy';
import { MyDashboard } from './components/MyDashboard';
import { BudgetExplorer } from './components/BudgetExplorer';
import { CivicCartModal } from './components/CivicCartModal';
import { EmailGeneratorModal } from './components/EmailGeneratorModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { OfflineIndicator } from './components/OfflineIndicator';
import { LegalView } from './components/LegalView';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('discover');
  const [selectedCommunity, setSelectedCommunity] = useState<Community>(COMMUNITIES[0]);
  const [locationSource, setLocationSource] = useState<'ip' | 'default' | 'manual'>('default');
  const [detectingLocation, setDetectingLocation] = useState<boolean>(false);
  const [selectedCivicItem, setSelectedCivicItem] = useState<CivicItem | null>(null);
  const [reports, setReports] = useState<Report311[]>(INITIAL_311_REPORTS);
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [civicCart, setCivicCart] = useState<CivicCartItem[]>([]);
  const [volunteerSignups, setVolunteerSignups] = useState<VolunteerSignup[]>([]);
  const [upvotedReportIds, setUpvotedReportIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('civilsy_upvoted_reports');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : ['rep-104'];
    } catch {
      return ['rep-104'];
    }
  });
  const [alertPreference, setAlertPreference] = useState<UserAlertPreference | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [emailOfficial, setEmailOfficial] = useState<Official | null>(null);
  const [aiQuery, setAiQuery] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);
  const [isModerator, setIsModerator] = useState<boolean>(false);
  const [authNotice, setAuthNotice] = useState<string>('');

  const detectLocationFromIp = useCallback(async () => {
    setDetectingLocation(true);
    try {
      const res = await fetch('/api/location/detect');
      if (!res.ok) return;
      const data = await res.json();
      const matched = COMMUNITIES.find((c) => c.id === data.communityId);
      if (matched) {
        setSelectedCommunity(matched);
        setLocationSource(data.detected ? 'ip' : 'default');
      }
    } catch {
      // Keep default Ashtabula City cleanly
    } finally {
      setDetectingLocation(false);
    }
  }, []);

  // IP-based location detection on first load (defaults cleanly to Ashtabula City)
  useEffect(() => {
    detectLocationFromIp();
  }, [detectLocationFromIp]);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setAuthNotice('');
        checkIsModerator(currentUser)
          .then(setIsModerator)
          .catch(() => setIsModerator(false));
      } else {
        setIsModerator(false);
        setWatchlist([]);
        setCivicCart([]);
        setVolunteerSignups([]);
        setAlertPreference(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Public 311 reports live subscription
  useEffect(() => {
    const unsubscribe = subscribeReports((cloudReports) => {
      if (cloudReports.length > 0) {
        setReports([...cloudReports, ...INITIAL_311_REPORTS]);
      } else {
        setReports(INITIAL_311_REPORTS);
      }
    });
    return () => unsubscribe();
  }, []);

  // Signed-in user watchlist, action queue, volunteer signups & alert preferences subscriptions
  useEffect(() => {
    if (!user) return;
    const unsubWatch = subscribeWatchlist(user.uid, (entries) => {
      setWatchlist(entries);
    });
    const unsubActions = subscribeUserActions(user.uid, (actions) => {
      setCivicCart(actions);
    });
    const unsubAlerts = subscribeAlertPreferences(user.uid, (pref) => {
      setAlertPreference(pref);
    });
    const unsubVolunteer = subscribeVolunteerSignups(user.uid, (signups) => {
      setVolunteerSignups(signups);
    });
    return () => {
      unsubWatch();
      unsubActions();
      unsubAlerts();
      unsubVolunteer();
    };
  }, [user]);

  const handleSelectCommunity = (comm: Community) => {
    setSelectedCommunity(comm);
    setLocationSource('manual');
  };

  const handleLogin = async () => {
    setAuthNotice('');
    try {
      await loginWithGoogle();
    } catch {
      setAuthNotice('Google sign-in could not be completed. Please try again.');
    }
  };

  const handleLogout = async () => {
    await logoutUser();
  };

  const handleTabChange = (tab: string) => {
    setSelectedCivicItem(null);
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCivicItem = (item: CivicItem) => {
    setSelectedCivicItem(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreateReport = async (report: Omit<Report311, 'id'>) => {
    await createCloudReport(report);
  };

  const markReportUpvoted = (id: string) => {
    setUpvotedReportIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try {
        localStorage.setItem('civilsy_upvoted_reports', JSON.stringify(next));
      } catch {
        // Ignore storage quota errors
      }
      return next;
    });
  };

  const handleUpvoteReport = async (id: string) => {
    // Seeded baseline items update locally; cloud reports update in Firestore
    if (id.startsWith('rep-')) {
      markReportUpvoted(id);
      setReports((prev) =>
        prev.map((r) => (r.id === id ? { ...r, upvotes: r.upvotes + 1 } : r))
      );
      return;
    }
    if (!user) {
      await handleLogin();
      return;
    }
    markReportUpvoted(id);
    await upvoteCloudReport(id);
  };

  const handleToggleWatchlist = async (item: CivicItem) => {
    if (!user) {
      await handleLogin();
      return;
    }
    const already = watchlist.some((w) => w.itemId === item.id);
    if (already) {
      await removeFromCloudWatchlist(user.uid, item.id);
    } else {
      await addToCloudWatchlist(user.uid, {
        itemId: item.id,
        title: item.title,
        category: item.category,
        status: item.status,
        department: item.department,
      });
    }
  };

  const handleSaveAlertPreference = async (
    pref: Omit<UserAlertPreference, 'userId' | 'updatedAtLabel'>
  ) => {
    if (!user) {
      await handleLogin();
      return;
    }
    await saveAlertPreferences(user.uid, pref);
  };

  const addToCart = async (item: Omit<CivicCartItem, 'id'>) => {
    if (user) {
      await createCloudAction(user.uid, item);
    } else {
      const localItem: CivicCartItem = {
        ...item,
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      };
      setCivicCart((prev) => [localItem, ...prev]);
    }
  };

  const completeAction = async (id: string) => {
    if (user && !id.startsWith('local-')) {
      await completeCloudAction(user.uid, id);
    } else {
      setCivicCart((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'Completed' } : a))
      );
    }
  };

  const removeFromCart = async (id: string) => {
    if (user && !id.startsWith('local-')) {
      await deleteCloudAction(user.uid, id);
    } else {
      setCivicCart((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const handleSaveVolunteerSignup = async (opp: BoardVolunteerOpportunity) => {
    if (!user) {
      await handleLogin();
      return;
    }
    await saveVolunteerSignup(user.uid, {
      opportunityId: opp.id,
      title: opp.title,
      communityName: opp.communityScope,
      kind: opp.kind,
      status: 'Interested',
    });
  };

  const handleRemoveVolunteerSignup = async (opportunityId: string) => {
    if (!user) return;
    await removeVolunteerSignup(user.uid, opportunityId);
  };

  const getResponsibleOfficial = (item: CivicItem): Official => {
    const dept = `${item.department} ${item.title}`.toLowerCase();
    if (dept.includes('auditor') || dept.includes('tax') || dept.includes('reappraisal')) {
      return OFFICIALS.find((o) => o.id === 'off-10') || OFFICIALS[0];
    }
    if (dept.includes('school') || dept.includes('aacs') || item.category === 'School') {
      return OFFICIALS.find((o) => o.id === 'off-9') || OFFICIALS[0];
    }
    if (dept.includes('commissioner')) {
      return OFFICIALS.find((o) => o.id === 'off-11') || OFFICIALS[0];
    }
    if (dept.includes('clerk') || dept.includes('council')) {
      return OFFICIALS.find((o) => o.id === 'off-2') || OFFICIALS[0];
    }
    return OFFICIALS[0];
  };

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-[#071B42] font-sans selection:bg-[#116BFF] selection:text-white flex flex-col justify-between pb-16 lg:pb-0">
      <Navbar
        currentTab={selectedCivicItem ? 'discover' : currentTab}
        setCurrentTab={handleTabChange}
        selectedCommunity={selectedCommunity}
        setSelectedCommunity={handleSelectCommunity}
        locationSource={locationSource}
        detectingLocation={detectingLocation}
        onAutoDetectLocation={detectLocationFromIp}
        civicCart={civicCart}
        setIsCartOpen={setIsCartOpen}
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {authNotice && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-xs font-medium flex items-center justify-between">
            <span>{authNotice}</span>
            <button
              onClick={() => setAuthNotice('')}
              className="text-rose-600 hover:text-rose-900 font-bold ml-4"
            >
              Dismiss
            </button>
          </div>
        )}
        {selectedCivicItem ? (
          <CivicDetailView
            item={selectedCivicItem}
            onBack={() => setSelectedCivicItem(null)}
            user={user}
            isModerator={isModerator}
            onRequireLogin={handleLogin}
            isWatched={watchlist.some((w) => w.itemId === selectedCivicItem.id)}
            onToggleWatchlist={handleToggleWatchlist}
            onAddAction={addToCart}
            onContactOfficial={() => setEmailOfficial(getResponsibleOfficial(selectedCivicItem))}
          />
        ) : (
          <>
            {currentTab === 'discover' && (
              <HomeDiscover
                selectedCommunity={selectedCommunity}
                locationSource={locationSource}
                reports={reports}
                onUpvoteReport={handleUpvoteReport}
                watchlist={watchlist}
                queuedActionsCount={civicCart.filter((a) => a.status !== 'Completed').length}
                onSelectCivicItem={handleSelectCivicItem}
                onAskAIQuery={(q) => {
                  setAiQuery(q);
                  setCurrentTab('ai');
                }}
                setCurrentTab={handleTabChange}
              />
            )}

            {currentTab === 'ai' && (
              <CivilsyAI
                selectedCommunity={selectedCommunity}
                reports={reports}
                onUpvoteReport={handleUpvoteReport}
                onSelectCivicItem={handleSelectCivicItem}
                addToCart={addToCart}
                setCurrentTab={handleTabChange}
                initialQuery={aiQuery}
              />
            )}

            {currentTab === 'fix' && (
              <CivicFix311
                selectedCommunity={selectedCommunity}
                reports={reports}
                upvotedReportIds={upvotedReportIds}
                onCreateReport={handleCreateReport}
                onUpvoteReport={handleUpvoteReport}
                user={user}
                onRequireLogin={handleLogin}
              />
            )}

            {currentTab === 'officials' && (
              <OfficialsDirectory
                selectedCommunity={selectedCommunity}
                onContactOfficial={(off) => setEmailOfficial(off)}
                user={user}
                onRequireLogin={handleLogin}
                volunteerSignups={volunteerSignups}
                onSaveVolunteerSignup={handleSaveVolunteerSignup}
                onRemoveVolunteerSignup={handleRemoveVolunteerSignup}
                onAddToActionQueue={addToCart}
              />
            )}

            {currentTab === 'academy' && <CivicsAcademy />}

            {currentTab === 'budget' && (
              <BudgetExplorer selectedCommunity={selectedCommunity} />
            )}

            {currentTab === 'dashboard' && (
              <MyDashboard
                selectedCommunity={selectedCommunity}
                civicCart={civicCart}
                watchlist={watchlist}
                reportsCount={reports.length}
                reports={reports}
                isModerator={isModerator}
                onUpdateReportStatus={updateCloudReportStatus}
                onRespondToReport={respondToCloudReport}
                onDeleteReport={deleteCloudReport}
                alertPreference={alertPreference}
                onSaveAlertPreference={handleSaveAlertPreference}
                volunteerSignups={volunteerSignups}
                onRemoveVolunteerSignup={handleRemoveVolunteerSignup}
                onSelectCivicItem={handleSelectCivicItem}
                onToggleWatchlist={handleToggleWatchlist}
                onCompleteAction={completeAction}
                onDeleteAction={removeFromCart}
                setCurrentTab={handleTabChange}
                user={user}
                onLogin={handleLogin}
              />
            )}

            {(currentTab === 'privacy' || currentTab === 'terms') && (
              <LegalView
                docType={currentTab}
                onSwitchDoc={(doc) => handleTabChange(doc)}
                onBack={() => handleTabChange('discover')}
              />
            )}
          </>
        )}
      </main>

      <Footer selectedCommunity={selectedCommunity} setCurrentTab={handleTabChange} />

      <CivicCartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={civicCart}
        onCompleteAction={completeAction}
        removeFromCart={removeFromCart}
      />

      <EmailGeneratorModal
        official={emailOfficial}
        onClose={() => setEmailOfficial(null)}
      />

      <MobileBottomNav
        currentTab={selectedCivicItem ? 'discover' : currentTab}
        setCurrentTab={handleTabChange}
      />

      <OfflineIndicator />
    </div>
  );
}

