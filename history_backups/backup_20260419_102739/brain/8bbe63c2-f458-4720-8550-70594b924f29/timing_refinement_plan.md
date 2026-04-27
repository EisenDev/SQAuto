# Implementation Plan: Bot Timing Refinements (Universal & Random Wait)

This plan enhances the Bot Mode with more sophisticated timing logic as requested. Users will be able to set a base wait time and a random jitter range to simulate human-like behavior.

## User Review Required

> [!IMPORTANT]
> **Randomized Timing**
> - Every "Wait" step can now be configured with a **Minimum (Base)** and **Maximum** duration.
> - The actual wait time during execution will be randomly chosen within this range.
> - Example: Base 2 min + Random 1-10 min means a total wait of 3 to 12 minutes.

## Proposed Changes

### [Models]

#### [MODIFY] [profile.py](file:///home/eisen/Downloads/Otumisyon/desktop_helper/app/models/profile.py)
- Update `BotAction` dataclass:
  - Rename `duration_ms` to `wait_min_ms` (for clarity).
  - Add `wait_max_ms: Optional[int] = None`.
  - Add `is_random: bool = False`.

### [Automation Engine]

#### [MODIFY] [automation_engine.py](file:///home/eisen/Downloads/Otumisyon/desktop_helper/app/services/automation_engine.py)
- Import `random`.
- Update `_execute_bot_action` for `BOT_ACTION_WAIT`:
  - If `is_random` is true: `duration = random.randint(wait_min_ms, wait_max_ms)`.
  - Else: `duration = wait_min_ms`.
  - Log the specific duration chosen for this loop.

### [UI Components]

#### [MODIFY] [calibration_wizard.py](file:///home/eisen/Downloads/Otumisyon/desktop_helper/app/ui/calibration_wizard.py)
- Update `_add_bot_wait()`:
  - Replace the single-integer input with a small dialog or form.
  - Fields: "Base Wait (min/sec)" and "Random Jitter (up to X min)".
  - Calculate `wait_min_ms` and `wait_max_ms` accordingly.

### [Profile Service]

#### [MODIFY] [profile_service.py](file:///home/eisen/Downloads/Otumisyon/desktop_helper/app/services/profile_service.py)
- Update `_bot_action` deserialization to handle the new fields.

## Verification Plan

### Automated Tests
- Update `test_bot_mode_engine.py` to verify random timing:
  - Mock `random.randint` to return a known value.
  - Verify `time.sleep` is called with the correct sum.

### Manual Verification
- Create a bot sequence: `[Click] -> [Alt+Tab] -> [Wait (2 min base + 1-10 min random)]`.
- Run the bot and verify the activity log shows random durations (e.g., "Step 3: Wait 425s (Randomized)").
