import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TopBar } from "./AppChrome";

describe("TopBar", () => {
  it("renders the back action as a floating top-left control", () => {
    const onBack = vi.fn();

    render(<TopBar title="详情" onBack={onBack} />);

    const button = screen.getByRole("button", { name: "返回" });
    expect(button).toHaveClass("floating-back-button");
    fireEvent.click(button);
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
