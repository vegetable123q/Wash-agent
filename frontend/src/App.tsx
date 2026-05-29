import { useEffect, useMemo, useState } from "react";
import {
  clearModelHubConfig,
  loadModelHubConfig,
  saveModelHubConfig,
  type ModelHubConfig,
} from "./api/modelHubConfig";
import { deleteWardrobeItem, fetchMobileSummary, type BackendMachine, type MobileSummary, type WardrobeSummaryItem } from "./api/mobileSummary";
import { BottomNav } from "./components/AppChrome";
import { machines, wardrobeItems, type MachineView, type ScreenId, type TabId, type WardrobeItemView } from "./data/washMateContent";
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

type BackendStatus = "loading" | "connected" | "offline";

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

export default function App() {
  const [screen, setScreen] = useState<ScreenId>("today");
  const [mobileSummary, setMobileSummary] = useState<MobileSummary | null>(null);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>("loading");
  const [userProfile, setUserProfile] = useState<UserProfile>(() => loadUserProfile());
  const [modelHubConfig, setModelHubConfig] = useState<ModelHubConfig>(() => loadModelHubConfig());
  const [selectedClothingId, setSelectedClothingId] = useState("");
  const [selectedMachineId, setSelectedMachineId] = useState("");
  const activeTab = parentTab[screen];

  const goBack = () => setScreen(parentTab[screen]);
  const navigate = (target: ScreenId) => setScreen(target);
  const navigateTab = (tab: TabId) => setScreen(tab);
  const handleProfileSave = (profile: UserProfile) => {
    setUserProfile(saveUserProfile(profile));
  };
  const handleModelHubConfigSave = (config: ModelHubConfig) => {
    const savedConfig = saveModelHubConfig(config);
    setModelHubConfig(savedConfig);
    return savedConfig;
  };
  const handleModelHubConfigClear = () => {
    setModelHubConfig(clearModelHubConfig());
  };
  const viewClothingDetail = (itemId: string) => {
    setSelectedClothingId(itemId);
    setScreen("clothingDetail");
  };
  const viewMachineDetail = (machineId: string) => {
    setSelectedMachineId(machineId);
    setScreen("machineDetail");
  };

  const refreshMobileSummary = async () => {
    setBackendStatus("loading");
    return fetchMobileSummary()
      .then((summary) => {
        setMobileSummary(summary);
        setBackendStatus("connected");
      })
      .catch(() => {
        setBackendStatus("offline");
      });
  };

  const handleDeleteWardrobeItem = async (itemId: string) => {
    await deleteWardrobeItem(itemId);
    if (selectedClothingId === itemId) {
      setSelectedClothingId("");
    }
    await refreshMobileSummary();
  };

  useEffect(() => {
    let active = true;
    setBackendStatus("loading");
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
    const selectedBackendItem: WardrobeSummaryItem | null =
      mobileSummary?.wardrobe.items.find((item) => item.item_id === selectedClothingId) ?? null;
    const selectedStaticItem: WardrobeItemView | null = wardrobeItems.find((item) => item.id === selectedClothingId) ?? null;
    const selectedBackendMachine: BackendMachine | null =
      mobileSummary?.campus_context.all_machines.find((machine) => machine.machine_id === selectedMachineId) ?? null;
    const selectedStaticMachine: MachineView | null = machines.find((machine) => machine.id === selectedMachineId) ?? null;

    switch (screen) {
      case "today":
        return (
          <TodayScreen
            backendStatus={backendStatus}
            mobileSummary={mobileSummary}
            userProfile={userProfile}
            modelHubConfig={modelHubConfig}
            onNavigate={navigate}
          />
        );
      case "planDetail":
        return <PlanDetailScreen onBack={goBack} mobileSummary={mobileSummary} modelHubConfig={modelHubConfig} />;
      case "wardrobe":
        return (
          <WardrobeScreen
            mobileSummary={mobileSummary}
            onNavigate={navigate}
            onViewItem={viewClothingDetail}
            onDeleteItem={handleDeleteWardrobeItem}
          />
        );
      case "addClothing":
        return <AddClothingScreen modelHubConfig={modelHubConfig} onBack={goBack} onSaved={refreshMobileSummary} />;
      case "clothingDetail":
        return <ClothingDetailScreen onBack={goBack} backendItem={selectedBackendItem} staticItem={selectedStaticItem} modelHubConfig={modelHubConfig} />;
      case "laundryRoom":
        return (
          <LaundryRoomScreen
            mobileSummary={mobileSummary}
            userProfile={userProfile}
            onNavigate={navigate}
            onViewMachine={viewMachineDetail}
          />
        );
      case "machineDetail":
        return <MachineDetailScreen onBack={goBack} backendMachine={selectedBackendMachine} staticMachine={selectedStaticMachine} />;
      case "report":
        return <ReportScreen mobileSummary={mobileSummary} />;
      case "profile":
        return (
          <ProfileScreen
            profile={userProfile}
            modelHubConfig={modelHubConfig}
            towerOptions={mobileSummary?.campus_towers ?? []}
            onSave={handleProfileSave}
            onSaveModelHubConfig={handleModelHubConfigSave}
            onClearModelHubConfig={handleModelHubConfigClear}
            backendStatus={backendStatus}
          />
        );
    }
  }, [backendStatus, mobileSummary, modelHubConfig, screen, selectedClothingId, selectedMachineId, userProfile]);

  const isTabScreen = screen === activeTab;

  return (
    <div className="app-shell">
      <div className="phone-frame">
        {content}
        {isTabScreen ? <BottomNav active={activeTab} onNavigate={navigateTab} /> : null}
      </div>
    </div>
  );
}
