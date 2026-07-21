// Compiles a dart2wasm-generated main module from `source` which can then
// instantiatable via the `instantiate` method.
//
// `source` needs to be a `Response` object (or promise thereof) e.g. created
// via the `fetch()` JS API.
export async function compileStreaming(source) {
  const builtins = {builtins: ['js-string']};
  return new CompiledApp(
      await WebAssembly.compileStreaming(source, builtins), builtins);
}

// Compiles a dart2wasm-generated wasm modules from `bytes` which is then
// instantiatable via the `instantiate` method.
export async function compile(bytes) {
  const builtins = {builtins: ['js-string']};
  return new CompiledApp(await WebAssembly.compile(bytes, builtins), builtins);
}

// DEPRECATED: Please use `compile` or `compileStreaming` to get a compiled app,
// use `instantiate` method to get an instantiated app and then call
// `invokeMain` to invoke the main function.
export async function instantiate(modulePromise, importObjectPromise) {
  var moduleOrCompiledApp = await modulePromise;
  if (!(moduleOrCompiledApp instanceof CompiledApp)) {
    moduleOrCompiledApp = new CompiledApp(moduleOrCompiledApp);
  }
  const instantiatedApp = await moduleOrCompiledApp.instantiate(await importObjectPromise);
  return instantiatedApp.instantiatedModule;
}

// DEPRECATED: Please use `compile` or `compileStreaming` to get a compiled app,
// use `instantiate` method to get an instantiated app and then call
// `invokeMain` to invoke the main function.
export const invoke = (moduleInstance, ...args) => {
  moduleInstance.exports.$invokeMain(args);
}

class CompiledApp {
  constructor(module, builtins) {
    this.module = module;
    this.builtins = builtins;
  }

  // The second argument is an options object containing:
  // `loadDeferredModules` is a JS function that takes an array of module names
  //   matching wasm files produced by the dart2wasm compiler. It also takes a
  //   callback that should be invoked for each loaded module with 2 arugments:
  //   (1) the module name, (2) the loaded module in a format supported by
  //   `WebAssembly.compile` or `WebAssembly.compileStreaming`. The callback
  //   returns a Promise that resolves when the module is instantiated.
  //   loadDeferredModules should return a Promise that resolves when all the
  //   modules have been loaded and the callback promises have resolved.
  // `loadDeferredId` is a JS function that takes load ID produced by the
  //   compiler when the `load-ids` option is passed. Each load ID maps to one
  //   or more wasm files as specified in the emitted JSON file. It also takes a
  //   callback that should be invoked for each loaded module with 2 arugments:
  //   (1) the module name, (2) the loaded module in a format supported by
  //   `WebAssembly.compile` or `WebAssembly.compileStreaming`. The callback
  //   returns a Promise that resolves when the module is instantiated.
  //   loadDeferredModules should return a Promise that resolves when all the
  //   modules have been loaded and the callback promises have resolved.
  // `loadDynamicModule` is a JS function that takes two string names matching,
  //   in order, a wasm file produced by the dart2wasm compiler during dynamic
  //   module compilation and a corresponding js file produced by the same
  //   compilation. It also takes a callback that should be invoked with the
  //   loaded module in a format supported by `WebAssembly.compile` or
  //   `WebAssembly.compileStreaming` and the result of using the JS 'import'
  //   API on the js file path. It should return a Promise that resolves when
  //   all the modules have been loaded and the callback promises have resolved.
  async instantiate(additionalImports,
      {loadDeferredModules, loadDynamicModule, loadDeferredId} = {}) {
    let dartInstance;

    // Prints to the console
    function printToConsole(value) {
      if (typeof dartPrint == "function") {
        dartPrint(value);
        return;
      }
      if (typeof console == "object" && typeof console.log != "undefined") {
        console.log(value);
        return;
      }
      if (typeof print == "function") {
        print(value);
        return;
      }

      throw "Unable to print message: " + value;
    }

    // A special symbol attached to functions that wrap Dart functions.
    const jsWrappedDartFunctionSymbol = Symbol("JSWrappedDartFunction");

    function finalizeWrapper(dartFunction, wrapped) {
      wrapped.dartFunction = dartFunction;
      wrapped[jsWrappedDartFunctionSymbol] = true;
      return wrapped;
    }

    // Imports
    const dart2wasm = {
            _1: (decoder, codeUnits) => decoder.decode(codeUnits),
      _2: () => new TextDecoder("utf-8", {fatal: true}),
      _3: () => new TextDecoder("utf-8", {fatal: false}),
      _4: (s) => +s,
      _5: x0 => new Uint8Array(x0),
      _6: (x0,x1,x2) => x0.set(x1,x2),
      _7: (x0,x1) => x0.transferFromImageBitmap(x1),
      _9: (x0,x1,x2) => x0.slice(x1,x2),
      _10: (x0,x1) => x0.decode(x1),
      _11: (x0,x1) => x0.segment(x1),
      _12: () => new TextDecoder(),
      _14: x0 => x0.buffer,
      _15: x0 => x0.wasmMemory,
      _16: () => globalThis.window._flutter_skwasmInstance,
      _17: x0 => x0.rasterStartMilliseconds,
      _18: x0 => x0.rasterEndMilliseconds,
      _19: x0 => x0.imageBitmaps,
      _135: (x0,x1) => x0.appendChild(x1),
      _166: (x0,x1,x2) => x0.addEventListener(x1,x2),
      _167: (x0,x1,x2) => x0.removeEventListener(x1,x2),
      _168: (x0,x1) => new OffscreenCanvas(x0,x1),
      _169: x0 => x0.remove(),
      _170: (x0,x1) => x0.append(x1),
      _172: x0 => x0.unlock(),
      _173: x0 => x0.getReader(),
      _174: (x0,x1) => x0.item(x1),
      _175: x0 => x0.next(),
      _176: x0 => x0.now(),
      _177: (x0,x1) => x0.revokeObjectURL(x1),
      _178: x0 => x0.close(),
      _179: (x0,x1,x2,x3,x4) => ({type: x0,data: x1,premultiplyAlpha: x2,colorSpaceConversion: x3,preferAnimation: x4}),
      _180: x0 => new window.ImageDecoder(x0),
      _181: (x0,x1) => ({frameIndex: x0,completeFramesOnly: x1}),
      _182: (x0,x1) => x0.decode(x1),
      _183: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._183(f,arguments.length,x0) }),
      _184: (x0,x1,x2,x3) => x0.addEventListener(x1,x2,x3),
      _186: (x0,x1) => x0.getModifierState(x1),
      _187: x0 => x0.preventDefault(),
      _188: x0 => x0.stopPropagation(),
      _189: (x0,x1) => x0.removeProperty(x1),
      _190: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._190(f,arguments.length,x0) }),
      _191: x0 => new window.FinalizationRegistry(x0),
      _192: (x0,x1,x2,x3) => x0.register(x1,x2,x3),
      _194: (x0,x1) => x0.unregister(x1),
      _195: (x0,x1) => x0.prepend(x1),
      _196: x0 => new Intl.Locale(x0),
      _197: (x0,x1) => x0.observe(x1),
      _198: x0 => x0.disconnect(),
      _199: (x0,x1) => x0.getAttribute(x1),
      _200: (x0,x1) => x0.contains(x1),
      _201: (x0,x1) => x0.querySelector(x1),
      _202: (x0,x1) => x0.matchMedia(x1),
      _203: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._203(f,arguments.length,x0) }),
      _204: (x0,x1,x2) => x0.call(x1,x2),
      _205: x0 => x0.blur(),
      _206: x0 => x0.hasFocus(),
      _207: (x0,x1) => x0.removeAttribute(x1),
      _208: (x0,x1,x2) => x0.insertBefore(x1,x2),
      _209: (x0,x1) => x0.hasAttribute(x1),
      _210: (x0,x1) => x0.getModifierState(x1),
      _211: (x0,x1) => x0.createTextNode(x1),
      _212: x0 => x0.getBoundingClientRect(),
      _213: (x0,x1) => x0.replaceWith(x1),
      _214: (x0,x1) => x0.contains(x1),
      _215: (x0,x1) => x0.closest(x1),
      _653: x0 => new Uint8Array(x0),
      _656: () => globalThis.window.flutterConfiguration,
      _658: x0 => x0.assetBase,
      _663: x0 => x0.canvasKitMaximumSurfaces,
      _664: x0 => x0.debugShowSemanticsNodes,
      _665: x0 => x0.hostElement,
      _666: x0 => x0.multiViewEnabled,
      _667: x0 => x0.nonce,
      _669: x0 => x0.fontFallbackBaseUrl,
      _679: x0 => x0.console,
      _680: x0 => x0.devicePixelRatio,
      _681: x0 => x0.document,
      _682: x0 => x0.history,
      _683: x0 => x0.innerHeight,
      _684: x0 => x0.innerWidth,
      _685: x0 => x0.location,
      _686: x0 => x0.navigator,
      _687: x0 => x0.visualViewport,
      _688: x0 => x0.performance,
      _689: x0 => x0.parent,
      _691: x0 => x0.URL,
      _693: (x0,x1) => x0.getComputedStyle(x1),
      _694: x0 => x0.screen,
      _695: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._695(f,arguments.length,x0) }),
      _696: (x0,x1) => x0.requestAnimationFrame(x1),
      _700: (x0,x1) => x0.warn(x1),
      _702: (x0,x1) => x0.debug(x1),
      _703: x0 => globalThis.parseFloat(x0),
      _704: () => globalThis.window,
      _705: () => globalThis.Intl,
      _706: () => globalThis.Symbol,
      _707: (x0,x1,x2,x3,x4) => globalThis.createImageBitmap(x0,x1,x2,x3,x4),
      _709: x0 => x0.clipboard,
      _710: x0 => x0.maxTouchPoints,
      _711: x0 => x0.vendor,
      _712: x0 => x0.language,
      _713: x0 => x0.platform,
      _714: x0 => x0.userAgent,
      _715: (x0,x1) => x0.vibrate(x1),
      _716: x0 => x0.languages,
      _717: x0 => x0.documentElement,
      _718: (x0,x1) => x0.querySelector(x1),
      _719: (x0,x1) => x0.querySelectorAll(x1),
      _721: (x0,x1) => x0.createElement(x1),
      _724: (x0,x1) => x0.createEvent(x1),
      _725: x0 => x0.activeElement,
      _728: x0 => x0.head,
      _729: x0 => x0.body,
      _731: (x0,x1) => { x0.title = x1 },
      _734: x0 => x0.visibilityState,
      _735: () => globalThis.document,
      _736: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._736(f,arguments.length,x0) }),
      _737: (x0,x1) => x0.dispatchEvent(x1),
      _745: x0 => x0.target,
      _747: x0 => x0.timeStamp,
      _748: x0 => x0.type,
      _750: (x0,x1,x2,x3) => x0.initEvent(x1,x2,x3),
      _757: x0 => x0.firstChild,
      _761: x0 => x0.parentElement,
      _763: (x0,x1) => { x0.textContent = x1 },
      _764: x0 => x0.parentNode,
      _765: x0 => x0.nextSibling,
      _766: (x0,x1) => x0.removeChild(x1),
      _767: x0 => x0.isConnected,
      _775: x0 => x0.clientHeight,
      _776: x0 => x0.clientWidth,
      _777: x0 => x0.offsetHeight,
      _778: x0 => x0.offsetWidth,
      _779: x0 => x0.id,
      _780: (x0,x1) => { x0.id = x1 },
      _783: (x0,x1) => { x0.spellcheck = x1 },
      _784: x0 => x0.tagName,
      _785: x0 => x0.style,
      _787: (x0,x1) => x0.querySelectorAll(x1),
      _788: (x0,x1,x2) => x0.setAttribute(x1,x2),
      _789: x0 => x0.tabIndex,
      _790: (x0,x1) => { x0.tabIndex = x1 },
      _791: (x0,x1) => x0.focus(x1),
      _792: x0 => x0.scrollTop,
      _793: (x0,x1) => { x0.scrollTop = x1 },
      _794: (x0,x1) => { x0.scrollLeft = x1 },
      _795: x0 => x0.scrollLeft,
      _796: x0 => x0.classList,
      _797: (x0,x1) => x0.scrollIntoView(x1),
      _800: (x0,x1) => { x0.className = x1 },
      _802: (x0,x1) => x0.getElementsByClassName(x1),
      _803: x0 => x0.click(),
      _804: (x0,x1) => x0.attachShadow(x1),
      _807: x0 => x0.computedStyleMap(),
      _808: (x0,x1) => x0.get(x1),
      _814: (x0,x1) => x0.getPropertyValue(x1),
      _815: (x0,x1,x2,x3) => x0.setProperty(x1,x2,x3),
      _816: x0 => x0.offsetLeft,
      _817: x0 => x0.offsetTop,
      _818: x0 => x0.offsetParent,
      _820: (x0,x1) => { x0.name = x1 },
      _821: x0 => x0.content,
      _822: (x0,x1) => { x0.content = x1 },
      _826: (x0,x1) => { x0.src = x1 },
      _827: x0 => x0.naturalWidth,
      _828: x0 => x0.naturalHeight,
      _832: (x0,x1) => { x0.crossOrigin = x1 },
      _834: (x0,x1) => { x0.decoding = x1 },
      _835: x0 => x0.decode(),
      _840: (x0,x1) => { x0.nonce = x1 },
      _845: (x0,x1) => { x0.width = x1 },
      _847: (x0,x1) => { x0.height = x1 },
      _850: (x0,x1) => x0.getContext(x1),
      _918: x0 => x0.width,
      _919: x0 => x0.height,
      _921: (x0,x1) => x0.fetch(x1),
      _922: x0 => x0.status,
      _924: x0 => x0.body,
      _925: x0 => x0.arrayBuffer(),
      _928: x0 => x0.read(),
      _929: x0 => x0.value,
      _930: x0 => x0.done,
      _937: x0 => x0.name,
      _938: x0 => x0.x,
      _939: x0 => x0.y,
      _942: x0 => x0.top,
      _943: x0 => x0.right,
      _944: x0 => x0.bottom,
      _945: x0 => x0.left,
      _955: x0 => x0.height,
      _956: x0 => x0.width,
      _957: x0 => x0.scale,
      _958: (x0,x1) => { x0.value = x1 },
      _961: (x0,x1) => { x0.placeholder = x1 },
      _963: (x0,x1) => { x0.name = x1 },
      _964: x0 => x0.selectionDirection,
      _965: x0 => x0.selectionStart,
      _966: x0 => x0.selectionEnd,
      _969: x0 => x0.value,
      _971: (x0,x1,x2) => x0.setSelectionRange(x1,x2),
      _972: x0 => x0.readText(),
      _973: (x0,x1) => x0.writeText(x1),
      _975: x0 => x0.altKey,
      _976: x0 => x0.code,
      _977: x0 => x0.ctrlKey,
      _978: x0 => x0.key,
      _979: x0 => x0.keyCode,
      _980: x0 => x0.location,
      _981: x0 => x0.metaKey,
      _982: x0 => x0.repeat,
      _983: x0 => x0.shiftKey,
      _984: x0 => x0.isComposing,
      _986: x0 => x0.state,
      _987: (x0,x1) => x0.go(x1),
      _989: (x0,x1,x2,x3) => x0.pushState(x1,x2,x3),
      _990: (x0,x1,x2,x3) => x0.replaceState(x1,x2,x3),
      _991: x0 => x0.pathname,
      _992: x0 => x0.search,
      _993: x0 => x0.hash,
      _997: x0 => x0.state,
      _1000: (x0,x1) => x0.createObjectURL(x1),
      _1002: x0 => new Blob(x0),
      _1012: x0 => x0.matches,
      _1016: x0 => x0.matches,
      _1020: x0 => x0.relatedTarget,
      _1022: x0 => x0.clientX,
      _1023: x0 => x0.clientY,
      _1024: x0 => x0.offsetX,
      _1025: x0 => x0.offsetY,
      _1028: x0 => x0.button,
      _1029: x0 => x0.buttons,
      _1030: x0 => x0.ctrlKey,
      _1034: x0 => x0.pointerId,
      _1035: x0 => x0.pointerType,
      _1036: x0 => x0.pressure,
      _1037: x0 => x0.tiltX,
      _1038: x0 => x0.tiltY,
      _1039: x0 => x0.getCoalescedEvents(),
      _1042: x0 => x0.deltaX,
      _1043: x0 => x0.deltaY,
      _1044: x0 => x0.wheelDeltaX,
      _1045: x0 => x0.wheelDeltaY,
      _1046: x0 => x0.deltaMode,
      _1053: x0 => x0.changedTouches,
      _1056: x0 => x0.clientX,
      _1057: x0 => x0.clientY,
      _1060: x0 => x0.data,
      _1063: (x0,x1) => { x0.disabled = x1 },
      _1065: (x0,x1) => { x0.type = x1 },
      _1066: (x0,x1) => { x0.max = x1 },
      _1067: (x0,x1) => { x0.min = x1 },
      _1068: x0 => x0.value,
      _1069: (x0,x1) => { x0.value = x1 },
      _1070: x0 => x0.disabled,
      _1071: (x0,x1) => { x0.disabled = x1 },
      _1073: (x0,x1) => { x0.placeholder = x1 },
      _1075: (x0,x1) => { x0.name = x1 },
      _1076: (x0,x1) => { x0.autocomplete = x1 },
      _1078: x0 => x0.selectionDirection,
      _1079: x0 => x0.selectionStart,
      _1081: x0 => x0.selectionEnd,
      _1084: (x0,x1,x2) => x0.setSelectionRange(x1,x2),
      _1085: (x0,x1) => x0.add(x1),
      _1087: (x0,x1) => { x0.noValidate = x1 },
      _1088: (x0,x1) => { x0.method = x1 },
      _1089: (x0,x1) => { x0.action = x1 },
      _1114: x0 => x0.orientation,
      _1115: x0 => x0.width,
      _1116: x0 => x0.height,
      _1117: (x0,x1) => x0.lock(x1),
      _1136: x0 => new ResizeObserver(x0),
      _1139: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1139(f,arguments.length,x0,x1) }),
      _1147: x0 => x0.length,
      _1148: x0 => x0.iterator,
      _1149: x0 => x0.Segmenter,
      _1150: x0 => x0.v8BreakIterator,
      _1151: (x0,x1) => new Intl.Segmenter(x0,x1),
      _1154: x0 => x0.language,
      _1155: x0 => x0.script,
      _1156: x0 => x0.region,
      _1174: x0 => x0.done,
      _1175: x0 => x0.value,
      _1176: x0 => x0.index,
      _1180: (x0,x1) => new Intl.v8BreakIterator(x0,x1),
      _1181: (x0,x1) => x0.adoptText(x1),
      _1182: x0 => x0.first(),
      _1183: x0 => x0.next(),
      _1184: x0 => x0.current(),
      _1186: () => globalThis.window.FinalizationRegistry,
      _1197: x0 => x0.hostElement,
      _1198: x0 => x0.viewConstraints,
      _1201: x0 => x0.maxHeight,
      _1202: x0 => x0.maxWidth,
      _1203: x0 => x0.minHeight,
      _1204: x0 => x0.minWidth,
      _1205: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1205(f,arguments.length,x0) }),
      _1206: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1206(f,arguments.length,x0) }),
      _1207: (x0,x1) => ({addView: x0,removeView: x1}),
      _1210: x0 => x0.loader,
      _1211: () => globalThis._flutter,
      _1212: (x0,x1) => x0.didCreateEngineInitializer(x1),
      _1213: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1213(f,arguments.length,x0) }),
      _1214: (module,f) => finalizeWrapper(f, function() { return module.exports._1214(f,arguments.length) }),
      _1215: (x0,x1) => ({initializeEngine: x0,autoStart: x1}),
      _1218: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1218(f,arguments.length,x0) }),
      _1219: x0 => ({runApp: x0}),
      _1221: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1221(f,arguments.length,x0,x1) }),
      _1222: x0 => new Promise(x0),
      _1223: x0 => x0.length,
      _1224: () => globalThis.window.ImageDecoder,
      _1225: x0 => x0.tracks,
      _1227: x0 => x0.completed,
      _1229: x0 => x0.image,
      _1235: x0 => x0.displayWidth,
      _1236: x0 => x0.displayHeight,
      _1237: x0 => x0.duration,
      _1240: x0 => x0.ready,
      _1241: x0 => x0.selectedTrack,
      _1242: x0 => x0.repetitionCount,
      _1243: x0 => x0.frameCount,
      _1290: (x0,x1) => x0.createElement(x1),
      _1296: (x0,x1,x2) => x0.addEventListener(x1,x2),
      _1297: () => globalThis.Notification.requestPermission(),
      _1298: x0 => globalThis.URL.revokeObjectURL(x0),
      _1299: x0 => x0.remove(),
      _1300: (x0,x1,x2,x3) => x0.drawImage(x1,x2,x3),
      _1301: (x0,x1,x2,x3,x4,x5) => x0.drawImage(x1,x2,x3,x4,x5),
      _1302: x0 => globalThis.URL.createObjectURL(x0),
      _1303: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1303(f,arguments.length,x0) }),
      _1304: (x0,x1,x2,x3) => x0.toBlob(x1,x2,x3),
      _1305: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1305(f,arguments.length,x0) }),
      _1306: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1306(f,arguments.length,x0) }),
      _1307: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1307(f,arguments.length,x0) }),
      _1308: (x0,x1) => x0.querySelector(x1),
      _1309: (x0,x1) => x0.createElement(x1),
      _1310: (x0,x1) => x0.append(x1),
      _1311: (x0,x1,x2) => x0.setAttribute(x1,x2),
      _1312: (x0,x1) => x0.replaceChildren(x1),
      _1313: x0 => x0.click(),
      _1324: x0 => x0.toArray(),
      _1325: x0 => x0.toUint8Array(),
      _1326: x0 => ({serverTimestamps: x0}),
      _1327: x0 => ({source: x0}),
      _1328: x0 => ({merge: x0}),
      _1330: x0 => new firebase_firestore.FieldPath(x0),
      _1331: (x0,x1) => new firebase_firestore.FieldPath(x0,x1),
      _1332: (x0,x1,x2) => new firebase_firestore.FieldPath(x0,x1,x2),
      _1333: (x0,x1,x2,x3) => new firebase_firestore.FieldPath(x0,x1,x2,x3),
      _1334: (x0,x1,x2,x3,x4) => new firebase_firestore.FieldPath(x0,x1,x2,x3,x4),
      _1335: (x0,x1,x2,x3,x4,x5) => new firebase_firestore.FieldPath(x0,x1,x2,x3,x4,x5),
      _1336: (x0,x1,x2,x3,x4,x5,x6) => new firebase_firestore.FieldPath(x0,x1,x2,x3,x4,x5,x6),
      _1337: (x0,x1,x2,x3,x4,x5,x6,x7) => new firebase_firestore.FieldPath(x0,x1,x2,x3,x4,x5,x6,x7),
      _1338: (x0,x1,x2,x3,x4,x5,x6,x7,x8) => new firebase_firestore.FieldPath(x0,x1,x2,x3,x4,x5,x6,x7,x8),
      _1339: (x0,x1,x2,x3,x4,x5,x6,x7,x8,x9) => new firebase_firestore.FieldPath(x0,x1,x2,x3,x4,x5,x6,x7,x8,x9),
      _1340: () => globalThis.firebase_firestore.documentId(),
      _1341: (x0,x1) => new firebase_firestore.Timestamp(x0,x1),
      _1342: (x0,x1) => new firebase_firestore.GeoPoint(x0,x1),
      _1343: x0 => globalThis.firebase_firestore.vector(x0),
      _1344: x0 => globalThis.firebase_firestore.Bytes.fromUint8Array(x0),
      _1345: x0 => globalThis.firebase_firestore.writeBatch(x0),
      _1346: (x0,x1) => globalThis.firebase_firestore.collection(x0,x1),
      _1348: (x0,x1) => globalThis.firebase_firestore.doc(x0,x1),
      _1351: x0 => x0.call(),
      _1375: x0 => x0.commit(),
      _1376: (x0,x1) => x0.delete(x1),
      _1378: (x0,x1,x2) => x0.set(x1,x2),
      _1379: x0 => globalThis.firebase_firestore.deleteDoc(x0),
      _1380: x0 => globalThis.firebase_firestore.getDoc(x0),
      _1381: x0 => globalThis.firebase_firestore.getDocFromServer(x0),
      _1382: x0 => globalThis.firebase_firestore.getDocFromCache(x0),
      _1383: (x0,x1) => ({includeMetadataChanges: x0,source: x1}),
      _1386: (x0,x1,x2,x3) => globalThis.firebase_firestore.onSnapshot(x0,x1,x2,x3),
      _1388: (x0,x1,x2) => globalThis.firebase_firestore.setDoc(x0,x1,x2),
      _1389: (x0,x1) => globalThis.firebase_firestore.setDoc(x0,x1),
      _1390: (x0,x1) => globalThis.firebase_firestore.query(x0,x1),
      _1391: x0 => globalThis.firebase_firestore.getDocs(x0),
      _1392: x0 => globalThis.firebase_firestore.getDocsFromServer(x0),
      _1393: x0 => globalThis.firebase_firestore.getDocsFromCache(x0),
      _1394: x0 => globalThis.firebase_firestore.limit(x0),
      _1395: x0 => globalThis.firebase_firestore.limitToLast(x0),
      _1396: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1396(f,arguments.length,x0) }),
      _1397: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1397(f,arguments.length,x0) }),
      _1398: (x0,x1) => globalThis.firebase_firestore.orderBy(x0,x1),
      _1400: (x0,x1,x2) => globalThis.firebase_firestore.where(x0,x1,x2),
      _1402: x0 => globalThis.firebase_firestore.doc(x0),
      _1405: (x0,x1) => x0.data(x1),
      _1409: x0 => x0.docChanges(),
      _1416: () => globalThis.firebase_firestore.deleteField(),
      _1417: () => globalThis.firebase_firestore.serverTimestamp(),
      _1427: (x0,x1) => globalThis.firebase_firestore.getFirestore(x0,x1),
      _1429: x0 => globalThis.firebase_firestore.Timestamp.fromMillis(x0),
      _1430: (module,f) => finalizeWrapper(f, function() { return module.exports._1430(f,arguments.length) }),
      _1575: () => globalThis.firebase_firestore.updateDoc,
      _1576: () => globalThis.firebase_firestore.or,
      _1577: () => globalThis.firebase_firestore.and,
      _1592: x0 => x0.path,
      _1595: () => globalThis.firebase_firestore.GeoPoint,
      _1596: x0 => x0.latitude,
      _1597: x0 => x0.longitude,
      _1599: () => globalThis.firebase_firestore.VectorValue,
      _1600: () => globalThis.firebase_firestore.Bytes,
      _1603: x0 => x0.type,
      _1605: x0 => x0.doc,
      _1607: x0 => x0.oldIndex,
      _1609: x0 => x0.newIndex,
      _1611: () => globalThis.firebase_firestore.DocumentReference,
      _1615: x0 => x0.path,
      _1624: x0 => x0.metadata,
      _1625: x0 => x0.ref,
      _1630: x0 => x0.docs,
      _1632: x0 => x0.metadata,
      _1637: () => globalThis.firebase_firestore.Timestamp,
      _1638: x0 => x0.seconds,
      _1639: x0 => x0.nanoseconds,
      _1675: x0 => x0.hasPendingWrites,
      _1677: x0 => x0.fromCache,
      _1684: x0 => x0.source,
      _1689: () => globalThis.firebase_firestore.startAfter,
      _1690: () => globalThis.firebase_firestore.startAt,
      _1691: () => globalThis.firebase_firestore.endBefore,
      _1692: () => globalThis.firebase_firestore.endAt,
      _1693: () => globalThis.firebase_firestore.arrayRemove,
      _1694: () => globalThis.firebase_firestore.arrayUnion,
      _1726: x0 => x0.decode(),
      _1727: (x0,x1,x2,x3) => x0.open(x1,x2,x3),
      _1728: (x0,x1,x2) => x0.setRequestHeader(x1,x2),
      _1729: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1729(f,arguments.length,x0) }),
      _1730: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1730(f,arguments.length,x0) }),
      _1731: x0 => x0.send(),
      _1732: () => new XMLHttpRequest(),
      _1733: (x0,x1) => x0.getItem(x1),
      _1734: (x0,x1) => x0.removeItem(x1),
      _1735: (x0,x1,x2) => x0.setItem(x1,x2),
      _1737: (x0,x1,x2,x3,x4,x5,x6,x7,x8) => ({apiKey: x0,authDomain: x1,databaseURL: x2,projectId: x3,storageBucket: x4,messagingSenderId: x5,measurementId: x6,appId: x7,recaptchaSiteKey: x8}),
      _1738: (x0,x1) => globalThis.firebase_core.initializeApp(x0,x1),
      _1739: x0 => globalThis.firebase_core.getApp(x0),
      _1740: () => globalThis.firebase_core.getApp(),
      _1741: (x0,x1,x2) => globalThis.firebase_core.registerVersion(x0,x1,x2),
      _1743: x0 => globalThis.firebase_messaging.getMessaging(x0),
      _1744: x0 => globalThis.firebase_messaging.deleteToken(x0),
      _1745: (x0,x1) => globalThis.firebase_messaging.getToken(x0,x1),
      _1747: (x0,x1) => globalThis.firebase_messaging.onMessage(x0,x1),
      _1748: (x0,x1) => ({next: x0,error: x1}),
      _1751: (x0,x1) => ({vapidKey: x0,serviceWorkerRegistration: x1}),
      _1754: x0 => x0.title,
      _1755: x0 => x0.body,
      _1756: x0 => x0.image,
      _1757: x0 => x0.messageId,
      _1758: x0 => x0.collapseKey,
      _1759: x0 => x0.fcmOptions,
      _1760: x0 => x0.notification,
      _1761: x0 => x0.data,
      _1762: x0 => x0.from,
      _1763: x0 => x0.analyticsLabel,
      _1764: x0 => x0.link,
      _1766: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1766(f,arguments.length,x0) }),
      _1767: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1767(f,arguments.length,x0) }),
      _1769: () => globalThis.firebase_core.SDK_VERSION,
      _1775: x0 => x0.apiKey,
      _1777: x0 => x0.authDomain,
      _1779: x0 => x0.databaseURL,
      _1781: x0 => x0.projectId,
      _1783: x0 => x0.storageBucket,
      _1785: x0 => x0.messagingSenderId,
      _1787: x0 => x0.measurementId,
      _1789: x0 => x0.appId,
      _1791: x0 => x0.recaptchaSiteKey,
      _1793: x0 => x0.name,
      _1794: x0 => x0.options,
      _1795: (x0,x1) => x0.debug(x1),
      _1796: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1796(f,arguments.length,x0) }),
      _1797: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1797(f,arguments.length,x0,x1) }),
      _1798: (x0,x1) => ({createScript: x0,createScriptURL: x1}),
      _1799: (x0,x1,x2) => x0.createPolicy(x1,x2),
      _1800: (x0,x1) => x0.createScriptURL(x1),
      _1801: (x0,x1,x2) => x0.createScript(x1,x2),
      _1802: (x0,x1) => x0.appendChild(x1),
      _1803: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1803(f,arguments.length,x0) }),
      _1805: Date.now,
      _1807: s => new Date(s * 1000).getTimezoneOffset() * 60,
      _1808: s => {
        if (!/^\s*[+-]?(?:Infinity|NaN|(?:\.\d+|\d+(?:\.\d*)?)(?:[eE][+-]?\d+)?)\s*$/.test(s)) {
          return NaN;
        }
        return parseFloat(s);
      },
      _1809: () => typeof dartUseDateNowForTicks !== "undefined",
      _1810: () => 1000 * performance.now(),
      _1811: () => Date.now(),
      _1812: () => {
        // On browsers return `globalThis.location.href`
        if (globalThis.location != null) {
          return globalThis.location.href;
        }
        return null;
      },
      _1813: () => {
        return typeof process != "undefined" &&
               Object.prototype.toString.call(process) == "[object process]" &&
               process.platform == "win32"
      },
      _1814: () => new WeakMap(),
      _1815: (map, o) => map.get(o),
      _1816: (map, o, v) => map.set(o, v),
      _1817: x0 => new WeakRef(x0),
      _1818: x0 => x0.deref(),
      _1825: () => globalThis.WeakRef,
      _1828: s => JSON.stringify(s),
      _1829: s => printToConsole(s),
      _1830: o => {
        if (o === null || o === undefined) return 0;
        if (typeof(o) === 'string') return 1;
        return 2;
      },
      _1831: (o, p, r) => o.replaceAll(p, () => r),
      _1832: (o, p, r) => o.replace(p, () => r),
      _1833: Function.prototype.call.bind(String.prototype.toLowerCase),
      _1834: s => s.toUpperCase(),
      _1835: s => s.trim(),
      _1836: s => s.trimLeft(),
      _1837: s => s.trimRight(),
      _1838: (string, times) => string.repeat(times),
      _1839: Function.prototype.call.bind(String.prototype.indexOf),
      _1840: (s, p, i) => s.lastIndexOf(p, i),
      _1841: (string, token) => string.split(token),
      _1842: Object.is,
      _1847: (o, c) => o instanceof c,
      _1848: o => Object.keys(o),
      _1902: x0 => new Array(x0),
      _1904: x0 => x0.length,
      _1906: (x0,x1) => x0[x1],
      _1907: (x0,x1,x2) => { x0[x1] = x2 },
      _1910: (x0,x1,x2) => new DataView(x0,x1,x2),
      _1912: x0 => new Int8Array(x0),
      _1913: (x0,x1,x2) => new Uint8Array(x0,x1,x2),
      _1915: x0 => new Uint8ClampedArray(x0),
      _1917: x0 => new Int16Array(x0),
      _1919: x0 => new Uint16Array(x0),
      _1921: x0 => new Int32Array(x0),
      _1923: x0 => new Uint32Array(x0),
      _1925: x0 => new Float32Array(x0),
      _1927: x0 => new Float64Array(x0),
      _1951: x0 => x0.random(),
      _1952: (x0,x1) => x0.getRandomValues(x1),
      _1953: () => globalThis.crypto,
      _1954: () => globalThis.Math,
      _1967: (ms, c) =>
      setTimeout(() => dartInstance.exports.$invokeCallback(c),ms),
      _1968: (handle) => clearTimeout(handle),
      _1969: (ms, c) =>
      setInterval(() => dartInstance.exports.$invokeCallback(c), ms),
      _1970: (handle) => clearInterval(handle),
      _1971: (c) =>
      queueMicrotask(() => dartInstance.exports.$invokeCallback(c)),
      _1972: () => Date.now(),
      _1973: () => new Error().stack,
      _1974: (exn) => {
        let stackString = exn.toString();
        let frames = stackString.split('\n');
        let drop = 4;
        if (frames[0].startsWith('Error')) {
            drop += 1;
        }
        return frames.slice(drop).join('\n');
      },
      _1975: (s, m) => {
        try {
          return new RegExp(s, m);
        } catch (e) {
          return String(e);
        }
      },
      _1976: (x0,x1) => x0.exec(x1),
      _1977: (x0,x1) => x0.test(x1),
      _1978: x0 => x0.pop(),
      _1980: o => o === undefined,
      _1982: o => typeof o === 'function' && o[jsWrappedDartFunctionSymbol] === true,
      _1984: o => {
        const proto = Object.getPrototypeOf(o);
        return proto === Object.prototype || proto === null;
      },
      _1985: o => o instanceof RegExp,
      _1986: (l, r) => l === r,
      _1987: o => o,
      _1988: o => {
        if (o === undefined || o === null) return 0;
        if (typeof o === 'number') return 1;
        return 2;
      },
      _1989: o => o,
      _1990: o => {
        if (o === undefined || o === null) return 0;
        if (typeof o === 'boolean') return 1;
        return 2;
      },
      _1991: o => o,
      _1992: b => !!b,
      _1993: o => o.length,
      _1995: (o, i) => o[i],
      _1996: f => f.dartFunction,
      _1997: () => ({}),
      _1998: () => [],
      _2000: () => globalThis,
      _2001: (constructor, args) => {
        const factoryFunction = constructor.bind.apply(
            constructor, [null, ...args]);
        return new factoryFunction();
      },
      _2003: (o, p) => o[p],
      _2004: (o, p, v) => o[p] = v,
      _2005: (o, m, a) => o[m].apply(o, a),
      _2007: o => String(o),
      _2008: (p, s, f) => p.then(s, (e) => f(e, e === undefined)),
      _2009: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._2009(f,arguments.length,x0) }),
      _2010: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._2010(f,arguments.length,x0,x1) }),
      _2011: o => {
        if (o === undefined) return 1;
        var type = typeof o;
        if (type === 'boolean') return 2;
        if (type === 'number') return 3;
        if (type === 'string') return 4;
        if (o instanceof Array) return 5;
        if (ArrayBuffer.isView(o)) {
          if (o instanceof Int8Array) return 6;
          if (o instanceof Uint8Array) return 7;
          if (o instanceof Uint8ClampedArray) return 8;
          if (o instanceof Int16Array) return 9;
          if (o instanceof Uint16Array) return 10;
          if (o instanceof Int32Array) return 11;
          if (o instanceof Uint32Array) return 12;
          if (o instanceof Float32Array) return 13;
          if (o instanceof Float64Array) return 14;
          if (o instanceof DataView) return 15;
        }
        if (o instanceof ArrayBuffer) return 16;
        // Feature check for `SharedArrayBuffer` before doing a type-check.
        if (globalThis.SharedArrayBuffer !== undefined &&
            o instanceof SharedArrayBuffer) {
            return 17;
        }
        if (o instanceof Promise) return 18;
        return 19;
      },
      _2012: o => [o],
      _2013: (o0, o1) => [o0, o1],
      _2014: (o0, o1, o2) => [o0, o1, o2],
      _2015: (o0, o1, o2, o3) => [o0, o1, o2, o3],
      _2016: (exn) => {
        if (exn instanceof Error) {
          return exn.stack;
        } else {
          return null;
        }
      },
      _2017: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI8ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      _2018: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI8ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      _2019: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI16ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      _2020: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI16ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      _2021: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI32ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      _2022: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI32ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      _2023: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmF32ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      _2024: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmF32ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      _2025: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmF64ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      _2026: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmF64ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      _2027: x0 => new ArrayBuffer(x0),
      _2028: s => {
        if (/[[\]{}()*+?.\\^$|]/.test(s)) {
            s = s.replace(/[[\]{}()*+?.\\^$|]/g, '\\$&');
        }
        return s;
      },
      _2030: x0 => x0.index,
      _2032: x0 => x0.flags,
      _2033: x0 => x0.multiline,
      _2034: x0 => x0.ignoreCase,
      _2035: x0 => x0.unicode,
      _2036: x0 => x0.dotAll,
      _2037: (x0,x1) => { x0.lastIndex = x1 },
      _2038: (o, p) => p in o,
      _2039: (o, p) => o[p],
      _2040: (o, p, v) => o[p] = v,
      _2041: (o, p) => delete o[p],
      _2042: () => new XMLHttpRequest(),
      _2043: (x0,x1,x2,x3) => x0.open(x1,x2,x3),
      _2045: (x0,x1,x2) => x0.setRequestHeader(x1,x2),
      _2046: (x0,x1) => x0.send(x1),
      _2047: x0 => x0.send(),
      _2049: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._2049(f,arguments.length,x0) }),
      _2050: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._2050(f,arguments.length,x0) }),
      _2051: (x0,x1,x2,x3) => x0.addEventListener(x1,x2,x3),
      _2052: (x0,x1,x2,x3) => x0.removeEventListener(x1,x2,x3),
      _2061: (x0,x1,x2) => x0.open(x1,x2),
      _2062: x0 => x0.abort(),
      _2063: x0 => x0.getAllResponseHeaders(),
      _2064: () => new AbortController(),
      _2065: x0 => x0.abort(),
      _2066: (x0,x1,x2,x3,x4,x5) => ({method: x0,headers: x1,body: x2,credentials: x3,redirect: x4,signal: x5}),
      _2067: (x0,x1) => globalThis.fetch(x0,x1),
      _2068: (x0,x1) => x0.get(x1),
      _2069: (module,f) => finalizeWrapper(f, function(x0,x1,x2) { return module.exports._2069(f,arguments.length,x0,x1,x2) }),
      _2070: (x0,x1) => x0.forEach(x1),
      _2071: x0 => x0.getReader(),
      _2072: x0 => x0.cancel(),
      _2073: x0 => x0.read(),
      _2077: () => new FileReader(),
      _2078: (x0,x1) => x0.readAsArrayBuffer(x1),
      _2079: (x0,x1) => x0.key(x1),
      _2080: (x0,x1) => x0.item(x1),
      _2081: x0 => x0.trustedTypes,
      _2082: (x0,x1) => { x0.text = x1 },
      _2083: o => o instanceof Array,
      _2087: a => a.pop(),
      _2088: (a, i) => a.splice(i, 1),
      _2089: (a, s) => a.join(s),
      _2090: (a, s, e) => a.slice(s, e),
      _2092: (a, b) => a == b ? 0 : (a > b ? 1 : -1),
      _2093: a => a.length,
      _2095: (a, i) => a[i],
      _2096: (a, i, v) => a[i] = v,
      _2098: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof ArrayBuffer) return 1;
        if (globalThis.SharedArrayBuffer !== undefined &&
            o instanceof SharedArrayBuffer) {
          return 2;
        }
        return 3;
      },
      _2099: (o, offsetInBytes, lengthInBytes) => {
        var dst = new ArrayBuffer(lengthInBytes);
        new Uint8Array(dst).set(new Uint8Array(o, offsetInBytes, lengthInBytes));
        return new DataView(dst);
      },
      _2101: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Uint8Array) return 1;
        return 2;
      },
      _2102: (o, start, length) => new Uint8Array(o.buffer, o.byteOffset + start, length),
      _2103: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Int8Array) return 1;
        return 2;
      },
      _2104: (o, start, length) => new Int8Array(o.buffer, o.byteOffset + start, length),
      _2105: o => o instanceof Uint8ClampedArray,
      _2106: (o, start, length) => new Uint8ClampedArray(o.buffer, o.byteOffset + start, length),
      _2107: o => o instanceof Uint16Array,
      _2108: (o, start, length) => new Uint16Array(o.buffer, o.byteOffset + start, length),
      _2109: o => o instanceof Int16Array,
      _2110: (o, start, length) => new Int16Array(o.buffer, o.byteOffset + start, length),
      _2111: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Uint32Array) return 1;
        return 2;
      },
      _2112: (o, start, length) => new Uint32Array(o.buffer, o.byteOffset + start, length),
      _2113: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Int32Array) return 1;
        return 2;
      },
      _2114: (o, start, length) => new Int32Array(o.buffer, o.byteOffset + start, length),
      _2116: (o, start, length) => new BigInt64Array(o.buffer, o.byteOffset + start, length),
      _2117: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Float32Array) return 1;
        return 2;
      },
      _2118: (o, start, length) => new Float32Array(o.buffer, o.byteOffset + start, length),
      _2119: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Float64Array) return 1;
        return 2;
      },
      _2120: (o, start, length) => new Float64Array(o.buffer, o.byteOffset + start, length),
      _2121: (a, i) => a.push(i),
      _2122: (t, s) => t.set(s),
      _2123: l => new DataView(new ArrayBuffer(l)),
      _2124: (o) => new DataView(o.buffer, o.byteOffset, o.byteLength),
      _2125: o => o.byteLength,
      _2126: o => o.buffer,
      _2127: o => o.byteOffset,
      _2128: Function.prototype.call.bind(Object.getOwnPropertyDescriptor(DataView.prototype, 'byteLength').get),
      _2129: (b, o) => new DataView(b, o),
      _2130: (b, o, l) => new DataView(b, o, l),
      _2131: Function.prototype.call.bind(DataView.prototype.getUint8),
      _2132: Function.prototype.call.bind(DataView.prototype.setUint8),
      _2133: Function.prototype.call.bind(DataView.prototype.getInt8),
      _2134: Function.prototype.call.bind(DataView.prototype.setInt8),
      _2135: Function.prototype.call.bind(DataView.prototype.getUint16),
      _2136: Function.prototype.call.bind(DataView.prototype.setUint16),
      _2137: Function.prototype.call.bind(DataView.prototype.getInt16),
      _2138: Function.prototype.call.bind(DataView.prototype.setInt16),
      _2139: Function.prototype.call.bind(DataView.prototype.getUint32),
      _2140: Function.prototype.call.bind(DataView.prototype.setUint32),
      _2141: Function.prototype.call.bind(DataView.prototype.getInt32),
      _2142: Function.prototype.call.bind(DataView.prototype.setInt32),
      _2145: Function.prototype.call.bind(DataView.prototype.getBigInt64),
      _2146: Function.prototype.call.bind(DataView.prototype.setBigInt64),
      _2147: Function.prototype.call.bind(DataView.prototype.getFloat32),
      _2148: Function.prototype.call.bind(DataView.prototype.setFloat32),
      _2149: Function.prototype.call.bind(DataView.prototype.getFloat64),
      _2150: Function.prototype.call.bind(DataView.prototype.setFloat64),
      _2151: Function.prototype.call.bind(Number.prototype.toString),
      _2152: Function.prototype.call.bind(BigInt.prototype.toString),
      _2153: Function.prototype.call.bind(Number.prototype.toString),
      _2154: (d, digits) => d.toFixed(digits),
      _2160: (x0,x1) => x0.getContext(x1),
      _2165: () => globalThis.document,
      _2167: () => globalThis.console,
      _2172: (x0,x1) => { x0.height = x1 },
      _2174: (x0,x1) => { x0.width = x1 },
      _2176: (x0,x1) => { x0.pointerEvents = x1 },
      _2185: x0 => x0.style,
      _2188: x0 => x0.src,
      _2189: (x0,x1) => { x0.src = x1 },
      _2190: x0 => x0.naturalWidth,
      _2191: x0 => x0.naturalHeight,
      _2206: (x0,x1) => x0.error(x1),
      _2211: x0 => x0.status,
      _2212: (x0,x1) => { x0.responseType = x1 },
      _2214: x0 => x0.response,
      _2252: x0 => x0.readyState,
      _2254: (x0,x1) => { x0.timeout = x1 },
      _2256: (x0,x1) => { x0.withCredentials = x1 },
      _2257: x0 => x0.upload,
      _2258: x0 => x0.responseURL,
      _2259: x0 => x0.status,
      _2260: x0 => x0.statusText,
      _2262: (x0,x1) => { x0.responseType = x1 },
      _2263: x0 => x0.response,
      _2275: x0 => x0.loaded,
      _2276: x0 => x0.total,
      _2352: (x0,x1) => { x0.oncancel = x1 },
      _2358: (x0,x1) => { x0.onchange = x1 },
      _2398: (x0,x1) => { x0.onerror = x1 },
      _2771: (x0,x1) => { x0.src = x1 },
      _2782: x0 => x0.width,
      _2784: x0 => x0.height,
      _3268: (x0,x1) => { x0.accept = x1 },
      _3282: x0 => x0.files,
      _3308: (x0,x1) => { x0.multiple = x1 },
      _3326: (x0,x1) => { x0.type = x1 },
      _3578: (x0,x1) => { x0.type = x1 },
      _3586: (x0,x1) => { x0.crossOrigin = x1 },
      _3588: (x0,x1) => { x0.text = x1 },
      _3620: x0 => x0.width,
      _3621: (x0,x1) => { x0.width = x1 },
      _3622: x0 => x0.height,
      _3623: (x0,x1) => { x0.height = x1 },
      _4044: () => globalThis.window,
      _4107: x0 => x0.navigator,
      _4369: x0 => x0.trustedTypes,
      _4370: x0 => x0.sessionStorage,
      _4371: x0 => x0.localStorage,
      _4497: x0 => x0.vendor,
      _4704: x0 => x0.length,
      _6608: x0 => x0.type,
      _6609: x0 => x0.target,
      _6649: x0 => x0.signal,
      _6721: () => globalThis.document,
      _6803: x0 => x0.body,
      _6805: x0 => x0.head,
      _7137: (x0,x1) => { x0.id = x1 },
      _8483: x0 => x0.value,
      _8485: x0 => x0.done,
      _8665: x0 => x0.size,
      _8666: x0 => x0.type,
      _8673: x0 => x0.name,
      _8674: x0 => x0.lastModified,
      _8679: x0 => x0.length,
      _8685: x0 => x0.result,
      _9182: x0 => x0.url,
      _9184: x0 => x0.status,
      _9186: x0 => x0.statusText,
      _9187: x0 => x0.headers,
      _9188: x0 => x0.body,
      _12816: x0 => x0.name,
      _13532: () => globalThis.console,
      _13560: x0 => x0.name,
      _13561: x0 => x0.message,
      _13562: x0 => x0.code,

    };

    const baseImports = {
      dart2wasm: dart2wasm,
      Math: Math,
      Date: Date,
      Object: Object,
      Array: Array,
      Reflect: Reflect,
      WebAssembly: {
        JSTag: WebAssembly.JSTag,
      },
      "": new Proxy({}, { get(_, prop) { return prop; } }),

    };

    const jsStringPolyfill = {
      "charCodeAt": (s, i) => s.charCodeAt(i),
      "compare": (s1, s2) => {
        if (s1 < s2) return -1;
        if (s1 > s2) return 1;
        return 0;
      },
      "concat": (s1, s2) => s1 + s2,
      "equals": (s1, s2) => s1 === s2,
      "fromCharCode": (i) => String.fromCharCode(i),
      "length": (s) => s.length,
      "substring": (s, a, b) => s.substring(a, b),
      "fromCharCodeArray": (a, start, end) => {
        if (end <= start) return '';

        const read = dartInstance.exports.$wasmI16ArrayGet;
        let result = '';
        let index = start;
        const chunkLength = Math.min(end - index, 500);
        let array = new Array(chunkLength);
        while (index < end) {
          const newChunkLength = Math.min(end - index, 500);
          for (let i = 0; i < newChunkLength; i++) {
            array[i] = read(a, index++);
          }
          if (newChunkLength < chunkLength) {
            array = array.slice(0, newChunkLength);
          }
          result += String.fromCharCode(...array);
        }
        return result;
      },
      "intoCharCodeArray": (s, a, start) => {
        if (s === '') return 0;

        const write = dartInstance.exports.$wasmI16ArraySet;
        for (var i = 0; i < s.length; ++i) {
          write(a, start++, s.charCodeAt(i));
        }
        return s.length;
      },
      "test": (s) => typeof s == "string",
    };


    

    dartInstance = await WebAssembly.instantiate(this.module, {
      ...baseImports,
      ...additionalImports,
      
      "wasm:js-string": jsStringPolyfill,
    });
    dartInstance.exports.$setThisModule(dartInstance);

    return new InstantiatedApp(this, dartInstance);
  }
}

class InstantiatedApp {
  constructor(compiledApp, instantiatedModule) {
    this.compiledApp = compiledApp;
    this.instantiatedModule = instantiatedModule;
  }

  // Call the main function with the given arguments.
  invokeMain(...args) {
    this.instantiatedModule.exports.$invokeMain(args);
  }
}
