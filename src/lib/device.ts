import mobile from 'is-mobile';

/**
 * 检测设备是否为移动设备
 * 使用 is-mobile npm 包进行检测
 * @param userAgent - 用户代理字符串，可选。如果不提供，will use default detection
 * @returns 是否为移动设备
 */
export function isMobile(userAgent?: string): boolean {
  if (userAgent) {
    // 当提供 userAgent 时，使用 is-mobile 包的检测逻辑
    return mobile({ ua: userAgent });
  }
  
  // 如果没有提供 userAgent，使用默认检测
  return mobile();
}
