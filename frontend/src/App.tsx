import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clearModelHubConfig,
  loadModelHubConfig,
  saveModelHubConfig,
  type ModelHubConfig,
} from "./api/modelHubConfig";
import { deleteWardrobeItem, fetchMobileSummary, rebuildMobileSummaryForSelection, setLaundrySelection, type BackendMachine, type MobileSummary, type WardrobeSummaryItem } from "./api/mobileSummary";
import { BottomNav } from "./components/AppChrome";
import { machines, wardrobeItems, type MachineView, type ScreenId, type TabId, type WardrobeItemView } from "./data/washMateContent";
import { AddClothingScreen } from "./screens/AddClothingScreen";
import { ClothingDetailScreen } from "./screens/ClothingDetailScreen";
import { DirtyBasketScreen } from "./screens/DirtyBasketScreen";
import { LaundryRoomScreen } from "./screens/LaundryRoomScreen";
import { MachineDetailScreen } from "./screens/MachineDetailScreen";
import { PlanDetailScreen } from "./screens/PlanDetailScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { ReportScreen } from "./screens/ReportScreen";
import { TodayScreen } from "./screens/TodayScreen";
import { WardrobeScreen } from "./screens/WardrobeScreen";
import { loadUserProfile, saveUserProfile, type UserProfile } from "./userProfile";

type BackendStatus = "loading" | "connected" | "offline";
type RefreshState = {
  isRefreshing: boolean;
  error: string | null;
};

const GENERIC_REFRESH_ERROR = "刷新失败，请稍后重试";

const parentTab: Record<ScreenId, TabId> = {
  today: "today",
  wardrobe: "wardrobe",
  laundryRoom: "laundryRoom",
  report: "report",
  profile: "profile",
  planDetail: "today",
  dirtyBasket: "today",
  addClothing: "wardrobe",
  clothingDetail: "wardrobe",
  machineDetail: "laundryRoom",
};

function isScreenId(value: unknown): value is ScreenId {
  return typeof value === "string" && value in parentTab;
}

function refreshErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.startsWith("本地")) {
    return error.message;
  }
  return GENERIC_REFRESH_ERROR;
}

export default function App() {
  const [screen, setScreen] = useState<ScreenId>("today");
  const screenRef = useRef<ScreenId>("today");
  const contextualBackTargetsRef = useRef<Partial<Record<ScreenId, ScreenId>>>({});
  const [mobileSummary, setMobileSummary] = useState<MobileSummary | null>(null);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>("loading");
  const [refreshState, setRefreshState] = useState<RefreshState>({ isRefreshing: false, error: null });
  const [userProfile, setUserProfile] = useState<UserProfile>(() => loadUserProfile());
  const [modelHubConfig, setModelHubConfig] = useState<ModelHubConfig>(() => loadModelHubConfig());
  const [selectedClothingId, setSelectedClothingId] = useState("");
  const [selectedMachineId, setSelectedMachineId] = useState("");
  const activeTab = parentTab[screen];

  const replaceHistoryScreen = (target: ScreenId) => {
    if (typeof window === "undefined") {
      return;
    }
    window.history.replaceState({ washmate: true, screen: target }, "");
  };

  const pushHistoryScreen = (target: ScreenId) => {
    if (typeof window === "undefined") {
      return;
    }
    window.history.pushState({ washmate: true, screen: target }, "");
  };

  const setScreenWithHistory = (target: ScreenId, historyMode: "push" | "replace" = "push") => {
    const current = screenRef.current;
    if (historyMode === "push" && target !== current && target !== parentTab[target]) {
      contextualBackTargetsRef.current[target] = current;
    }
    screenRef.current = target;
    setScreen(target);
    if (target === current) {
      return;
    }
    if (historyMode === "replace") {
      replaceHistoryScreen(target);
    } else {
      pushHistoryScreen(target);
    }
  };

  const goBack = () => {
    const current = screenRef.current;
    const target = contextualBackTargetsRef.current[current] ?? parentTab[current];
    delete contextualBackTargetsRef.current[current];
    setScreenWithHistory(target, "replace");
  };
  const navigate = (target: ScreenId) => setScreenWithHistory(target);
  const navigateTab = (tab: TabId) => setScreenWithHistory(tab);
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
    setScreenWithHistory("clothingDetail");
  };
  const viewMachineDetail = (machineId: string) => {
    setSelectedMachineId(machineId);
    setScreenWithHistory("machineDetail");
  };

  const refreshMobileSummary = useCallback(async (): Promise<void> => {
    setRefreshState({ isRefreshing: true, error: null });
    if (!mobileSummary) {
      setBackendStatus("loading");
    }
    try {
      const summary = await fetchMobileSummary(userProfile);
      setMobileSummary(summary);
      setBackendStatus("connected");
      setRefreshState({ isRefreshing: false, error: null });
    } catch (error) {
      if (!mobileSummary) {
        setBackendStatus("offline");
      }
      setRefreshState({ isRefreshing: false, error: refreshErrorMessage(error) });
    }
  }, [mobileSummary, userProfile]);

  const handleDeleteWardrobeItem = async (itemId: string) => {
    await deleteWardrobeItem(itemId);
    if (selectedClothingId === itemId) {
      setSelectedClothingId("");
    }
    await refreshMobileSummary();
  };

  const handleToggleLaundrySelection = async (itemId: string) => {
    if (!mobileSummary) {
      return;
    }
    const selected = new Set(mobileSummary?.selected_laundry_item_ids ?? []);
    if (selected.has(itemId)) {
      selected.delete(itemId);
    } else {
      selected.add(itemId);
    }
    const result = await setLaundrySelection([...selected]);
    setMobileSummary((current) =>
      current ? rebuildMobileSummaryForSelection(current, result.selected_item_ids, userProfile) : current,
    );
  };

  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  useEffect(() => {
    replaceHistoryScreen(screenRef.current);
    const handlePopState = (event: PopStateEvent) => {
      const stateScreen = event.state?.washmate && isScreenId(event.state.screen) ? event.state.screen : null;
      const target = stateScreen ?? parentTab[screenRef.current];
      screenRef.current = target;
      setScreen(target);
      if (!stateScreen) {
        replaceHistoryScreen(target);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    let active = true;
    setBackendStatus("loading");
    setRefreshState((current) => ({ ...current, error: null }));
    fetchMobileSummary(userProfile)
      .then((summary) => {
        if (!active) {
          return;
        }
        setMobileSummary(summary);
        setBackendStatus("connected");
        setRefreshState({ isRefreshing: false, error: null });
      })
      .catch((error) => {
        if (active) {
          setBackendStatus("offline");
          setRefreshState({ isRefreshing: false, error: refreshErrorMessage(error) });
        }
      });
    return () => {
      active = false;
    };
  }, [userProfile]);

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
            isRefreshing={refreshState.isRefreshing}
            refreshError={refreshState.error}
            onNavigate={navigate}
            onRefresh={refreshMobileSummary}
          />
        );
      case "planDetail":
        return <PlanDetailScreen onBack={goBack} mobileSummary={mobileSummary} modelHubConfig={modelHubConfig} />;
      case "dirtyBasket":
        return (
          <DirtyBasketScreen
            mobileSummary={mobileSummary}
            onBack={goBack}
            onNavigate={navigate}
            onToggleItem={handleToggleLaundrySelection}
          />
        );
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
            isRefreshing={refreshState.isRefreshing}
            refreshError={refreshState.error}
            onNavigate={navigate}
            onViewMachine={viewMachineDetail}
            onRefresh={refreshMobileSummary}
          />
        );
      case "machineDetail":
        return (
          <MachineDetailScreen
            onBack={goBack}
            backendMachine={selectedBackendMachine}
            staticMachine={selectedStaticMachine}
            pricingRules={mobileSummary?.campus_context.pricing_rules}
          />
        );
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
  }, [backendStatus, mobileSummary, modelHubConfig, refreshMobileSummary, refreshState, screen, selectedClothingId, selectedMachineId, userProfile]);

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
