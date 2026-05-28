import { useEffect, useMemo, useState } from "react";
import { fetchMobileSummary, type MobileSummary } from "./api/mobileSummary";
import { BottomNav, StatusBar } from "./components/AppChrome";
import type { ScreenId, TabId } from "./data/washMateContent";
import { AddClothingScreen } from "./screens/AddClothingScreen";
import { ClothingDetailScreen } from "./screens/ClothingDetailScreen";
import { LaundryRoomScreen } from "./screens/LaundryRoomScreen";
import { MachineDetailScreen } from "./screens/MachineDetailScreen";
import { PlanDetailScreen } from "./screens/PlanDetailScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { ReportScreen } from "./screens/ReportScreen";
import { TodayScreen } from "./screens/TodayScreen";
import { WardrobeScreen } from "./screens/WardrobeScreen";
import { loadUserProfile, saveUserProfile, type UserProfile } from "./userProfile";

const parentTab: Record<ScreenId, TabId> = {
  today: "today",
  wardrobe: "wardrobe",
  laundryRoom: "laundryRoom",
  report: "report",
  profile: "profile",
  planDetail: "today",
  addClothing: "wardrobe",
  clothingDetail: "wardrobe",
  machineDetail: "laundryRoom",
};

const screenTime: Record<ScreenId, string> = {
  today: "21:08",
  planDetail: "21:09",
  wardrobe: "21:10",
  addClothing: "21:11",
  clothingDetail: "21:12",
  laundryRoom: "21:13",
  machineDetail: "21:14",
  report: "21:15",
  profile: "21:16",
};

export default function App() {
  const [screen, setScreen] = useState<ScreenId>("today");
  const [mobileSummary, setMobileSummary] = useState<MobileSummary | null>(null);
  const [backendStatus, setBackendStatus] = useState<"loading" | "connected" | "offline">("loading");
  const [userProfile, setUserProfile] = useState<UserProfile>(() => loadUserProfile());
  const activeTab = parentTab[screen];

  const goBack = () => setScreen(parentTab[screen]);
  const navigate = (target: ScreenId) => setScreen(target);
  const navigateTab = (tab: TabId) => setScreen(tab);
  const handleProfileSave = (profile: UserProfile) => {
    setUserProfile(saveUserProfile(profile));
  };

  const refreshMobileSummary = async () => {
    return fetchMobileSummary()
      .then((summary) => {
        setMobileSummary(summary);
        setBackendStatus("connected");
      })
      .catch(() => {
        setBackendStatus("offline");
      });
  };

  useEffect(() => {
    let active = true;
    fetchMobileSummary()
      .then((summary) => {
        if (!active) {
          return;
        }
        setMobileSummary(summary);
        setBackendStatus("connected");
      })
      .catch(() => {
        if (active) {
          setBackendStatus("offline");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const content = useMemo(() => {
    switch (screen) {
      case "today":
        return (
          <TodayScreen
            backendStatus={backendStatus}
            mobileSummary={mobileSummary}
            userProfile={userProfile}
            onNavigate={navigate}
          />
        );
      case "planDetail":
        return <PlanDetailScreen onBack={goBack} />;
      case "wardrobe":
        return <WardrobeScreen mobileSummary={mobileSummary} onNavigate={navigate} />;
      case "addClothing":
        return <AddClothingScreen onBack={goBack} onSaved={refreshMobileSummary} />;
      case "clothingDetail":
        return <ClothingDetailScreen onBack={goBack} />;
      case "laundryRoom":
        return <LaundryRoomScreen mobileSummary={mobileSummary} userProfile={userProfile} onNavigate={navigate} />;
      case "machineDetail":
        return <MachineDetailScreen onBack={goBack} />;
      case "report":
        return <ReportScreen mobileSummary={mobileSummary} />;
      case "profile":
        return <ProfileScreen profile={userProfile} onSave={handleProfileSave} />;
    }
  }, [backendStatus, mobileSummary, screen, userProfile]);

  const isTabScreen = screen === activeTab;

  return (
    <div className="app-shell">
      <div className="phone-frame">
        <StatusBar time={screenTime[screen]} />
        {content}
        {isTabScreen ? <BottomNav active={activeTab} onNavigate={navigateTab} /> : null}
      </div>
    </div>
  );
}
