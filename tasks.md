# Live Audio/Video Call Tasks

This list is ordered for seamless collaboration between two users.

## 1. Back-end token and environment setup
- [ ] Confirm `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` are set correctly.
- [ ] Verify `backend/src/calls/calls.controller.ts` and `backend/src/calls/calls.service.ts` generate valid LiveKit tokens.
- [ ] Ensure the `/api/calls/token/:roomName` endpoint is protected and returns the authenticated user identity and name.

## 2. Room connection and signal setup
- [ ] Ensure `LivekitProvider` in `src/lib/livekit-provider.tsx` successfully fetches a token and connects to the room.
- [ ] Add a `room` guard so UI only renders call details after `room` is connected.
- [ ] Wrap `VoiceView` UI in `src/components/VoiceView.tsx` with `<LiveKitRoom room={room}>`.

## 3. Participant and media handling
- [ ] Ensure `useLocalParticipant()` and `useParticipants()` are only used after the room exists.
- [ ] Render local and remote video/audio tracks in `src/components/call/ParticipantTile.tsx`:
  - [ ] Bind video track to `<video>` elements.
  - [ ] Bind audio track to `<audio>` elements.
  - [ ] Support screen-share track rendering and status.
- [ ] Initialize mic/camera state from the actual local participant instead of hardcoding `true`.

## 4. Controls and collaboration flow
- [ ] Confirm `toggleMic()`, `toggleCamera()`, and `toggleScreenShare()` perform expected LiveKit operations immediately.
- [ ] Show active participant count and participant names in the call view.
- [ ] Add ability to focus a participant and switch between video tiles.
- [ ] Add explicit join/leave controls and a clear "in call" mode toggle on the channel or voice page.

## 5. Disconnect and cleanup
- [ ] Improve disconnect lifecycle so leaving cleans room state, resets call UI, and removes participants.
- [ ] Ensure participant state is cleared for both users when one user leaves.
- [ ] Handle errors and reconnect/fallback state gracefully.

## 6. End-to-end testing for two users
- [ ] Open the same room with two different browsers/users.
- [ ] Confirm each user sees the other user’s audio and video.
- [ ] Confirm screen sharing can be started by one user and seen by the other.
- [ ] Confirm leaving/disconnecting removes the user from the room on both sides.
- [ ] Confirm the UI remains stable if one user mutes, turns off camera, or loses connection.
