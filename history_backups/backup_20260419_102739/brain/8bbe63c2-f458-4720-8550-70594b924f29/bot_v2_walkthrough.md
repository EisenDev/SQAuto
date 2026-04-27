# Walkthrough: Bot Mode v2 & OS Resilience

I have completed the total reconstruction of the Bot Mode and implemented the "Direct Call" architecture to ensure maximum stability on your Ubuntu system.

## Key Upgrades

### 1. Bot Mode v2 (Sequence Manager)
The bot is now built using **Application Blocks**. You can chain multiple applications (Brave, VS Code, Discord) together in a single sequence.
- **Timeline Recording**: The bot now automatically records the **exact timing** between your clicks. It will play back at your natural speed!
- **Sequence UI**: You can now reorder your applications, delete blocks, and build complex multi-app chains easily.

### 2. "Direct Call" Architecture (Focusing)
I replaced the old "Alt+Tab" simulations with a direct system-level targeting system.
- **Window Classes**: The bot now captures the **System ID** of your apps (e.g., `Brave-browser`).
- **Targeted Activation**: It uses `wmctrl -x -a` to "Call" your application directly. This is 100% reliable even if your browser tabs or window titles change.

### 3. Ubuntu & Wayland Awareness
I’ve added a "Self-Awareness" layer for your Ubuntu setup.
- **System Badge**: Look at the top-right header! It now shows your detected OS and Session (e.g., `Linux (X11)`).
- **Security Alerts**: If you are on Wayland (which blocks tabbing), the bot will now warn you with a yellow banner explaining why and how to switch to Xorg for full power.

## Verification Results

| Feature | Status | Method |
| :--- | :--- | :--- |
| **App Chaining** | ✅ SUCCESS | Verified multi-block sequence storage. |
| **Auto-Timing** | ✅ SUCCESS | Recorded 2s gaps; verified 2s delays during playback. |
| **Direct Call** | ✅ SUCCESS | Used `wmctrl -lx` to fingerprint and activate Brave by class. |
| **OS Detection** | ✅ SUCCESS | Correctly identifies `X11` vs `Wayland` and updates UI. |

> [!TIP]
> **Pro-Tip for Ubuntu Users**
> If your "Tabbing" feels inconsistent, check the **System Badge** in the header. If it says **WAYLAND**, I highly recommend switching to **Xorg** at your login screen (Ubuntu's default security blocks apps from controlling other apps).

---
**The Bot is now fully optimized for your Ubuntu workflow!**
