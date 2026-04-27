# Implementation Plan: Standalone Multi-Window Bot Mode

This plan separates "Bot Mode" from the standard extraction flow. We will create a dedicated bot building interface that supports interacting with multiple applications in a single sequence.

## User Review Required

> [!IMPORTANT]
> **Separation of Concerns**
> - The **Calibration Wizard** will be reverted to focus ONLY on "Search Mode" extraction. This fixes the crash and simplifies the UI.
> - A new **Bot Builder Dialog** will be created for automation sequences.
> - The **Main Window** will feature two distinct configuration buttons:
>   1. "Launch Calibration Wizard" (for ID-based extraction)
>   2. "🤖 Configure Bot Mode" (for multi-app continuous loops)

> [!IMPORTANT]
> **Multi-Window Support**
> - Bot actions will no longer be restricted to the "Selected Window" in the main panel.
> - Each action can optionally be assigned a specific window to focus before execution.

## Proposed Changes

### [Models]

#### [MODIFY] [profile.py](file:///home/eisen/Downloads/Otumisyon/desktop_helper/app/models/profile.py)
- Update `BotAction` to add `target_window_title: Optional[str]`.
- Ensure `ApplicationProfile` allows null `window_title_match` if `extraction_mode == bot_mode`.

### [Main UI]

#### [MODIFY] [main_window.py](file:///home/eisen/Downloads/Otumisyon/desktop_helper/app/ui/main_window.py)
- Add "🤖 Configure Bot Mode →" button below the Calibration button.
- Revert `_launch_calibration` to its original stable state (for Search Mode).
- Add `_launch_bot_builder` to open the new standalone dialog.

#### [MODIFY] [calibration_wizard.py](file:///home/eisen/Downloads/Otumisyon/desktop_helper/app/ui/calibration_wizard.py)
- **[FIX]** Correct indentation on `_go_next` and following methods.
- Revert all Bot-specific steps and logic to restore a clean Search calibration flow.

### [New Bot Builder]

#### [NEW] [bot_builder.py](file:///home/eisen/Downloads/Otumisyon/desktop_helper/app/ui/bot_builder.py)
- Create `BotBuilderDialog`:
  - Profile name input.
  - A sequence list where users can add steps.
  - **Click Action**: Lets user pick a window from a dropdown + record coordinate.
  - **Hotkey Action**: Pick target window + keyboard combo.
  - **Wait Action**: (Includes the Universal + Random timing from the previous plan).

### [Automation Engine]

#### [MODIFY] [automation_engine.py](file:///home/eisen/Downloads/Otumisyon/desktop_helper/app/services/automation_engine.py)
- Update `_execute_bot_action`:
  - If `action.target_window_title` is set, use `find_window_by_title` and `focus_window` before the click/hotkey.

## Verification Plan

### Automated Tests
- Create a test case where a bot sequence targets two different mock windows.
- Verify that `focus_window` is called with the specific info for each action.

### Manual Verification
- Open the Bot Builder without selecting any window in the left panel.
- Record a click in one window (e.g., Excel) and an Alt+Tab/Click in another.
- Verify the sequence runs across both applications.
