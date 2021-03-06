/***************************************************************************
 *
 * Copyright (c) 2011 Baidu.com, Inc. All Rights Reserved
 * $Id: context.js 5156 2011-04-27 04:15:29Z liyubei $
 *
 **************************************************************************/



/**
 * context.js ~ 2011/03/25 00:09:46
 * @author leeight(liyubei@baidu.com)
 * @version $Revision: 5156 $
 * @description
 * er.context
 **/

goog.provide('er.context');

/**
 * 运行时的上下文数据管理器
 * @constructor
 */
er.Context = function() {
  /**
   * @private
   */
  this.applicationContext = {};
};

/**
 * 设置应用环境上下文
 *
 * @param {string} key 环境变量名.
 * @param {*} value 环境变量值.
 */
er.Context.prototype.set = function(key, value) {
  this.applicationContext[key] = value;
};

/**
 * 获取应用环境上下文变量
 *
 * @param {string} key 上下文变量名.
 * @return {*} 环境变量值.
 */
er.Context.prototype.get = function(key) {
  return this.applicationContext[key];
};

/**
 * instance
 * @type {er.Context}
 */
er.context = new er.Context();





















/* vim: set ts=4 sw=4 sts=4 tw=100 noet: */
