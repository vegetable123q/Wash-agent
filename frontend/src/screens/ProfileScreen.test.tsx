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

  it("saves budget and maximum wait preferences", () => {
    const onSave = vi.fn();

    render(
      <ProfileScreen
        profile={{
          displayName: "",
          dormName: "",
          latestPickupTime: "22:30",
          allowDryer: false,
          budgetYuan: null,
          maxWaitMinutes: null,
        }}
        modelHubConfig={emptyModelHubConfig}
        backendStatus="connected"
        towerOptions={[]}
        onSave={onSave}
        onSaveModelHubConfig={vi.fn((config) => config)}
        onClearModelHubConfig={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("本次预算上限（元）"), { target: { value: "12.5" } });
    fireEvent.change(screen.getByLabelText("最大等待时间（分钟）"), { target: { value: "8" } });
    fireEvent.click(screen.getByRole("button", { name: /保存个人信息/ }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        budgetYuan: 12.5,
        maxWaitMinutes: 8,
      }),
    );
  });
});
