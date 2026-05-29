import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearModelHubConfig,
  hasCompleteModelHubConfig,
  loadModelHubConfig,
  saveModelHubConfig,
} from "./modelHubConfig";

describe("modelHubConfig persistence", () => {
  beforeEach(() => {
    clearModelHubConfig();
    localStorage.clear();
  });

  it("saves the apikey locally and loads it after app restart", async () => {
    const saved = saveModelHubConfig({
      baseUrl: "https://modelhub.ailemac.com/v1beta/",
      apikey: "sk-local-test-key",
      model_name: "gemini-3.1-pro-preview",
    });

    expect(saved).toEqual({
      baseUrl: "https://modelhub.ailemac.com/v1beta",
      apikey: "sk-local-test-key",
      model_name: "gemini-3.1-pro-preview",
    });
    expect(loadModelHubConfig()).toEqual(saved);
    expect(allLocalStorageValues()).toContain("sk-local-test-key");

    vi.resetModules();
    const reloaded = await import("./modelHubConfig");
    expect(reloaded.loadModelHubConfig()).toEqual(saved);
  });

  it("clears the locally saved apikey", () => {
    saveModelHubConfig({
      baseUrl: "https://modelhub.ailemac.com/v1beta",
      apikey: "sk-local-test-key",
      model_name: "gemini-3.1-pro-preview",
    });

    clearModelHubConfig();

    expect(loadModelHubConfig().apikey).toBe("");
    expect(JSON.stringify(localStorage)).not.toContain("sk-local-test-key");
  });

  it("does not return a stale in-memory config after localStorage is cleared externally", () => {
    saveModelHubConfig({
      baseUrl: "https://modelhub.ailemac.com/v1beta",
      apikey: "sk-local-test-key",
      model_name: "gemini-3.1-pro-preview",
    });

    localStorage.clear();

    expect(loadModelHubConfig().apikey).toBe("");
  });

  it("does not treat malformed baseUrl values as complete config", () => {
    expect(
      hasCompleteModelHubConfig({
        baseUrl: "not a url",
        apikey: "sk-local-test-key",
        model_name: "gemini-3.1-pro-preview",
      }),
    ).toBe(false);
  });

  it("does not treat whitespace-only apikey values as complete config", () => {
    expect(
      hasCompleteModelHubConfig({
        baseUrl: "https://modelhub.ailemac.com/v1beta",
        apikey: "   ",
        model_name: "gemini-3.1-pro-preview",
      }),
    ).toBe(false);
  });

  it("trims supported model names before validation", () => {
    const saved = saveModelHubConfig({
      baseUrl: "https://modelhub.ailemac.com/v1beta",
      apikey: "sk-local-test-key",
      model_name: " gemini-3.1-pro-preview ",
    });

    expect(saved.model_name).toBe("gemini-3.1-pro-preview");
    expect(hasCompleteModelHubConfig(saved)).toBe(true);
  });
});

function allLocalStorageValues(): string {
  const values: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key) {
      values.push(localStorage.getItem(key) ?? "");
    }
  }
  return values.join("\n");
}
