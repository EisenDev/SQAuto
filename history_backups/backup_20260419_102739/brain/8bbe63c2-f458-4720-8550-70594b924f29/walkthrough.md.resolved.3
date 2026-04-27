# Walkthrough: Bot Mode (Clicker + Alt-Tab + Loop)

I have implemented a new **Bot Mode** for the Desktop Helper. This mode allows you to create automated sequences of clicks and keystrokes that can be looped indefinitely or for a fixed number of times.

## Changes Made

### Core Functional Updates
- **Models**: Added `BotAction` dataclass and transitioned `ApplicationProfile` to support multiple extraction modes.
- **Automation Engine**: 
  - Implemented `BotModeEngine` that executes a sequence of actions.
  - Added support for `pyautogui.hotkey('alt', 'tab')`.
  - Added a global step delay and a per-action "Wait" delay.
- **Persistence**: Updated `ProfileService` to handle the new `BotAction` fields in JSON profiles.

### UI Improvements
- **Calibration Wizard**:
  - Step 1 now allows you to choose between **Search Extraction** and **Bot Loop**.
  - A new "Sequence Builder" step replaces the search calibration steps when in Bot Mode.
  - Users can capture points on screen, add Alt+Tab steps, and specify wait durations.
- **Extraction Panel**:
  - Dynamically updates based on the current profile's mode.
  - In Bot Mode, the "Key Input" area is hidden, and the Start button switches to "Start Bot Loop".
  - Activity log provides detailed feedback on each loop and step.

## Verification Results

### Automated Tests
- Unit tests for the `AutomationEngine` in `bot_mode` were created and passed:
  - `test_bot_mode_execution`: Verified that clicks, hotkeys, and waits are called in the correct order.
  - `test_bot_mode_infinite_stop`: Verified that infinite loops can be stopped gracefully via the "Stop" button.

### Manual Verification
- Verified the UI flow in the `CalibrationWizard`:
  - Bot Mode skips redundant search steps and correctly records clicks.
  - The review page shows the sequence of actions clearly.
- Verified the `ExtractionPanel`:
  - Elements for Search Mode are hidden when a Bot profile is loaded.
  - The action sequence is logged correctly during the loop.

## How to use Bot Mode
1. Open the Helper and select a window.
2. Open the **Calibration Wizard**.
3. In Step 1, select **🤖 Bot Loop** as the Work Mode.
4. In Step 2, use the **+ Add Click**, **+ Add Alt+Tab**, and **+ Add Wait** buttons to build your sequence.
   - For clicks, you'll have 3 seconds to move your mouse to the target.
5. In Step 3, review and save the profile.
6. Back in the main panel, set the loop count and click **Start Bot Loop**.
