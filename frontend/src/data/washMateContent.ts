export type TabId = "today" | "wardrobe" | "laundryRoom" | "report" | "profile";

export type ScreenId =
  | TabId
  | "planDetail"
  | "addClothing"
  | "clothingDetail"
  | "machineDetail";

export type Tone =
  | "purple"
  | "teal"
  | "blue"
  | "amber"
  | "orange"
  | "red"
  | "soft";

export type ClothingArtKind = "tee" | "hoodie" | "jeans" | "wool" | "bedding" | "sport";

export interface ChipInfo {
  label: string;
  tone: Tone;
}

export interface LaundryItem {
  id: string;
  label: string;
  description: string;
  tone: Tone;
  badge: ChipInfo;
}

export interface BucketPlan {
  id: string;
  title: string;
  machine: string;
  detail: string;
  tags: ChipInfo[];
  accent: Tone;
}

export interface WardrobeItemView {
  id: string;
  name: string;
  art: ClothingArtKind;
  material: string;
  description: string;
  wearCount: number;
  washCount: number;
  tags: ChipInfo[];
  riskTitle: string;
  riskLevel: string;
  recommendation: string;
}

export interface MachineView {
  id: string;
  backendId: string;
  name: string;
  location: string;
  type: string;
  backendType: "standard_washer" | "shoe_washer" | "dryer";
  capacity: string;
  status: "空闲" | "等待" | "故障";
  backendStatus: "available" | "running" | "out_of_service";
  remaining: string;
  detail: string;
  price: string;
  modes: string[];
  provider: "cleverschool" | "haier";
  ruleKey: string;
  tone: Tone;
}

export interface QueueEstimateView {
  machineType: MachineView["backendType"];
  label: string;
  total: number;
  available: number;
  running: number;
  outOfService: number;
  wait: string;
  tone: Tone;
}

export const todaySummary = {
  title: "今晚洗衣",
  subtitle: "雨天，高湿，无阳台，22:30 前取完",
  weatherBadge: "雨 89%",
  recommendedTime: "22:05",
  recommendedLabel: "全部洗完并低温烘干",
  constraints: ["今晚必须干", "无阳台", "高湿 89%", "最晚 22:30"],
  stats: [
    { value: "2 台", label: "标准筒空闲，可先开洗" },
    { value: "12 分", label: "大件机等待后洗床单" },
  ],
  items: [
    {
      id: "light",
      label: "白 T、运动 T 恤",
      description: "快速洗，短时烘干",
      tone: "blue",
      badge: { label: "可机洗", tone: "teal" },
    },
    {
      id: "dark",
      label: "灰卫衣、黑牛仔裤",
      description: "深色分桶，低温烘干",
      tone: "purple",
      badge: { label: "防掉色", tone: "orange" },
    },
    {
      id: "exclude",
      label: "羊毛开衫",
      description: "不进共享机，建议手洗或干洗",
      tone: "red",
      badge: { label: "高风险", tone: "red" },
    },
  ] satisfies LaundryItem[],
};

export const bucketPlans: BucketPlan[] = [
  {
    id: "bucket-light",
    title: "浅色快速洗",
    machine: "A01",
    detail: "白 T、运动 T 恤 · 34 分钟 · 洗衣液 1 瓶盖",
    accent: "blue",
    tags: [
      { label: "洗衣袋", tone: "teal" },
      { label: "短时烘干 30 分", tone: "amber" },
    ],
  },
  {
    id: "bucket-dark",
    title: "深色标准洗",
    machine: "A02",
    detail: "灰卫衣、黑牛仔裤 · 45 分钟 · 翻面洗",
    accent: "purple",
    tags: [
      { label: "不混白色", tone: "orange" },
      { label: "低温烘干 60 分", tone: "amber" },
    ],
  },
  {
    id: "bucket-bedding",
    title: "床单大件洗",
    machine: "C01",
    detail: "大件机 C01 · 1.5 瓶盖 · 不和衣物混洗",
    accent: "orange",
    tags: [{ label: "等 12 分", tone: "amber" }],
  },
];

export const backendPlanSummary = {
  buckets: "4 个洗护批次",
  cost: "预计 ¥24",
  duration: "机器占用约 154 分钟",
  risk: "高风险衣物已单独处理",
  note: "对齐 LaundryPlan 的分桶、费用、时长和 global_warnings 展示口径。",
};

export const campusContext = {
  towerName: "紫荆 1 号楼",
  providerLabel: "CleverSchool + 海乐生活",
  towerKey: "ncrkiz1",
  towerKeys: [
    ["cleverschool", "ncrkiz1"],
    ["haier", "440"],
  ],
  weather: "雨天 · 湿度 89%",
  dryingContext: "无阳台优先低温烘干",
  updatedAt: "更新 1 分钟前",
  recommendation: "标准筒 A02 当前可用；大件机预计 12 分钟后释放，烘干机可作为低温后续档。",
};

export const wardrobeItems: WardrobeItemView[] = [
  {
    id: "white-tee",
    name: "白色纯棉 T 恤",
    art: "tee",
    material: "棉 100%",
    description: "穿 2 次 · 快速洗",
    wearCount: 2,
    washCount: 5,
    tags: [{ label: "常洗", tone: "teal" }],
    riskTitle: "串色风险",
    riskLevel: "低",
    recommendation: "可与浅色运动衣同桶，建议装洗衣袋。",
  },
  {
    id: "gray-hoodie",
    name: "灰色连帽卫衣",
    art: "hoodie",
    material: "棉混纺",
    description: "棉混纺 · 低温烘干",
    wearCount: 5,
    washCount: 2,
    tags: [
      { label: "缩水史", tone: "orange" },
      { label: "低温", tone: "amber" },
    ],
    riskTitle: "高温烘干风险",
    riskLevel: "高",
    recommendation: "深色标准洗，低温烘干或延长悬挂晾干。",
  },
  {
    id: "black-jeans",
    name: "黑色牛仔裤",
    art: "jeans",
    material: "丹宁",
    description: "少洗 · 与浅色分开",
    wearCount: 3,
    washCount: 1,
    tags: [{ label: "掉色", tone: "orange" }],
    riskTitle: "掉色风险",
    riskLevel: "高",
    recommendation: "翻面冷水洗，不和白 T、床单混洗。",
  },
  {
    id: "wool-cardigan",
    name: "羊毛开衫",
    art: "wool",
    material: "羊毛 90%",
    description: "不建议共享机洗",
    wearCount: 4,
    washCount: 1,
    tags: [{ label: "高风险", tone: "red" }],
    riskTitle: "变形缩水风险",
    riskLevel: "高",
    recommendation: "本次排除，建议手洗平铺晾干或送干洗。",
  },
  {
    id: "sport-tee",
    name: "运动速干短袖",
    art: "sport",
    material: "聚酯纤维",
    description: "运动后穿过 · 建议本次洗",
    wearCount: 1,
    washCount: 3,
    tags: [{ label: "急", tone: "orange" }],
    riskTitle: "异味残留",
    riskLevel: "中",
    recommendation: "浅色桶快速洗，短时烘干即可。",
  },
  {
    id: "bedding",
    name: "床单被套",
    art: "bedding",
    material: "棉 100%",
    description: "大件机 · 单独洗",
    wearCount: 1,
    washCount: 4,
    tags: [{ label: "大件", tone: "blue" }],
    riskTitle: "容量风险",
    riskLevel: "中",
    recommendation: "等 C01 大件机，避免塞入标准筒。",
  },
];

export const machines: MachineView[] = [
  {
    id: "A01",
    backendId: "washer-standard-1",
    name: "标准筒 A01",
    location: "紫荆 1 号楼 一层",
    type: "快速/标准",
    backendType: "standard_washer",
    capacity: "8kg",
    status: "空闲",
    backendStatus: "available",
    remaining: "0 分钟",
    detail: "适合浅色快洗 · 距宿舍 2 分钟",
    price: "¥4",
    modes: ["quick", "standard"],
    provider: "cleverschool",
    ruleKey: "washer_types.standard_washer",
    tone: "teal",
  },
  {
    id: "A02",
    backendId: "washer-standard-2",
    name: "标准筒 A02",
    location: "紫荆 1 号楼 二层",
    type: "标准/加强",
    backendType: "standard_washer",
    capacity: "8kg",
    status: "空闲",
    backendStatus: "available",
    remaining: "0 分钟",
    detail: "适合深色厚衣物 · 推荐本次使用",
    price: "¥4",
    modes: ["quick", "standard", "heavy"],
    provider: "cleverschool",
    ruleKey: "washer_types.standard_washer",
    tone: "teal",
  },
  {
    id: "C01",
    backendId: "washer-large-1",
    name: "大件机 C01",
    location: "紫荆 1 号楼 一层",
    type: "大件洗",
    backendType: "standard_washer",
    capacity: "12kg",
    status: "等待",
    backendStatus: "running",
    remaining: "12 分钟",
    detail: "床单被套 · 还需等待 12 分钟",
    price: "¥6",
    modes: ["standard", "heavy"],
    provider: "haier",
    ruleKey: "washer_types.standard_washer",
    tone: "amber",
  },
  {
    id: "A04",
    backendId: "washer-standard-4",
    name: "标准筒 A04",
    location: "紫荆 1 号楼 三层",
    type: "门锁异常",
    backendType: "standard_washer",
    capacity: "8kg",
    status: "故障",
    backendStatus: "out_of_service",
    remaining: "不可用",
    detail: "暂不可用，避开本次方案",
    price: "--",
    modes: [],
    provider: "cleverschool",
    ruleKey: "washer_types.standard_washer",
    tone: "red",
  },
  {
    id: "D01",
    backendId: "dryer-low-1",
    name: "低温烘干 D01",
    location: "紫荆 1 号楼 一层",
    type: "低温烘干",
    backendType: "dryer",
    capacity: "8kg",
    status: "空闲",
    backendStatus: "available",
    remaining: "0 分钟",
    detail: "适合卫衣低温后续 · 避免高温缩水",
    price: "¥2/25分",
    modes: ["low"],
    provider: "haier",
    ruleKey: "dryer_modes.low",
    tone: "purple",
  },
];

export const queueEstimates: QueueEstimateView[] = [
  {
    machineType: "standard_washer",
    label: "标准筒",
    total: 3,
    available: 2,
    running: 0,
    outOfService: 1,
    wait: "0 分钟",
    tone: "teal",
  },
  {
    machineType: "standard_washer",
    label: "大件机",
    total: 1,
    available: 0,
    running: 1,
    outOfService: 0,
    wait: "12 分钟",
    tone: "amber",
  },
  {
    machineType: "dryer",
    label: "烘干机",
    total: 1,
    available: 1,
    running: 0,
    outOfService: 0,
    wait: "0 分钟",
    tone: "purple",
  },
];

export const dryerOptions = [
  { minutes: "30'", label: "薄衣短烘", price: "¥3" },
  { minutes: "60'", label: "厚衣低温", price: "¥5" },
  { minutes: "90'", label: "大件增量", price: "¥7" },
];

export const report = {
  total: "¥24",
  saved: "省 ¥7",
  subtitle: "洗衣 ¥14 · 烘干 ¥10",
  breakdown: [
    ["浅色快洗 A01", "¥4"],
    ["深色标准洗 A02", "¥4"],
    ["床单大件洗 C01", "¥6"],
    ["两次低温/短时烘干", "¥10"],
  ],
  valueTitle: "减少返洗与高温烘坏",
  valueLabel: "明显",
  valueCopy: "牛仔裤不混白 T，卫衣低温烘干，羊毛开衫排除共享机洗。",
  avoided: ["避免白 T 串色", "降低卫衣缩水", "减少床单返洗", "保护羊毛开衫"],
};

export const reportSections = [
  { title: "洗衣步骤", copy: "分桶、程序、洗衣袋和干燥方式" },
  { title: "费用和时间", copy: "预计费用与机器占用时间" },
  { title: "机器环境", copy: "可用机器、天气与晾晒条件" },
  { title: "风险提醒", copy: "串色、缩水、返洗和非机洗提醒" },
];

export const addClothingResult = [
  ["类别", "连帽卫衣"],
  ["材质", "棉混纺 · 推测"],
  ["颜色风险", "深色，避免混白"],
  ["烘干", "仅低温，避免高温"],
];
