import type { CampusTowerOption } from "./types";

export type CampusProvider = "cleverschool" | "haier";

export interface CampusTowerDirectoryEntry {
  name: string;
  providerKeys: Partial<Record<CampusProvider, string>>;
}

export const CAMPUS_TOWER_DIRECTORY: CampusTowerDirectoryEntry[] = [
  { name: "南区1号楼", providerKeys: { cleverschool: "xcm0G" } },
  { name: "南区3号楼", providerKeys: { cleverschool: "0066wkb" } },
  { name: "南区4号楼", providerKeys: { cleverschool: "3aldk" } },
  { name: "南区5号楼东", providerKeys: { cleverschool: "rpwwwsy" } },
  { name: "南区5号楼西", providerKeys: { cleverschool: "al78dbx" } },
  { name: "南区7号楼", providerKeys: { cleverschool: "jkiymgm" } },
  { name: "南区8号楼", providerKeys: { cleverschool: "0055wkb" } },
  { name: "南区9号楼", providerKeys: { cleverschool: "u06r9wt", haier: "43750" } },
  { name: "南区10号楼", providerKeys: { cleverschool: "5jrnt1q", haier: "43751" } },
  { name: "南区10号楼北", providerKeys: { cleverschool: "rhalncg" } },
  { name: "南区11号楼", providerKeys: { cleverschool: "1n0dx5a", haier: "43752" } },
  { name: "南区12号楼", providerKeys: { cleverschool: "xcm0ug", haier: "43735" } },
  { name: "南区13号楼", providerKeys: { cleverschool: "x1IJD" } },
  { name: "南区14号楼东", providerKeys: { cleverschool: "4w9neux" } },
  { name: "南区14号楼西", providerKeys: { cleverschool: "71rx42h" } },
  { name: "南区16号楼", providerKeys: { cleverschool: "Ucm54X", haier: "43731" } },
  { name: "南区17号楼", providerKeys: { cleverschool: "Ucm29X" } },
  { name: "南区18号楼", providerKeys: { cleverschool: "wx4gghc", haier: "43733" } },
  { name: "南区19号楼", providerKeys: { cleverschool: "7ld98kx", haier: "43763" } },
  { name: "南区20号楼", providerKeys: { cleverschool: "2ui0lxl" } },
  {
    name: "南区21号楼",
    providerKeys: {
      cleverschool: "97zas64",
      haier: "43762",
    },
  },
  { name: "南区22号楼", providerKeys: { cleverschool: "yxs1ch4", haier: "43761" } },
  { name: "南区23号楼", providerKeys: { cleverschool: "r6d0mgm" } },
  { name: "南区24号楼", providerKeys: { cleverschool: "y6mhpj1" } },
  { name: "南区25号楼", providerKeys: { cleverschool: "hn017ep" } },
  { name: "南区26号楼东", providerKeys: { cleverschool: "nwhstuo" } },
  { name: "南区26号楼西", providerKeys: { cleverschool: "yeybcgx" } },
  { name: "南区27号楼", providerKeys: { cleverschool: "i4g4zyq", haier: "43754" } },
  { name: "南区28号楼", providerKeys: { cleverschool: "mkjbvx0" } },
  { name: "南区28号楼北", providerKeys: { cleverschool: "iwqxt0n" } },
  { name: "南区29号楼", providerKeys: { cleverschool: "0zu3m86", haier: "43759" } },
  { name: "南区30号楼", providerKeys: { haier: "43734" } },
  { name: "南区30号楼东", providerKeys: { cleverschool: "0i180or" } },
  { name: "南区30号楼西", providerKeys: { cleverschool: "am7kmm2" } },
  { name: "南区31号楼", providerKeys: { cleverschool: "am7kmm3", haier: "43768" } },
  { name: "南区32号楼", providerKeys: { cleverschool: "6f2clxw" } },
  { name: "南区33号楼", providerKeys: { cleverschool: "8wgpu8c" } },
  { name: "南区33号楼西", providerKeys: { cleverschool: "8wgpu8c" } },
  { name: "南区34号楼东", providerKeys: { cleverschool: "otp3b4d" } },
  { name: "南区34号楼西", providerKeys: { cleverschool: "lj4k039" } },
  { name: "南区35号楼东", providerKeys: { cleverschool: "ano2rka" } },
  { name: "南区35号楼西", providerKeys: { cleverschool: "w8v814j" } },
  { name: "南区36号楼", providerKeys: { cleverschool: "w8v914j" } },
  { name: "南区37号楼", providerKeys: { cleverschool: "krddtmi" } },
  {
    name: "紫荆1号楼",
    providerKeys: {
      cleverschool: "ncrkiz1",
      haier: "43766",
    },
  },
  { name: "紫荆2号楼", providerKeys: { cleverschool: "rl5sowa", haier: "43765" } },
  { name: "紫荆3号楼", providerKeys: { cleverschool: "kerspue", haier: "43756" } },
  { name: "紫荆4号楼", providerKeys: { cleverschool: "ldycs8x", haier: "43730" } },
  { name: "紫荆5号楼", providerKeys: { cleverschool: "mg1d2lz", haier: "43736" } },
  { name: "紫荆6号楼", providerKeys: { cleverschool: "2hk4fvi", haier: "43729" } },
  { name: "紫荆8号楼2单元", providerKeys: { cleverschool: "kx5btdn" } },
  { name: "紫荆8号楼3单元", providerKeys: { cleverschool: "10opqe9" } },
  { name: "紫荆9号楼", providerKeys: { cleverschool: "7w1mkvs" } },
  { name: "紫荆9号楼2单元", providerKeys: { cleverschool: "0qvbwk5" } },
  { name: "紫荆10号楼", providerKeys: { cleverschool: "1q3bnfs" } },
  { name: "紫荆11号楼2单元", providerKeys: { cleverschool: "1v7589h" } },
  { name: "紫荆11号楼3单元", providerKeys: { cleverschool: "5kkolxf" } },
  { name: "紫荆12号楼3单元", providerKeys: { cleverschool: "jddfg7r" } },
  { name: "紫荆13号楼2单元", providerKeys: { cleverschool: "70ty2x7" } },
  { name: "紫荆14号楼", providerKeys: { cleverschool: "z1vpdxa" } },
  { name: "紫荆15号楼", providerKeys: { cleverschool: "wxnsgh2" } },
  { name: "紫荆16号楼", providerKeys: { haier: "39890" } },
  { name: "紫荆17号楼", providerKeys: { haier: "31921" } },
  { name: "紫荆18号楼", providerKeys: { haier: "43745" } },
  { name: "紫荆18号楼东", providerKeys: { cleverschool: "egr57u3" } },
  { name: "紫荆18号楼西", providerKeys: { cleverschool: "0uoz8sf" } },
  { name: "紫荆19号楼", providerKeys: { haier: "516" } },
  { name: "紫荆20号楼", providerKeys: { cleverschool: "2n1uh7u" } },
  { name: "紫荆21号楼", providerKeys: { haier: "39832" } },
  { name: "紫荆23号楼", providerKeys: { haier: "43721" } },
  { name: "双清公寓北楼", providerKeys: { cleverschool: "rgtkk", haier: "43711" } },
  { name: "双清公寓南楼", providerKeys: { cleverschool: "ocmrx" } },
  { name: "新斋", providerKeys: { cleverschool: "ztcaj5a", haier: "43764" } },
  { name: "清智公寓", providerKeys: { haier: "43772" } },
  { name: "红杉学生公寓", providerKeys: { haier: "440" } },
];

export function listCampusTowerOptions(): CampusTowerOption[] {
  return CAMPUS_TOWER_DIRECTORY.map((tower) => ({ name: tower.name }));
}

export function resolveCampusTowerByName(name: string): CampusTowerDirectoryEntry {
  const normalized = normalizeTowerName(name);
  const match = CAMPUS_TOWER_DIRECTORY.find((tower) => normalizeTowerName(tower.name) === normalized);
  if (!match) {
    throw new Error(`当前宿舍楼未配置机器接口映射: ${name || "未选择"}`);
  }
  return match;
}

function normalizeTowerName(value: string): string {
  return value.replace(/\s+/g, "").trim();
}
