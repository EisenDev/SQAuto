# Implementation Plan: Bot Mode (Clicker + Alt-Tab + Loop)

This plan adds a new "Bot Mode" to the Desktop Helper. Unlike Search Mode (which is for systematic data extraction), Bot Mode allows users to define a sequence of actions—clicks, keystrokes (Alt+Tab), and delays—that can be repeated in a loop.

## User Review Required

> [!IMPORTANT]
> **New Feature: Bot Mode**
> We are adding a new operation mode. A profile will now be either a **Search Mode** profile (for data extraction) or a **Bot Mode** profile (for automation loops).
>
> 1. **Alt+Tab Reliability**: On Linux (X11), Alt+Tab behavior depends on the window manager. We will provide a configurable delay after tabbing to ensure the system is ready.
> 2. **Looping**: We will support both "Fixed Number of Loops" and "Infinite Loop" (stopped by the Stop button).
> 3. **Changeable Delay**: Users will be able to set a global delay between steps or per-step delays.

## Proposed Changes

### [Models]

#### [MODIFY] [profile.py](file:///home/eisen/Downloads/Otumisyon/desktop_helper/app/models/profile.py)
- Add `EXTRACTION_MODE_BOT = "bot_mode"`
- Add `BotAction` dataclass (type: `click` | `hotkey` | `delay`, coordinates, keys, duration).
- Add `bot_actions: List[BotAction]` to `ApplicationProfile`.

### [Automation Engine]

#### [MODIFY] [automation_engine.py](file:///home/eisen/Downloads/Otumisyon/desktop_helper/app/services/automation_engine.py)
- Refactor to handle `bot_mode`.
- Implement `_run_bot_loop()` logic:
  - Focus target window.
  - Execute sequence of actions.
  - Optional `Alt+Tab` using `pyautogui.hotkey('alt', 'tab')`.
  - Handle loop counts.

### [UI Components]

#### [MODIFY] [calibration_wizard.py](file:///home/eisen/Downloads/Otumisyon/desktop_helper/app/ui/calibration_wizard.py)
- Add mode selection in Step 1 (Search Mode vs. Bot Mode).
- If Bot Mode is selected, Step 2 becomes a "Sequence Builder" where users can add steps:
  - Add Click (and capture point).
  - Add Alt+Tab.
  - Add Wait (ms).
- Update Review step to show the recorded sequence.

#### [MODIFY] [extraction_panel.py](file:///home/eisen/Downloads/Otumisyon/desktop_helper/app/ui/extraction_panel.py)
- Switch UI between "Extraction Mode" (Keys Input) and "Bot Mode" (Loop Settings).
- Add "Loop Count" spinbox (0 = infinite).
- Add "Global Step Delay" field.

### [Profile Service]

#### [MODIFY] [profile_service.py](file:///home/eisen/Downloads/Otumisyon/desktop_helper/app/services/profile_service.py)
- Update deserialization to handle `BotAction` objects.

## Verification Plan

### Automated Tests
- Test saving/loading profiles with `bot_actions`.
- Test `AutomationEngine` in `bot_mode` with mocked pyautogui calls.
- Verify infinite loop can be stopped gracefully.

### Manual Verification
- Create a Bot profile that clicks a button in the `mock_app` and Alt-Tabs.
- Verify the delay between clicks works as expected.
- Verify Alt+Tab actually switches windows.
