# NO AUTO-POPUP POLICY

**Date:** 2026-01-16  
**Status:** ACTIVE - Zero popup tolerance

## Summary

This policy prohibits any component from automatically opening a Dialog, AlertDialog, or modal without explicit user action (click/tap).

## Disabled Components

| Component | Location | Status | Reason |
|-----------|----------|--------|--------|
| `AnnouncementGate` | `src/App.tsx` | **REMOVED** | Auto-opened Dialog on unread announcements |
| `RHLoginNotificationPopup` | `src/components/layout/MainLayout.tsx` | **REMOVED** | Auto-opened AlertDialog on RH notifications |

## Preserved Components (Exceptions)

| Component | Location | Justification |
|-----------|----------|---------------|
| `ChangePasswordDialog` | `src/App.tsx` | Security requirement - forces password change when `must_change_password=true` |

## Future Reactivation

When the notification bell system is implemented:

1. **AnnouncementGate** → Replace with badge indicator in header bell
2. **RHLoginNotificationPopup** → Already has `RHNotificationBadge` in header - use that instead

## Rules for New Features

1. **NEVER** use `useEffect` to set `open={true}` on a Dialog/AlertDialog
2. **NEVER** open modals in realtime subscription callbacks
3. **ALWAYS** require user click to open any modal
4. **Badge indicators** are OK for drawing attention without blocking UI

## Verification Checklist

- [ ] Login flow: no modal opens automatically
- [ ] Tab switch: no modal opens when returning
- [ ] Realtime event: no modal opens on incoming data
- [ ] Page refresh: no modal opens on reload

## Related Files

- `src/components/announcements/AnnouncementGate.tsx` - Component exists but NOT rendered
- `src/components/rh/RHLoginNotificationPopup.tsx` - Component exists but NOT rendered
- `src/hooks/use-announcements.ts` - Hook exists for future bell integration
