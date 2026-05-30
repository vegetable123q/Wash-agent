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
        profile={baseProfile()}
        modelHubConfig={emptyModelHubConfig}
        backendStatus="connected"
        towerOptions={[
          {
            name: "Dorm A",
          },
        ]}
        onSave={vi.fn()}
        onSaveModelHubConfig={vi.fn((config) => config)}
        onClearModelHubConfig={vi.fn()}
      />,
    );

    expect(screen.getByRole("option", { name: "Dorm A" })).toBeInTheDocument();
    expect(screen.queryByDisplayValue("nq21")).not.toBeInTheDocument();
    expect(screen.queryByText(/cleverschool/)).not.toBeInTheDocument();
    expect(screen.queryByText(/haier/)).not.toBeInTheDocument();
  });

  it("saves budget and maximum wait preferences", () => {
    const onSave = vi.fn();
    const { container } = render(
      <ProfileScreen
        profile={baseProfile()}
        modelHubConfig={emptyModelHubConfig}
        backendStatus="connected"
        towerOptions={[]}
        onSave={onSave}
        onSaveModelHubConfig={vi.fn((config) => config)}
        onClearModelHubConfig={vi.fn()}
      />,
    );

    const numberInputs = numberPreferenceInputs(container);
    fireEvent.change(numberInputs[0], { target: { value: "12.5" } });
    fireEvent.change(numberInputs[1], { target: { value: "8" } });
    fireEvent.click(profileSubmitButton(container));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        budgetYuan: 12.5,
        maxWaitMinutes: 8,
      }),
    );
  });

  it("keeps decimal budgets but rejects fractional maximum wait preferences", () => {
    const onSave = vi.fn();
    const { container } = render(
      <ProfileScreen
        profile={baseProfile()}
        modelHubConfig={emptyModelHubConfig}
        backendStatus="connected"
        towerOptions={[]}
        onSave={onSave}
        onSaveModelHubConfig={vi.fn((config) => config)}
        onClearModelHubConfig={vi.fn()}
      />,
    );

    const numberInputs = numberPreferenceInputs(container);
    fireEvent.change(numberInputs[0], { target: { value: "12.5" } });
    fireEvent.change(numberInputs[1], { target: { value: "8.5" } });
    fireEvent.submit(profileSubmitButton(container).closest("form")!);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        budgetYuan: 12.5,
        maxWaitMinutes: null,
      }),
    );
  });

  it("saves zero budget and maximum wait preferences", () => {
    const onSave = vi.fn();
    const { container } = render(
      <ProfileScreen
        profile={baseProfile()}
        modelHubConfig={emptyModelHubConfig}
        backendStatus="connected"
        towerOptions={[]}
        onSave={onSave}
        onSaveModelHubConfig={vi.fn((config) => config)}
        onClearModelHubConfig={vi.fn()}
      />,
    );

    const numberInputs = numberPreferenceInputs(container);
    expect(numberInputs[0].getAttribute("min")).toBe("0");
    expect(numberInputs[1].getAttribute("min")).toBe("0");
    fireEvent.change(numberInputs[0], { target: { value: "0" } });
    fireEvent.change(numberInputs[1], { target: { value: "0" } });
    fireEvent.click(profileSubmitButton(container));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        budgetYuan: 0,
        maxWaitMinutes: 0,
      }),
    );
  });

  it("blocks saving when the latest pickup time is empty", () => {
    const onSave = vi.fn();
    const { container } = render(
      <ProfileScreen
        profile={baseProfile()}
        modelHubConfig={emptyModelHubConfig}
        backendStatus="connected"
        towerOptions={[]}
        onSave={onSave}
        onSaveModelHubConfig={vi.fn((config) => config)}
        onClearModelHubConfig={vi.fn()}
      />,
    );

    const pickupTimeInput = container.querySelector<HTMLInputElement>('input[type="time"]');

    expect(pickupTimeInput).not.toBeNull();
    fireEvent.change(pickupTimeInput!, { target: { value: "" } });
    fireEvent.click(profileSubmitButton(container));

    expect(onSave).not.toHaveBeenCalled();
  });

  it("blocks saving incomplete ModelHub recognition config", () => {
    const onSaveModelHubConfig = vi.fn((config) => config);
    const { container } = render(
      <ProfileScreen
        profile={baseProfile()}
        modelHubConfig={emptyModelHubConfig}
        backendStatus="connected"
        towerOptions={[]}
        onSave={vi.fn()}
        onSaveModelHubConfig={onSaveModelHubConfig}
        onClearModelHubConfig={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("ModelHub baseUrl"), { target: { value: "not a url" } });
    fireEvent.change(screen.getByLabelText("apikey"), { target: { value: "sk-local-test-key" } });
    fireEvent.click(apiSubmitButton(container));

    expect(onSaveModelHubConfig).not.toHaveBeenCalled();
  });
});

function baseProfile() {
  return {
    displayName: "",
    dormName: "",
    latestPickupTime: "22:30",
    allowDryer: false,
    budgetYuan: null,
    maxWaitMinutes: null,
  };
}

function numberPreferenceInputs(container: HTMLElement): NodeListOf<HTMLInputElement> {
  const inputs = container.querySelectorAll<HTMLInputElement>('input[type="number"]');
  expect(inputs).toHaveLength(2);
  return inputs;
}

function profileSubmitButton(container: HTMLElement): HTMLButtonElement {
  return container.querySelector<HTMLButtonElement>('form button[type="submit"]')!;
}

function apiSubmitButton(container: HTMLElement): HTMLButtonElement {
  return container.querySelectorAll<HTMLButtonElement>('form button[type="submit"]')[1]!;
}
