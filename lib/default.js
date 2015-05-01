/**
 * @author Adam Jaso <ajaso@pocketly.com>
 * @copyright 2015 Pocketly
 */ 

module.exports = {
  jobsPath: '/jobs',
  allowFailedSchedule: true,
  lockTTL: 1000,
  useSandLockd: false,
  useCustom: false,
  acquireLock: null,
  releaseLock: null
};