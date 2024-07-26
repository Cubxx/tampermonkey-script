// ==UserScript==
// @name        tm env
// @version     0.2
// @author      Cubxx
// @match       *://*/*
// @updateURL   https://cdn.jsdelivr.net/gh/Cubxx/tampermonkey-script/src/tm.user.js
// @downloadURL https://cdn.jsdelivr.net/gh/Cubxx/tampermonkey-script/src/tm.user.js
// @require     https://cdn.jsdelivr.net/gh/Cubxx/tampermonkey-script/lib/lit-html.js
// @require     https://cdn.jsdelivr.net/gh/Cubxx/tampermonkey-script/lib/sober.min.js
// @run-at      document-start
// @icon        data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="%23bf0" viewBox="0 0 1 1"><rect width="1" height="1"/></svg>
// @grant       none
// ==/UserScript==

const tm = (function () {
  'use strict';
  if (Object.prototype.hasOwnProperty.call(window, 'tm'))
    throw 'tm env error: global variable "tm" already exists';
  console.debug('tm env init', self.location.href);

  const _ = {
    exit(...e) {
      debugger;
      log.error(...e);
      throw 'tm exit';
    },
    /**
     * @template {any[]} P
     * @param {(...e: P) => void} fn
     * @param {number} delay
     * @returns {(...e: P) => void}
     */
    debounce(fn, delay) {
      /** @type {number | undefined} */
      let timer = void 0;
      return (...e) => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          fn.apply(null, e);
        }, delay);
      };
    },
    /**
     * @template {any[]} P
     * @param {(...e: P) => void} fn
     * @param {number} delay
     * @returns {(...e: P) => void}
     */
    throttle(fn, delay) {
      /** @type {number | null} */
      let timer = null;
      return (...e) => {
        if (timer) return;
        timer = window.setTimeout(() => {
          fn.apply(null, e);
          timer = null;
        }, delay);
      };
    },
    /**
     * @template {{}} T
     * @param {T} obj
     * @param {<K extends keyof T>(value: T[K], key: K, obj: T) => void} fn
     */
    each(obj, fn) {
      for (const key in obj) if (_.hasOwnKey(obj, key)) fn(obj[key], key, obj);
    },
    /**
     * @template {{}} T,R
     * @param {T} obj
     * @param {<K extends keyof T>(value: T[K], key: K, obj: T) => R} fn
     */
    map(obj, fn) {
      const results = /** @type {R[]} */ ([]);
      _.each(obj, (...e) => results.push(fn(...e)));
      return results;
    },
    /**
     * @template {{}} T,R
     * @param {T} obj
     * @param {<K extends keyof T>(value: T[K], key: K, obj: T) => R} fn
     */
    mapValues(obj, fn) {
      const result = /** @type {{ [P in keyof T]: R }} */ ({});
      _.each(obj, (...e) => (result[e[1]] = fn(...e)));
      return result;
    },
    /**
     * @template {{}} T
     * @template {PropertyKey} K
     * @param {T} obj
     * @param {K} key
     * @returns {T is {[P in K]: unknown}}
     */
    hasOwnKey(obj, key) {
      return Object.prototype.hasOwnProperty.call(obj, key);
    },
    /**
     * @template {{}} T
     * @template {keyof T} K
     * @param {T} data
     * @param {K} key
     * @param {T[K][]} values
     */
    toggle(data, key, values) {
      const index = (values.indexOf(data[key]) + 1) % values.length;
      return (data[key] = values[index]);
    },
  };
  const log = (function () {
    const console = { ...window.console };
    const color = '#bf0';
    const handle =
      (key) =>
      (msg, ...e) =>
        console[key](
          `%c tm %c ${msg} %c`,
          $.style({
            background: color,
            color: '#000',
            font: 'italic bold 12px/1 serif',
            'border-radius': '4px',
          }),
          $.style({ color: color }),
          '',
          ...e,
        );
    return new Proxy(/** @type {Console & Console['log']} */ (handle('log')), {
      get: (o, p) => handle(p),
      set: () => false,
    });
  })();
  const hack = {
    get stack() {
      const error = new Error();
      return (
        error.stack
          ?.split('\n')
          .slice(2)
          .map((e) => e.trim()) ?? []
      );
    },
    /**
     * @template {{}} T
     * @template {keyof T} K
     * @template {{
     *   value: T[K];
     *   get(this: T): T[K];
     *   set(this: T, e: T[K]): void;
     * }} D
     * @param {T} obj
     * @param {K} key
     * @param {(descriptor: Merge<PropertyDescriptor, D>) => Partial<D>} convert
     */
    override(obj, key, convert) {
      const d = Object.getOwnPropertyDescriptor(obj, key) ??
        log(`can't find own key: ${key.toString()}, will add a new one`) ?? {
          configurable: true,
        };
      if (!d.configurable)
        return _.exit(`${key.toString()} is not configurable`);
      //@ts-ignore
      Object.defineProperty(obj, key, Object.assign({}, d, convert(d)));
    },
    disableInfDebugger() {
      hack.override(window, 'setInterval', ({ value }) => ({
        //@ts-ignore
        value(...e) {
          ('' + e[0]).includes('debugger')
            ? tm.log('disabled setInterval')
            : value.apply(this, e);
        },
      }));
    },
    restoreConsole() {
      if (console.log.toString() === 'function log() { [native code] }') {
        return;
      }
      const iframe = $.h('iframe').mount('body').el;
      window['console'] = iframe.contentWindow?.['console'];
      iframe.remove();
    },
    /** @param {RegExp[]} regexs */
    blockRequest(...regexs) {
      const check = (url) =>
        regexs.some(
          (reg) => reg.test('' + url) && (log('blocked request:', url), true),
        );
      hack.override(window, 'fetch', ({ value }) => ({
        value(...e) {
          const url = e[0] instanceof Request ? e[0].url : e[0];
          return check(url) ? Promise.reject() : value(...e);
        },
      }));
      hack.override(XMLHttpRequest.prototype, 'open', ({ value }) => ({
        value(...e) {
          //@ts-ignore
          return check(e[1]) || value.apply(this, e);
        },
      }));
    },
    /** @see https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API */
    cancelTrustedTypes() {
      const { trustedTypes } = window;
      if (!trustedTypes) return;
      const policy = trustedTypes.createPolicy('tm-policy', {
        createHTML: (e) => e,
      });
      hack.override(Element.prototype, 'innerHTML', ({ set }) => ({
        set(v) {
          //@ts-ignore
          set.call(this, policy.createHTML(v));
        },
      }));
    },
    openShadowRoot() {
      hack.override(Element.prototype, 'attachShadow', ({ value }) => ({
        value(e) {
          e.mode = 'open';
          return value.call(this, e);
        },
      }));
    },
    /** @param {RegExp | string} str */
    allowDevtool(str) {
      hack.override(Object, 'assign', ({ value }) => ({
        value(...e) {
          if (
            hack.stack.some((e) =>
              typeof str === 'string' ? e.includes(str) : str.test(e),
            ) &&
            typeof e[0] === 'function' &&
            _.hasOwnKey(e[1], 'isDevToolOpened')
          ) {
            hack.override(e, 0, ({ value }) => ({
              value() {
                return value({
                  disableMenu: false,
                  disableIframeParents: false,
                  clearIntervalWhenDevOpenTrigger: true,
                  clearLog: false,
                  ignore: () => true,
                  // ondevtoolopen() {},
                });
              },
            }));
          }
          //@ts-ignore
          return value.apply(this, e);
        },
      }));
    },
  };
  const $ = Object.assign(
    /**
     * @template {keyof HTMLElementTagNameMap} K
     * @overload
     * @param {Selector<K>} e
     * @returns {Dom<HTMLElementTagNameMap[K]> | null}
     */
    /**
     * @overload
     * @param {string} e
     * @returns {Dom<HTMLElement> | null}
     */
    /**
     * @template {El} T
     * @overload
     * @param {T} e
     * @returns {Dom<T>}
     */
    function (e) {
      //@ts-ignore
      const el = typeof e === 'string' ? $._ctx(this).querySelector(e) : e;
      return el ? new Dom(el) : null;
    },
    {
      /**
       * Create new element
       *
       * @template {keyof HTMLElementTagNameMap} K
       * @param {K} tag
       * @param {Partial<Props<K>>} props
       * @param {(Dom | string)[]} children
       * @returns {Dom<HTMLElementTagNameMap[K]>}
       */
      h(tag, props = {}, children = []) {
        const el = document.createElement(tag);
        const dom = $(el);
        //@ts-ignore
        dom.set(props);
        if (children.length) {
          el.append(...children.map((e) => (typeof e === 'string' ? e : e.el)));
        }
        return $(el);
      },
      /** Class string @param {ConvertProps['class']} [value] */
      class(value) {
        if (!value) return '';
        return typeof value === 'string' ? value : value.join(' ');
      },
      /** Style string @param {ConvertProps['style']} [value] */
      style(value) {
        if (!value) return '';
        if (typeof value === 'string') return value;
        return _.map(value, (v, k) => `${k}:${v}`).join(';');
      },
      /** @param {string | Dom} dom */
      el(dom) {
        return dom instanceof Dom
          ? dom.el
          : ($(dom)?.el ?? _.exit(`${dom} not found`));
      },
      _ctx(that) {
        return that instanceof Dom ? that.el : window.document;
      },
    },
  );
  /**
   * @template {keyof HTMLElementTagNameMap} K
   * @overload
   * @param {Selector<K>} e
   * @returns {Dom<HTMLElementTagNameMap[K]>[]}
   */
  /**
   * @overload
   * @param {string} e
   * @returns {Dom[]}
   */
  function $$(e) {
    //@ts-ignore
    return [...$._ctx(this).querySelectorAll(e)].map($);
  }
  /** @template {El} T */
  class Dom {
    /** @param {T} el */
    constructor(el) {
      /** @type {T} */
      this.el = el;
    }
    get shadow() {
      return $(
        this._astype(HTMLElement).shadowRoot ?? _.exit(`shadowRoot not found`),
      );
    }
    get children() {
      return [...this.el.children].map($);
    }
    /**
     * @template {El} T
     * @param {new (...e: any[]) => T} constructor
     */
    _astype(constructor) {
      return this.el instanceof constructor
        ? this.el
        : _.exit(`el is not ${constructor.name}`);
    }
    /**
     * @template {EventType<T>} K
     * @param {K} name
     * @param {T[`on${K}`]} listener
     * @param {boolean | AddEventListenerOptions} [options]
     */
    on(name, listener, options) {
      this.el.addEventListener(name, listener, options);
      return this;
    }
    /**
     * @template {EventType<T>} K
     * @param {K} name
     * @param {T[`on${K}`]} listener
     * @param {boolean | EventListenerOptions} [options]
     */
    off(name, listener, options) {
      this.el.removeEventListener(name, listener, options);
      return this;
    }
    /**
     * @template {EventType<T>} K
     * @overload
     * @param {K} evt
     * @param {EventInit} [options]
     * @returns {boolean}
     */
    /**
     * @overload
     * @param {Event} evt
     * @returns {boolean}
     */
    trigger(evt, options) {
      return this.el.dispatchEvent(
        typeof evt === 'string' ? new Event(evt, options) : evt,
      );
    }
    /**
     * @param {string | Dom} dom
     * @param {string | Dom | number} [pos]
     */
    mount(dom, pos) {
      const el = $.el(dom);
      pos === void 0
        ? el.appendChild(this.el)
        : el.insertBefore(
            this.el,
            typeof pos === 'number' ? el.childNodes[pos] : $.el(pos),
          );
      return this;
    }
    /**
     * @param {(
     *   observer: MutationObserver,
     *   records: MutationRecord[],
     * ) => void} callback
     * @param {MutationObserverInit} config
     */
    observe(callback, config) {
      const observer = new MutationObserver((records) =>
        callback(observer, records),
      );
      observer.observe(this.el, config);
      return this;
    }
    hide() {
      const el = this._astype(HTMLElement);
      requestAnimationFrame(() => {
        el.style.setProperty('display', 'none', 'important');
      });
    }
    /** @param {Partial<Props<ExtractKey<HTMLElementTagNameMap, T>>>} props */
    set(props) {
      const el = this._astype(HTMLElement);
      /**
       * @type {{
       *   [P in keyof ConvertProps]: (value: ConvertProps[P]) => void;
       * }}
       */
      const converts = {
        class: (value) => (el.className = $.class(value)),
        style: (value) => (el.style.cssText = $.style(value)),
      };
      _.each(converts, (convert, key) => {
        if (_.hasOwnKey(props, key)) {
          //@ts-ignore
          convert(props[key]);
          delete props[key];
        }
      });
      Object.assign(el, props);
      return this;
    }
  }
  Dom.prototype.$ = $;
  Dom.prototype.$$ = $$;

  const ui = (function () {
    const id = 'tm-ui';
    const shadow = {
      createRoot() {
        const container = $.h('section', {
          id: id,
          style: { position: 'fixed', 'z-index': 1e5 },
        }).mount('body').el;
        const shadow = container.attachShadow({ mode: 'open' });
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(`
                    :host{}
                    s-snackbar::part(container){background:var(--tm-snackbar-color)}
                `);
        shadow.adoptedStyleSheets = [sheet];
        return shadow;
      },
      get root() {
        return (
          document.querySelector('#' + id)?.shadowRoot ?? this.createRoot()
        );
      },
      get sheet() {
        return this.root.adoptedStyleSheets[0];
      },
      /** @returns {CSSStyleDeclaration} */
      get hostStyle() {
        //@ts-ignore
        return this.sheet.cssRules[0].style;
      },
    };
    /**
     * @template {HTMLElement & { show(): void; dismiss(): void }} T
     * @template {any[]} U Update args
     */
    class Popup {
      dom;
      update;
      #hasMounted = false;
      /**
       * @param {Dom<T>} dom
       * @param {(this: Dom<T>, ...e: U) => Parameters<T['show']> | void} update
       *   Update fn
       */
      constructor(dom, update) {
        const { tagName } = dom.el;
        if (!window.customElements.get(tagName.toLowerCase())) {
          log.warn(`${tagName} is not defined, please import sober`);
        }
        this.dom = dom;
        this.update = update.bind(this.dom);
      }
      /** @param {U} e */
      show(...e) {
        if (!this.#hasMounted) {
          shadow.root.appendChild(this.dom.el);
          this.#hasMounted = true;
        }
        //@ts-ignore
        this.dom.el.show(...(this.update(...e) ?? []));
      }
      close() {
        this.dom.el.dismiss();
      }
    }
    function cache(fn) {
      let cache = null;
      return function () {
        //@ts-ignore
        if (null === cache) cache = fn.call(this);
        return cache;
      };
    }
    const getters = {
      get snackbar() {
        return new Popup(
          $.h('s-snackbar'),
          /**
           * @param {string} text
           * @param {'crimson' | 'seagreen' | 'steelblue'} color
           * @param {number} duration
           */
          function (text, color = 'steelblue', duration = 2e3) {
            Object.assign(this.el, { textContent: text, duration });
            shadow.hostStyle.setProperty('--tm-snackbar-color', color);
          },
        );
      },
      get dialog() {
        return new Popup(
          $.h('s-dialog'),
          /**
           * @param {string} title
           * @param {string | HTMLTemplateResult} text
           * @param {(Partial<
           *   ConvertProps &
           *     Pick<HTMLElementTagNameMap['s-button'], 'type' | 'onclick'>
           * > & {
           *   text: string | HTMLTemplateResult;
           * })[]} actions
           */
          function (title, text, actions = []) {
            const titleTp = title
              ? lit.html`<div slot="headline">${title}</div>`
              : '';
            const conetntTp =
              typeof text === 'string' && text
                ? lit.html`<div slot="text">${text}</div>`
                : text;
            const actionsTp = actions.map((action) => {
              return lit.html`
                <s-button 
                  slot="action" 
                  class=${$.class(action.class)}
                  style=${$.style(action.style)}
                  type=${action.type}
                  .onclick=${action.onclick}
                >${action.text}</s-button>`;
            });
            lit.render([titleTp, conetntTp, actionsTp], this.el);
          },
        );
      },
      /**
       * @typedef {Partial<ConvertProps> & {
       *   text: string | HTMLTemplateResult;
       *   items: MenuItemOrGroup[];
       * }} MenuGroup
       *
       *
       * @typedef {Partial<ConvertProps> & {
       *   text: string | HTMLTemplateResult;
       *   onclick?: HTMLElementTagNameMap['s-popup-menu-item']['onclick'];
       * }} MenuItem
       *
       *
       * @typedef {MenuGroup | MenuItem} MenuItemOrGroup
       */
      get menu() {
        /**
         * @param {MenuItemOrGroup} item
         * @returns {item is MenuItem}
         */
        const isMenuItem = (item) => !_.hasOwnKey(item, 'items');
        /** @param {MenuItemOrGroup[]} items */
        function tp(items) {
          return items.map((item) =>
            isMenuItem(item)
              ? lit.html`
                <s-popup-menu-item
                  class=${$.class(item.class)}
                  style=${$.style(item.style)}
                  .onclick=${item.onclick}
                >${item.text}</s-popup-menu-item>`
              : lit.html`
                <s-popup-menu
                  class=${$.class(item.class)}
                  style=${$.style(item.style)}
                >
                  <s-popup-menu-item slot="trigger">
                    ${item.text}
                    <s-icon slot="end" type="arrow_drop_right"></s-icon>
                  </s-popup-menu-item>
                  ${tp(item.items)}
                </s-popup-menu>`,
          );
        }
        return new Popup(
          $.h('s-popup-menu'),
          /** @param {MenuItemOrGroup[]} items @param {string | Dom} target */
          function (items, target) {
            lit.render(tp(items), this.el);
            return [$.el(target)];
          },
        );
      },
      get confirm() {
        const dialog = this.dialog;
        const convert = ([text, onclick]) => ({ text, onclick });
        return new Popup(
          dialog.dom,
          /**
           * @typedef {[text: string, onclick: () => void]} Action
           * @param {string} title
           * @param {string | HTMLTemplateResult} text
           * @param {Action} ok
           * @param {Action} cancel
           * @returns
           */
          function (title, text, ok, cancel) {
            dialog.update(title, text, [
              { type: 'filled', ...convert(ok) },
              { type: 'outlined', ...convert(cancel) },
            ]);
          },
        );
      },
    };
    return Object.defineProperties(
      getters,
      _.mapValues(Object.getOwnPropertyDescriptors(getters), ({ get }) => ({
        get: cache(get),
      })),
    );
  })();
  const fs = {
    /**
     * @param {Blob} blob
     * @param {string} [filename]
     */
    save: function (
      blob,
      filename = prompt('filename') ?? `tm-${Date.now()}.download`,
    ) {
      $.h('a', {
        href: URL.createObjectURL(blob),
        download: filename,
      }).el.click();
    },
    /**
     * Dowload stream
     *
     * @param {string} url
     * @param {(info: { progress: number; received: number }) => void} [onProgress]
     * @param {(info: { progress: number; received: number }) => void} onBreakpoint
     */
    async download(
      url,
      onProgress,
      onBreakpoint = ({ progress, received }) => {
        log('breakpoint at', `${progress} %`, `${received} MB`);
      },
    ) {
      const handle = await window.showSaveFilePicker();
      const stream = await handle.createWritable();
      let total = 0,
        received = 0;
      const { promise, resolve, reject } = Promise.withResolvers();
      promise
        .finally(() => stream.close())
        .then(
          () => {
            log('download success');
          },
          (err) => {
            log('download error, breakpoint at', received);
            log.error(err);
          },
        );
      const getProgressInfo = () => ({
        progress: +((received / total) * 100).toFixed(2),
        received: +(received / 1024 ** 2).toFixed(0),
      });
      /** @param {ReadableStreamDefaultReader<Uint8Array>} reader */
      function pump(reader) {
        onProgress && onProgress(getProgressInfo());
        reader.read().then(
          ({ done, value }) => {
            if (done) {
              resolve('');
              return;
            }
            if (value) {
              stream.write(value);
              received += value.length;
            }
            pump(reader);
          },
          (err) => {
            if (err == 'TypeError: network error') {
              onBreakpoint(getProgressInfo());
              download();
            } else {
              reject(err);
            }
          },
        );
      }
      function download() {
        fetch(url, { headers: { Range: `bytes=${received}-` } }).then((res) => {
          if (!res.ok || !res.body) {
            reject('HTTP error');
            log.error(res);
            debugger;
            return;
          }
          total ||= +(res.headers.get('Content-Length') ?? 0);
          pump(res.body.getReader());
        }, reject);
      }
      download();
    },
  };
  /** Communicate between tabs */
  const comm = {
    signal: 'tm.comm signal',
    /**
     * @param {string} target
     * @param {{ [x: string]: Serializable }} data
     * @returns {Promise<null>}
     */
    send(target, data) {
      data[comm.signal] = true;
      /** @param {MessageEvent} e */
      function cb(e) {
        e.origin === targetOrigin && e.data == comm.signal && stop();
      }
      /** @param {string} [msg] */
      function stop(msg) {
        msg ?? log.error(msg);
        window.removeEventListener('message', cb);
        clearInterval(timer);
        resolve(null);
      }
      const { promise, resolve } = Promise.withResolvers();
      const win = window.open(target);
      const targetOrigin = new URL(target).origin;
      const timer = setInterval(() => {
        if (!win) return stop('win was blocked');
        if (win.closed) return stop('win was closed');
        win.postMessage(data, targetOrigin);
      }, 1e3);
      window.addEventListener('message', cb);
      return promise;
    },
    /** @param {string} sourceOrigin */
    receive(sourceOrigin) {
      let shouldStop = false;
      const { promise, resolve } = Promise.withResolvers();
      window.addEventListener('message', (e) => {
        if (shouldStop) {
          const source = e.source;
          if (source instanceof Window)
            source.postMessage(comm.signal, e.origin);
          else log("source is not Window, can't send stop signal", source);
          return;
        }
        if (e.origin !== sourceOrigin || !e.data[comm.signal]) return;
        log('receive signal', e.data);
        resolve(e.data);
        shouldStop = true;
      });
      return promise;
    },
  };
  const tm = /** @type {const} */ ({
    [Symbol.toStringTag]: 'tm',
    ...{ _, log, hack, $, $$, ui, fs, comm },
    import: _.mapValues(
      {
        axios: (v = 'latest') => `https://cdn.jsdelivr.net/npm/axios@${v}`,
        Cookies: (v = 'latest') =>
          `https://cdn.jsdelivr.net/npm/js-cookie@${v}`,
        FFmpeg: (v = 'latest') =>
          `https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@${v}`,
        html2canvas: (v = 'latest') =>
          `https://cdn.jsdelivr.net/npm/html2canvas@${v}`,
        tailwindcss: (v = '') => `https://cdn.tailwindcss.com/${v}`,
      },
      (getUrl) =>
        /** @param {string} version */
        (version) => {
          const url = getUrl(version);
          return fetch(url)
            .then(
              (e) => e.text(),
              () => {
                return '';
              },
            )
            .then((code) => new Function(code)());
        },
    ),
    /** @param {[match: RegExp | string, fn: () => void][]} map */
    matchURL(...map) {
      const url = document.URL;
      map.forEach(([str, fn]) => {
        (typeof str === 'string' ? url.includes(str) : str.test(url)) && fn();
      });
    },
    onRouteChange: (function () {
      const queue = [];
      const trigger = () => queue.forEach((cb) => cb());
      window.addEventListener('popstate', trigger);
      hack.override(History.prototype, 'pushState', ({ value }) => ({
        value(...e) {
          value.apply(this, e);
          trigger();
        },
      }));
      /** @param {() => void} cb */
      return (cb) => queue.push(cb);
    })(),
  });

  _.each(Object.freeze(tm), Object.freeze);
  return /** @type {typeof tm} */ (window['tm'] = Object.create(tm));
})();

tm.matchURL(
  ['youtube.com', () => tm.hack.cancelTrustedTypes()],
  ['fanyi.youdao.com', () => tm.hack.allowDevtool('chunk-vendors')],
);
