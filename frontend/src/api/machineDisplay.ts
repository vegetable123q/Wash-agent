import type { MachineType } from "./types";

interface MachineDisplayInput {
  machine_id?: string | null;
  location?: string | null;
  machine_location?: string | null;
  machine_type?: MachineType | string | null;
}

export function machineDisplayLabel(machine: MachineDisplayInput): string {
  const location = machineDisplayLocation(machine.machine_location ?? machine.location ?? "");
  const typeLabel = machineTypeLabel(machine.machine_type ?? "unknown");
  if (location.endsWith(typeLabel)) {
    return location;
  }
  const number = locationHasPhysicalMachineNumber(location) ? "" : fallbackMachineNumber(machine.machine_id ?? "");
  return `${location}${number}${typeLabel}`;
}

function machineDisplayLocation(location: string): string {
  const compactFloor = location.trim().replace(/\s+(?=[一二三四五六七八九十\d]+层)/g, "");
  const parts = compactFloor.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return compactFloor;
  }
  const withoutRepeatedBuilding = parts.filter((part, index) =>
    !parts.some((other, otherIndex) =>
      otherIndex !== index && /[楼栋]/.test(part) && other.includes(part),
    ),
  );
  if (withoutRepeatedBuilding.length !== parts.length) {
    return withoutRepeatedBuilding.join("");
  }
  if (/[楼栋层号]/.test(compactFloor)) {
    return parts.join("");
  }
  return compactFloor;
}

function locationHasPhysicalMachineNumber(location: string): boolean {
  return /[一二三四五六七八九十\d]+号$/.test(location);
}

function fallbackMachineNumber(machineId: string): string {
  const normalizedId = machineId.trim();
  const suffix = normalizedId.match(/(?:^|[-_\s#])([1-9]\d?)$/);
  return suffix ? `${suffix[1]}号` : "";
}

function machineTypeLabel(machineType: MachineType | string): string {
  const labels: Record<MachineType, string> = {
    standard_washer: "洗衣机",
    shoe_washer: "洗鞋机",
    dryer: "烘干机",
    unknown: "机器",
  };
  return labels[machineType as MachineType] ?? "机器";
}
