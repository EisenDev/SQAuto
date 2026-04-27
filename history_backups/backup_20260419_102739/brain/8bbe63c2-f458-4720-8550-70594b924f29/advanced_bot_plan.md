# Implementation Plan: Advanced Bot Recording & Randomization

This plan introduces "Bulk Recording" and "Randomization Sequences" to the Bot Mode, making it significantly faster to set up complex multi-window automations.

## User Review Required

> [!IMPORTANT]
> **Bulk Recording Mode**
> - When you click "Record Clicks", the application will hide, and **every click** you perform on the target window will be saved as a separate step in the sequence.
> - You will press a shortcut (e.g., **ESC**) to finish recording.
> - This replaces the need to manually click "Add Click" for every single point.

> [!CAUTION]
> **Random Sequence Window**
> - I will implement a "Random Action" step. This will allow you to define a list of actions (e.g., Click A, Click B, Click C), and the bot will pick **one** of them at random during each loop.
> - **Does this match your vision for 'random sequence window'?**

## Proposed Changes

### [Models]

#### [MODIFY] [profile.py](file:///home/eisen/Downloads/Otumisyon/desktop_helper/app/models/profile.py)
- Add `BOT_ACTION_RANDOM_GROUP` constant.
- Update `BotAction` to support optional sub-actions (for randomization groups).

### [Services]

#### [MODIFY] [automation_engine.py](file:///home/eisen/Downloads/Otumisyon/desktop_helper/app/services/automation_engine.py)
- Update code to handle `RANDOM_GROUP` actions by picking a random child action.
- Ensure the window-focus logic handles the "switch back to Brave" loop accurately without redundant Alt+Tabs if already focused.

### [UI]

#### [NEW] [record_overlay.py](file:///home/eisen/Downloads/Otumisyon/desktop_helper/app/ui/record_overlay.py)
- A small, transparent overlay that shows "Recording... Click to save point, Press ESC to finish."

#### [MODIFY] [bot_builder.py](file:///home/eisen/Downloads/Otumisyon/desktop_helper/app/ui/bot_builder.py)
- Replace "Add Click" with "🎙 Bulk Record Clicks".
- Integrate the mouse listener (using `pynput`) to capture multiple clicks in one session.
- Add "🎲 Add Random Group" button.

## Verification Plan

### Automated Tests
- Test that multiple recorded clicks are correctly stored in the profile.
- Test that the engine correctly switches between different app windows in a loop.

### Manual Verification
- Verify the "Bulk Recording" session correctly captures mouse coordinates on Brave.
- Verify that "ESC" stops the recording and returns to the config window.
