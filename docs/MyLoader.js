var myGameInstance = null;

function createUnityInstance(canvas, config, onProgress) {
  onProgress = onProgress || function () {};

  function errorListener(e) {
    var error = e.type == "unhandledrejection" && typeof e.reason == "object" ? e.reason : typeof e.error == "object" ? e.error : null;
    var message = error ? error.toString() : typeof e.message == "string" ? e.message : typeof e.reason == "string" ? e.reason : "";
    if (error && typeof error.stack == "string")
      message += "\n" + error.stack.substring(!error.stack.lastIndexOf(message, 0) ? message.length : 0).replace(/(^\n*|\n*$)/g, "");
    if (!message || !Module.stackTraceRegExp || !Module.stackTraceRegExp.test(message))
      return;
    var filename =
      e instanceof ErrorEvent ? e.filename :
      error && typeof error.fileName == "string" ? error.fileName :
      error && typeof error.sourceURL == "string" ? error.sourceURL :
      "";
    var lineno =
      e instanceof ErrorEvent ? e.lineno :
      error && typeof error.lineNumber == "number" ? error.lineNumber :
      error && typeof error.line == "number" ? error.line :
      0;
    errorHandler(message, filename, lineno);
  }

  var Module = {
    canvas: canvas,
    webglContextAttributes: {
      preserveDrawingBuffer: false,
    },
    cacheControl: function (url) {
      return url == Module.dataUrl ? "must-revalidate" : "no-store";
    },
    streamingAssetsUrl: "StreamingAssets",
    downloadProgress: {},
    deinitializers: [],
    intervals: {},
    setInterval: function (func, ms) {
      var id = window.setInterval(func, ms);
      this.intervals[id] = true;
      return id;
    },
    clearInterval: function(id) {
      delete this.intervals[id];
      window.clearInterval(id);
    },
    preRun: [],
    postRun: [],
    print: function (message) {
      console.log(message);
    },
    printErr: function (message) {
      console.error(message);
    },
    locateFile: function (url) {
      return (
        url
      );
    },
    disabledCanvasEvents: [
      "contextmenu",
      "dragstart",
    ],
  };

  for (var parameter in config)
    Module[parameter] = config[parameter];

  Module.streamingAssetsUrl = new URL(Module.streamingAssetsUrl, document.URL).href;

  // Operate on a clone of Module.disabledCanvasEvents field so that at Quit time
  // we will ensure we'll remove the events that we created (in case user has
  // modified/cleared Module.disabledCanvasEvents in between)
  var disabledCanvasEvents = Module.disabledCanvasEvents.slice();

  function preventDefault(e) {
    e.preventDefault();
  }

  disabledCanvasEvents.forEach(function (disabledCanvasEvent) {
    canvas.addEventListener(disabledCanvasEvent, preventDefault);
  });

  window.addEventListener("error", errorListener);
  window.addEventListener("unhandledrejection", errorListener);

  var unityInstance = {
    Module: Module,
    SetFullscreen: function () {
      if (Module.SetFullscreen)
        return Module.SetFullscreen.apply(Module, arguments);
      Module.print("Failed to set Fullscreen mode: Player not loaded yet.");
    },
    SendMessage: function () {
      if (Module.SendMessage)
        return Module.SendMessage.apply(Module, arguments);
      Module.print("Failed to execute SendMessage: Player not loaded yet.");
    },
    Quit: function () {
      return new Promise(function (resolve, reject) {
        Module.shouldQuit = true;
        Module.onQuit = resolve;

        // Clear the event handlers we added above, so that the event handler
        // functions will not hold references to this JS function scope after
        // exit, to allow JS garbage collection to take place.
        disabledCanvasEvents.forEach(function (disabledCanvasEvent) {
          canvas.removeEventListener(disabledCanvasEvent, preventDefault);
        });
        window.removeEventListener("error", errorListener);
        window.removeEventListener("unhandledrejection", errorListener);
      });
    },
  };

  Module.SystemInfo = (function () {

    var browser, browserVersion, os, osVersion, canvas, gpu;

    var ua = navigator.userAgent + ' ';
    var browsers = [
      ['Firefox', 'Firefox'],
      ['OPR', 'Opera'],
      ['Edg', 'Edge'],
      ['SamsungBrowser', 'Samsung Browser'],
      ['Trident', 'Internet Explorer'],
      ['MSIE', 'Internet Explorer'],
      ['Chrome', 'Chrome'],
      ['Safari', 'Safari'],
    ];

    function extractRe(re, str, idx) {
      re = RegExp(re, 'i').exec(str);
      return re && re[idx];
    }
    for(var b = 0; b < browsers.length; ++b) {
      browserVersion = extractRe(browsers[b][0] + '[\/ ](.*?)[ \\)]', ua, 1);
      if (browserVersion) {
        browser = browsers[b][1];
        break;
      }
    }
    if (browser == 'Safari') browserVersion = extractRe('Version\/(.*?) ', ua, 1);
    if (browser == 'Internet Explorer') browserVersion = extractRe('rv:(.*?)\\)? ', ua, 1) || browserVersion;

    var oses = [
      ['Windows (.*?)[;\)]', 'Windows'],
      ['Android ([0-9_\.]+)', 'Android'],
      ['iPhone OS ([0-9_\.]+)', 'iPhoneOS'],
      ['iPad.*? OS ([0-9_\.]+)', 'iPadOS'],
      ['FreeBSD( )', 'FreeBSD'],
      ['OpenBSD( )', 'OpenBSD'],
      ['Linux|X11()', 'Linux'],
      ['Mac OS X ([0-9_\.]+)', 'macOS'],
      ['bot|google|baidu|bing|msn|teoma|slurp|yandex', 'Search Bot']
    ];
    for(var o = 0; o < oses.length; ++o) {
      osVersion = extractRe(oses[o][0], ua, 1);
      if (osVersion) {
        os = oses[o][1];
        osVersion = osVersion.replace(/_/g, '.');
        break;
      }
    }
    var versionMappings = {
      'NT 5.0': '2000',
      'NT 5.1': 'XP',
      'NT 5.2': 'Server 2003',
      'NT 6.0': 'Vista',
      'NT 6.1': '7',
      'NT 6.2': '8',
      'NT 6.3': '8.1',
      'NT 10.0': '10'
    };
    osVersion = versionMappings[osVersion] || osVersion;

    // TODO: Add mobile device identifier, e.g. SM-G960U

    canvas = document.createElement("canvas");
    if (canvas) {
      gl = canvas.getContext("webgl2");
      glVersion = gl ? 2 : 0;
      if (!gl) {
        if (gl = canvas && canvas.getContext("webgl")) glVersion = 1;
      }

      if (gl) {
        gpu = (gl.getExtension("WEBGL_debug_renderer_info") && gl.getParameter(0x9246 /*debugRendererInfo.UNMASKED_RENDERER_WEBGL*/)) || gl.getParameter(0x1F01 /*gl.RENDERER*/);
      }
    }

    var hasThreads = typeof SharedArrayBuffer !== 'undefined';
    var hasWasm = typeof WebAssembly === "object" && typeof WebAssembly.compile === "function";
    return {
      width: screen.width,
      height: screen.height,
      userAgent: ua.trim(),
      browser: browser,
      browserVersion: browserVersion,
      mobile: /Mobile|Android|iP(ad|hone)/.test(navigator.appVersion),
      os: os,
      osVersion: osVersion,
      gpu: gpu,
      language: navigator.userLanguage || navigator.language,
      hasWebGL: glVersion,
      hasCursorLock: !!document.body.requestPointerLock,
      hasFullscreen: !!document.body.requestFullscreen,
      hasThreads: hasThreads,
      hasWasm: hasWasm,
      hasWasmThreads: (function() {
        var wasmMemory = hasWasm && hasThreads && new WebAssembly.Memory({"initial": 1, "maximum": 1, "shared": true});
        return wasmMemory && wasmMemory.buffer instanceof SharedArrayBuffer;
      })(),
    };
  })();

  function errorHandler(message, filename, lineno) {
    if (Module.startupErrorHandler) {
      Module.startupErrorHandler(message, filename, lineno);
      return;
    }
    if (Module.errorHandler && Module.errorHandler(message, filename, lineno))
      return;
    console.log("Invoking error handler due to\n" + message);
    if (typeof dump == "function")
      dump("Invoking error handler due to\n" + message);
    // Firefox has a bug where it's IndexedDB implementation will throw UnknownErrors, which are harmless, and should not be shown.
    if (message.indexOf("UnknownError") != -1)
      return;
    // Ignore error when application terminated with return code 0
    if (message.indexOf("Program terminated with exit(0)") != -1)
      return;
    if (errorHandler.didShowErrorMessage)
      return;
    var message = "An error occurred running the Unity content on this page. See your browser JavaScript console for more info. The error was:\n" + message;
    if (message.indexOf("DISABLE_EXCEPTION_CATCHING") != -1) {
      message = "An exception has occurred, but exception handling has been disabled in this build. If you are the developer of this content, enable exceptions in your project WebGL player settings to be able to catch the exception or see the stack trace.";
    } else if (message.indexOf("Cannot enlarge memory arrays") != -1) {
      message = "Out of memory. If you are the developer of this content, try allocating more memory to your WebGL build in the WebGL player settings.";
    } else if (message.indexOf("Invalid array buffer length") != -1  || message.indexOf("Invalid typed array length") != -1 || message.indexOf("out of memory") != -1 || message.indexOf("could not allocate memory") != -1) {
      message = "The browser could not allocate enough memory for the WebGL content. If you are the developer of this content, try allocating less memory to your WebGL build in the WebGL player settings.";
    }
    alert(message);
    errorHandler.didShowErrorMessage = true;
  }


  Module.abortHandler = function (message) {
    errorHandler(message, "", 0);
    return true;
  };

  Error.stackTraceLimit = Math.max(Error.stackTraceLimit || 0, 50);

  function progressUpdate(id, e) {
    if (id == "symbolsUrl")
      return;
    var progress = Module.downloadProgress[id];
    if (!progress)
      progress = Module.downloadProgress[id] = {
        started: false,
        finished: false,
        lengthComputable: false,
        total: 0,
        loaded: 0,
      };
    if (typeof e == "object" && (e.type == "progress" || e.type == "load")) {
      if (!progress.started) {
        progress.started = true;
        progress.lengthComputable = e.lengthComputable;
        progress.total = e.total;
      }
      progress.loaded = e.loaded;
      if (e.type == "load")
        progress.finished = true;
    }
    var loaded = 0, total = 0, started = 0, computable = 0, unfinishedNonComputable = 0;
    for (var id in Module.downloadProgress) {
      var progress = Module.downloadProgress[id];
      if (!progress.started)
        return 0;
      started++;
      if (progress.lengthComputable) {
        loaded += progress.loaded;
        total += progress.total;
        computable++;
      } else if (!progress.finished) {
        unfinishedNonComputable++;
      }
    }
    var totalProgress = started ? (started - unfinishedNonComputable - (total ? computable * (total - loaded) / total : 0)) / started : 0;
    onProgress(0.9 * totalProgress);
  }

    Module.XMLHttpRequest = function () {
    var UnityCacheDatabase = { name: "UnityCache", version: 2 };
    var XMLHttpRequestStore = { name: "XMLHttpRequest", version: 1 };
    var WebAssemblyStore = { name: "WebAssembly", version: 1 };
    
    function log(message) {
      console.log("[UnityCache] " + message);
    }
    
    function resolveURL(url) {
      resolveURL.link = resolveURL.link || document.createElement("a");
      resolveURL.link.href = url;
      return resolveURL.link.href;
    }
    
    function isCrossOriginURL(url) {
      var originMatch = window.location.href.match(/^[a-z]+:\/\/[^\/]+/);
      return !originMatch || url.lastIndexOf(originMatch[0], 0);
    }

    function UnityCache() {
      var cache = this;
      cache.queue = [];

      function initDatabase(database) {
        if (typeof cache.database != "undefined")
          return;
        cache.database = database;
        if (!cache.database)
          log("indexedDB database could not be opened");
        while (cache.queue.length) {
          var queued = cache.queue.shift();
          if (cache.database) {
            cache.execute.apply(cache, queued.arguments);
          } else if (typeof queued.onerror == "function") {
            queued.onerror(new Error("operation cancelled"));
          }
        }
      }
      
      try {
        var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        function upgradeDatabase() {
          var openRequest = indexedDB.open(UnityCacheDatabase.name, UnityCacheDatabase.version);
          openRequest.onupgradeneeded = function (e) {
            var database = e.target.result;
            if (!database.objectStoreNames.contains(WebAssemblyStore.name))
              database.createObjectStore(WebAssemblyStore.name);
          };
          openRequest.onsuccess = function (e) { initDatabase(e.target.result); };
          openRequest.onerror = function () { initDatabase(null); };
        }

        // Workaround for WebKit bug 226547:
        // On very first page load opening a connection to IndexedDB hangs without triggering onerror.
        // Add a timeout that triggers the error handling code.
        var indexedDBTimeout = setTimeout(function () {
          if (typeof cache.database != "undefined")
            return;
          
          initDatabase(null);  
        }, 2000);

        var openRequest = indexedDB.open(UnityCacheDatabase.name);
        openRequest.onupgradeneeded = function (e) {
          var objectStore = e.target.result.createObjectStore(XMLHttpRequestStore.name, { keyPath: "url" });
          ["version", "company", "product", "updated", "revalidated", "accessed"].forEach(function (index) { objectStore.createIndex(index, index); });
        };
        openRequest.onsuccess = function (e) {
          clearTimeout(indexedDBTimeout);

          var database = e.target.result;
          if (database.version < UnityCacheDatabase.version) {
            database.close();
            upgradeDatabase();
          } else {
            initDatabase(database);
          }
        };
        openRequest.onerror = function () {
          clearTimeout(indexedDBTimeout);
          initDatabase(null);
        };
      } catch (e) {
        clearTimeout(indexedDBTimeout);
        initDatabase(null);
      }
    };
    
    UnityCache.prototype.execute = function (store, operation, parameters, onsuccess, onerror) {
      if (this.database) {
        try {
          var target = this.database.transaction([store], ["put", "delete", "clear"].indexOf(operation) != -1 ? "readwrite" : "readonly").objectStore(store);
          if (operation == "openKeyCursor") {
            target = target.index(parameters[0]);
            parameters = parameters.slice(1);
          }
          var request = target[operation].apply(target, parameters);
          if (typeof onsuccess == "function")
            request.onsuccess = function (e) { onsuccess(e.target.result); };
          request.onerror = onerror;
        } catch (e) {
          if (typeof onerror == "function")
            onerror(e);
        }
      } else if (typeof this.database == "undefined") {
        this.queue.push({
          arguments: arguments,
          onerror: onerror
        });
      } else if (typeof onerror == "function") {
        onerror(new Error("indexedDB access denied"));
      }
    };
    
    var unityCache = new UnityCache();
    
    function createXMLHttpRequestResult(url, company, product, timestamp, xhr) {
      var result = { url: url, version: XMLHttpRequestStore.version, company: company, product: product, updated: timestamp, revalidated: timestamp, accessed: timestamp, responseHeaders: {}, xhr: {} };
      if (xhr) {
        ["Last-Modified", "ETag"].forEach(function (header) { result.responseHeaders[header] = xhr.getResponseHeader(header); });
        ["responseURL", "status", "statusText", "response"].forEach(function (property) { result.xhr[property] = xhr[property]; });
      }
      return result;
    }

    function CachedXMLHttpRequest(objParameters) {
      this.cache = { enabled: false };
      if (objParameters) {
        this.cache.control = objParameters.cacheControl;
        this.cache.company = objParameters.companyName;
        this.cache.product = objParameters.productName;
      }
      this.xhr = new XMLHttpRequest(objParameters);
      this.xhr.addEventListener("load", function () {
        var xhr = this.xhr, cache = this.cache;
        if (!cache.enabled || cache.revalidated)
          return;
        if (xhr.status == 304) {
          cache.result.revalidated = cache.result.accessed;
          cache.revalidated = true;
          unityCache.execute(XMLHttpRequestStore.name, "put", [cache.result]);
          log("'" + cache.result.url + "' successfully revalidated and served from the indexedDB cache");
        } else if (xhr.status == 200) {
          cache.result = createXMLHttpRequestResult(cache.result.url, cache.company, cache.product, cache.result.accessed, xhr);
          cache.revalidated = true;
          unityCache.execute(XMLHttpRequestStore.name, "put", [cache.result], function (result) {
            log("'" + cache.result.url + "' successfully downloaded and stored in the indexedDB cache");
          }, function (error) {
            log("'" + cache.result.url + "' successfully downloaded but not stored in the indexedDB cache due to the error: " + error);
          });
        } else {
          log("'" + cache.result.url + "' request failed with status: " + xhr.status + " " + xhr.statusText);
        }
      }.bind(this));
    };
    
    CachedXMLHttpRequest.prototype.send = function (data) {
      var xhr = this.xhr, cache = this.cache;
      var sendArguments = arguments;
      cache.enabled = cache.enabled && xhr.responseType == "arraybuffer" && !data;
      if (!cache.enabled)
        return xhr.send.apply(xhr, sendArguments);
      unityCache.execute(XMLHttpRequestStore.name, "get", [cache.result.url], function (result) {
        if (!result || result.version != XMLHttpRequestStore.version) {
          xhr.send.apply(xhr, sendArguments);
          return;
        }
        cache.result = result;
        cache.result.accessed = Date.now();
        if (cache.control == "immutable") {
          cache.revalidated = true;
          unityCache.execute(XMLHttpRequestStore.name, "put", [cache.result]);
          xhr.dispatchEvent(new Event('load'));
          log("'" + cache.result.url + "' served from the indexedDB cache without revalidation");
        } else if (isCrossOriginURL(cache.result.url) && (cache.result.responseHeaders["Last-Modified"] || cache.result.responseHeaders["ETag"])) {
          var headXHR = new XMLHttpRequest();
          headXHR.open("HEAD", cache.result.url);
          headXHR.onload = function () {
            cache.revalidated = ["Last-Modified", "ETag"].every(function (header) {
              return !cache.result.responseHeaders[header] || cache.result.responseHeaders[header] == headXHR.getResponseHeader(header);
            });
            if (cache.revalidated) {
              cache.result.revalidated = cache.result.accessed;
              unityCache.execute(XMLHttpRequestStore.name, "put", [cache.result]);
              xhr.dispatchEvent(new Event('load'));
              log("'" + cache.result.url + "' successfully revalidated and served from the indexedDB cache");
            } else {
              xhr.send.apply(xhr, sendArguments);
            }
          }
          headXHR.send();
        } else {
          if (cache.result.responseHeaders["Last-Modified"]) {
            xhr.setRequestHeader("If-Modified-Since", cache.result.responseHeaders["Last-Modified"]);
            xhr.setRequestHeader("Cache-Control", "no-cache");
          } else if (cache.result.responseHeaders["ETag"]) {
            xhr.setRequestHeader("If-None-Match", cache.result.responseHeaders["ETag"]);
            xhr.setRequestHeader("Cache-Control", "no-cache");
          }
          xhr.send.apply(xhr, sendArguments);
        }
      }, function (error) {
        xhr.send.apply(xhr, sendArguments);
      });
    };
    
    CachedXMLHttpRequest.prototype.open = function (method, url, async, user, password) {
      this.cache.result = createXMLHttpRequestResult(resolveURL(url), this.cache.company, this.cache.product, Date.now());
      this.cache.enabled = ["must-revalidate", "immutable"].indexOf(this.cache.control) != -1 && method == "GET" && this.cache.result.url.match("^https?:\/\/")
        && (typeof async == "undefined" || async) && typeof user == "undefined" && typeof password == "undefined";
      this.cache.revalidated = false;
      return this.xhr.open.apply(this.xhr, arguments);
    };
    
    CachedXMLHttpRequest.prototype.setRequestHeader = function (header, value) {
      this.cache.enabled = false;
      return this.xhr.setRequestHeader.apply(this.xhr, arguments);
    };
    
    var xhr = new XMLHttpRequest();
    for (var property in xhr) {
      if (!CachedXMLHttpRequest.prototype.hasOwnProperty(property)) {
        (function (property) {
          Object.defineProperty(CachedXMLHttpRequest.prototype, property, typeof xhr[property] == "function" ? {
            value: function () { return this.xhr[property].apply(this.xhr, arguments); },
          } : {
            get: function () { return this.cache.revalidated && this.cache.result.xhr.hasOwnProperty(property) ? this.cache.result.xhr[property] : this.xhr[property]; },
            set: function (value) { this.xhr[property] = value; },
          });
        })(property);
      }
    }
    
    return CachedXMLHttpRequest;
  } ();


  var decompressors = {
    gzip: {
      require: function require(e){var t={"inflate.js":function(e,t,i){"use strict";function n(e){if(!(this instanceof n))return new n(e);this.options=o.assign({chunkSize:16384,windowBits:0,to:""},e||{});var t=this.options;t.raw&&t.windowBits>=0&&t.windowBits<16&&(t.windowBits=-t.windowBits,0===t.windowBits&&(t.windowBits=-15)),!(t.windowBits>=0&&t.windowBits<16)||e&&e.windowBits||(t.windowBits+=32),t.windowBits>15&&t.windowBits<48&&0===(15&t.windowBits)&&(t.windowBits|=15),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new h,this.strm.avail_out=0;var i=s.inflateInit2(this.strm,t.windowBits);if(i!==f.Z_OK)throw new Error(d[i]);this.header=new u,s.inflateGetHeader(this.strm,this.header)}function a(e,t){var i=new n(t);if(i.push(e,!0),i.err)throw i.msg||d[i.err];return i.result}function r(e,t){return t=t||{},t.raw=!0,a(e,t)}var s=e("./zlib/inflate"),o=e("./utils/common"),l=e("./utils/strings"),f=e("./zlib/constants"),d=e("./zlib/messages"),h=e("./zlib/zstream"),u=e("./zlib/gzheader"),c=Object.prototype.toString;n.prototype.push=function(e,t){var i,n,a,r,d,h,u=this.strm,b=this.options.chunkSize,w=this.options.dictionary,m=!1;if(this.ended)return!1;n=t===~~t?t:t===!0?f.Z_FINISH:f.Z_NO_FLUSH,"string"==typeof e?u.input=l.binstring2buf(e):"[object ArrayBuffer]"===c.call(e)?u.input=new Uint8Array(e):u.input=e,u.next_in=0,u.avail_in=u.input.length;do{if(0===u.avail_out&&(u.output=new o.Buf8(b),u.next_out=0,u.avail_out=b),i=s.inflate(u,f.Z_NO_FLUSH),i===f.Z_NEED_DICT&&w&&(h="string"==typeof w?l.string2buf(w):"[object ArrayBuffer]"===c.call(w)?new Uint8Array(w):w,i=s.inflateSetDictionary(this.strm,h)),i===f.Z_BUF_ERROR&&m===!0&&(i=f.Z_OK,m=!1),i!==f.Z_STREAM_END&&i!==f.Z_OK)return this.onEnd(i),this.ended=!0,!1;u.next_out&&(0!==u.avail_out&&i!==f.Z_STREAM_END&&(0!==u.avail_in||n!==f.Z_FINISH&&n!==f.Z_SYNC_FLUSH)||("string"===this.options.to?(a=l.utf8border(u.output,u.next_out),r=u.next_out-a,d=l.buf2string(u.output,a),u.next_out=r,u.avail_out=b-r,r&&o.arraySet(u.output,u.output,a,r,0),this.onData(d)):this.onData(o.shrinkBuf(u.output,u.next_out)))),0===u.avail_in&&0===u.avail_out&&(m=!0)}while((u.avail_in>0||0===u.avail_out)&&i!==f.Z_STREAM_END);return i===f.Z_STREAM_END&&(n=f.Z_FINISH),n===f.Z_FINISH?(i=s.inflateEnd(this.strm),this.onEnd(i),this.ended=!0,i===f.Z_OK):n!==f.Z_SYNC_FLUSH||(this.onEnd(f.Z_OK),u.avail_out=0,!0)},n.prototype.onData=function(e){this.chunks.push(e)},n.prototype.onEnd=function(e){e===f.Z_OK&&("string"===this.options.to?this.result=this.chunks.join(""):this.result=o.flattenChunks(this.chunks)),this.chunks=[],this.err=e,this.msg=this.strm.msg},i.Inflate=n,i.inflate=a,i.inflateRaw=r,i.ungzip=a},"utils/common.js":function(e,t,i){"use strict";var n="undefined"!=typeof Uint8Array&&"undefined"!=typeof Uint16Array&&"undefined"!=typeof Int32Array;i.assign=function(e){for(var t=Array.prototype.slice.call(arguments,1);t.length;){var i=t.shift();if(i){if("object"!=typeof i)throw new TypeError(i+"must be non-object");for(var n in i)i.hasOwnProperty(n)&&(e[n]=i[n])}}return e},i.shrinkBuf=function(e,t){return e.length===t?e:e.subarray?e.subarray(0,t):(e.length=t,e)};var a={arraySet:function(e,t,i,n,a){if(t.subarray&&e.subarray)return void e.set(t.subarray(i,i+n),a);for(var r=0;r<n;r++)e[a+r]=t[i+r]},flattenChunks:function(e){var t,i,n,a,r,s;for(n=0,t=0,i=e.length;t<i;t++)n+=e[t].length;for(s=new Uint8Array(n),a=0,t=0,i=e.length;t<i;t++)r=e[t],s.set(r,a),a+=r.length;return s}},r={arraySet:function(e,t,i,n,a){for(var r=0;r<n;r++)e[a+r]=t[i+r]},flattenChunks:function(e){return[].concat.apply([],e)}};i.setTyped=function(e){e?(i.Buf8=Uint8Array,i.Buf16=Uint16Array,i.Buf32=Int32Array,i.assign(i,a)):(i.Buf8=Array,i.Buf16=Array,i.Buf32=Array,i.assign(i,r))},i.setTyped(n)},"utils/strings.js":function(e,t,i){"use strict";function n(e,t){if(t<65537&&(e.subarray&&s||!e.subarray&&r))return String.fromCharCode.apply(null,a.shrinkBuf(e,t));for(var i="",n=0;n<t;n++)i+=String.fromCharCode(e[n]);return i}var a=e("./common"),r=!0,s=!0;try{String.fromCharCode.apply(null,[0])}catch(e){r=!1}try{String.fromCharCode.apply(null,new Uint8Array(1))}catch(e){s=!1}for(var o=new a.Buf8(256),l=0;l<256;l++)o[l]=l>=252?6:l>=248?5:l>=240?4:l>=224?3:l>=192?2:1;o[254]=o[254]=1,i.string2buf=function(e){var t,i,n,r,s,o=e.length,l=0;for(r=0;r<o;r++)i=e.charCodeAt(r),55296===(64512&i)&&r+1<o&&(n=e.charCodeAt(r+1),56320===(64512&n)&&(i=65536+(i-55296<<10)+(n-56320),r++)),l+=i<128?1:i<2048?2:i<65536?3:4;for(t=new a.Buf8(l),s=0,r=0;s<l;r++)i=e.charCodeAt(r),55296===(64512&i)&&r+1<o&&(n=e.charCodeAt(r+1),56320===(64512&n)&&(i=65536+(i-55296<<10)+(n-56320),r++)),i<128?t[s++]=i:i<2048?(t[s++]=192|i>>>6,t[s++]=128|63&i):i<65536?(t[s++]=224|i>>>12,t[s++]=128|i>>>6&63,t[s++]=128|63&i):(t[s++]=240|i>>>18,t[s++]=128|i>>>12&63,t[s++]=128|i>>>6&63,t[s++]=128|63&i);return t},i.buf2binstring=function(e){return n(e,e.length)},i.binstring2buf=function(e){for(var t=new a.Buf8(e.length),i=0,n=t.length;i<n;i++)t[i]=e.charCodeAt(i);return t},i.buf2string=function(e,t){var i,a,r,s,l=t||e.length,f=new Array(2*l);for(a=0,i=0;i<l;)if(r=e[i++],r<128)f[a++]=r;else if(s=o[r],s>4)f[a++]=65533,i+=s-1;else{for(r&=2===s?31:3===s?15:7;s>1&&i<l;)r=r<<6|63&e[i++],s--;s>1?f[a++]=65533:r<65536?f[a++]=r:(r-=65536,f[a++]=55296|r>>10&1023,f[a++]=56320|1023&r)}return n(f,a)},i.utf8border=function(e,t){var i;for(t=t||e.length,t>e.length&&(t=e.length),i=t-1;i>=0&&128===(192&e[i]);)i--;return i<0?t:0===i?t:i+o[e[i]]>t?i:t}},"zlib/inflate.js":function(e,t,i){"use strict";function n(e){return(e>>>24&255)+(e>>>8&65280)+((65280&e)<<8)+((255&e)<<24)}function a(){this.mode=0,this.last=!1,this.wrap=0,this.havedict=!1,this.flags=0,this.dmax=0,this.check=0,this.total=0,this.head=null,this.wbits=0,this.wsize=0,this.whave=0,this.wnext=0,this.window=null,this.hold=0,this.bits=0,this.length=0,this.offset=0,this.extra=0,this.lencode=null,this.distcode=null,this.lenbits=0,this.distbits=0,this.ncode=0,this.nlen=0,this.ndist=0,this.have=0,this.next=null,this.lens=new _.Buf16(320),this.work=new _.Buf16(288),this.lendyn=null,this.distdyn=null,this.sane=0,this.back=0,this.was=0}function r(e){var t;return e&&e.state?(t=e.state,e.total_in=e.total_out=t.total=0,e.msg="",t.wrap&&(e.adler=1&t.wrap),t.mode=U,t.last=0,t.havedict=0,t.dmax=32768,t.head=null,t.hold=0,t.bits=0,t.lencode=t.lendyn=new _.Buf32(we),t.distcode=t.distdyn=new _.Buf32(me),t.sane=1,t.back=-1,z):C}function s(e){var t;return e&&e.state?(t=e.state,t.wsize=0,t.whave=0,t.wnext=0,r(e)):C}function o(e,t){var i,n;return e&&e.state?(n=e.state,t<0?(i=0,t=-t):(i=(t>>4)+1,t<48&&(t&=15)),t&&(t<8||t>15)?C:(null!==n.window&&n.wbits!==t&&(n.window=null),n.wrap=i,n.wbits=t,s(e))):C}function l(e,t){var i,n;return e?(n=new a,e.state=n,n.window=null,i=o(e,t),i!==z&&(e.state=null),i):C}function f(e){return l(e,_e)}function d(e){if(ge){var t;for(m=new _.Buf32(512),k=new _.Buf32(32),t=0;t<144;)e.lens[t++]=8;for(;t<256;)e.lens[t++]=9;for(;t<280;)e.lens[t++]=7;for(;t<288;)e.lens[t++]=8;for(x(S,e.lens,0,288,m,0,e.work,{bits:9}),t=0;t<32;)e.lens[t++]=5;x(B,e.lens,0,32,k,0,e.work,{bits:5}),ge=!1}e.lencode=m,e.lenbits=9,e.distcode=k,e.distbits=5}function h(e,t,i,n){var a,r=e.state;return null===r.window&&(r.wsize=1<<r.wbits,r.wnext=0,r.whave=0,r.window=new _.Buf8(r.wsize)),n>=r.wsize?(_.arraySet(r.window,t,i-r.wsize,r.wsize,0),r.wnext=0,r.whave=r.wsize):(a=r.wsize-r.wnext,a>n&&(a=n),_.arraySet(r.window,t,i-n,a,r.wnext),n-=a,n?(_.arraySet(r.window,t,i-n,n,0),r.wnext=n,r.whave=r.wsize):(r.wnext+=a,r.wnext===r.wsize&&(r.wnext=0),r.whave<r.wsize&&(r.whave+=a))),0}function u(e,t){var i,a,r,s,o,l,f,u,c,b,w,m,k,we,me,ke,_e,ge,ve,pe,xe,ye,Se,Be,Ee=0,Ze=new _.Buf8(4),Ae=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];if(!e||!e.state||!e.output||!e.input&&0!==e.avail_in)return C;i=e.state,i.mode===q&&(i.mode=W),o=e.next_out,r=e.output,f=e.avail_out,s=e.next_in,a=e.input,l=e.avail_in,u=i.hold,c=i.bits,b=l,w=f,ye=z;e:for(;;)switch(i.mode){case U:if(0===i.wrap){i.mode=W;break}for(;c<16;){if(0===l)break e;l--,u+=a[s++]<<c,c+=8}if(2&i.wrap&&35615===u){i.check=0,Ze[0]=255&u,Ze[1]=u>>>8&255,i.check=v(i.check,Ze,2,0),u=0,c=0,i.mode=j;break}if(i.flags=0,i.head&&(i.head.done=!1),!(1&i.wrap)||(((255&u)<<8)+(u>>8))%31){e.msg="incorrect header check",i.mode=ue;break}if((15&u)!==F){e.msg="unknown compression method",i.mode=ue;break}if(u>>>=4,c-=4,xe=(15&u)+8,0===i.wbits)i.wbits=xe;else if(xe>i.wbits){e.msg="invalid window size",i.mode=ue;break}i.dmax=1<<xe,e.adler=i.check=1,i.mode=512&u?G:q,u=0,c=0;break;case j:for(;c<16;){if(0===l)break e;l--,u+=a[s++]<<c,c+=8}if(i.flags=u,(255&i.flags)!==F){e.msg="unknown compression method",i.mode=ue;break}if(57344&i.flags){e.msg="unknown header flags set",i.mode=ue;break}i.head&&(i.head.text=u>>8&1),512&i.flags&&(Ze[0]=255&u,Ze[1]=u>>>8&255,i.check=v(i.check,Ze,2,0)),u=0,c=0,i.mode=D;case D:for(;c<32;){if(0===l)break e;l--,u+=a[s++]<<c,c+=8}i.head&&(i.head.time=u),512&i.flags&&(Ze[0]=255&u,Ze[1]=u>>>8&255,Ze[2]=u>>>16&255,Ze[3]=u>>>24&255,i.check=v(i.check,Ze,4,0)),u=0,c=0,i.mode=L;case L:for(;c<16;){if(0===l)break e;l--,u+=a[s++]<<c,c+=8}i.head&&(i.head.xflags=255&u,i.head.os=u>>8),512&i.flags&&(Ze[0]=255&u,Ze[1]=u>>>8&255,i.check=v(i.check,Ze,2,0)),u=0,c=0,i.mode=H;case H:if(1024&i.flags){for(;c<16;){if(0===l)break e;l--,u+=a[s++]<<c,c+=8}i.length=u,i.head&&(i.head.extra_len=u),512&i.flags&&(Ze[0]=255&u,Ze[1]=u>>>8&255,i.check=v(i.check,Ze,2,0)),u=0,c=0}else i.head&&(i.head.extra=null);i.mode=K;case K:if(1024&i.flags&&(m=i.length,m>l&&(m=l),m&&(i.head&&(xe=i.head.extra_len-i.length,i.head.extra||(i.head.extra=new Array(i.head.extra_len)),_.arraySet(i.head.extra,a,s,m,xe)),512&i.flags&&(i.check=v(i.check,a,m,s)),l-=m,s+=m,i.length-=m),i.length))break e;i.length=0,i.mode=M;case M:if(2048&i.flags){if(0===l)break e;m=0;do xe=a[s+m++],i.head&&xe&&i.length<65536&&(i.head.name+=String.fromCharCode(xe));while(xe&&m<l);if(512&i.flags&&(i.check=v(i.check,a,m,s)),l-=m,s+=m,xe)break e}else i.head&&(i.head.name=null);i.length=0,i.mode=P;case P:if(4096&i.flags){if(0===l)break e;m=0;do xe=a[s+m++],i.head&&xe&&i.length<65536&&(i.head.comment+=String.fromCharCode(xe));while(xe&&m<l);if(512&i.flags&&(i.check=v(i.check,a,m,s)),l-=m,s+=m,xe)break e}else i.head&&(i.head.comment=null);i.mode=Y;case Y:if(512&i.flags){for(;c<16;){if(0===l)break e;l--,u+=a[s++]<<c,c+=8}if(u!==(65535&i.check)){e.msg="header crc mismatch",i.mode=ue;break}u=0,c=0}i.head&&(i.head.hcrc=i.flags>>9&1,i.head.done=!0),e.adler=i.check=0,i.mode=q;break;case G:for(;c<32;){if(0===l)break e;l--,u+=a[s++]<<c,c+=8}e.adler=i.check=n(u),u=0,c=0,i.mode=X;case X:if(0===i.havedict)return e.next_out=o,e.avail_out=f,e.next_in=s,e.avail_in=l,i.hold=u,i.bits=c,N;e.adler=i.check=1,i.mode=q;case q:if(t===Z||t===A)break e;case W:if(i.last){u>>>=7&c,c-=7&c,i.mode=fe;break}for(;c<3;){if(0===l)break e;l--,u+=a[s++]<<c,c+=8}switch(i.last=1&u,u>>>=1,c-=1,3&u){case 0:i.mode=J;break;case 1:if(d(i),i.mode=ie,t===A){u>>>=2,c-=2;break e}break;case 2:i.mode=$;break;case 3:e.msg="invalid block type",i.mode=ue}u>>>=2,c-=2;break;case J:for(u>>>=7&c,c-=7&c;c<32;){if(0===l)break e;l--,u+=a[s++]<<c,c+=8}if((65535&u)!==(u>>>16^65535)){e.msg="invalid stored block lengths",i.mode=ue;break}if(i.length=65535&u,u=0,c=0,i.mode=Q,t===A)break e;case Q:i.mode=V;case V:if(m=i.length){if(m>l&&(m=l),m>f&&(m=f),0===m)break e;_.arraySet(r,a,s,m,o),l-=m,s+=m,f-=m,o+=m,i.length-=m;break}i.mode=q;break;case $:for(;c<14;){if(0===l)break e;l--,u+=a[s++]<<c,c+=8}if(i.nlen=(31&u)+257,u>>>=5,c-=5,i.ndist=(31&u)+1,u>>>=5,c-=5,i.ncode=(15&u)+4,u>>>=4,c-=4,i.nlen>286||i.ndist>30){e.msg="too many length or distance symbols",i.mode=ue;break}i.have=0,i.mode=ee;case ee:for(;i.have<i.ncode;){for(;c<3;){if(0===l)break e;l--,u+=a[s++]<<c,c+=8}i.lens[Ae[i.have++]]=7&u,u>>>=3,c-=3}for(;i.have<19;)i.lens[Ae[i.have++]]=0;if(i.lencode=i.lendyn,i.lenbits=7,Se={bits:i.lenbits},ye=x(y,i.lens,0,19,i.lencode,0,i.work,Se),i.lenbits=Se.bits,ye){e.msg="invalid code lengths set",i.mode=ue;break}i.have=0,i.mode=te;case te:for(;i.have<i.nlen+i.ndist;){for(;Ee=i.lencode[u&(1<<i.lenbits)-1],me=Ee>>>24,ke=Ee>>>16&255,_e=65535&Ee,!(me<=c);){if(0===l)break e;l--,u+=a[s++]<<c,c+=8}if(_e<16)u>>>=me,c-=me,i.lens[i.have++]=_e;else{if(16===_e){for(Be=me+2;c<Be;){if(0===l)break e;l--,u+=a[s++]<<c,c+=8}if(u>>>=me,c-=me,0===i.have){e.msg="invalid bit length repeat",i.mode=ue;break}xe=i.lens[i.have-1],m=3+(3&u),u>>>=2,c-=2}else if(17===_e){for(Be=me+3;c<Be;){if(0===l)break e;l--,u+=a[s++]<<c,c+=8}u>>>=me,c-=me,xe=0,m=3+(7&u),u>>>=3,c-=3}else{for(Be=me+7;c<Be;){if(0===l)break e;l--,u+=a[s++]<<c,c+=8}u>>>=me,c-=me,xe=0,m=11+(127&u),u>>>=7,c-=7}if(i.have+m>i.nlen+i.ndist){e.msg="invalid bit length repeat",i.mode=ue;break}for(;m--;)i.lens[i.have++]=xe}}if(i.mode===ue)break;if(0===i.lens[256]){e.msg="invalid code -- missing end-of-block",i.mode=ue;break}if(i.lenbits=9,Se={bits:i.lenbits},ye=x(S,i.lens,0,i.nlen,i.lencode,0,i.work,Se),i.lenbits=Se.bits,ye){e.msg="invalid literal/lengths set",i.mode=ue;break}if(i.distbits=6,i.distcode=i.distdyn,Se={bits:i.distbits},ye=x(B,i.lens,i.nlen,i.ndist,i.distcode,0,i.work,Se),i.distbits=Se.bits,ye){e.msg="invalid distances set",i.mode=ue;break}if(i.mode=ie,t===A)break e;case ie:i.mode=ne;case ne:if(l>=6&&f>=258){e.next_out=o,e.avail_out=f,e.next_in=s,e.avail_in=l,i.hold=u,i.bits=c,p(e,w),o=e.next_out,r=e.output,f=e.avail_out,s=e.next_in,a=e.input,l=e.avail_in,u=i.hold,c=i.bits,i.mode===q&&(i.back=-1);break}for(i.back=0;Ee=i.lencode[u&(1<<i.lenbits)-1],me=Ee>>>24,ke=Ee>>>16&255,_e=65535&Ee,!(me<=c);){if(0===l)break e;l--,u+=a[s++]<<c,c+=8}if(ke&&0===(240&ke)){for(ge=me,ve=ke,pe=_e;Ee=i.lencode[pe+((u&(1<<ge+ve)-1)>>ge)],me=Ee>>>24,ke=Ee>>>16&255,_e=65535&Ee,!(ge+me<=c);){if(0===l)break e;l--,u+=a[s++]<<c,c+=8}u>>>=ge,c-=ge,i.back+=ge}if(u>>>=me,c-=me,i.back+=me,i.length=_e,0===ke){i.mode=le;break}if(32&ke){i.back=-1,i.mode=q;break}if(64&ke){e.msg="invalid literal/length code",i.mode=ue;break}i.extra=15&ke,i.mode=ae;case ae:if(i.extra){for(Be=i.extra;c<Be;){if(0===l)break e;l--,u+=a[s++]<<c,c+=8}i.length+=u&(1<<i.extra)-1,u>>>=i.extra,c-=i.extra,i.back+=i.extra}i.was=i.length,i.mode=re;case re:for(;Ee=i.distcode[u&(1<<i.distbits)-1],me=Ee>>>24,ke=Ee>>>16&255,_e=65535&Ee,!(me<=c);){if(0===l)break e;l--,u+=a[s++]<<c,c+=8}if(0===(240&ke)){for(ge=me,ve=ke,pe=_e;Ee=i.distcode[pe+((u&(1<<ge+ve)-1)>>ge)],me=Ee>>>24,ke=Ee>>>16&255,_e=65535&Ee,!(ge+me<=c);){if(0===l)break e;l--,u+=a[s++]<<c,c+=8}u>>>=ge,c-=ge,i.back+=ge}if(u>>>=me,c-=me,i.back+=me,64&ke){e.msg="invalid distance code",i.mode=ue;break}i.offset=_e,i.extra=15&ke,i.mode=se;case se:if(i.extra){for(Be=i.extra;c<Be;){if(0===l)break e;l--,u+=a[s++]<<c,c+=8}i.offset+=u&(1<<i.extra)-1,u>>>=i.extra,c-=i.extra,i.back+=i.extra}if(i.offset>i.dmax){e.msg="invalid distance too far back",i.mode=ue;break}i.mode=oe;case oe:if(0===f)break e;if(m=w-f,i.offset>m){if(m=i.offset-m,m>i.whave&&i.sane){e.msg="invalid distance too far back",i.mode=ue;break}m>i.wnext?(m-=i.wnext,k=i.wsize-m):k=i.wnext-m,m>i.length&&(m=i.length),we=i.window}else we=r,k=o-i.offset,m=i.length;m>f&&(m=f),f-=m,i.length-=m;do r[o++]=we[k++];while(--m);0===i.length&&(i.mode=ne);break;case le:if(0===f)break e;r[o++]=i.length,f--,i.mode=ne;break;case fe:if(i.wrap){for(;c<32;){if(0===l)break e;l--,u|=a[s++]<<c,c+=8}if(w-=f,e.total_out+=w,i.total+=w,w&&(e.adler=i.check=i.flags?v(i.check,r,w,o-w):g(i.check,r,w,o-w)),w=f,(i.flags?u:n(u))!==i.check){e.msg="incorrect data check",i.mode=ue;break}u=0,c=0}i.mode=de;case de:if(i.wrap&&i.flags){for(;c<32;){if(0===l)break e;l--,u+=a[s++]<<c,c+=8}if(u!==(4294967295&i.total)){e.msg="incorrect length check",i.mode=ue;break}u=0,c=0}i.mode=he;case he:ye=R;break e;case ue:ye=O;break e;case ce:return I;case be:default:return C}return e.next_out=o,e.avail_out=f,e.next_in=s,e.avail_in=l,i.hold=u,i.bits=c,(i.wsize||w!==e.avail_out&&i.mode<ue&&(i.mode<fe||t!==E))&&h(e,e.output,e.next_out,w-e.avail_out)?(i.mode=ce,I):(b-=e.avail_in,w-=e.avail_out,e.total_in+=b,e.total_out+=w,i.total+=w,i.wrap&&w&&(e.adler=i.check=i.flags?v(i.check,r,w,e.next_out-w):g(i.check,r,w,e.next_out-w)),e.data_type=i.bits+(i.last?64:0)+(i.mode===q?128:0)+(i.mode===ie||i.mode===Q?256:0),(0===b&&0===w||t===E)&&ye===z&&(ye=T),ye)}function c(e){if(!e||!e.state)return C;var t=e.state;return t.window&&(t.window=null),e.state=null,z}function b(e,t){var i;return e&&e.state?(i=e.state,0===(2&i.wrap)?C:(i.head=t,t.done=!1,z)):C}function w(e,t){var i,n,a,r=t.length;return e&&e.state?(i=e.state,0!==i.wrap&&i.mode!==X?C:i.mode===X&&(n=1,n=g(n,t,r,0),n!==i.check)?O:(a=h(e,t,r,r))?(i.mode=ce,I):(i.havedict=1,z)):C}var m,k,_=e("../utils/common"),g=e("./adler32"),v=e("./crc32"),p=e("./inffast"),x=e("./inftrees"),y=0,S=1,B=2,E=4,Z=5,A=6,z=0,R=1,N=2,C=-2,O=-3,I=-4,T=-5,F=8,U=1,j=2,D=3,L=4,H=5,K=6,M=7,P=8,Y=9,G=10,X=11,q=12,W=13,J=14,Q=15,V=16,$=17,ee=18,te=19,ie=20,ne=21,ae=22,re=23,se=24,oe=25,le=26,fe=27,de=28,he=29,ue=30,ce=31,be=32,we=852,me=592,ke=15,_e=ke,ge=!0;i.inflateReset=s,i.inflateReset2=o,i.inflateResetKeep=r,i.inflateInit=f,i.inflateInit2=l,i.inflate=u,i.inflateEnd=c,i.inflateGetHeader=b,i.inflateSetDictionary=w,i.inflateInfo="pako inflate (from Nodeca project)"},"zlib/constants.js":function(e,t,i){"use strict";t.exports={Z_NO_FLUSH:0,Z_PARTIAL_FLUSH:1,Z_SYNC_FLUSH:2,Z_FULL_FLUSH:3,Z_FINISH:4,Z_BLOCK:5,Z_TREES:6,Z_OK:0,Z_STREAM_END:1,Z_NEED_DICT:2,Z_ERRNO:-1,Z_STREAM_ERROR:-2,Z_DATA_ERROR:-3,Z_BUF_ERROR:-5,Z_NO_COMPRESSION:0,Z_BEST_SPEED:1,Z_BEST_COMPRESSION:9,Z_DEFAULT_COMPRESSION:-1,Z_FILTERED:1,Z_HUFFMAN_ONLY:2,Z_RLE:3,Z_FIXED:4,Z_DEFAULT_STRATEGY:0,Z_BINARY:0,Z_TEXT:1,Z_UNKNOWN:2,Z_DEFLATED:8}},"zlib/messages.js":function(e,t,i){"use strict";t.exports={2:"need dictionary",1:"stream end",0:"","-1":"file error","-2":"stream error","-3":"data error","-4":"insufficient memory","-5":"buffer error","-6":"incompatible version"}},"zlib/zstream.js":function(e,t,i){"use strict";function n(){this.input=null,this.next_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=0,this.total_out=0,this.msg="",this.state=null,this.data_type=2,this.adler=0}t.exports=n},"zlib/gzheader.js":function(e,t,i){"use strict";function n(){this.text=0,this.time=0,this.xflags=0,this.os=0,this.extra=null,this.extra_len=0,this.name="",this.comment="",this.hcrc=0,this.done=!1}t.exports=n},"zlib/adler32.js":function(e,t,i){"use strict";function n(e,t,i,n){for(var a=65535&e|0,r=e>>>16&65535|0,s=0;0!==i;){s=i>2e3?2e3:i,i-=s;do a=a+t[n++]|0,r=r+a|0;while(--s);a%=65521,r%=65521}return a|r<<16|0}t.exports=n},"zlib/crc32.js":function(e,t,i){"use strict";function n(){for(var e,t=[],i=0;i<256;i++){e=i;for(var n=0;n<8;n++)e=1&e?3988292384^e>>>1:e>>>1;t[i]=e}return t}function a(e,t,i,n){var a=r,s=n+i;e^=-1;for(var o=n;o<s;o++)e=e>>>8^a[255&(e^t[o])];return e^-1}var r=n();t.exports=a},"zlib/inffast.js":function(e,t,i){"use strict";var n=30,a=12;t.exports=function(e,t){var i,r,s,o,l,f,d,h,u,c,b,w,m,k,_,g,v,p,x,y,S,B,E,Z,A;i=e.state,r=e.next_in,Z=e.input,s=r+(e.avail_in-5),o=e.next_out,A=e.output,l=o-(t-e.avail_out),f=o+(e.avail_out-257),d=i.dmax,h=i.wsize,u=i.whave,c=i.wnext,b=i.window,w=i.hold,m=i.bits,k=i.lencode,_=i.distcode,g=(1<<i.lenbits)-1,v=(1<<i.distbits)-1;e:do{m<15&&(w+=Z[r++]<<m,m+=8,w+=Z[r++]<<m,m+=8),p=k[w&g];t:for(;;){if(x=p>>>24,w>>>=x,m-=x,x=p>>>16&255,0===x)A[o++]=65535&p;else{if(!(16&x)){if(0===(64&x)){p=k[(65535&p)+(w&(1<<x)-1)];continue t}if(32&x){i.mode=a;break e}e.msg="invalid literal/length code",i.mode=n;break e}y=65535&p,x&=15,x&&(m<x&&(w+=Z[r++]<<m,m+=8),y+=w&(1<<x)-1,w>>>=x,m-=x),m<15&&(w+=Z[r++]<<m,m+=8,w+=Z[r++]<<m,m+=8),p=_[w&v];i:for(;;){if(x=p>>>24,w>>>=x,m-=x,x=p>>>16&255,!(16&x)){if(0===(64&x)){p=_[(65535&p)+(w&(1<<x)-1)];continue i}e.msg="invalid distance code",i.mode=n;break e}if(S=65535&p,x&=15,m<x&&(w+=Z[r++]<<m,m+=8,m<x&&(w+=Z[r++]<<m,m+=8)),S+=w&(1<<x)-1,S>d){e.msg="invalid distance too far back",i.mode=n;break e}if(w>>>=x,m-=x,x=o-l,S>x){if(x=S-x,x>u&&i.sane){e.msg="invalid distance too far back",i.mode=n;break e}if(B=0,E=b,0===c){if(B+=h-x,x<y){y-=x;do A[o++]=b[B++];while(--x);B=o-S,E=A}}else if(c<x){if(B+=h+c-x,x-=c,x<y){y-=x;do A[o++]=b[B++];while(--x);if(B=0,c<y){x=c,y-=x;do A[o++]=b[B++];while(--x);B=o-S,E=A}}}else if(B+=c-x,x<y){y-=x;do A[o++]=b[B++];while(--x);B=o-S,E=A}for(;y>2;)A[o++]=E[B++],A[o++]=E[B++],A[o++]=E[B++],y-=3;y&&(A[o++]=E[B++],y>1&&(A[o++]=E[B++]))}else{B=o-S;do A[o++]=A[B++],A[o++]=A[B++],A[o++]=A[B++],y-=3;while(y>2);y&&(A[o++]=A[B++],y>1&&(A[o++]=A[B++]))}break}}break}}while(r<s&&o<f);y=m>>3,r-=y,m-=y<<3,w&=(1<<m)-1,e.next_in=r,e.next_out=o,e.avail_in=r<s?5+(s-r):5-(r-s),e.avail_out=o<f?257+(f-o):257-(o-f),i.hold=w,i.bits=m}},"zlib/inftrees.js":function(e,t,i){"use strict";var n=e("../utils/common"),a=15,r=852,s=592,o=0,l=1,f=2,d=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0],h=[16,16,16,16,16,16,16,16,17,17,17,17,18,18,18,18,19,19,19,19,20,20,20,20,21,21,21,21,16,72,78],u=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,0,0],c=[16,16,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,25,26,26,27,27,28,28,29,29,64,64];t.exports=function(e,t,i,b,w,m,k,_){var g,v,p,x,y,S,B,E,Z,A=_.bits,z=0,R=0,N=0,C=0,O=0,I=0,T=0,F=0,U=0,j=0,D=null,L=0,H=new n.Buf16(a+1),K=new n.Buf16(a+1),M=null,P=0;for(z=0;z<=a;z++)H[z]=0;for(R=0;R<b;R++)H[t[i+R]]++;for(O=A,C=a;C>=1&&0===H[C];C--);if(O>C&&(O=C),0===C)return w[m++]=20971520,w[m++]=20971520,_.bits=1,0;for(N=1;N<C&&0===H[N];N++);for(O<N&&(O=N),F=1,z=1;z<=a;z++)if(F<<=1,F-=H[z],F<0)return-1;if(F>0&&(e===o||1!==C))return-1;for(K[1]=0,z=1;z<a;z++)K[z+1]=K[z]+H[z];for(R=0;R<b;R++)0!==t[i+R]&&(k[K[t[i+R]]++]=R);if(e===o?(D=M=k,S=19):e===l?(D=d,L-=257,M=h,P-=257,S=256):(D=u,M=c,S=-1),j=0,R=0,z=N,y=m,I=O,T=0,p=-1,U=1<<O,x=U-1,e===l&&U>r||e===f&&U>s)return 1;for(;;){B=z-T,k[R]<S?(E=0,Z=k[R]):k[R]>S?(E=M[P+k[R]],Z=D[L+k[R]]):(E=96,Z=0),g=1<<z-T,v=1<<I,N=v;do v-=g,w[y+(j>>T)+v]=B<<24|E<<16|Z|0;while(0!==v);for(g=1<<z-1;j&g;)g>>=1;if(0!==g?(j&=g-1,j+=g):j=0,R++,0===--H[z]){if(z===C)break;z=t[i+k[R]]}if(z>O&&(j&x)!==p){for(0===T&&(T=O),y+=N,I=z-T,F=1<<I;I+T<C&&(F-=H[I+T],!(F<=0));)I++,F<<=1;if(U+=1<<I,e===l&&U>r||e===f&&U>s)return 1;p=j&x,w[p]=O<<24|I<<16|y-m|0}}return 0!==j&&(w[y+j]=z-T<<24|64<<16|0),_.bits=O,0}}};for(var i in t)t[i].folder=i.substring(0,i.lastIndexOf("/")+1);var n=function(e){var i=[];return e=e.split("/").every(function(e){return".."==e?i.pop():"."==e||""==e||i.push(e)})?i.join("/"):null,e?t[e]||t[e+".js"]||t[e+"/index.js"]:null},a=function(e,t){return e?n(e.folder+"node_modules/"+t)||a(e.parent,t):null},r=function(e,t){var i=t.match(/^\//)?null:e?t.match(/^\.\.?\//)?n(e.folder+t):a(e,t):n(t);if(!i)throw"module not found: "+t;return i.exports||(i.parent=e,i(r.bind(null,i),i,i.exports={})),i.exports};return r(null,e)},
      decompress: function (data) {
        if (!this.exports)
          this.exports = this.require("inflate.js");
        try { return this.exports.inflate(data) } catch (e) {};
      },
      hasUnityMarker: function (data) {
        var commentOffset = 10, expectedComment = "UnityWeb Compressed Content (gzip)";
        if (commentOffset > data.length || data[0] != 0x1F || data[1] != 0x8B)
          return false;
        var flags = data[3];
        if (flags & 0x04) {
          if (commentOffset + 2 > data.length)
            return false;
          commentOffset += 2 + data[commentOffset] + (data[commentOffset + 1] << 8);
          if (commentOffset > data.length)
            return false;
        }
        if (flags & 0x08) {
          while (commentOffset < data.length && data[commentOffset])
            commentOffset++;
          if (commentOffset + 1 > data.length)
            return false;
          commentOffset++;
        }
        return (flags & 0x10) && String.fromCharCode.apply(null, data.subarray(commentOffset, commentOffset + expectedComment.length + 1)) == expectedComment + "\0";
      },
    },
  };

  function decompress(compressed, url, callback) {
    for (var contentEncoding in decompressors) {
      if (decompressors[contentEncoding].hasUnityMarker(compressed)) {
        if (url)
          console.log("You can reduce startup time if you configure your web server to add \"Content-Encoding: " + contentEncoding + "\" response header when serving \"" + url + "\" file.");
        var decompressor = decompressors[contentEncoding];
        if (!decompressor.worker) {
          var workerUrl = URL.createObjectURL(new Blob(["this.require = ", decompressor.require.toString(), "; this.decompress = ", decompressor.decompress.toString(), "; this.onmessage = ", function (e) {
            var data = { id: e.data.id, decompressed: this.decompress(e.data.compressed) };
            postMessage(data, data.decompressed ? [data.decompressed.buffer] : []);
          }.toString(), "; postMessage({ ready: true });"], { type: "application/javascript" }));
          decompressor.worker = new Worker(workerUrl);
          decompressor.worker.onmessage = function (e) {
            if (e.data.ready) {
              URL.revokeObjectURL(workerUrl);
              return;
            }
            this.callbacks[e.data.id](e.data.decompressed);
            delete this.callbacks[e.data.id];
          };
          decompressor.worker.callbacks = {};
          decompressor.worker.nextCallbackId = 0;
        }
        var id = decompressor.worker.nextCallbackId++;
        decompressor.worker.callbacks[id] = callback;
        decompressor.worker.postMessage({id: id, compressed: compressed}, [compressed.buffer]);
        return;
      }
    }
    callback(compressed);
  }

  function downloadBinary(urlId) {
    return new Promise(function (resolve, reject) {
      progressUpdate(urlId);
      var xhr = Module.companyName && Module.productName ? new Module.XMLHttpRequest({
        companyName: Module.companyName,
        productName: Module.productName,
        cacheControl: Module.cacheControl(Module[urlId]),
      }) : new XMLHttpRequest();
      xhr.open("GET", Module[urlId]);
      xhr.responseType = "arraybuffer";
      xhr.addEventListener("progress", function (e) {
        progressUpdate(urlId, e);
      });
      xhr.addEventListener("load", function(e) {
        progressUpdate(urlId, e);
        decompress(new Uint8Array(xhr.response), Module[urlId], resolve);
      });
      xhr.send();
    });
  }

  function downloadFramework() {
    return downloadBinary("frameworkUrl").then(function (code) {
      var blobUrl = URL.createObjectURL(new Blob([code], { type: "application/javascript" }));
      return new Promise(function (resolve, reject) {
        var script = document.createElement("script");
        script.src = blobUrl;
        script.onload = function () {
          // Adding the framework.js script to DOM created a global
          // 'unityFramework' variable that should be considered internal.
          // Capture the variable to local scope and clear it from global
          // scope so that JS garbage collection can take place on
          // application quit.
          var fw = unityFramework;
          unityFramework = null;
          // Also ensure this function will not hold any JS scope
          // references to prevent JS garbage collection.
          script.onload = null;
          URL.revokeObjectURL(blobUrl);
          resolve(fw);
        }
        document.body.appendChild(script);
        Module.deinitializers.push(function() {
          document.body.removeChild(script);
        });
      });
    });
  }

  function loadBuild() {
    Promise.all([
      downloadFramework(),
      downloadBinary("codeUrl"),
    ]).then(function (results) {
      Module.wasmBinary = results[1];
      results[0](Module);
    });

    var dataPromise = downloadBinary("dataUrl");
    Module.preRun.push(function () {
      Module.addRunDependency("dataUrl");
      dataPromise.then(function (data) {
        var view = new DataView(data.buffer, data.byteOffset, data.byteLength);
        var pos = 0;
        var prefix = "UnityWebData1.0\0";
        if (!String.fromCharCode.apply(null, data.subarray(pos, pos + prefix.length)) == prefix)
          throw "unknown data format";
        pos += prefix.length;
        var headerSize = view.getUint32(pos, true); pos += 4;
        while (pos < headerSize) {
          var offset = view.getUint32(pos, true); pos += 4;
          var size = view.getUint32(pos, true); pos += 4;
          var pathLength = view.getUint32(pos, true); pos += 4;
          var path = String.fromCharCode.apply(null, data.subarray(pos, pos + pathLength)); pos += pathLength;
          for (var folder = 0, folderNext = path.indexOf("/", folder) + 1 ; folderNext > 0; folder = folderNext, folderNext = path.indexOf("/", folder) + 1)
            Module.FS_createPath(path.substring(0, folder), path.substring(folder, folderNext - 1), true, true);
          Module.FS_createDataFile(path, null, data.subarray(offset, offset + size), true, true, true);
        }
        Module.removeRunDependency("dataUrl");
      });
    });
  }

  return new Promise(function (resolve, reject) {
    if (!Module.SystemInfo.hasWebGL) {
      reject("Your browser does not support WebGL.");
    } else if (!Module.SystemInfo.hasWasm) {
      reject("Your browser does not support WebAssembly.");
    } else {
      if (Module.SystemInfo.hasWebGL == 1)
        Module.print("Warning: Your browser does not support \"WebGL 2.0\" Graphics API, switching to \"WebGL 1.0\"");
      Module.startupErrorHandler = reject;
      onProgress(0);
      Module.postRun.push(function () {
        onProgress(1);
        delete Module.startupErrorHandler;
        resolve(unityInstance);
      });
      loadBuild();
    }
  });
}
