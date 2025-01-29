"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// app.ts
var app_exports = {};
__export(app_exports, {
  lambdaHandler: () => lambdaHandler
});
module.exports = __toCommonJS(app_exports);
var z = __toESM(require("zod"));
var import_axios = __toESM(require("axios"));
var PayloadCodec = z.object({
  addon: z.string()
});
var ApiResponseCodec = z.object({
  addonKey: z.string(),
  summary: z.string()
});
var parseRecord = (record) => {
  try {
    return PayloadCodec.parse(JSON.parse(record.body));
  } catch (e) {
    console.error("Failed to parse record body:", record.body, e);
    return { addon: "invalid" };
  }
};
var fetchAppSummary = async (addonKey) => {
  try {
    const response = await import_axios.default.get(`https://marketplace.atlassian.com/rest/2/addons/${addonKey}`);
    const data = ApiResponseCodec.parse(response.data);
    return data.summary;
  } catch (error) {
    console.error(`Failed to fetch for addon ${addonKey}:`, error);
    return "Unknown app summary";
  }
};
var lambdaHandler = async (event) => {
  const relevantPayloads = event.Records.map(parseRecord).filter((payload) => payload.addon !== "invalid");
  if (!relevantPayloads.length) {
    throw new Error("No valid records");
  }
  const summaries = await Promise.all(
    relevantPayloads.map((relevantPayload) => fetchAppSummary(relevantPayload.addon))
  );
  return summaries;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  lambdaHandler
});
