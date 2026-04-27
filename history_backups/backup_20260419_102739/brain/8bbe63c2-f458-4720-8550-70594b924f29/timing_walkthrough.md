# Walkthrough: Bot Timing Refinements (Universal & Random Wait)

I have refined the **Bot Mode** timing logic to support universal base waits and random jitter, as requested. This allows the bot to behave more naturally by varying the delay between actions.

## Key Enhancements

### 1. Randomized Wait Logic
The `AutomationEngine` now supports range-based delays. When a "Wait" step is configured with a random range, the engine picks a new random duration for every loop iteration.

### 2. Improved "Add Wait" Dialog
The **Calibration Wizard** now features a custom dialog for adding wait steps:
- **Base Wait**: Set a fixed minimum time (in minutes and seconds).
- **Random Jitter**: Optionally add an extra random duration (up to X extra minutes/seconds).
- **Automatic Calculation**: The UI converts these into milliseconds for the underlying engine.

### 3. Transparent Logging
During execution, the activity log now clearly indicates when a randomized wait is in progress:
- Example: `WAIT (RANDOMIZED): 452.3s`
- This ensures you can verify the universal and random components are working as expected.

## Technical Details
- **Model**: `BotAction` now includes `wait_min_ms`, `wait_max_ms`, and `is_random`.
- **Backward Compatibility**: Existing profiles are automatically migrated to the new schema when loaded.
- **Verification**: Tests in `desktop_helper/tests/test_bot_mode_engine.py` confirm that `random.randint` is called with the correct range and `time.sleep` receives the randomized value.

## How to use Randomized Timing
1. In the **Calibration Wizard** (Bot Mode), click **+ Add Wait**.
2. Set your **Base Wait** (e.g., 2 minutes).
3. Check **Add Random Jitter** and set the extra range (e.g., up to 10 minutes extra).
4. Save and run. The bot will now wait between 2 and 12 minutes randomly at that step.
