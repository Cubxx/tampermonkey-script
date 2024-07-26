// ==UserScript==
// @name        Global
// @version     0.2
// @author      Cubxx
// @match       *://*/*
// @updateURL   https://cdn.jsdelivr.net/gh/Cubxx/tampermonkey-script/src/global.user.js
// @downloadURL https://cdn.jsdelivr.net/gh/Cubxx/tampermonkey-script/src/global.user.js
// @icon        data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="%230bf" viewBox="0 0 1 1"><rect width="1" height="1"/></svg>
// @grant       none
// ==/UserScript==

(function () {
  'use strict';
  const { $, ui, _ } = tm;
  function copyText() {
    if (!navigator.clipboard) _.exit('not support navigator.clipboard');
    const text = getSelection()?.toString();
    if (!text) return;
    navigator.clipboard.writeText(text).then(
      () => ui.snackbar.show('copy success', 'seagreen'),
      (err) => ui.snackbar.show('copy failed', 'crimson'),
    );
  }
  function advancedNav() {
    const cfg = {
      google: 'https://www.google.com/search?q=',
      'google-scholar': 'https://scholar.google.com/scholar?q=',
      bing: 'https://www.bing.com/search?cc=us&q=',
      duck: 'https://duckduckgo.com/?q=',
      mdn: 'https://developer.mozilla.org/zh-CN/search?q=',
      github: 'https://github.com/search?q=',
      'github-user': 'https://github.com/',
      npm: 'https://www.npmjs.com/search?q=',
      'npm-pkg': 'https://www.npmjs.com/package/',
      bili: 'https://search.bilibili.com/all?keyword=',
      'bili-video': 'https://www.bilibili.com/video/',
      'bili-user': 'https://space.bilibili.com/',
      mfuns: 'https://www.mfuns.net/search?q=',
      youtube: 'https://www.youtube.com/results?search_query=',
      x: 'https://x.com/search?q=',
      stackoverflow: 'https://stackoverflow.com/search?q=',
      zhihu: 'https://www.zhihu.com/search?q=',
      zhipin: 'https://www.zhipin.com/web/geek/job?query=',
      steamdb: 'https://steamdb.info/search/?q=',
      greasyfork: 'https://greasyfork.org/zh-CN/scripts?q=',
      amap: 'https://ditu.amap.com/search?query=',
      scihub: 'https://sci-hub.st/',
      email: 'mailto:',
      wiki: 'https://wikipedia.org/w/index.php?search=',
    };
    let alias = 'duck',
      content = '';
    function setContent(e) {
      content = e.target.value;
      ui.confirm.update(...updateArgs());
    }
    function setAlias(e) {
      alias = typeof e === 'string' ? e : e.target.value;
      ui.confirm.update(...updateArgs());
    }
    function showCfg(e) {
      const text = e.target.value;
      if (!text) return;
      const aliases = Object.keys(cfg).filter((e) => e.startsWith(text));
      const items = aliases.map((e) => ({
        text: e,
        onclick: () => setAlias(e),
      }));
      if (!items.length) return;
      const el = ui.dialog.dom.$('s-text-field');
      sober.TextField;
      el && ui.menu.show(items, el);
    }
    const comp = () => lit.html`
      <div style="${$.style({
        margin: '15px 20px 0',
        font: 'large Consolas',
        display: 'grid',
        'grid-template-columns': '1fr 2fr',
        gap: '10px',
      })}">
        <s-text-field label="Alias" style="min-width: auto;">
          <input .value=${alias} @blur=${setAlias} @input=${showCfg} type="text"/>
        </s-text-field>
        <s-text-field label="Content">
          <textarea .value=${content} @blur=${setContent}></textarea>
        </s-text-field>
        <i style="${$.style({
          'grid-column-start': 1,
          'grid-column-end': 3,
          'font-size': 'small',
        })}">${cfg[alias] ?? 'https://...'}</i>
      </div>`;
    function search(target) {
      if (!_.hasOwnKey(cfg, alias)) {
        ui.snackbar.show(`not support ${alias}`, 'crimson');
        return;
      }
      const url = cfg[alias] + content;
      window.open(url, target);
    }
    const updateArgs = () =>
      /** @type {Parameters<typeof ui.confirm.show>} */ ([
        'Nav',
        comp(),
        ['New', () => search('_blank')],
        ['Redirect', () => search('_self')],
      ]);

    ui.confirm.show(...updateArgs());
    const el = ui.confirm.dom.$('s-text-field textarea')?.el;
    if (!el) return;
    el.focus();
    el.setSelectionRange(-1, -1);
  }
  function FnPanel() {
    /** @typedef {NonNullable<Parameters<typeof ui.dialog.show>[2]>} Btns */
    /** @type {Btns} */
    const pageBtns = [];
    tm.matchURL(
      [
        /github.(com|io)/,
        () =>
          pageBtns.push({
            text: 'Github Page',
            onclick() {
              const url = new URL(location.href);
              if (url.host === 'github.com') {
                const [_, author, rep] = url.pathname.split('/');
                window.open(`https://${author}.github.io/${rep}`);
              } else if (url.host.endsWith('.github.io')) {
                const author = url.host.replace('.github.io', '');
                const [_, rep] = url.pathname.split('/');
                window.open(`https://github.com/${author}/${rep}`);
              } else {
                ui.snackbar.show('not support this page', 'crimson');
              }
            },
          }),
      ],
      [
        'zhihu.com',
        () =>
          pageBtns.push({
            text: 'Clear Inbox',
            async onclick() {
              const { data } = await fetch(
                'https://www.zhihu.com/api/v4/inbox',
              ).then((e) => e.json());
              await Promise.allSettled(
                data.map(({ participant: { id } }) =>
                  fetch(`https://www.zhihu.com/api/v4/chat?sender_id=${id}`, {
                    method: 'delete',
                  }).then((e) => e.json()),
                ),
              );
            },
          }),
      ],
    );
    /** @type {Btns} */
    const commonBtns = [
      {
        text: 'Design Mode',
        style: {
          background: document.designMode === 'on' ? '#bbb' : '',
        },
        onclick() {
          _.toggle(document, 'designMode', ['on', 'off']);
        },
      },
    ];
    ui.dialog.show('', '', commonBtns.concat(pageBtns));
  }
  $(document).on(
    'keydown',
    (e) => {
      if (e.shiftKey && e.code === 'KeyC') {
        e.stopImmediatePropagation();
        copyText();
      }
      if (e.altKey && e.code === 'KeyQ') advancedNav();
      if (e.altKey && e.code === 'KeyS') FnPanel();
    },
    true,
  );
})();

(function () {
  'use strict';
  if (self != top) return;
  const { $$, log } = tm;

  /** @param {number} times */
  function remove(times = 1) {
    const ads = [
      [
        '.adsbygoogle', //google
        '.pb-ad', //google
        '.google-auto-placed', //google
        '.ap_container', //google
        '.ad', //google
        '.b_ad', //bing
        '.Pc-card', //zhihu-首页
        '.Pc-Business-Card-PcTopFeedBanner', //zhihu-首页
        '.Pc-word', //zhihu-问题
        '.jjjjasdasd', //halihali
        '.Ads', //nico
        '.ads', //nico
        '.baxia-dialog', //amap
        '.sufei-dialog', //amap
        '.app-download-panel', //amap
        '#player-ads', //ytb
        '#masthead-ad', //ytb
        'ytd-ad-slot-renderer', //ytb
        '#google_esf', //google
        'li[data-layout=ad]', //duck
        'img[alt=AD]', //acgbox
        'div[id="1280_adv"]',
        '.c-ad', //nature
        '.wwads-container', //vitepress
        '.VPDocAsideCarbonAds', //vitepress
      ].map((e) => $$(e)),
      /** @type {const} */ ([
        ['iframe', 'src', /googleads/],
        ['iframe', 'src', /app.moegirl/],
        ['iframe', 'src', /ads.nicovideo.jp/],
      ]).map(([tag, key, reg]) =>
        $$(tag).filter(({ el }) => reg.test(el[key])),
      ),
    ]
      .flat(2)
      .filter((e) => e.el.style.display !== 'none' && (e.hide(), true))
      .map((e) => e.el);
    if (ads.length) log('globalAD', ads);
    if (times < 5) setTimeout(() => remove(++times), 200);
  }
  remove();
  window.addEventListener('load', () => remove());
})();

(function () {
  'use strict';
  /**
   * @type {Record<
   *   string,
   *   ((sp: URLSearchParams) => string | null) | null
   * >}
   */
  const arr = {
    'link.zhihu.com': null,
    'link.csdn.net': null,
    'link.juejin.cn': null,
    'c.pc.qq.com': (sp) => {
      const url = sp.get('url') || sp.get('pfurl');
      return url && (url.includes('://') ? url : 'https://' + url);
    },
    'gitee.com/link': null,
    'www.jianshu.com/go-wild': (sp) => sp.get('url'),
    'docs.qq.com/scenario/link.html': (sp) => sp.get('url'),
    'afdian.com/link': null,
    'mail.qq.com/cgi-bin/readtemplate': (sp) => sp.get('gourl'),
  };
  for (let path in arr) {
    if (location.href.includes(path)) {
      const sp = new URL(document.URL).searchParams;
      const target = arr[path]?.(sp) ?? sp.get('target');
      if (target) location.href = target;
      else return tm.log("can't skip this url");
    }
  }
})();

(function () {
  'use strict';
  if (self != top) return;
  const { $, $$, hack, log } = tm;
  tm.matchURL(
    [
      'bing.com',
      () => {
        const url = new URL(location.href);
        if (url.pathname === '/ck/a') return;
        const search = url.searchParams;
        if (search.get('cc') === 'us' && search.get('mkt') === null) return;
        search.set('cc', 'us');
        search.delete('mkt');
        location.search = search + '';
      },
    ],
    [
      /www.bing.com\/(search|chat)\?/,
      () => {
        //禁止自动跳转
        hack.override(document, 'visibilityState', () => ({
          get: () => 'visible',
        }));
        //界面优化
        let times = 0;
        $('body')?.observe(
          function (ob) {
            const main = $('cib-serp')?.shadow;
            if (!main) return;
            //清空会话
            const surface = main
              .$('#cib-conversation-main')
              ?.children[0].shadow?.$('.threads-container .surface');
            if (!surface) return;
            const threads = surface.$('.threads');
            if (!threads) return;
            if (times) return ob.disconnect();
            const clearBtn = $.h('input', {
              type: 'button',
              value: 'Clear',
              class: 'show-recent',
              onclick() {
                threads.$$('cib-thread').forEach((e) => {
                  e.shadow?.$('.delete')?.el['click']();
                  setTimeout(() => {
                    e.shadow?.$('.confirm')?.el['click']();
                  }, 50);
                });
              },
            });
            clearBtn.mount(surface);
            //历史会话
            surface.observe(
              function (ob) {
                surface.$('button')?.hide();
                ob.disconnect();
              },
              { childList: true },
            );
            threads.observe(
              function () {
                threads
                  .$$('cib-thread')
                  ?.forEach((e) => e.el.removeAttribute('hide'));
              },
              { childList: true },
            );
            times++;
            ob.disconnect();
          },
          { childList: true },
        );
      },
    ],

    [
      /developer.mozilla.org\/[\w-]+\/docs/,
      () => {
        if (location.href.includes('zh-CN')) return;
        if (history.length > 2) return;
        history.pushState(
          null,
          '',
          (location.href = location.href.replace(
            /\/([\w-]+)\/docs/,
            '/zh-CN/docs',
          )),
        );
      },
    ],

    [
      /www.zhihu.com\/(follow)?$/,
      () => {
        $('#TopstoryContent')?.on('click', (e) => {
          //@ts-ignore
          if (e.target.classList[1] != 'ContentItem-more') return;
          //@ts-ignore
          const el = e.target.parentElement?.parentElement?.parentElement;
          el.observe(
            function (ob) {
              const childrens = [...el.children];
              const time = childrens.filter((e) =>
                /(发布|编辑)于/.test(e.innerText),
              )[0];
              const vote = childrens.filter((e) =>
                /赞同了该(回答|文章)/.test(e.innerText),
              )[0];
              if (vote) vote.hide();
              if (!time) return log('time not found');
              el.insertBefore(time, el.children[0]);
              el.$('.ContentItem-time').innerHTML +=
                '<br>Paragraph num ' + el.$$('.RichContent-inner p').length;
              ob.disconnect();
            },
            { childList: true },
          );
        });
      },
    ],
    [
      'www.zhihu.com/question',
      () => {
        $('.App-main .QuestionHeader-title')?.set({
          title: `Create on ${
            $('meta[itemprop=dateCreated]')?.el.content
          }\nEdit on${$('meta[itemprop=dateModified]')?.el.content}`,
        });
        $('header')?.hide();
      },
    ],
    [
      'zhuanlan.zhihu.com/p',
      () => {
        $('.ContentItem-time')?.mount('article', '.Post-RichTextContainer');
      },
    ],

    [
      'heroicons.dev',
      () => {
        $('#root > aside.sidebar-2 > div')?.hide();
      },
    ],

    [
      'www.pixiv.net/artworks',
      () => {
        function delADs() {
          $$('iframe').forEach((e) => e.hide());
        }
        // delADs();
        $('body')?.observe(delADs, { childList: true });
      },
    ],

    [
      'www.acgbox.link',
      () => {
        $$('a.card').map((e) => {
          e.set({ href: e.el.dataset.url });
        });
      },
    ],

    [
      'nature.com',
      () => {
        $$('a.c-card__link').map((e) => {
          e.el.classList.add('c-card__link--no-block-link');
        });
      },
    ],
  );
})();
