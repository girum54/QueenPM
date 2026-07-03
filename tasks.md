# Live Audio/Video Call Tasks

## Feature 1: Connection & Signaling Infrastructure
- [x] Setup LiveKit env variables and token generation endpoints.
- [x] Implement LivekitProvider token fetching and room guard logic.

## Feature 2: Core Call View & Media Binding
- [x] Wrap VoiceView UI with LiveKitRoom and implement participant hooks safety.
- [x] Build ParticipantTile component for audio and video rendering.
  - [x] Bind video track to the participant tile view.
  - [x] Bind audio track for remote/local participant playback.
  - [x] Add screen-share rendering support and status overlay.
- [x] Initialize mic and camera state from the actual local participant.

## Feature 3: Call Interaction & UI Controls
- [ ] Implement media toggles for microphone, camera, and screen share.
- [ ] Display active participant count, names, and focus switching.

## Feature 4: Session Lifecycle & Stability
- [ ] Secure `/api/calls/token/:roomName` endpoint with auth guards.
- [ ] Improve disconnect lifecycle, room cleanup, and state resets.
- [ ] Handle connection errors and reconnect/fallback states.
- [ ] Implement explicit join/leave UI controls and call mode toggle.

## Feature 5: End-to-End Testing (Collaborative)
- [ ] Perform dual-user cross-browser audio and video verification.
- [ ] Test multi-user screen sharing and toggle stability.
