import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import SafetyDialog from "./SafetyDialog";
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
test("requires a meaningful reason and preserves failed submissions for retry", async () => {
  const confirm = jest.fn().mockRejectedValue({
    response: { data: { message: "Unable to submit report" } },
  });
  const close = jest.fn();
  render(
    <SafetyDialog
      title="Why are you reporting this user?"
      report
      confirmLabel="Submit report"
      onConfirm={confirm}
      onClose={close}
    />
  );
  const button = screen.getByRole("button", { name: "Submit report" });
  expect(button).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Reason (required)"), {
    target: { value: "   " },
  });
  expect(button).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Reason (required)"), {
    target: { value: "  Harassment  " },
  });
  fireEvent.click(button);
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Unable to submit report"
    )
  );
  expect(confirm).toHaveBeenCalledWith("Harassment");
  expect(close).not.toHaveBeenCalled();
  confirm.mockResolvedValue(undefined);
  fireEvent.click(button);
  await waitFor(() => expect(close).toHaveBeenCalled());
});
test("cancel never performs the destructive action", () => {
  const confirm = jest.fn();
  const close = jest.fn();
  render(
    <SafetyDialog
      title="Delete all messages?"
      confirmLabel="Delete"
      onConfirm={confirm}
      onClose={close}
    />
  );
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(close).toHaveBeenCalled();
  expect(confirm).not.toHaveBeenCalled();
});
