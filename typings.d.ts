/** 当前开发中的产品名称 */
declare var __PRODUCT__: string;
/** 当前服务器的 host，注意只在 DEV 环境中使用 */
declare var __HOST__: string;
/** 当前服务器的 port，注意只在 DEV 环境中使用 */
declare var __PORT__: string;

/** 环境变量 */
declare var __ENV__: string;
/** 是否是开发环境 */
declare var __DEV__: boolean;
/** 是否是自动化测试模式 */
declare var __TEST__: boolean;
/** 是否是发布模式（包括发布到测试系统和生产系统） */
declare var __BUILD__: boolean;
