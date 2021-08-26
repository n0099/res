import { Settings, DateTime as luxon } from 'luxon';

Settings.defaultLocale = 'zh-CN';
Settings.defaultZone = 'Asia/Shanghai';
Settings.throwOnInvalid = true;

export const futureSecondsToRelative = (seconds: number): string => luxon.now().plus({ seconds }).toRelative({ round: false }) ?? '';
export const timestampToRelative = (timestamp: number): string => luxon.fromSeconds(timestamp).toRelative({ round: false }) ?? '';
export const timestampToLocaleDateTime = (timestamp: number): string => luxon.fromSeconds(timestamp).toLocaleString(luxon.DATETIME_HUGE_WITH_SECONDS);
export default luxon;
