# Implementation Plan: OS Awareness & Wayland Protection

You are 100% correct—Linux Ubuntu has specific "Focus Protection" that can interfere with tabbing. I will make the bot smarter about this.

## User Review Required

> [!IMPORTANT]
> **Ubuntu Wayland vs Xorg**
> - Most modern Ubuntu versions use **Wayland**. Wayland actively blocks apps from "calling" or "tabbing" other apps for security.
> - I will add a **System Status Badge** to the header so you can see exactly what the bot detects.
> - If you are on Wayland, I will show a warning: "⚠ Wayland Detected — Tabbing may be limited by Ubuntu."

## Proposed Changes

### [Backend]

#### [MODIFY] [window_service.py](file:///home/eisen/Downloads/Otumisyon/desktop_helper/app/services/window_service.py)
- Add `get_system_info()`: Returns a string like "Linux (Ubuntu/X11)" or "Windows".

### [UI]

#### [MODIFY] [main_window.py](file:///home/eisen/Downloads/Otumisyon/desktop_helper/app/ui/main_window.py)
- **Header Update**: Add a "System Badge" next to the "Ready" indicator.
- **Manual Toggle**: Add a "Override OS Mode" dropdown in the settings (just in case auto-detection ever misses).
- **Wayland Alert**: If the session is Wayland, add a yellow banner to the Bot Automation section explaining how to fix it (Switching to Xorg).

## Verification Plan

### Manual Verification
- Start the app on Ubuntu.
- Verify the header says "System: Linux (X11)" or "System: Linux (Wayland)".
- Verify that if "Wayland" is detected, the warning banner appears in the Bot panel.
