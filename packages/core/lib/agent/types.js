"use strict";
// ===== @spakjs/core Agent SDK - Type Definitions =====
// Agent SDK 核心类型定义
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentTemplateManagerImpl = exports.ProviderSystemImpl = exports.ToolSystemImpl = exports.AgentManagerImpl = exports.AgentStatus = void 0;
/**
 * Agent 状态枚举
 */
var AgentStatus;
(function (AgentStatus) {
    AgentStatus["IDLE"] = "idle";
    AgentStatus["BUSY"] = "busy";
    AgentStatus["ERROR"] = "error";
    AgentStatus["STOPPED"] = "stopped";
    AgentStatus["CRASHED"] = "crashed";
})(AgentStatus || (exports.AgentStatus = AgentStatus = {}));
// Re-export implementation classes
var manager_1 = require("./manager");
Object.defineProperty(exports, "AgentManagerImpl", { enumerable: true, get: function () { return manager_1.AgentManagerImpl; } });
var tool_system_1 = require("./tool-system");
Object.defineProperty(exports, "ToolSystemImpl", { enumerable: true, get: function () { return tool_system_1.ToolSystemImpl; } });
var provider_system_1 = require("./provider-system");
Object.defineProperty(exports, "ProviderSystemImpl", { enumerable: true, get: function () { return provider_system_1.ProviderSystemImpl; } });
var template_manager_1 = require("./template-manager");
Object.defineProperty(exports, "AgentTemplateManagerImpl", { enumerable: true, get: function () { return template_manager_1.AgentTemplateManagerImpl; } });
//# sourceMappingURL=types.js.map