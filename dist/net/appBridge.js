var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { nav } from '../ui';
import { uid } from '../uid';
import { apiTokenApi, callCenterapi, CenterAppApi, centerToken } from './api';
import { setSubAppWindow, wsBridge } from './wsChannel';
import { getUrlOrDebug } from './apiBase';
const apiTokens = {};
const appsInFrame = {};
export let meInFrame = {
    hash: undefined,
    unit: undefined,
    page: undefined,
    param: undefined,
};
export function isBridged() {
    return self !== window.parent;
}
window.addEventListener('message', function (evt) {
    return __awaiter(this, void 0, void 0, function* () {
        var message = evt.data;
        switch (message.type) {
            default:
                this.console.log('message: %s', JSON.stringify(message));
                break;
            case 'ws':
                wsBridge.receive(message.msg);
                break;
            case 'hide-frame-back':
                setSubAppWindow(evt.source);
                hideFrameBack(message.hash);
                break;
            case 'pop-app':
                nav.navBack();
                break;
            case 'center-api':
                yield callCenterApiFromMessage(evt.source, message);
                break;
            case 'center-api-return':
                bridgeCenterApiReturn(message);
                break;
            case 'app-api':
                console.log("receive PostMessage: %s", JSON.stringify(message));
                let ret = yield onReceiveAppApiMessage(message.hash, message.apiName);
                console.log("onReceiveAppApiMessage: %s", JSON.stringify(ret));
                evt.source.postMessage({
                    type: 'app-api-return',
                    apiName: message.apiName,
                    url: ret.url,
                    urlDebug: ret.urlDebug,
                    token: ret.token
                }, "*");
                break;
            case 'app-api-return':
                console.log("app-api-return: %s", JSON.stringify(message));
                yield onAppApiReturn(message);
                break;
        }
    });
});
function hideFrameBack(hash) {
    console.log('hideFrameBack %s', hash);
    let el = document.getElementById(hash);
    if (el !== undefined)
        el.hidden = true;
}
function onReceiveAppApiMessage(hash, apiName) {
    return __awaiter(this, void 0, void 0, function* () {
        let appInFrame = appsInFrame[hash];
        if (appInFrame === undefined)
            return { name: apiName, url: undefined, urlDebug: undefined, token: undefined };
        let { unit } = appInFrame;
        let parts = apiName.split('/');
        let ret = yield apiTokenApi.api({ unit: unit, apiOwner: parts[0], apiName: parts[1] });
        if (ret === undefined) {
            console.log('apiTokenApi.api return undefined. api=%s, unit=%s', apiName, unit);
            throw 'api not found';
        }
        return { name: apiName, url: ret.url, urlDebug: ret.urlDebug, token: ret.token };
    });
}
function onAppApiReturn(message) {
    return __awaiter(this, void 0, void 0, function* () {
        let { apiName, url, urlDebug, token } = message;
        let action = apiTokens[apiName];
        if (action === undefined) {
            throw 'error app api return';
            //return;
        }
        let realUrl = yield getUrlOrDebug(url, urlDebug);
        action.url = realUrl;
        action.token = token;
        action.resolve(action);
    });
}
export function setMeInFrame(appHash) {
    let parts = appHash.split('-');
    let len = parts.length;
    meInFrame.hash = parts[0].substr(3);
    if (len > 0)
        meInFrame.unit = Number(parts[1]);
    if (len > 1)
        meInFrame.page = parts[2];
    if (len > 2)
        meInFrame.param = parts.slice(3);
    return meInFrame;
}
export function appUrl(url, unitId, page, param) {
    let u;
    for (;;) {
        u = uid();
        let a = appsInFrame[u];
        if (a === undefined) {
            appsInFrame[u] = { hash: u, unit: unitId };
            break;
        }
    }
    url += '#tv' + u + '-' + unitId;
    if (page !== undefined) {
        url += '-' + page;
        if (param !== undefined) {
            for (let i = 0; i < param.length; i++) {
                url += '-' + param[i];
            }
        }
    }
    return { url: url, hash: u };
}
export function loadAppApis(appOwner, appName) {
    return __awaiter(this, void 0, void 0, function* () {
        let centerAppApi = new CenterAppApi('tv/', undefined);
        return yield centerAppApi.apis(meInFrame.unit, appOwner, appName);
    });
}
export function appApi(api, apiOwner, apiName) {
    return __awaiter(this, void 0, void 0, function* () {
        let apiToken = apiTokens[api];
        if (apiToken !== undefined)
            return apiToken;
        if (!isBridged()) {
            apiToken = yield apiTokenApi.api({ unit: meInFrame.unit, apiOwner: apiOwner, apiName: apiName });
            if (apiToken === undefined) {
                let err = 'unauthorized call: apiTokenApi center return undefined!';
                throw err;
            }
            if (apiToken.token === undefined)
                apiToken.token = centerToken;
            let { url, urlDebug } = apiToken;
            let realUrl = yield getUrlOrDebug(url, urlDebug);
            console.log('realUrl: %s', realUrl);
            apiToken.url = realUrl;
            apiTokens[api] = apiToken;
            return apiToken;
        }
        console.log("appApi parent send: %s", meInFrame.hash);
        apiToken = {
            name: api,
            url: undefined,
            urlDebug: undefined,
            token: undefined,
            resolve: undefined,
            reject: undefined,
        };
        apiTokens[api] = apiToken;
        return new Promise((resolve, reject) => {
            apiToken.resolve = (at) => __awaiter(this, void 0, void 0, function* () {
                let a = yield at;
                console.log('return from parent window: %s', JSON.stringify(a));
                apiToken.url = a.url;
                apiToken.urlDebug = a.urlDebug;
                apiToken.token = a.token;
                resolve(apiToken);
            });
            apiToken.reject = reject;
            (window.opener || window.parent).postMessage({
                type: 'app-api',
                apiName: api,
                hash: meInFrame.hash,
            }, "*");
        });
    });
}
const brideCenterApis = {};
export function bridgeCenterApi(url, method, body) {
    console.log('bridgeCenterApi: url=%s, method=%s', url, method);
    return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
        let callId;
        for (;;) {
            callId = uid();
            let bca = brideCenterApis[callId];
            if (bca === undefined) {
                brideCenterApis[callId] = {
                    id: callId,
                    resolve: resolve,
                    reject: reject,
                };
                break;
            }
        }
        (window.opener || window.parent).postMessage({
            type: 'center-api',
            callId: callId,
            url: url,
            method: method,
            body: body
        }, '*');
    }));
}
function callCenterApiFromMessage(from, message) {
    return __awaiter(this, void 0, void 0, function* () {
        let { callId, url, method, body } = message;
        let result = yield callCenterapi.directCall(url, method, body);
        from.postMessage({
            type: 'center-api-return',
            callId: callId,
            result: result,
        }, '*');
    });
}
function bridgeCenterApiReturn(message) {
    let { callId, result } = message;
    let bca = brideCenterApis[callId];
    if (bca === undefined)
        return;
    brideCenterApis[callId] = undefined;
    bca.resolve(result);
}
//# sourceMappingURL=appBridge.js.map