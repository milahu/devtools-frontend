"use strict";
/**
 * Copyright 2019 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Target = void 0;
const Page_js_1 = require("./Page.js");
const WebWorker_js_1 = require("./WebWorker.js");
/**
 * @public
 */
class Target {
    /**
     * @internal
     */
    constructor(targetInfo, browserContext, sessionFactory, ignoreHTTPSErrors, defaultViewport, screenshotTaskQueue, isPageTargetCallback) {
        this._targetInfo = targetInfo;
        this._browserContext = browserContext;
        this._targetId = targetInfo.targetId;
        this._sessionFactory = sessionFactory;
        this._ignoreHTTPSErrors = ignoreHTTPSErrors;
        this._defaultViewport = defaultViewport;
        this._screenshotTaskQueue = screenshotTaskQueue;
        this._isPageTargetCallback = isPageTargetCallback;
        /** @type {?Promise<!Puppeteer.Page>} */
        this._pagePromise = null;
        /** @type {?Promise<!WebWorker>} */
        this._workerPromise = null;
        this._initializedPromise = new Promise((fulfill) => (this._initializedCallback = fulfill)).then(async (success) => {
            if (!success)
                return false;
            const opener = this.opener();
            if (!opener || !opener._pagePromise || this.type() !== 'page')
                return true;
            const openerPage = await opener._pagePromise;
            if (!openerPage.listenerCount("popup" /* Popup */))
                return true;
            const popupPage = await this.page();
            openerPage.emit("popup" /* Popup */, popupPage);
            return true;
        });
        this._isClosedPromise = new Promise((fulfill) => (this._closedCallback = fulfill));
        this._isInitialized =
            !this._isPageTargetCallback(this._targetInfo) ||
                this._targetInfo.url !== '';
        if (this._isInitialized)
            this._initializedCallback(true);
    }
    /**
     * Creates a Chrome Devtools Protocol session attached to the target.
     */
    createCDPSession() {
        return this._sessionFactory();
    }
    /**
     * If the target is not of type `"page"` or `"background_page"`, returns `null`.
     */
    async page() {
        if (this._isPageTargetCallback(this._targetInfo) && !this._pagePromise) {
            this._pagePromise = this._sessionFactory().then((client) => Page_js_1.Page.create(client, this, this._ignoreHTTPSErrors, this._defaultViewport, this._screenshotTaskQueue));
        }
        return this._pagePromise;
    }
    /**
     * If the target is not of type `"service_worker"` or `"shared_worker"`, returns `null`.
     */
    async worker() {
        if (this._targetInfo.type !== 'service_worker' &&
            this._targetInfo.type !== 'shared_worker')
            return null;
        if (!this._workerPromise) {
            // TODO(einbinder): Make workers send their console logs.
            this._workerPromise = this._sessionFactory().then((client) => new WebWorker_js_1.WebWorker(client, this._targetInfo.url, () => { } /* consoleAPICalled */, () => { } /* exceptionThrown */));
        }
        return this._workerPromise;
    }
    url() {
        return this._targetInfo.url;
    }
    /**
     * Identifies what kind of target this is.
     *
     * @remarks
     *
     * See {@link https://developer.chrome.com/extensions/background_pages | docs} for more info about background pages.
     */
    type() {
        const type = this._targetInfo.type;
        if (type === 'page' ||
            type === 'background_page' ||
            type === 'service_worker' ||
            type === 'shared_worker' ||
            type === 'browser' ||
            type === 'webview')
            return type;
        return 'other';
    }
    /**
     * Get the browser the target belongs to.
     */
    browser() {
        return this._browserContext.browser();
    }
    /**
     * Get the browser context the target belongs to.
     */
    browserContext() {
        return this._browserContext;
    }
    /**
     * Get the target that opened this target. Top-level targets return `null`.
     */
    opener() {
        const { openerId } = this._targetInfo;
        if (!openerId)
            return null;
        return this.browser()._targets.get(openerId);
    }
    /**
     * @internal
     */
    _targetInfoChanged(targetInfo) {
        this._targetInfo = targetInfo;
        if (!this._isInitialized &&
            (!this._isPageTargetCallback(this._targetInfo) ||
                this._targetInfo.url !== '')) {
            this._isInitialized = true;
            this._initializedCallback(true);
            return;
        }
    }
}
exports.Target = Target;
//# sourceMappingURL=Target.js.map