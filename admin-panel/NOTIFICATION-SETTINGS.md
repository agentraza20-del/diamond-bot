# 🔔 Notification Sound Settings - Admin Guide

## Overview
The Diamond Bot Admin Panel now includes a comprehensive notification sound system that allows admins to customize alert sounds when new orders arrive.

## Features

### 1. **Enable/Disable Notifications**
- Toggle notifications on or off from the Settings menu
- When disabled, no sound will play for new orders
- Settings are saved to browser's local storage

### 2. **Sound Selection**
Choose from 10+ different notification sounds:
- **Bell Notification** - Classic bell ring (Default: mixkit-bell-notification-933.wav)
- **Correct Answer Tone** - Success tone (mixkit-correct-answer-tone-2870.wav)
- **Digital Quick Tone** - Modern beep (mixkit-digital-quick-tone-2866.wav)
- **Doorbell Tone** - Doorbell sound (mixkit-doorbell-tone-2864.wav)
- **Happy Bells** - Cheerful notification (mixkit-happy-bells-notification-937.wav)
- **Magic Notification Ring** - Magical sound (mixkit-magic-notification-ring-2344.wav)
- **Message Pop Alert** - Pop sound (mixkit-message-pop-alert-2354.mp3)
- **Bubble Pop Alert** - Bubble pop (mixkit-bubble-pop-up-alert-notification-2357.wav)
- **Wave Alarm** - Wave alert (mixkit-game-notification-wave-alarm-987.wav)
- **Interface Hint** - Subtle hint sound (mixkit-interface-hint-notification-911.wav)

### 3. **Sound Preview**
- Click "Preview Sound" button to hear selected sound before saving
- Test different sounds to find your preference

## How to Access

### From Settings Menu
1. Click ⚙️ **Settings** in the More menu
2. Scroll down to **Notification Sound** section
3. Enable/disable notifications and select preferred sound
4. Click "Preview Sound" to test
5. Settings save automatically

### From More Menu
1. Click ⋯ **More** in the top navigation
2. Click **Settings** 
3. Follow steps above

## How It Works

### When Notifications Are Enabled
- **New Order Arrives**: The selected notification sound plays automatically
- **Volume**: Set to 80% to not be too loud
- **Real-time**: Uses WebSocket real-time updates

### Settings Storage
- Settings stored in browser's **localStorage**
- Persists even after closing browser
- Per-device/browser basis (not synced across devices)

### Automatic Playback
- Sound plays when `dataUpdated` event is triggered
- Triggered when new order is received
- Only plays if:
  - Notifications are enabled ✓
  - A sound is selected ✓
  - Browser allows audio playback ✓

## Default Settings

| Setting | Default Value |
|---------|---------------|
| Enable Notifications | ✅ Enabled |
| Selected Sound | Bell Notification (mixkit-bell-notification-933.wav) |
| Volume | 80% |

## Customization

### Add More Sounds
To add additional notification sounds:

1. **Add sound file** to `/admin-panel/public/sounds/` folder
2. **Update Settings Modal** in `app.js` (line ~2220):
   ```javascript
   <option value="filename.wav">Sound Name</option>
   ```

### Change Default Volume
Edit `playNotificationSound()` function in `app.js`:
```javascript
audio.volume = 0.8; // Change 0.8 to desired volume (0-1)
```

## Troubleshooting

### Sound Not Playing
✓ Check if notifications are **enabled** in settings
✓ Check if a sound is **selected** (not "No Sound")
✓ Check browser's **audio permissions**
✓ Try different browser if issue persists
✓ Check browser's **volume settings**

### Sound File Issues
- Ensure files are in `/admin-panel/public/sounds/` folder
- Use .wav or .mp3 format only
- Check file name matches exactly in dropdown

### Persistent Storage Not Working
- Check browser's localStorage is **enabled**
- Try clearing browser cache and reload
- Check if running in **private/incognito mode**

## Developer Information

### Key Functions

#### saveNotificationSettings()
Saves notification preferences to localStorage
- Called when toggling enable checkbox
- Called when changing sound selection
- Stores both enable status and sound filename

#### playNotificationSound()
Plays the selected notification sound
- Called when new order arrives (dataUpdated event)
- Checks if notifications are enabled
- Checks if sound is selected
- Catches any audio errors gracefully

#### playPreviewSound()
Plays sound immediately for preview
- Called by Preview Sound button
- Same sound file as notification
- Shows error toast if no sound selected

### LocalStorage Keys
```javascript
localStorage.getItem('notificationEnabled')  // 'true' or 'false'
localStorage.getItem('notificationSound')    // filename.wav or filename.mp3
```

### Socket Event
```javascript
socket.on('dataUpdated', () => {
    playNotificationSound(); // NEW: Added sound playback
    silentRefreshData();     // Existing: Refresh data
});
```

## Browser Compatibility

| Browser | Support |
|---------|---------|
| Chrome | ✅ Full Support |
| Firefox | ✅ Full Support |
| Safari | ✅ Full Support |
| Edge | ✅ Full Support |
| IE 11 | ❌ Not Supported |

## Future Enhancements

- [ ] Different sounds for different notification types
- [ ] Custom sound upload
- [ ] Sound volume slider in settings
- [ ] Notification frequency control
- [ ] Time-based mute (Do Not Disturb)
- [ ] Cloud sync across devices
- [ ] Sound category presets (Subtle, Moderate, Loud)

## Security Notes

- Sound files are served from `/sounds/` public folder
- No sensitive data in audio files
- Settings stored only in browser cache
- No server-side logging of sound preferences

## Performance

- Minimal impact on performance
- Audio playback is non-blocking
- Errors caught and logged to console
- No memory leaks from repeated playback

---

**Last Updated**: November 30, 2025
**Status**: ✅ Production Ready
**Version**: 1.0
