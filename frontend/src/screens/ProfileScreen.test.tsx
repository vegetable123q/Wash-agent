import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { emptyModelHubConfig } from "../api/modelHubConfig";
import { ProfileScreen } from "./ProfileScreen";

describe("ProfileScreen", () => {
  it("lets users choose a dorm name without exposing tower keys", () => {
    render(
      <ProfileScreen
        profile={{
          displayName: "",
          dormName: "",
          latestPickupTime: "22:30",
          allowDryer: false,
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
});
