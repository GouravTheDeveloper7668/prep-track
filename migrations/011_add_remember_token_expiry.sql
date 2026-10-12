-- Migration 011: Add remember_token_expires_at for 30-day auto logout
-- PrepTrack — 30-Day Persistent Login Session

ALTER TABLE `users` 
ADD COLUMN IF NOT EXISTS `remember_token_expires_at` TIMESTAMP NULL DEFAULT NULL AFTER `remember_token`;
