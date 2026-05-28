import { useEffect, useMemo, useRef, useState } from "react";
import {
  clearApiConnectionConfig,
  hasCompleteApiConnectionConfig,
  loadApiConnectionConfig,
  saveApiConnectionConfig,
  type ApiConnectionConfig,
} from "./api/apiConnection";
import { deleteWardrobeItem, fetchMobileSummary, type BackendMachine, type MobileSummary, type WardrobeSummaryItem } from "./api/mobileSummary";
import { BottomNav, StatusBar } from "./components/AppChrome";
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

type BackendStatus = "unconfigured" | "loading" | "connected" | "offline";

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
  const [backendStatus, setBackendStatus] = useState<BackendStatus>("unconfigured");
  const [userProfile, setUserProfile] = useState<UserProfile>(() => loadUserProfile());
  const [apiConfig, setApiConfig] = useState<ApiConnectionConfig>(() => loadApiConnectionConfig());
  const [selectedClothingId, setSelectedClothingId] = useState("");
  const [selectedMachineId, setSelectedMachineId] = useState("");
  const skipAutoRefreshKeyRef = useRef("");
  const activeTab = parentTab[screen];

  const goBack = () => setScreen(parentTab[screen]);
  const navigate = (target: ScreenId) => setScreen(target);
  const navigateTab = (tab: TabId) => setScreen(tab);
  const handleProfileSave = (profile: UserProfile) => {
    setUserProfile(saveUserProfile(profile));
  };
  const handleApiConfigSave = (config: ApiConnectionConfig, options: { skipAutoRefresh?: boolean } = {}) => {
    const savedConfig = saveApiConnectionConfig(config);
    if (options.skipAutoRefresh) {
      skipAutoRefreshKeyRef.current = apiConfigKey(savedConfig);
    }
    setApiConfig(savedConfig);
    return savedConfig;
  };
  const handleApiConfigClear = () => {
    setApiConfig(clearApiConnectionConfig());
    setMobileSummary(null);
    setBackendStatus("unconfigured");
  };
  const viewClothingDetail = (itemId: string) => {
    setSelectedClothingId(itemId);
    setScreen("clothingDetail");
  };
  const viewMachineDetail = (machineId: string) => {
    setSelectedMachineId(machineId);
    setScreen("machineDetail");
  };

  const refreshMobileSummary = async (configOverride: ApiConnectionConfig = apiConfig) => {
    if (!hasCompleteApiConnectionConfig(configOverride)) {
      setMobileSummary(null);
      setBackendStatus("unconfigured");
      return;
    }
    setBackendStatus("loading");
    return fetchMobileSummary(configOverride)
      .then((summary) => {
        setMobileSummary(summary);
        setBackendStatus("connected");
      })
      .catch(() => {
        setBackendStatus("offline");
      });
  };

  const handleDeleteWardrobeItem = async (itemId: string) => {
    await deleteWardrobeItem(itemId, apiConfig);
    if (selectedClothingId === itemId) {
      setSelectedClothingId("");
    }
    await refreshMobileSummary();
  };

  useEffect(() => {
    let active = true;
    if (!hasCompleteApiConnectionConfig(apiConfig)) {
      setMobileSummary(null);
      setBackendStatus("unconfigured");
      return () => {
        active = false;
      };
    }
    const currentConfigKey = apiConfigKey(apiConfig);
    if (skipAutoRefreshKeyRef.current === currentConfigKey) {
      skipAutoRefreshKeyRef.current = "";
      return () => {
        active = false;
      };
    }
    setBackendStatus("loading");
    fetchMobileSummary(apiConfig)
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
  }, [apiConfig]);

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
            onNavigate={navigate}
          />
        );
      case "planDetail":
        return <PlanDetailScreen onBack={goBack} mobileSummary={mobileSummary} />;
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
        return <AddClothingScreen apiConfig={apiConfig} onBack={goBack} onSaved={refreshMobileSummary} />;
      case "clothingDetail":
        return <ClothingDetailScreen onBack={goBack} backendItem={selectedBackendItem} staticItem={selectedStaticItem} />;
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
            apiConfig={apiConfig}
            towerOptions={mobileSummary?.campus_towers ?? []}
            onSave={handleProfileSave}
            onSaveApiConfig={handleApiConfigSave}
            onClearApiConfig={handleApiConfigClear}
            backendStatus={backendStatus}
            onTestApiConnection={refreshMobileSummary}
          />
        );
    }
  }, [apiConfig, backendStatus, mobileSummary, screen, selectedClothingId, selectedMachineId, userProfile]);

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

function apiConfigKey(config: ApiConnectionConfig): string {
  return `${config.baseUrl}\n${config.apikey}`;
}
