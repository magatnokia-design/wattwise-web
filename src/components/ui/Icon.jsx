import {
  IoAlertCircle,
  IoTrashOutline,
  IoPulseOutline,
  IoPersonOutline,
  IoLockClosedOutline,
  IoInformationCircleOutline,
  IoCreateOutline,
  IoAlertCircleOutline,
  IoBarChartOutline,
  IoBatteryCharging,
  IoBulbOutline,
  IoCalendarOutline,
  IoCaretDown,
  IoCaretUp,
  IoCheckmarkCircle,
  IoChevronBack,
  IoChevronForward,
  IoCloudOfflineOutline,
  IoCompassOutline,
  IoDesktopOutline,
  IoDocumentText,
  IoDocumentTextOutline,
  IoDownloadOutline,
  IoFlash,
  IoFlashOff,
  IoFlashOutline,
  IoGameControllerOutline,
  IoGitCompareOutline,
  IoGridOutline,
  IoHardwareChip,
  IoHardwareChipOutline,
  IoHelpCircleOutline,
  IoLaptopOutline,
  IoListOutline,
  IoMailOutline,
  IoNotifications,
  IoNotificationsOutline,
  IoPhonePortraitOutline,
  IoPowerOutline,
  IoPricetagsOutline,
  IoReceipt,
  IoReceiptOutline,
  IoSearchOutline,
  IoSettingsOutline,
  IoShieldCheckmark,
  IoShieldCheckmarkOutline,
  IoSpeedometer,
  IoSpeedometerOutline,
  IoStatsChart,
  IoSwapVertical,
  IoTimeOutline,
  IoTimer,
  IoTimerOutline,
  IoTrendingUpOutline,
  IoTvOutline,
  IoVolumeHighOutline,
  IoWallet,
  IoWalletOutline,
  IoWarning,
} from 'react-icons/io5';
import { PiFan } from 'react-icons/pi';

/*
 * Icons, not emoji (Oct 2026) - the website catching up with the phone, which
 * swapped every emoji for an icon in the rebrand. Keyed by the Ionicons names
 * the app passes to <Ionicons name=…>, so the two clients can be read against
 * each other and a name means the same picture on both. Ionicons has no fan;
 * that one is Phosphor's, the closest line weight.
 *
 * Imported one by one so the bundle carries only these, not the whole set.
 */
const ICONS = {
  'trash-outline': IoTrashOutline,
  'pulse-outline': IoPulseOutline,
  'person-outline': IoPersonOutline,
  'lock-closed-outline': IoLockClosedOutline,
  'information-circle-outline': IoInformationCircleOutline,
  'create-outline': IoCreateOutline,
  'alert-circle': IoAlertCircle,
  'alert-circle-outline': IoAlertCircleOutline,
  'bar-chart-outline': IoBarChartOutline,
  'battery-charging': IoBatteryCharging,
  'bulb-outline': IoBulbOutline,
  'calendar-outline': IoCalendarOutline,
  'caret-down': IoCaretDown,
  'caret-up': IoCaretUp,
  'checkmark-circle': IoCheckmarkCircle,
  'chevron-back': IoChevronBack,
  'chevron-forward': IoChevronForward,
  'cloud-offline-outline': IoCloudOfflineOutline,
  'compass-outline': IoCompassOutline,
  'desktop-outline': IoDesktopOutline,
  'document-text': IoDocumentText,
  'document-text-outline': IoDocumentTextOutline,
  'download-outline': IoDownloadOutline,
  fan: PiFan,
  flash: IoFlash,
  'flash-off': IoFlashOff,
  'flash-outline': IoFlashOutline,
  'game-controller-outline': IoGameControllerOutline,
  'git-compare-outline': IoGitCompareOutline,
  'grid-outline': IoGridOutline,
  'hardware-chip': IoHardwareChip,
  'hardware-chip-outline': IoHardwareChipOutline,
  'help-circle-outline': IoHelpCircleOutline,
  'laptop-outline': IoLaptopOutline,
  'list-outline': IoListOutline,
  'mail-outline': IoMailOutline,
  notifications: IoNotifications,
  'notifications-outline': IoNotificationsOutline,
  'phone-portrait-outline': IoPhonePortraitOutline,
  'power-outline': IoPowerOutline,
  'pricetags-outline': IoPricetagsOutline,
  receipt: IoReceipt,
  'receipt-outline': IoReceiptOutline,
  'search-outline': IoSearchOutline,
  'settings-outline': IoSettingsOutline,
  'shield-checkmark': IoShieldCheckmark,
  'shield-checkmark-outline': IoShieldCheckmarkOutline,
  speedometer: IoSpeedometer,
  'speedometer-outline': IoSpeedometerOutline,
  'stats-chart': IoStatsChart,
  'swap-vertical': IoSwapVertical,
  'time-outline': IoTimeOutline,
  timer: IoTimer,
  'timer-outline': IoTimerOutline,
  'trending-up-outline': IoTrendingUpOutline,
  'tv-outline': IoTvOutline,
  'volume-high-outline': IoVolumeHighOutline,
  wallet: IoWallet,
  'wallet-outline': IoWalletOutline,
  warning: IoWarning,
};

export const hasIcon = (name) => Object.prototype.hasOwnProperty.call(ICONS, name);

/**
 * @param {string} name   An Ionicons name from ICONS. Anything else is drawn
 *   as text, so a caller not yet converted still renders rather than vanishing.
 * @param {number|string} [size]  Defaults to 1em, so it follows the font size.
 */
export const Icon = ({ name, size = '1em', className = '', title, ...rest }) => {
  const Component = ICONS[name];
  if (!Component) {
    return name ? <span className={className} aria-hidden="true">{name}</span> : null;
  }
  return (
    <Component
      size={size}
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      aria-label={title}
      focusable="false"
      {...rest}
    />
  );
};

export default Icon;
