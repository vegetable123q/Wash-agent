import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyModelHubConfig } from "../api/modelHubConfig";
import { ProfileScreen } from "./ProfileScreen";

describe("ProfileScreen", () => {
  afterEach(() => {
    cleanup();
  });

  it("lets users choose a dorm name without exposing tower keys", () => {
    render(
      <ProfileScreen
        profile={{
          displayName: "",
          dormName: "",
          dormFloor: "",
          latestPickupTime: "22:30",
          allowDryer: false,
          budgetYuan: null,
          maxWaitMinutes: null,
        }}
        modelHubConfig={emptyModelHubConfig}
        backendStatus="connected"
        towerOptions={[
          {
            name: "南区21号楼",
          },
        ]}
        onSave={vi.fn()}
        onSaveModelHubConfig={vi.fn((config) => config)}
        onClearModelHubConfig={vi.fn()}
      />,
    );

    expect(screen.getByRole("option", { name: "南区21号楼" })).toBeInTheDocument();
    expect(screen.queryByText("楼栋编码")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("nq21")).not.toBeInTheDocument();
    expect(screen.queryByText(/cleverschool/)).not.toBeInTheDocument();
    expect(screen.queryByText(/haier/)).not.toBeInTheDocument();
  });

  it("saves a manually entered dorm floor from 1 to 30", () => {
    const onSave = vi.fn();
    render(
      <ProfileScreen
        profile={{
          displayName: "",
          dormName: "南区21号楼",
          dormFloor: "",
          latestPickupTime: "22:30",
          allowDryer: false,
          budgetYuan: null,
          maxWaitMinutes: null,
        }}
        modelHubConfig={emptyModelHubConfig}
        backendStatus="connected"
        towerOptions={[{ name: "南区21号楼" }]}
        onSave={onSave}
        onSaveModelHubConfig={vi.fn((config) => config)}
        onClearModelHubConfig={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("所在楼层"), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: /保存个人信息/ }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ dormFloor: "4" }));
  });

  it("rejects dorm floors outside 1 to 30", () => {
    const onSave = vi.fn();
    render(
      <ProfileScreen
        profile={{
          displayName: "",
          dormName: "南区21号楼",
          dormFloor: "",
          latestPickupTime: "22:30",
          allowDryer: false,
          budgetYuan: null,
          maxWaitMinutes: null,
        }}
        modelHubConfig={emptyModelHubConfig}
        backendStatus="connected"
        towerOptions={[{ name: "南区21号楼" }]}
        onSave={onSave}
        onSaveModelHubConfig={vi.fn((config) => config)}
        onClearModelHubConfig={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("所在楼层"), { target: { value: "31" } });
    fireEvent.click(screen.getByRole("button", { name: /保存个人信息/ }));

    expect(screen.getByText("请输入 1-30 之间的楼层")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("saves optional budget and max wait preferences", () => {
    const onSave = vi.fn();
    render(
      <ProfileScreen
        profile={{
          displayName: "",
          dormName: "南区21号楼",
          dormFloor: "4",
          latestPickupTime: "22:30",
          allowDryer: false,
          budgetYuan: null,
          maxWaitMinutes: null,
        }}
        modelHubConfig={emptyModelHubConfig}
        backendStatus="connected"
        towerOptions={[{ name: "南区21号楼" }]}
        onSave={onSave}
        onSaveModelHubConfig={vi.fn((config) => config)}
        onClearModelHubConfig={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("本次预算（元）"), { target: { value: "8.5" } });
    fireEvent.change(screen.getByLabelText("最大等待（分钟）"), { target: { value: "15" } });
    fireEvent.click(screen.getByRole("button", { name: /保存个人信息/ }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ budgetYuan: 8.5, maxWaitMinutes: 15 }));
  });

  it("saves an edited latest pickup time", () => {
    const onSave = vi.fn();
    render(
      <ProfileScreen
        profile={{
          displayName: "",
          dormName: "南区21号楼",
          dormFloor: "4",
          latestPickupTime: "22:30",
          allowDryer: false,
          budgetYuan: null,
          maxWaitMinutes: null,
        }}
        modelHubConfig={emptyModelHubConfig}
        backendStatus="connected"
        towerOptions={[{ name: "南区21号楼" }]}
        onSave={onSave}
        onSaveModelHubConfig={vi.fn((config) => config)}
        onClearModelHubConfig={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("最晚取衣"), { target: { value: "21:30" } });
    fireEvent.click(screen.getByRole("button", { name: /保存个人信息/ }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ latestPickupTime: "21:30" }));
  });

  it("rejects an empty pickup time instead of silently restoring the default", () => {
    const onSave = vi.fn();
    render(
      <ProfileScreen
        profile={{
          displayName: "",
          dormName: "南区21号楼",
          dormFloor: "4",
          latestPickupTime: "22:30",
          allowDryer: false,
          budgetYuan: null,
          maxWaitMinutes: null,
        }}
        modelHubConfig={emptyModelHubConfig}
        backendStatus="connected"
        towerOptions={[{ name: "南区21号楼" }]}
        onSave={onSave}
        onSaveModelHubConfig={vi.fn((config) => config)}
        onClearModelHubConfig={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("最晚取衣"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /保存个人信息/ }));

    expect(screen.getByText("请输入有效的取衣时间")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });
});
