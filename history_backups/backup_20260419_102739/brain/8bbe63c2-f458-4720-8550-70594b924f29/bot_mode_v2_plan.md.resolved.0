# Implementation Plan: Bot Mode v2 (App Chaining & Timeline Recording)

This is a complete redesign of the Bot Mode to make it "block-based." Instead of a flat list of clicks, you will build a chain of "Application Blocks."

## User Review Required

> [!IMPORTANT]
> **Timeline Recording (Automatic Wait)**
> - Every time you click during a recording session, I will measure the **time elapsed** since your last click.
> - This will automatically add the correct "Wait" steps to your bot, so it mimics your natural speed perfectly.

> [!TIP]
> **Block-Based Sequencing**
> - You will record "Brave Block", then "IDE Block".
> - In the main view, you can drag/drop (or use arrows) to change the order: e.g., run IDE first, then Brave.
> - The bot will handle the "Auto-Tab" between blocks automatically.

## Proposed Changes

### [Models]

#### [MODIFY] [profile.py](file:///home/eisen/Downloads/Otumisyon/desktop_helper/app/models/profile.py)
- Introduce `AppBlock` model: A group of actions tied to a specific window.
- Update `ApplicationProfile` to store a list of `AppBlocks` instead of a flat `bot_actions` list.

### [UI]

#### [REWRITE] [bot_builder.py](file:///home/eisen/Downloads/Otumisyon/desktop_helper/app/ui/bot_builder.py)
- **Main View**: Shows a list of added Applications. Buttons: [➕ Add/Record App], [🔼 Move Up], [🔽 Move Down], [💾 Save Profile].
- **Recorder View**: A small, premium-looking floating bar that shows:
  - **Timer**: 00:00:00
  - **Click Counter**: "Points: 5"
  - **Status**: "Focusing [Brave]..."

### [Engine]

#### [MODIFY] [automation_engine.py](file:///home/eisen/Downloads/Otumisyon/desktop_helper/app/services/automation_engine.py)
- Update the execution loop to iterate through `AppBlocks`.
- Ensure it performs a "Clean Focus" (Auto-Tab) whenever it enters a new block.

## Verification Plan

### Manual Verification
- **App Chaining**: Record 3 clicks in Brave, save block. Record 2 clicks in Text Editor, save block. Verify both show up in the sequence.
- **Timing**: Perform clicks at 2-second intervals. Verify the bot plays them back with the same 2-second delays.
- **Reordering**: Move the Text Editor block to the top and verify the bot runs it first.
