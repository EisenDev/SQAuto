# Implementation Plan: Dedicated Bot Mode Dashboard

This plan refactors the Desktop Helper UI to provide a first-class experience for Bot Automation, separating it completely from the Search/Extraction workflow.

## User Review Required

> [!IMPORTANT]
> **UI Structural Change**
> - The left panel will now have two distinct sections: **Search Mode** and **Bot Mode**.
> - Each section will have its own profile selector. Selecting a profile in one will clear the selection in the other to avoid context confusion.
> - The "Start Bot" button will be located directly in the Bot Mode section of the left panel, making it feel like a standalone automation tool.

> [!NOTE]
> **Bot Sequence Builder**
> - I will ensure that "stacking" actions (Clicks, Tabs, Waits) in the Bot Builder is as intuitive as possible, allowing for long complex sequences.

## Proposed Changes

### [Models & Services]

#### [MODIFY] [profile_service.py](file:///home/eisen/Downloads/Otumisyon/desktop_helper/app/services/profile_service.py)
- No changes strictly needed as we can filter `list_profiles()` already, but maybe add convenience methods if helpful.

### [Main UI]

#### [MODIFY] [main_window.py](file:///home/eisen/Downloads/Otumisyon/desktop_helper/app/ui/main_window.py)
- Refactor `_build_left_panel`:
    - Section A: **Database Extraction (Search)**
        - Combo for Search-mode profiles.
        - Button for Calibration Wizard.
    - Section B: **Automation Bot (Loop)**
        - Combo for Bot-mode profiles.
        - Button for Bot Builder.
        - **Dedicated "Start Bot Loop" button.**
- Handle logic to switch `ExtractionPanel` context when a Bot profile is selected.

#### [MODIFY] [extraction_panel.py](file:///home/eisen/Downloads/Otumisyon/desktop_helper/app/ui/extraction_panel.py)
- Add a `set_bot_mode(profile)` method that hides search-specific elements (keys input, test mode) and focuses on the activity log for bot execution.
- Ensure progress bars are hidden/handled for infinite loops.

#### [MODIFY] [bot_builder.py](file:///home/eisen/Downloads/Otumisyon/desktop_helper/app/ui/bot_builder.py)
- Improve the sequence list display to show more detail about "stacked" actions (e.g., specific window titles, duration ranges).

## Verification Plan

### Manual Verification
- Verify that Search profiles only appear in the Search combo.
- Verify that Bot profiles only appear in the Bot combo.
- Verify that clicking "Start Bot Loop" in the left panel correctly triggers the automation engine in the right panel.
- Verify that the "Start Extraction" button in the right panel remains specific to Search Mode.
