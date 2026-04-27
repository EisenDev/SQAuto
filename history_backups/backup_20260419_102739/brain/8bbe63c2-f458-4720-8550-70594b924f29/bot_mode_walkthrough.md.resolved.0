# Walkthrough: Bot Mode Separation & Multi-Window Support

I have successfully separated **Bot Mode** from the standard extraction flow and resolved the crash you encountered in the Calibration Wizard.

## Key Accomplishments

### 1. Fixed Calibration Wizard Crash
The "won't open" error was caused by a code indentation bug. I have fixed this and restored the **Calibration Wizard** to its original purpose: guided search-mode extraction. It is now stable and reliable.

### 2. Standalone Bot Mode UI
Bot Mode now has its own dedicated button and interface. It is no longer tied to the Search Mode calibration steps.
- **Button added**: `🤖 Configure Bot Mode →` in the main left panel.
- **Standalone Builder**: A new dialog for building automation loops without needing to select a "target window" first in the main screen.

### 3. Multi-Window Capability
This was the major functional upgrade. Your bot sequences can now interact with **multiple different applications** in a single loop.
- **Per-Action Targeting**: When you add a Click or Hotkey, you can now pick which application window should be focused **before** that specific action.
- **Seamless Tabbing**: The bot will automatically find and bring the correct window to the front before execution, allowing you to click in one app and tab into another easily.

### 4. Advanced Timing Settings
The "Universal Wait" and "Random Jitter" logic from earlier has been integrated into the new Bot Builder. You can fine-tune every delay to simulate human-like behavior across different apps.

## Verification Results
- **Unit Tests**: Verified that the `AutomationEngine` correctly switches focus between different window titles during a sequence.
- **UI Integrity**: Confirmed that the "Configure Bot Mode" button works independently of the main window selection state.
- **Error Handling**: Added safety checks for missing windows during execution to ensure the loop continues gracefully if an app is closed.

## How to use Multi-Window Botting
1. Click **🤖 Configure Bot Mode →** in the main window.
2. Enter a profile name (no target window required at this stage).
3. Click **+ Add Click Point**. You will be prompted to pick which window to focus.
4. Pick your first app (e.g., Excel), then record your click coordinate.
5. Click **+ Add Click Point** again, but this time pick a **different** app (e.g., your legacy system).
6. Save and Run. The bot will now handle the switching between Excel and your system automatically!
