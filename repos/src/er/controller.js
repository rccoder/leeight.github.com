/***************************************************************************
 *
 * Copyright (c) 2011 Baidu.com, Inc. All Rights Reserved
 * $Id: controller.js 5232 2011-05-04 16:09:37Z liyubei $
 *
 **************************************************************************/



/**
 * controller.js ~ 2011/03/24 23:37:46
 * @author leeight(liyubei@baidu.com)
 * @version $Revision: 5232 $
 * @description
 * er.controller
 **/

goog.require('er.base');
goog.require('er.config');
goog.require('er.locator');

goog.provide('er.controller');


/**
 * 控制器负责将对应的path转向给相应的action对象处理.
 * @constructor
 */
er.Controller = function() {
  /**
   * Action的配置信息(path -> action)
   * @type {Object.<string, er.Controller.ActionConfigType>}
   * @private
   */
  this.container = {};

  /**
   * Action的配置信息(name -> action)
   * @type {Object.<string, er.Controller.ActionConfigType>}
   * @private
   */
  this.actionConfigMap = {};

  /**
   * FIXME
   * 如何定义一个Module呢？
   * @private
   */
  this.modules = [];

  /**
   * @private
   * @type {?er.Action}
   */
  this.currentAction = null;

  /**
   * 权限验证的函数
   * @type {?function(string):boolean}
   */
  this.permit = null;

  /**
   * 默认的无权限页面
   * @private
   * @type {string}
   */
  this._noAuthLocation = '/';

  /**
   * 默认的无权限Action
   * @private
   * @type {string}
   */
  this._noAuthAction = null;

  /**
   * 404页面
   * @private
   * @type {string}
   */
  this._noPageLocation = '/';

  /**
   * 404页面Action
   * @private
   * @type {string}
   */
  this._noPageAction = null;

  /**
   * @private
   */
  this._pathMap = {};
};

/**
 * @typedef {{action:string,location:string,
 *            authority:string,noAuthLocation:string}}
 */
er.Controller.ActionConfigType;

/**
 * 无权限的时候需要的调整的路径.
 * @param {string} location
 */
er.Controller.prototype.setNoAuthLocation = function(location) {
  this._noAuthLocation = location;
};

/**
 * 无权限的时候需要的Action.
 * @param {string} action
 */
er.Controller.prototype.setNoAuthAction = function(action) {
  this._noAuthAction = action;
};

/**
 * 设置页面找不到时的路径.
 * @param {string} location
 */
er.Controller.prototype.setNoPageLocation = function(location) {
  this._noPageLocation = location;
};

/**
 * 设置页面找不到时的Action.
 * @param {string} action
 */
er.Controller.prototype.setNoPageAction = function(action) {
  this._noPageAction = action;
};

/**
 * 路径映射
 * @param {string} oldPath
 * @param {string} newPath
 */
er.Controller.prototype.addPathMap = function(oldPath, newPath) {
  this._pathMap[oldPath] = newPath;
};

/**
 * 跳转视图
 *
 * @param {string} path 路径.
 * @param {Object} paramMap 查询条件.
 * @param {string} referer 定位器.
 */
er.Controller.prototype.forward = function(path, paramMap, referer) {
  if (this._pathMap[path]) {
    er.locator.redirect(this._pathMap[path]);
    return;
  }

  // 组合所需的argument对象
  var argMap = {
    type: 'main',
    referer: referer,
    paramMap: paramMap,
    path: path,
    domId: er.config.MAIN_ELEMENT_ID
  };

  this.reset();

  // 进入action
  this.currentAction = this.enterAction(this.container[path], argMap);
};

/**
 * 进入action
 *
 * @private
 * @param {er.Controller.ActionConfigType} actionConfig action配置对象.
 * @param {Object} argMap arg表.
 * @return {?er.Action} 需要进入的对象实例.
 */
er.Controller.prototype.enterAction = function(actionConfig, argMap) {
  if (!actionConfig) {
    //404 Page Not Found
    if (this._noPageAction) {
      var action = this._noPageAction;
      if (er.base.isFunction(action)) {
        action = new /** @type {Function} */ (action)();
      }
      action.enter(argMap);
      return action;
    }

    er.locator.redirect(this._noPageLocation);
    return null;
  }

  var action = this.findAction(actionConfig),
      newAction = null,
      authority = actionConfig.authority;

  // 如果action不是单例，new一个实例
  if (er.base.isFunction(action)) {
    action = new /** @type {Function} */ (action)();
  }

  if (this.permit) {
    if (authority && !this.permit(authority)) {
      if (this._noAuthAction) {
        action = this._noAuthAction;
        if (er.base.isFunction(action)) {
          action = new /** @type {Function} */ (action)();
        }
        action.enter(argMap);
        return action;
      }
      er.locator.redirect(actionConfig.noAuthLocation || this._noAuthLocation);
      return null;
    }
  }

  newAction = action.enter(argMap);

  if (newAction) {
    // XXX 为什么这么做呢？请看src/material/form.js
    return newAction;
  }

  return action;
};


/**
 * 重置会话。卸载控件并清除显示区域内容
 * FIXME action中的controlMap对用户来说应该是不可见的，应该和
 * ui.manager结合起来，提供一个接口来创建ui.widget，然后reset的
 * 时候来保证通过调用那个接口创建的widget都会被dispose掉
 * @private
 */
er.Controller.prototype.reset = function() {
  if (this.currentAction) {
    this.currentAction.leave();
  }

  // 清空内容区域
  er.base.g(er.config.MAIN_ELEMENT_ID).innerHTML = '';
};


/**
 * 添加模块
 * @param {Object} module 注册的模块.
 */
er.Controller.prototype.addModule = function(module) {
  this.modules.push(module);
};

/**
 * 初始化控制器
 */
er.Controller.prototype.init = function() {
  var i = 0,
      len = this.modules.length,
      j, len2,
      loc,
      module, actions,
      moduleAuthority, moduleNoAuthLocation,
      actionConfig, actionName;

  for (; i < len; i++) {
    module = this.modules[i];

    // 初始化module
    if (module.init) {
      module.init();
    }

    // 注册action
    actions = module.config.action;

    // 所有action公共的权限配置信息
    moduleAuthority = module.config.authority;
    moduleNoAuthLocation = module.config.noAuthLocation;

    if (actions) {
      for (j = 0, len2 = actions.length; j < len2; j++) {
        actionConfig = actions[j];
        loc = actionConfig.location;
        actionName = actionConfig.action;

        // 如果当前的action没有配置权限信息，并且存在
        // 公共的权限控制信息，就继承下来
        if (moduleAuthority && !er.base.hasValue(actionConfig.authority)) {
          actionConfig.authority = moduleAuthority;
        }
        if (moduleNoAuthLocation && !er.base.hasValue(actionConfig.noAuthLocation)) {
          actionConfig.noAuthLocation = moduleNoAuthLocation;
        }

        this.container[loc] = actionConfig;
        this.actionConfigMap[actionName] = actionConfig;
      }
    }
  }

  er.locator.init();
};

/**
 * 查找获取Action对象
 *
 * @private
 * @param {er.Controller.ActionConfigType} actionConfig action配置对象或action的对象路径.
 * @return {?er.Action} null没找到,否则返回Action的实例.
 */
er.Controller.prototype.findAction = function(actionConfig) {
  var propPath = actionConfig.action;
  return /** @type {er.Action} */ (er.base.getObjectByName(propPath));
};


/**
 * 加载一个action
 *
 * @param {string} domId 容器dom元素id.
 * @param {string} actionName 要载入的action名称.
 * @param {Object=} opt_argMap 一些可选的arg参数，默认情况下通过
 * loadPopup载入的view都是create的状态，而有时候需要modify的状态
 * 此时就需要opt_argMap来发挥作用了，因为很多时候判断是不是处于
 * modify的状态是根据argMap的path来判断的.
 * @return {?er.Action} 对应的Action实例.
 */
er.Controller.prototype.loadAction = function(domId, actionName, opt_argMap) {
  var actionConfig = this.actionConfigMap[actionName],
      argMap = {
        type: 'popup',
        domId: domId
      };

  if (opt_argMap) {
    er.base.extend(argMap, opt_argMap);
  }

  return this.enterAction(actionConfig, argMap);
};

/**
 * instance
 * @type {er.Controller}
 */
er.controller = new er.Controller();





















/* vim: set ts=4 sw=4 sts=4 tw=100 noet: */
