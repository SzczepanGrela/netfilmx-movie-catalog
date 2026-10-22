//#region \0rolldown/runtime.js
var __defProp = Object.defineProperty;
var __esmMin = (fn, res) => () => (fn && (res = fn(fn = 0)), res);
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) {
		__defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	}
	if (!no_symbols) {
		__defProp(target, Symbol.toStringTag, { value: "Module" });
	}
	return target;
};

//#endregion
//#region ../../node_modules/.pnpm/maverick.js@0.44.1/node_modules/maverick.js/dist/dev/signal.js
function flushEffects() {
	scheduledEffects = true;
	queueMicrotask(runEffects);
}
function runEffects() {
	if (!effects.length) {
		scheduledEffects = false;
		return;
	}
	runningEffects = true;
	for (let i = 0; i < effects.length; i++) if (effects[i].$st !== STATE_CLEAN) runTop(effects[i]);
	effects = [];
	scheduledEffects = false;
	runningEffects = false;
}
function runTop(node) {
	let ancestors = [node];
	while (node = node[SCOPE]) if (node.$e && node.$st !== STATE_CLEAN) ancestors.push(node);
	for (let i = ancestors.length - 1; i >= 0; i--) updateCheck(ancestors[i]);
}
function root(init) {
	const scope = createScope();
	return compute(scope, !init.length ? init : init.bind(null, dispose.bind(scope)), null);
}
function peek(fn) {
	return compute(currentScope, fn, null);
}
function untrack(fn) {
	return compute(null, fn, null);
}
function tick() {
	if (!runningEffects) runEffects();
}
function getScope() {
	return currentScope;
}
function scoped(run, scope) {
	try {
		return compute(scope, run, null);
	} catch (error) {
		handleError(scope, error);
		return;
	}
}
function getContext(key, scope = currentScope) {
	return scope?.$cx[key];
}
function setContext(key, value, scope = currentScope) {
	if (scope) scope.$cx = {
		...scope.$cx,
		[key]: value
	};
}
function onDispose(disposable) {
	if (!disposable || !currentScope) return disposable || NOOP;
	const node = currentScope;
	if (!node.$d) node.$d = disposable;
	else if (Array.isArray(node.$d)) node.$d.push(disposable);
	else node.$d = [node.$d, disposable];
	return function removeDispose() {
		if (node.$st === STATE_DISPOSED) return;
		disposable.call(null);
		if (isFunction$1(node.$d)) node.$d = null;
		else if (Array.isArray(node.$d)) node.$d.splice(node.$d.indexOf(disposable), 1);
	};
}
function dispose(self = true) {
	if (this.$st === STATE_DISPOSED) return;
	if (this.$h) if (Array.isArray(this.$h)) for (let i = this.$h.length - 1; i >= 0; i--) dispose.call(this.$h[i]);
	else dispose.call(this.$h);
	if (self) {
		const parent = this[SCOPE];
		if (parent) if (Array.isArray(parent.$h)) parent.$h.splice(parent.$h.indexOf(this), 1);
		else parent.$h = null;
		disposeNode(this);
	}
}
function disposeNode(node) {
	node.$st = STATE_DISPOSED;
	if (node.$d) emptyDisposal(node);
	if (node.$s) removeSourceObservers(node, 0);
	node[SCOPE] = null;
	node.$s = null;
	node.$o = null;
	node.$h = null;
	node.$cx = defaultContext;
	node.$eh = null;
}
function emptyDisposal(scope) {
	try {
		if (Array.isArray(scope.$d)) for (let i = scope.$d.length - 1; i >= 0; i--) {
			const callable = scope.$d[i];
			callable.call(callable);
		}
		else scope.$d.call(scope.$d);
		scope.$d = null;
	} catch (error) {
		handleError(scope, error);
	}
}
function compute(scope, compute2, observer) {
	const prevScope = currentScope, prevObserver = currentObserver;
	currentScope = scope;
	currentObserver = observer;
	try {
		return compute2.call(scope);
	} finally {
		currentScope = prevScope;
		currentObserver = prevObserver;
	}
}
function handleError(scope, error) {
	if (!scope || !scope.$eh) throw error;
	let i = 0, len = scope.$eh.length, currentError = error;
	for (i = 0; i < len; i++) try {
		scope.$eh[i](currentError);
		break;
	} catch (error2) {
		currentError = error2;
	}
	if (i === len) throw currentError;
}
function read() {
	if (this.$st === STATE_DISPOSED) return this.$v;
	if (currentObserver && !this.$e) if (!currentObservers && currentObserver.$s && currentObserver.$s[currentObserversIndex] == this) currentObserversIndex++;
	else if (!currentObservers) currentObservers = [this];
	else currentObservers.push(this);
	if (this.$c) updateCheck(this);
	return this.$v;
}
function write(newValue) {
	const value = isFunction$1(newValue) ? newValue(this.$v) : newValue;
	if (this.$ch(this.$v, value)) {
		this.$v = value;
		if (this.$o) for (let i = 0; i < this.$o.length; i++) notify(this.$o[i], STATE_DIRTY);
	}
	return this.$v;
}
function createScope() {
	return new ScopeNode();
}
function createComputation(initialValue, compute2, options) {
	return new ComputeNode(initialValue, compute2, options);
}
function isNotEqual(a, b) {
	return a !== b;
}
function isFunction$1(value) {
	return typeof value === "function";
}
function updateCheck(node) {
	if (node.$st === STATE_CHECK) for (let i = 0; i < node.$s.length; i++) {
		updateCheck(node.$s[i]);
		if (node.$st === STATE_DIRTY) break;
	}
	if (node.$st === STATE_DIRTY) update(node);
	else node.$st = STATE_CLEAN;
}
function cleanup(node) {
	if (node.$h) dispose.call(node, false);
	if (node.$d) emptyDisposal(node);
	node.$eh = node[SCOPE] ? node[SCOPE].$eh : null;
}
function update(node) {
	let prevObservers = currentObservers, prevObserversIndex = currentObserversIndex;
	currentObservers = null;
	currentObserversIndex = 0;
	try {
		cleanup(node);
		const result = compute(node, node.$c, node);
		updateObservers(node);
		if (!node.$e && node.$i) write.call(node, result);
		else {
			node.$v = result;
			node.$i = true;
		}
	} catch (error) {
		updateObservers(node);
		handleError(node, error);
	} finally {
		currentObservers = prevObservers;
		currentObserversIndex = prevObserversIndex;
		node.$st = STATE_CLEAN;
	}
}
function updateObservers(node) {
	if (currentObservers) {
		if (node.$s) removeSourceObservers(node, currentObserversIndex);
		if (node.$s && currentObserversIndex > 0) {
			node.$s.length = currentObserversIndex + currentObservers.length;
			for (let i = 0; i < currentObservers.length; i++) node.$s[currentObserversIndex + i] = currentObservers[i];
		} else node.$s = currentObservers;
		let source;
		for (let i = currentObserversIndex; i < node.$s.length; i++) {
			source = node.$s[i];
			if (!source.$o) source.$o = [node];
			else source.$o.push(node);
		}
	} else if (node.$s && currentObserversIndex < node.$s.length) {
		removeSourceObservers(node, currentObserversIndex);
		node.$s.length = currentObserversIndex;
	}
}
function notify(node, state) {
	if (node.$st >= state) return;
	if (node.$e && node.$st === STATE_CLEAN) {
		effects.push(node);
		if (!scheduledEffects) flushEffects();
	}
	node.$st = state;
	if (node.$o) for (let i = 0; i < node.$o.length; i++) notify(node.$o[i], STATE_CHECK);
}
function removeSourceObservers(node, index) {
	let source, swap;
	for (let i = index; i < node.$s.length; i++) {
		source = node.$s[i];
		if (source.$o) {
			swap = source.$o.indexOf(node);
			source.$o[swap] = source.$o[source.$o.length - 1];
			source.$o.pop();
		}
	}
}
function signal(initialValue, options) {
	const node = createComputation(initialValue, null, options), signal2 = read.bind(node);
	signal2[SCOPE] = true;
	signal2.set = write.bind(node);
	return signal2;
}
function isReadSignal(fn) {
	return isFunction$1(fn) && SCOPE in fn;
}
function computed(compute, options) {
	const node = createComputation(options?.initial, compute, options), signal2 = read.bind(node);
	signal2[SCOPE] = true;
	return signal2;
}
function effect$1(effect2, options) {
	const signal2 = createComputation(null, function runEffect() {
		let effectResult = effect2();
		isFunction$1(effectResult) && onDispose(effectResult);
		return null;
	}, void 0);
	signal2.$e = true;
	update(signal2);
	return dispose.bind(signal2, true);
}
function isWriteSignal(fn) {
	return isReadSignal(fn) && "set" in fn;
}
function noop(...args) {}
function isNull(value) {
	return value === null;
}
function isUndefined(value) {
	return typeof value === "undefined";
}
function isNil(value) {
	return isNull(value) || isUndefined(value);
}
function isObject(value) {
	return value?.constructor === Object;
}
function isNumber(value) {
	return typeof value === "number" && !Number.isNaN(value);
}
function isString(value) {
	return typeof value === "string";
}
function isBoolean(value) {
	return typeof value === "boolean";
}
function isFunction(value) {
	return typeof value === "function";
}
function isArray$1(value) {
	return Array.isArray(value);
}
/**
* Whether the given `event` is a `DOMEvent` class.
*/
function isDOMEvent(event) {
	return !!event?.[DOM_EVENT];
}
/**
* Adds an event listener for the given `type` and returns a function which can be invoked to
* remove the event listener.
*
* - The listener is removed if the current scope is disposed.
* - This function is safe to use on the server (noop).
*/
function listenEvent(target, type, handler, options) {
	target.addEventListener(type, handler, options);
	return onDispose(() => target.removeEventListener(type, handler, options));
}
/**
* Returns an `AbortSignal` that will abort when any of the given signals are aborted.
*/
function anySignal(...signals) {
	const controller = new AbortController(), options = { signal: controller.signal };
	function onAbort(event) {
		controller.abort(event.target.reason);
	}
	for (const signal of signals) {
		if (signal.aborted) {
			controller.abort(signal.reason);
			break;
		}
		signal.addEventListener("abort", onAbort, options);
	}
	return controller.signal;
}
function isTouchEvent(event) {
	return !!event?.type.startsWith("touch");
}
function isKeyboardEvent(event) {
	return !!event?.type.startsWith("key");
}
function wasEnterKeyPressed(event) {
	return isKeyboardEvent(event) && event.key === "Enter";
}
function isKeyboardClick(event) {
	return isKeyboardEvent(event) && (event.key === "Enter" || event.key === " ");
}
function isDOMNode(node) {
	return node instanceof Node;
}
/**
* Sets or removes the given attribute `value`. Falsy values except `''` and `0` will remove
* the attribute. If the given `value` is a function/signal, the attribute will be updated as
* the value updates.
*
* This function is safe to use on the server.
*
* @see {@link https://developer.mozilla.org/en-US/docs/Glossary/Falsy}
*/
function setAttribute(host, name, value) {
	if (!host) return;
	else if (!value && value !== "" && value !== 0) host.removeAttribute(name);
	else {
		const attrValue = value === true ? "" : value + "";
		if (host.getAttribute(name) !== attrValue) host.setAttribute(name, attrValue);
	}
}
/**
* Sets or removes the given style `value`. Falsy values will remove the style. If the
* given `value` is a function/signal, the style will be updated as the value updates.
*
* This function is safe to use on the server.
*
* @see {@link https://developer.mozilla.org/en-US/docs/Glossary/Falsy}
*/
function setStyle(host, property, value) {
	if (!host) return;
	else if (!value && value !== 0) host.style.removeProperty(property);
	else host.style.setProperty(property, value + "");
}
var SCOPE, scheduledEffects, runningEffects, currentScope, currentObserver, currentObservers, currentObserversIndex, effects, defaultContext, NOOP, STATE_CLEAN, STATE_CHECK, STATE_DIRTY, STATE_DISPOSED, ScopeNode, ScopeProto, ComputeNode, ComputeProto, effect, EVENT, DOM_EVENT, DOMEvent, EventTriggers, EventsTarget, EventsController;
var init_signal = __esmMin((() => {
	SCOPE = Symbol(0);
	scheduledEffects = false, runningEffects = false, currentScope = null, currentObserver = null, currentObservers = null, currentObserversIndex = 0, effects = [], defaultContext = {};
	NOOP = () => {}, STATE_CLEAN = 0, STATE_CHECK = 1, STATE_DIRTY = 2, STATE_DISPOSED = 3;
	ScopeNode = function Scope() {
		this[SCOPE] = null;
		this.$h = null;
		if (currentScope) currentScope.append(this);
	};
	ScopeProto = ScopeNode.prototype;
	ScopeProto.$cx = defaultContext;
	ScopeProto.$eh = null;
	ScopeProto.$c = null;
	ScopeProto.$d = null;
	ScopeProto.append = function(child) {
		child[SCOPE] = this;
		if (!this.$h) this.$h = child;
		else if (Array.isArray(this.$h)) this.$h.push(child);
		else this.$h = [this.$h, child];
		child.$cx = child.$cx === defaultContext ? this.$cx : {
			...this.$cx,
			...child.$cx
		};
		if (this.$eh) child.$eh = !child.$eh ? this.$eh : [...child.$eh, ...this.$eh];
	};
	ScopeProto.dispose = function() {
		dispose.call(this);
	};
	ComputeNode = function Computation(initialValue, compute2, options) {
		ScopeNode.call(this);
		this.$st = compute2 ? STATE_DIRTY : STATE_CLEAN;
		this.$i = false;
		this.$e = false;
		this.$s = null;
		this.$o = null;
		this.$v = initialValue;
		if (compute2) this.$c = compute2;
		if (options && options.dirty) this.$ch = options.dirty;
	};
	ComputeProto = ComputeNode.prototype;
	Object.setPrototypeOf(ComputeProto, ScopeProto);
	ComputeProto.$ch = isNotEqual;
	ComputeProto.call = read;
	effect = effect$1;
	EVENT = Event, DOM_EVENT = Symbol("DOM_EVENT");
	DOMEvent = class extends EVENT {
		/**
		* The preceding event that was responsible for this event being fired.
		*/
		get trigger() {
			return this.triggers.source;
		}
		/**
		* The origin event that lead to this event being fired.
		*/
		get originEvent() {
			return this.triggers.origin;
		}
		/**
		* Whether the origin event was triggered by the user.
		*
		* @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Event/isTrusted}
		*/
		get isOriginTrusted() {
			return this.triggers.origin?.isTrusted ?? false;
		}
		constructor(type, ...init) {
			super(type, init[0]);
			this[DOM_EVENT] = true;
			this.triggers = new EventTriggers();
			this.detail = init[0]?.detail;
			const trigger = init[0]?.trigger;
			if (trigger) this.triggers.add(trigger);
		}
	};
	EventTriggers = class {
		constructor() {
			this.chain = [];
		}
		get source() {
			return this.chain[0];
		}
		get origin() {
			return this.chain[this.chain.length - 1];
		}
		/**
		* Appends the event to the end of the chain.
		*/
		add(event) {
			this.chain.push(event);
			if (isDOMEvent(event)) this.chain.push(...event.triggers);
		}
		/**
		* Removes the event from the chain and returns it (if found).
		*/
		remove(event) {
			return this.chain.splice(this.chain.indexOf(event), 1)[0];
		}
		/**
		* Returns whether the chain contains the given `event`.
		*/
		has(event) {
			return this.chain.some((e) => e === event);
		}
		/**
		* Returns whether the chain contains the given event type.
		*/
		hasType(type) {
			return !!this.findType(type);
		}
		/**
		* Returns the first event with the given `type` found in the chain.
		*/
		findType(type) {
			return this.chain.find((e) => e.type === type);
		}
		/**
		* Walks an event chain on a given `event`, and invokes the given `callback` for each trigger event.
		*/
		walk(callback) {
			for (const event of this.chain) {
				const returnValue = callback(event);
				if (returnValue) return [event, returnValue];
			}
		}
		[Symbol.iterator]() {
			return this.chain.values();
		}
	};
	EventsTarget = class extends EventTarget {
		addEventListener(type, callback, options) {
			return super.addEventListener(type, callback, options);
		}
		removeEventListener(type, callback, options) {
			return super.removeEventListener(type, callback, options);
		}
	};
	EventsController = class {
		#target;
		#controller;
		get signal() {
			return this.#controller.signal;
		}
		constructor(target) {
			this.#target = target;
			this.#controller = new AbortController();
			onDispose(this.abort.bind(this));
		}
		add(type, handler, options) {
			if (this.signal.aborted) throw Error("aborted");
			this.#target.addEventListener(type, handler, {
				...options,
				signal: options?.signal ? anySignal(this.signal, options.signal) : this.signal
			});
			return this;
		}
		remove(type, handler) {
			this.#target.removeEventListener(type, handler);
			return this;
		}
		abort(reason) {
			this.#controller.abort(reason);
		}
	};
}));

//#endregion
//#region ../../node_modules/.pnpm/maverick.js@0.44.1/node_modules/maverick.js/dist/dev/controller.js
function createContext(provide) {
	return {
		id: Symbol(),
		provide
	};
}
function provideContext(context, value, scope = getScope()) {
	if (!scope) throw Error("[maverick] attempting to provide context outside root");
	const hasProvidedValue = !isUndefined(value);
	if (!hasProvidedValue && !context.provide) throw Error("[maverick] context can not be provided without a value or `provide` function");
	setContext(context.id, hasProvidedValue ? value : context.provide?.(), scope);
}
function useContext(context) {
	const value = getContext(context.id);
	if (isUndefined(value)) throw Error("[maverick] attempting to use context without providing first");
	return value;
}
function hasProvidedContext(context) {
	return !isUndefined(getContext(context.id));
}
function createInstanceProps(props) {
	const $props = {};
	for (const name of Object.keys(props)) {
		const def = props[name];
		$props[name] = signal(def, def);
	}
	return $props;
}
function createComponent(Component, init) {
	return root(() => {
		currentInstance.$$ = new Instance(Component, getScope(), init);
		const component = new Component();
		currentInstance.$$.component = component;
		currentInstance.$$ = null;
		return component;
	});
}
var PROPS, METHODS, ON_DISPATCH, EMPTY_PROPS, Instance, currentInstance, ViewController;
var init_controller = __esmMin((() => {
	init_signal();
	PROPS = /* @__PURE__ */ Symbol("PROPS");
	METHODS = /* @__PURE__ */ Symbol("METHODS");
	ON_DISPATCH = /* @__PURE__ */ Symbol("ON_DISPATCH");
	EMPTY_PROPS = {};
	Instance = class {
		#setupCallbacks;
		#attachCallbacks;
		#connectCallbacks;
		#destroyCallbacks;
		constructor(Component, scope, init) {
			this[ON_DISPATCH] = null;
			this.$el = signal(null);
			this.el = null;
			this.scope = null;
			this.attachScope = null;
			this.connectScope = null;
			this.component = null;
			this.destroyed = false;
			this.props = EMPTY_PROPS;
			this.attrs = null;
			this.styles = null;
			this.#setupCallbacks = [];
			this.#attachCallbacks = [];
			this.#connectCallbacks = [];
			this.#destroyCallbacks = [];
			this.scope = scope;
			if (init?.scope) init.scope.append(scope);
			let stateFactory = Component.state, props = Component.props;
			if (stateFactory) {
				this.$state = stateFactory.create();
				this.state = new Proxy(this.$state, { get: (_, prop) => this.$state[prop]() });
				provideContext(stateFactory, this.$state);
			}
			if (props) {
				this.props = createInstanceProps(props);
				if (init?.props) for (const prop of Object.keys(init.props)) this.props[prop]?.set(init.props[prop]);
			}
			onDispose(this.destroy.bind(this));
		}
		setup() {
			scoped(() => {
				for (const callback of this.#setupCallbacks) callback();
			}, this.scope);
		}
		attach(el) {
			if (this.el) return;
			this.el = el;
			this.$el.set(el);
			el.$$COMPONENT_NAME = this.component?.constructor.name;
			scoped(() => {
				this.attachScope = createScope();
				scoped(() => {
					for (const callback of this.#attachCallbacks) callback(this.el);
					this.#attachAttrs();
					this.#attachStyles();
				}, this.attachScope);
			}, this.scope);
			el.dispatchEvent(new Event("attached"));
		}
		detach() {
			this.attachScope?.dispose();
			this.attachScope = null;
			this.connectScope = null;
			if (this.el) this.el.$$COMPONENT_NAME = null;
			this.el = null;
			this.$el.set(null);
		}
		connect() {
			if (!this.el || !this.attachScope || !this.#connectCallbacks.length) return;
			scoped(() => {
				this.connectScope = createScope();
				scoped(() => {
					for (const callback of this.#connectCallbacks) callback(this.el);
				}, this.connectScope);
			}, this.attachScope);
		}
		disconnect() {
			this.connectScope?.dispose();
			this.connectScope = null;
		}
		destroy() {
			if (this.destroyed) return;
			this.destroyed = true;
			scoped(() => {
				for (const callback of this.#destroyCallbacks) callback(this.el);
			}, this.scope);
			const el = this.el;
			this.detach();
			this.scope.dispose();
			this.#setupCallbacks.length = 0;
			this.#attachCallbacks.length = 0;
			this.#connectCallbacks.length = 0;
			this.#destroyCallbacks.length = 0;
			this.component = null;
			this.attrs = null;
			this.styles = null;
			this.props = EMPTY_PROPS;
			this.scope = null;
			this.state = EMPTY_PROPS;
			this.$state = null;
			if (el) delete el.$;
		}
		addHooks(target) {
			if (target.onSetup) this.#setupCallbacks.push(target.onSetup.bind(target));
			if (target.onAttach) this.#attachCallbacks.push(target.onAttach.bind(target));
			if (target.onConnect) this.#connectCallbacks.push(target.onConnect.bind(target));
			if (target.onDestroy) this.#destroyCallbacks.push(target.onDestroy.bind(target));
		}
		#attachAttrs() {
			if (!this.attrs) return;
			for (const name of Object.keys(this.attrs)) if (isFunction(this.attrs[name])) effect(this.#setAttr.bind(this, name));
			else setAttribute(this.el, name, this.attrs[name]);
		}
		#attachStyles() {
			if (!this.styles) return;
			for (const name of Object.keys(this.styles)) if (isFunction(this.styles[name])) effect(this.#setStyle.bind(this, name));
			else setStyle(this.el, name, this.styles[name]);
		}
		#setAttr(name) {
			setAttribute(this.el, name, this.attrs[name].call(this.component));
		}
		#setStyle(name) {
			setStyle(this.el, name, this.styles[name].call(this.component));
		}
	};
	currentInstance = { $$: null };
	ViewController = class extends EventTarget {
		get el() {
			return this.$$.el;
		}
		get $el() {
			return this.$$.$el();
		}
		get scope() {
			return this.$$.scope;
		}
		get attachScope() {
			return this.$$.attachScope;
		}
		get connectScope() {
			return this.$$.connectScope;
		}
		/** @internal */
		get $props() {
			return this.$$.props;
		}
		/** @internal */
		get $state() {
			return this.$$.$state;
		}
		get state() {
			return this.$$.state;
		}
		constructor() {
			super();
			if (currentInstance.$$) this.attach(currentInstance);
		}
		attach({ $$ }) {
			this.$$ = $$;
			$$.addHooks(this);
			return this;
		}
		addEventListener(type, callback, options) {
			if (!this.el) {
				const name = this.constructor.name;
				console.warn(`[maverick] adding event listener to \`${name}\` before element is attached`);
			}
			this.listen(type, callback, options);
		}
		removeEventListener(type, callback, options) {
			this.el?.removeEventListener(type, callback, options);
		}
		/**
		* This method can be used to specify attributes that should be set on the host element. Any
		* attributes that are assigned to a function will be considered a signal and updated accordingly.
		*/
		setAttributes(attributes) {
			if (!this.$$.attrs) this.$$.attrs = {};
			Object.assign(this.$$.attrs, attributes);
		}
		/**
		* This method can be used to specify styles that should set be set on the host element. Any
		* styles that are assigned to a function will be considered a signal and updated accordingly.
		*/
		setStyles(styles) {
			if (!this.$$.styles) this.$$.styles = {};
			Object.assign(this.$$.styles, styles);
		}
		/**
		* This method is used to satisfy the CSS variables contract specified on the current
		* component. Other CSS variables can be set via the `setStyles` method.
		*/
		setCSSVars(vars) {
			this.setStyles(vars);
		}
		/**
		* Type-safe utility for creating component DOM events.
		*/
		createEvent(type, ...init) {
			return new DOMEvent(type, init[0]);
		}
		/**
		* Creates a `DOMEvent` and dispatches it from the host element. This method is typed to
		* match all component events.
		*/
		dispatch(type, ...init) {
			if (!this.el) return false;
			const event = type instanceof Event ? type : new DOMEvent(type, init[0]);
			Object.defineProperty(event, "target", { get: () => this.$$.component });
			return untrack(() => {
				this.$$[ON_DISPATCH]?.(event);
				return this.el.dispatchEvent(event);
			});
		}
		dispatchEvent(event) {
			return this.dispatch(event);
		}
		/**
		* Adds an event listener for the given `type` and returns a function which can be invoked to
		* remove the event listener.
		*
		* - The listener is removed if the current scope is disposed.
		* - This method is safe to use on the server (noop).
		*/
		listen(type, handler, options) {
			if (!this.el) return noop;
			return listenEvent(this.el, type, handler, options);
		}
	};
}));

//#endregion
//#region ../../node_modules/.pnpm/maverick.js@0.44.1/node_modules/maverick.js/dist/dev/string.js
function runAll(fns, arg) {
	for (const fn of fns) fn(arg);
}
/**
* Converts a camelCase string to kebab-case.
*
* @example `myProperty -> my-property`
*/
function camelToKebabCase(str) {
	return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}
/**
* Converts a kebab-case string to camelCase.
*
* @example `my-property -> myProperty`
*/
function kebabToCamelCase(str) {
	return str.replace(/-./g, (x) => x[1].toUpperCase());
}
function uppercaseFirstChar(str) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}
var init_string = __esmMin((() => {}));

//#endregion
//#region ../../node_modules/.pnpm/maverick.js@0.44.1/node_modules/maverick.js/dist/dev/element.js
init_signal();
init_controller();
init_string();
const STRING = (v) => v === null ? "" : v + "";
const NULLABLE_STRING = (v) => v === null ? null : v + "";
const NUMBER = (v) => v === null ? 0 : Number(v);
const BOOLEAN = (v) => v !== null;
const FUNCTION = () => null;
const ARRAY = (v) => v === null ? [] : JSON.parse(v);
const OBJECT = (v) => v === null ? {} : JSON.parse(v);
function inferAttributeConverter(value) {
	if (value === null) return NULLABLE_STRING;
	switch (typeof value) {
		case "undefined": return STRING;
		case "string": return STRING;
		case "boolean": return BOOLEAN;
		case "number": return NUMBER;
		case "function": return FUNCTION;
		case "object": return isArray$1(value) ? ARRAY : OBJECT;
		default: return STRING;
	}
}
const ATTRS = /* @__PURE__ */ Symbol("ATTRS");
const SETUP = /* @__PURE__ */ Symbol("SETUP");
const SETUP_STATE = /* @__PURE__ */ Symbol("SETUP_STATE");
const SETUP_CALLBACKS = /* @__PURE__ */ Symbol("SETUP_CALLBACKS");
function Host(Super, Component) {
	class MaverickElement extends Super {
		static {
			this[ATTRS] = null;
		}
		static get observedAttributes() {
			if (!this[ATTRS] && Component.props) {
				const map = /* @__PURE__ */ new Map();
				for (const propName of Object.keys(Component.props)) {
					let attr = this.attrs?.[propName], attrName = isString(attr) ? attr : !attr ? attr : attr?.attr;
					if (attrName === false) continue;
					if (!attrName) attrName = camelToKebabCase(propName);
					map.set(attrName, {
						prop: propName,
						converter: attr && !isString(attr) && attr?.converter || inferAttributeConverter(Component.props[propName])
					});
				}
				this[ATTRS] = map;
			}
			return this[ATTRS] ? Array.from(this[ATTRS].keys()) : [];
		}
		get scope() {
			return this.$.$$.scope;
		}
		get attachScope() {
			return this.$.$$.attachScope;
		}
		get connectScope() {
			return this.$.$$.connectScope;
		}
		get $props() {
			return this.$.$$.props;
		}
		get $state() {
			return this.$.$$.$state;
		}
		get state() {
			return this.$.state;
		}
		constructor(...args) {
			super(...args);
			this[SETUP_STATE] = 0;
			this[SETUP_CALLBACKS] = null;
			this.keepAlive = false;
			this.forwardKeepAlive = true;
			this.$ = scoped(() => createComponent(Component), null);
			this.$.$$.addHooks(this);
			if (Component.props) {
				const props = this.$props, descriptors = Object.getOwnPropertyDescriptors(this);
				for (const prop of Object.keys(descriptors)) if (prop in Component.props) {
					props[prop].set(this[prop]);
					delete this[prop];
				}
			}
		}
		attributeChangedCallback(name, _, newValue) {
			const Ctor = this.constructor;
			if (!Ctor[ATTRS]) {
				super.attributeChangedCallback?.(name, _, newValue);
				return;
			}
			const def = Ctor[ATTRS].get(name);
			if (def) this[def.prop] = def.converter(newValue);
		}
		connectedCallback() {
			const instance = this.$?.$$;
			if (!instance || instance.destroyed) return;
			if (this[SETUP_STATE] !== 2) {
				setup.call(this);
				return;
			}
			if (!this.isConnected) return;
			if (this.hasAttribute("keep-alive")) this.keepAlive = true;
			instance.connect();
			if (isArray$1(this[SETUP_CALLBACKS])) runAll(this[SETUP_CALLBACKS], this);
			this[SETUP_CALLBACKS] = null;
			const callback = super.connectedCallback;
			if (callback) scoped(() => callback.call(this), this.connectScope);
		}
		disconnectedCallback() {
			const instance = this.$?.$$;
			if (!instance || instance.destroyed) return;
			instance.disconnect();
			const callback = super.disconnectedCallback;
			if (callback) callback.call(this);
			if (!this.keepAlive && !this.hasAttribute("keep-alive")) setTimeout(() => {
				requestAnimationFrame(() => {
					if (!this.isConnected) instance.destroy();
				});
			}, 0);
		}
		[SETUP]() {
			const instance = this.$.$$, Ctor = this.constructor;
			if (instance.destroyed) console.warn(`[maverick] attempted attaching to destroyed element \`${this.tagName}\``);
			if (instance.destroyed) return;
			const attrs = Ctor[ATTRS];
			if (attrs) for (const attr of this.attributes) {
				let def = attrs.get(attr.name);
				if (def && def.converter) instance.props[def.prop].set(def.converter(this.getAttribute(attr.name)));
			}
			instance.setup();
			instance.attach(this);
			this[SETUP_STATE] = 2;
			this.connectedCallback();
		}
		subscribe(callback) {
			return this.$.subscribe(callback);
		}
		destroy() {
			this.disconnectedCallback();
			this.$.destroy();
		}
	}
	extendProto(MaverickElement, Component);
	return MaverickElement;
}
function extendProto(Element, Component) {
	const ElementProto = Element.prototype, ComponentProto = Component.prototype;
	if (Component.props) for (const prop of Object.keys(Component.props)) Object.defineProperty(ElementProto, prop, {
		enumerable: true,
		configurable: true,
		get() {
			return this.$props[prop]();
		},
		set(value) {
			this.$props[prop].set(value);
		}
	});
	if (ComponentProto[PROPS]) for (const name of ComponentProto[PROPS]) Object.defineProperty(ElementProto, name, {
		enumerable: true,
		configurable: true,
		get() {
			return this.$[name];
		},
		set(value) {
			this.$[name] = value;
		}
	});
	if (ComponentProto[METHODS]) for (const name of ComponentProto[METHODS]) ElementProto[name] = function(...args) {
		return this.$[name](...args);
	};
}
function setup() {
	if (this[SETUP_STATE] !== 0) return;
	this[SETUP_STATE] = 1;
	const parent = findParent(this), isParentRegistered = parent && window.customElements.get(parent.localName), isParentSetup = parent && parent[SETUP_STATE] === 2;
	if (parent && (!isParentRegistered || !isParentSetup)) {
		waitForParent.call(this, parent);
		return;
	}
	attach.call(this, parent);
}
async function waitForParent(parent) {
	await window.customElements.whenDefined(parent.localName);
	if (parent[SETUP_STATE] !== 2) await new Promise((res) => (parent[SETUP_CALLBACKS] ??= []).push(res));
	attach.call(this, parent);
}
function attach(parent) {
	if (!this.isConnected) return;
	if (parent) {
		if (parent.keepAlive && parent.forwardKeepAlive) {
			this.keepAlive = true;
			this.setAttribute("keep-alive", "");
		}
		const scope = this.$.$$.scope;
		if (scope) parent.$.$$.attachScope.append(scope);
	}
	this[SETUP]();
}
function findParent(host) {
	let node = host.parentNode, prefix = host.localName.split("-", 1)[0] + "-";
	while (node) {
		if (node.nodeType === 1 && node.localName.startsWith(prefix)) return node;
		node = node.parentNode;
	}
	return null;
}
function defineCustomElement(element, throws = false) {
	if (throws || !window.customElements.get(element.tagName)) window.customElements.define(element.tagName, element);
}

//#endregion
//#region ../../node_modules/.pnpm/maverick.js@0.44.1/node_modules/maverick.js/dist/dev/index.js
function prop(target, propertyKey, descriptor) {
	if (!target[PROPS]) target[PROPS] = /* @__PURE__ */ new Set();
	target[PROPS].add(propertyKey);
}
function method(target, propertyKey, descriptor) {
	if (!target[METHODS]) target[METHODS] = /* @__PURE__ */ new Set();
	target[METHODS].add(propertyKey);
}
/**
* Returns the state record context value for the current component tree.
*/
function useState(state) {
	return useContext(state);
}
var Component, State;
var init_dev = __esmMin((() => {
	init_signal();
	init_controller();
	Component = class extends ViewController {
		subscribe(callback) {
			if (!this.state) {
				const name = this.constructor.name;
				throw Error(`[maverick] component \`${name}\` can not be subscribed to because it has no internal state`);
			}
			return scoped(() => effect(() => callback(this.state)), this.$$.scope);
		}
		destroy() {
			this.$$.destroy();
		}
	};
	State = class {
		#descriptors;
		constructor(record) {
			this.id = Symbol("STATE");
			this.record = record;
			this.#descriptors = Object.getOwnPropertyDescriptors(record);
		}
		create() {
			const store = {}, state = new Proxy(store, { get: (_, prop) => store[prop]() });
			for (const name of Object.keys(this.record)) {
				const getter = this.#descriptors[name].get;
				store[name] = getter ? computed(getter.bind(state)) : signal(this.record[name]);
			}
			return store;
		}
		reset(record, filter) {
			for (const name of Object.keys(record)) if (!this.#descriptors[name].get && (!filter || filter(name))) record[name].set(this.record[name]);
		}
	};
}));

//#endregion
//#region ../../node_modules/.pnpm/maverick.js@0.44.1/node_modules/maverick.js/dist/dev/std.js
function ariaBool$1(value) {
	return value ? "true" : "false";
}
/**
* Creates and returns a disposal bin for managing cleanup operations.
*
* @example
* ```ts
* const bin = createDisposalBin();
* // Add callbacks
* bin.add(() => {});
* bin.add(() => {});
* // Empty bin by running callbacks
* bin.empty();
* ```
*/
function createDisposalBin() {
	const disposal = /* @__PURE__ */ new Set();
	return {
		add(...callbacks) {
			for (const callback of callbacks) disposal.add(callback);
		},
		empty() {
			for (const callback of disposal) callback();
			disposal.clear();
		}
	};
}
function keysOf(obj) {
	return Object.keys(obj);
}
/**
* Creates an empty Promise and defers resolving/rejecting it.
*/
function deferredPromise() {
	let resolve, reject;
	return {
		promise: new Promise((res, rej) => {
			resolve = res;
			reject = rej;
		}),
		resolve,
		reject
	};
}
/**
* Resolves after the given `delay` timeout has passed.
*/
function waitTimeout(delay) {
	return new Promise((resolve) => setTimeout(resolve, delay));
}
/**
* Creates a throttled function that only invokes `func` at most once per animation frame. This is
* a noop server-side.
*
* @param func - The function to throttle.
* @see {@link https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame}
*/
function animationFrameThrottle(func) {
	let id = -1, lastArgs;
	function throttle(...args) {
		lastArgs = args;
		if (id >= 0) return;
		id = window.requestAnimationFrame(() => {
			func.apply(this, lastArgs);
			id = -1;
			lastArgs = void 0;
		});
	}
	return throttle;
}
/**
* Queues and waits for a function to be called during a browser's idle periods. This enables
* developers to perform background and low priority work on the main event loop, without impacting
* latency-critical events such as animation and input response. Functions are generally called in
* first-in-first-out order; however, callbacks which have a `timeout` specified may be called
* out-of-order if necessary in order to run them before the timeout elapses.
*
* - If `requestIdleCallback` is not available, this function will wait for a new animation frame.
* - This is safe to call server-side, the given `callback` won't be invoked.
*
* @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback}
*/
function waitIdlePeriod(callback, options) {
	return new Promise((resolve) => {
		requestIdleCallback((deadline) => {
			callback?.(deadline);
			resolve();
		}, options);
	});
}
var requestIdleCallback;
var init_std = __esmMin((() => {
	init_signal();
	init_string();
	requestIdleCallback = typeof window !== "undefined" ? "requestIdleCallback" in window ? window.requestIdleCallback : (cb) => window.setTimeout(cb, 1) : noop;
}));

//#endregion
//#region src/core/api/media-attrs.ts
init_dev();
init_std();
const MEDIA_ATTRIBUTES = Symbol("MEDIA_ATTRIBUTES");
const mediaAttributes = [
	"autoPlay",
	"canAirPlay",
	"canFullscreen",
	"canGoogleCast",
	"canLoad",
	"canLoadPoster",
	"canPictureInPicture",
	"canPlay",
	"canSeek",
	"ended",
	"fullscreen",
	"isAirPlayConnected",
	"isGoogleCastConnected",
	"live",
	"liveEdge",
	"loop",
	"mediaType",
	"muted",
	"paused",
	"pictureInPicture",
	"playing",
	"playsInline",
	"remotePlaybackState",
	"remotePlaybackType",
	"seeking",
	"started",
	"streamType",
	"viewType",
	"waiting"
];

//#endregion
//#region src/core/api/media-context.ts
const mediaContext = createContext();
function useMediaContext() {
	return useContext(mediaContext);
}

//#endregion
//#region src/providers/type-check.ts
/** @see {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLAudioElement} */
function isHTMLAudioElement(element) {
	return element instanceof HTMLAudioElement;
}
/** @see {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement} */
function isHTMLVideoElement(element) {
	return element instanceof HTMLVideoElement;
}
/** @see {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement} */
function isHTMLMediaElement(element) {
	return isHTMLAudioElement(element) || isHTMLVideoElement(element);
}
/** @see {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLIFrameElement} */
function isHTMLIFrameElement(element) {
	return element instanceof HTMLIFrameElement;
}

//#endregion
//#region src/core/api/player-controller.ts
init_dev();
var MediaPlayerController = class extends ViewController {};

//#endregion
//#region src/core/keyboard/controller.ts
init_dev();
const MEDIA_KEY_SHORTCUTS = {
	togglePaused: "k Space",
	toggleMuted: "m",
	toggleFullscreen: "f",
	togglePictureInPicture: "i",
	toggleCaptions: "c",
	seekBackward: "j J ArrowLeft",
	seekForward: "l L ArrowRight",
	volumeUp: "ArrowUp",
	volumeDown: "ArrowDown",
	speedUp: ">",
	slowDown: "<"
};
const MODIFIER_KEYS = new Set([
	"Shift",
	"Alt",
	"Meta",
	"Ctrl"
]), BUTTON_SELECTORS = "button, [role=\"button\"]", IGNORE_SELECTORS = "input, textarea, select, [contenteditable], [role^=\"menuitem\"], [role=\"timer\"]";
var MediaKeyboardController = class extends MediaPlayerController {
	#media;
	constructor(media) {
		super();
		this.#media = media;
	}
	onConnect() {
		effect(this.#onTargetChange.bind(this));
	}
	#onTargetChange() {
		const { keyDisabled, keyTarget } = this.$props;
		if (keyDisabled()) return;
		const target = keyTarget() === "player" ? this.el : document, $active = signal(false);
		if (target === this.el) new EventsController(this.el).add("focusin", () => $active.set(true)).add("focusout", (event) => {
			if (!this.el.contains(event.target)) $active.set(false);
		});
		else {
			if (!peek($active)) $active.set(document.querySelector("[data-media-player]") === this.el);
			listenEvent(document, "focusin", (event) => {
				const activePlayer = event.composedPath().find((el) => el instanceof Element && el.localName === "media-player");
				if (activePlayer !== void 0) $active.set(this.el === activePlayer);
			});
		}
		effect(() => {
			if (!$active()) return;
			new EventsController(target).add("keyup", this.#onKeyUp.bind(this)).add("keydown", this.#onKeyDown.bind(this)).add("keydown", this.#onPreventVideoKeys.bind(this), { capture: true });
		});
	}
	#onKeyUp(event) {
		const focusedEl = document.activeElement;
		if (!event.key || !this.$state.canSeek() || focusedEl?.matches(IGNORE_SELECTORS)) return;
		let { method, value } = this.#getMatchingMethod(event);
		if (!isString(value) && !isArray$1(value)) {
			value?.onKeyUp?.({
				event,
				player: this.#media.player,
				remote: this.#media.remote
			});
			value?.callback?.(event, this.#media.remote);
			return;
		}
		if (method?.startsWith("seek")) {
			event.preventDefault();
			event.stopPropagation();
			if (this.#timeSlider) {
				this.#forwardTimeKeyboardEvent(event, method === "seekForward");
				this.#timeSlider = null;
			} else {
				this.#media.remote.seek(this.#seekTotal, event);
				this.#seekTotal = void 0;
			}
		}
		if (method?.startsWith("volume")) this.el.querySelector("[data-media-volume-slider]")?.dispatchEvent(new KeyboardEvent("keyup", {
			key: method === "volumeUp" ? "Up" : "Down",
			shiftKey: event.shiftKey,
			trigger: event
		}));
	}
	#onKeyDown(event) {
		if (!event.key || MODIFIER_KEYS.has(event.key)) return;
		const focusedEl = document.activeElement;
		if (focusedEl?.matches(IGNORE_SELECTORS) || isKeyboardClick(event) && focusedEl?.matches(BUTTON_SELECTORS)) return;
		let { method, value } = this.#getMatchingMethod(event), isNumberPress = !event.metaKey && /^[0-9]$/.test(event.key);
		if (!isString(value) && !isArray$1(value) && !isNumberPress) {
			value?.onKeyDown?.({
				event,
				player: this.#media.player,
				remote: this.#media.remote
			});
			value?.callback?.(event, this.#media.remote);
			return;
		}
		if (!method && isNumberPress && !modifierKeyPressed(event)) {
			event.preventDefault();
			event.stopPropagation();
			this.#media.remote.seek(this.$state.duration() / 10 * Number(event.key), event);
			return;
		}
		if (!method) return;
		event.preventDefault();
		event.stopPropagation();
		switch (method) {
			case "seekForward":
			case "seekBackward":
				this.#seeking(event, method, method === "seekForward");
				break;
			case "volumeUp":
			case "volumeDown":
				const volumeSlider = this.el.querySelector("[data-media-volume-slider]");
				if (volumeSlider) volumeSlider.dispatchEvent(new KeyboardEvent("keydown", {
					key: method === "volumeUp" ? "Up" : "Down",
					shiftKey: event.shiftKey,
					trigger: event
				}));
				else {
					const value = event.shiftKey ? .1 : .05;
					this.#media.remote.changeVolume(this.$state.volume() + (method === "volumeUp" ? +value : -value), event);
				}
				break;
			case "toggleFullscreen":
				this.#media.remote.toggleFullscreen("prefer-media", event);
				break;
			case "speedUp":
			case "slowDown":
				const playbackRate = this.$state.playbackRate();
				this.#media.remote.changePlaybackRate(Math.max(.25, Math.min(2, playbackRate + (method === "speedUp" ? .25 : -.25))), event);
				break;
			default: this.#media.remote[method]?.(event);
		}
		this.$state.lastKeyboardAction.set({
			action: method,
			event
		});
	}
	#onPreventVideoKeys(event) {
		if (isHTMLMediaElement(event.target) && this.#getMatchingMethod(event).method) event.preventDefault();
	}
	#getMatchingMethod(event) {
		const keyShortcuts = {
			...this.$props.keyShortcuts(),
			...this.#media.ariaKeys
		};
		const method = Object.keys(keyShortcuts).find((method) => {
			const value = keyShortcuts[method], keys = isArray$1(value) ? value.join(" ") : isString(value) ? value : value?.keys;
			return ((isArray$1(keys) ? keys : keys?.split(" "))?.map((key) => replaceSymbolKeys(key).replace(/Control/g, "Ctrl").split("+")))?.some((combo) => {
				const modifierKeys = new Set(combo.filter((key) => MODIFIER_KEYS.has(key)));
				if ("<>".includes(event.key)) modifierKeys.add("Shift");
				for (const modKey of MODIFIER_KEYS) {
					const modKeyProp = modKey.toLowerCase() + "Key";
					if (!modifierKeys.has(modKey) && event[modKeyProp]) return false;
				}
				return combo.every((key) => {
					return MODIFIER_KEYS.has(key) ? event[key.toLowerCase() + "Key"] : event.key === key.replace("Space", " ");
				});
			});
		});
		return {
			method,
			value: method ? keyShortcuts[method] : null
		};
	}
	#seekTotal;
	#calcSeekAmount(event, type) {
		const seekBy = event.shiftKey ? 10 : 5;
		return this.#seekTotal = Math.max(0, Math.min((this.#seekTotal ?? this.$state.currentTime()) + (type === "seekForward" ? +seekBy : -seekBy), this.$state.duration()));
	}
	#timeSlider = null;
	#forwardTimeKeyboardEvent(event, forward) {
		this.#timeSlider?.dispatchEvent(new KeyboardEvent(event.type, {
			key: !forward ? "Left" : "Right",
			shiftKey: event.shiftKey,
			trigger: event
		}));
	}
	#seeking(event, type, forward) {
		if (!this.$state.canSeek()) return;
		if (!this.#timeSlider) this.#timeSlider = this.el.querySelector("[data-media-time-slider]");
		if (this.#timeSlider) this.#forwardTimeKeyboardEvent(event, forward);
		else this.#media.remote.seeking(this.#calcSeekAmount(event, type), event);
	}
};
const SYMBOL_KEY_MAP = [
	"!",
	"@",
	"#",
	"$",
	"%",
	"^",
	"&",
	"*",
	"(",
	")"
];
function replaceSymbolKeys(key) {
	return key.replace(/Shift\+(\d)/g, (_, num) => SYMBOL_KEY_MAP[num - 1]);
}
function modifierKeyPressed(event) {
	for (const key of MODIFIER_KEYS) if (event[key.toLowerCase() + "Key"]) return true;
	return false;
}

//#endregion
//#region src/core/api/player-props.ts
const mediaPlayerProps = {
	artist: "",
	artwork: null,
	ariaLabel: "",
	autoplay: false,
	autoPlay: false,
	clipStartTime: 0,
	clipEndTime: 0,
	controls: false,
	currentTime: 0,
	crossorigin: null,
	crossOrigin: null,
	duration: -1,
	fullscreenOrientation: "landscape",
	googleCast: {},
	load: "visible",
	posterLoad: "visible",
	logLevel: "warn",
	loop: false,
	muted: false,
	paused: true,
	playsinline: false,
	playsInline: false,
	playbackRate: 1,
	poster: "",
	preload: "metadata",
	preferNativeHLS: false,
	src: "",
	title: "",
	controlsDelay: 2e3,
	hideControlsOnMouseLeave: false,
	viewType: "unknown",
	streamType: "unknown",
	volume: 1,
	liveEdgeTolerance: 10,
	minLiveDVRWindow: 60,
	keyDisabled: false,
	keyTarget: "player",
	keyShortcuts: MEDIA_KEY_SHORTCUTS,
	storage: null
};

//#endregion
//#region ../../node_modules/.pnpm/fscreen@1.2.0/node_modules/fscreen/dist/fscreen.esm.js
var key = {
	fullscreenEnabled: 0,
	fullscreenElement: 1,
	requestFullscreen: 2,
	exitFullscreen: 3,
	fullscreenchange: 4,
	fullscreenerror: 5,
	fullscreen: 6
};
var webkit = [
	"webkitFullscreenEnabled",
	"webkitFullscreenElement",
	"webkitRequestFullscreen",
	"webkitExitFullscreen",
	"webkitfullscreenchange",
	"webkitfullscreenerror",
	"-webkit-full-screen"
];
var moz = [
	"mozFullScreenEnabled",
	"mozFullScreenElement",
	"mozRequestFullScreen",
	"mozCancelFullScreen",
	"mozfullscreenchange",
	"mozfullscreenerror",
	"-moz-full-screen"
];
var ms$1 = [
	"msFullscreenEnabled",
	"msFullscreenElement",
	"msRequestFullscreen",
	"msExitFullscreen",
	"MSFullscreenChange",
	"MSFullscreenError",
	"-ms-fullscreen"
];
var document$1 = typeof window !== "undefined" && typeof window.document !== "undefined" ? window.document : {};
var vendor = "fullscreenEnabled" in document$1 && Object.keys(key) || webkit[0] in document$1 && webkit || moz[0] in document$1 && moz || ms$1[0] in document$1 && ms$1 || [];
var fscreen = {
	requestFullscreen: function(element) {
		return element[vendor[key.requestFullscreen]]();
	},
	requestFullscreenFunction: function(element) {
		return element[vendor[key.requestFullscreen]];
	},
	get exitFullscreen() {
		return document$1[vendor[key.exitFullscreen]].bind(document$1);
	},
	get fullscreenPseudoClass() {
		return ":" + vendor[key.fullscreen];
	},
	addEventListener: function(type, handler, options) {
		return document$1.addEventListener(vendor[key[type]], handler, options);
	},
	removeEventListener: function(type, handler, options) {
		return document$1.removeEventListener(vendor[key[type]], handler, options);
	},
	get fullscreenEnabled() {
		return Boolean(document$1[vendor[key.fullscreenEnabled]]);
	},
	set fullscreenEnabled(val) {},
	get fullscreenElement() {
		return document$1[vendor[key.fullscreenElement]];
	},
	set fullscreenElement(val) {},
	get onfullscreenchange() {
		return document$1[("on" + vendor[key.fullscreenchange]).toLowerCase()];
	},
	set onfullscreenchange(handler) {
		return document$1[("on" + vendor[key.fullscreenchange]).toLowerCase()] = handler;
	},
	get onfullscreenerror() {
		return document$1[("on" + vendor[key.fullscreenerror]).toLowerCase()];
	},
	set onfullscreenerror(handler) {
		return document$1[("on" + vendor[key.fullscreenerror]).toLowerCase()] = handler;
	}
};

//#endregion
//#region src/utils/support.ts
/**
* Checks if the ScreenOrientation API is available.
*
* @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Screen/orientation}
*/
function canOrientScreen() {
	return canRotateScreen() && isFunction(screen.orientation.unlock);
}
/**
* Checks if the screen orientation can be changed.
*
* @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Screen/orientation}
*/
function canRotateScreen() {
	return !isUndefined(window.screen.orientation) && !isUndefined(window.screen.orientation.lock);
}
function canPlayAudioType(audio, type) {
	if (!audio) audio = document.createElement("audio");
	return audio.canPlayType(type).length > 0;
}
function canPlayVideoType(video, type) {
	if (!video) video = document.createElement("video");
	return video.canPlayType(type).length > 0;
}
/**
* Checks if the native HTML5 video player can play HLS.
*/
function canPlayHLSNatively(video) {
	if (!video) video = document.createElement("video");
	return video.canPlayType("application/vnd.apple.mpegurl").length > 0;
}
/**
* Checks if the native HTML5 video player can enter picture-in-picture (PIP) mode when using
* the Chrome browser.
*
* @see {@link https://developers.google.com/web/updates/2018/10/watch-video-using-picture-in-picture}
*/
function canUsePictureInPicture(video) {
	if (!video) return false;
	return !!document.pictureInPictureEnabled && !video.disablePictureInPicture;
}
/**
* Checks if the native HTML5 video player can use the presentation API in Safari.
*
* @see {@link https://developer.apple.com/documentation/webkitjs/htmlvideoelement/1631913-webkitpresentationmode}
*/
function canUseVideoPresentation(video) {
	return isFunction(video?.webkitSupportsPresentationMode) && isFunction(video?.webkitSetPresentationMode);
}
async function canChangeVolume() {
	const video = document.createElement("video");
	video.volume = .5;
	await waitTimeout(0);
	return video.volume === .5;
}
/**
* @see {@link https://github.com/video-dev/hls.js/blob/master/src/is-supported.ts}
*/
function getMediaSource() {
	return window?.ManagedMediaSource ?? window?.MediaSource ?? window?.WebKitMediaSource;
}
/**
* @see {@link https://github.com/video-dev/hls.js/blob/master/src/is-supported.ts}
*/
function getSourceBuffer() {
	return window?.SourceBuffer ?? window?.WebKitSourceBuffer;
}
/**
* Whether `hls.js` is supported in this environment. Checks whether `MediaSource` or
* `ManagedMediaSource` and a valid `SourceBuffer` API are available.
*
* @see {@link https://github.com/video-dev/hls.js/blob/master/src/is-supported.ts}
*/
function isHLSSupported() {
	const MediaSource = getMediaSource();
	if (isUndefined(MediaSource)) return false;
	const isTypeSupported = MediaSource && isFunction(MediaSource.isTypeSupported) && MediaSource.isTypeSupported("video/mp4; codecs=\"avc1.42E01E,mp4a.40.2\"");
	const SourceBuffer = getSourceBuffer();
	const isSourceBufferValid = isUndefined(SourceBuffer) || !isUndefined(SourceBuffer.prototype) && isFunction(SourceBuffer.prototype.appendBuffer) && isFunction(SourceBuffer.prototype.remove);
	return !!isTypeSupported && !!isSourceBufferValid;
}
/**
* Whether `dashjs` is supported in this environment. Checks whether `MediaSource` or
* `ManagedMediaSource` and a valid `SourceBuffer` API are available.
*/
function isDASHSupported() {
	return isHLSSupported();
}
var UA, IS_IOS, IS_IPHONE, IS_CHROME, IS_IOS_CHROME, IS_SAFARI;
var init_support = __esmMin((() => {
	init_std();
	UA = navigator?.userAgent.toLowerCase() || "";
	IS_IOS = /iphone|ipad|ipod|ios|crios|fxios/i.test(UA);
	IS_IPHONE = /(iphone|ipod)/gi.test(navigator?.platform || "");
	IS_CHROME = !!window.chrome;
	IS_IOS_CHROME = /crios/i.test(UA);
	IS_SAFARI = !!window.safari || IS_IOS;
}));

//#endregion
//#region src/core/time-ranges.ts
function getTimeRangesStart(range) {
	if (!range.length) return null;
	let min = range.start(0);
	for (let i = 1; i < range.length; i++) {
		const value = range.start(i);
		if (value < min) min = value;
	}
	return min;
}
function getTimeRangesEnd(range) {
	if (!range.length) return null;
	let max = range.end(0);
	for (let i = 1; i < range.length; i++) {
		const value = range.end(i);
		if (value > max) max = value;
	}
	return max;
}
function throwIfEmpty(length) {
	if (!length) throw new Error("`TimeRanges` object is empty.");
}
function throwIfOutOfRange(fnName, index, end) {
	if (!isNumber(index) || index < 0 || index > end) throw new Error(`Failed to execute '${fnName}' on 'TimeRanges': The index provided (${index}) is non-numeric or out of bounds (0-${end}).`);
}
function normalizeTimeIntervals(intervals) {
	if (intervals.length <= 1) return intervals;
	intervals.sort((a, b) => a[0] - b[0]);
	let normalized = [], current = intervals[0];
	for (let i = 1; i < intervals.length; i++) {
		const next = intervals[i];
		if (current[1] >= next[0] - 1) current = [current[0], Math.max(current[1], next[1])];
		else {
			normalized.push(current);
			current = next;
		}
	}
	normalized.push(current);
	return normalized;
}
function updateTimeIntervals(intervals, interval, value) {
	let start = interval[0], end = interval[1];
	if (value < start) return [value, -1];
	else if (value === start) return interval;
	else if (start === -1) {
		interval[0] = value;
		return interval;
	} else if (value > start) {
		interval[1] = value;
		if (end === -1) intervals.push(interval);
	}
	normalizeTimeIntervals(intervals);
	return interval;
}
var TimeRange;
var init_time_ranges = __esmMin((() => {
	init_std();
	TimeRange = class {
		#ranges;
		get length() {
			return this.#ranges.length;
		}
		constructor(start, end) {
			if (isArray$1(start)) this.#ranges = start;
			else if (!isUndefined(start) && !isUndefined(end)) this.#ranges = [[start, end]];
			else this.#ranges = [];
		}
		start(index) {
			throwIfEmpty(this.#ranges.length);
			throwIfOutOfRange("start", index, this.#ranges.length - 1);
			return this.#ranges[index][0] ?? Infinity;
		}
		end(index) {
			throwIfEmpty(this.#ranges.length);
			throwIfOutOfRange("end", index, this.#ranges.length - 1);
			return this.#ranges[index][1] ?? Infinity;
		}
	};
}));

//#endregion
//#region src/utils/mime.ts
function isAudioSrc({ src, type }) {
	return isString(src) ? AUDIO_EXTENSIONS.test(src) || AUDIO_TYPES.has(type) || src.startsWith("blob:") && type === "audio/object" : type === "audio/object";
}
function isVideoSrc(src) {
	return isString(src.src) ? VIDEO_EXTENSIONS.test(src.src) || VIDEO_TYPES.has(src.type) || src.src.startsWith("blob:") && src.type === "video/object" || isHLSSrc(src) && canPlayHLSNatively() : src.type === "video/object";
}
function isHLSSrc({ src, type }) {
	return isString(src) && HLS_VIDEO_EXTENSIONS.test(src) || HLS_VIDEO_TYPES.has(type);
}
function isDASHSrc({ src, type }) {
	return isString(src) && DASH_VIDEO_EXTENSIONS.test(src) || DASH_VIDEO_TYPES.has(type);
}
function canGoogleCastSrc(src) {
	return isString(src.src) && (isAudioSrc(src) || isVideoSrc(src) || isHLSSrc(src) || isDASHSrc(src));
}
function isMediaStream(src) {
	return typeof window.MediaStream !== "undefined" && src instanceof window.MediaStream;
}
var AUDIO_EXTENSIONS, AUDIO_TYPES, VIDEO_EXTENSIONS, VIDEO_TYPES, HLS_VIDEO_EXTENSIONS, DASH_VIDEO_EXTENSIONS, HLS_VIDEO_TYPES, DASH_VIDEO_TYPES;
var init_mime = __esmMin((() => {
	init_std();
	init_support();
	AUDIO_EXTENSIONS = /\.(m4a|m4b|mp4a|mpga|mp2|mp2a|mp3|m2a|m3a|wav|weba|aac|oga|opus|spx|flac)($|\?)/i;
	AUDIO_TYPES = new Set([
		"audio/mpeg",
		"audio/ogg",
		"audio/3gp",
		"audio/mp3",
		"audio/webm",
		"audio/flac",
		"audio/m4a",
		"audio/m4b",
		"audio/mp4a",
		"audio/mp4"
	]);
	VIDEO_EXTENSIONS = /\.(mp4|og[gv]|webm|mov|m4v)(#t=[,\d+]+)?($|\?)/i;
	VIDEO_TYPES = new Set([
		"video/mp4",
		"video/webm",
		"video/3gp",
		"video/ogg",
		"video/avi",
		"video/mpeg"
	]);
	HLS_VIDEO_EXTENSIONS = /\.(m3u8)($|\?)/i;
	DASH_VIDEO_EXTENSIONS = /\.(mpd)($|\?)/i;
	HLS_VIDEO_TYPES = new Set([
		"application/vnd.apple.mpegurl",
		"audio/mpegurl",
		"audio/x-mpegurl",
		"application/x-mpegurl",
		"video/x-mpegurl",
		"video/mpegurl",
		"application/mpegurl"
	]);
	DASH_VIDEO_TYPES = new Set(["application/dash+xml"]);
}));

//#endregion
//#region src/utils/network.ts
function appendParamsToURL(baseUrl, params) {
	const url = new URL(baseUrl);
	for (const key of Object.keys(params)) url.searchParams.set(key, params[key] + "");
	return url.toString();
}
function preconnect(url, rel = "preconnect") {
	if (!isNull(document.querySelector(`link[href="${url}"]`))) return true;
	const link = document.createElement("link");
	link.rel = rel;
	link.href = url;
	link.crossOrigin = "true";
	document.head.append(link);
	return true;
}
function loadScript(src) {
	if (pendingRequests[src]) return pendingRequests[src].promise;
	const promise = deferredPromise();
	if (!isNull(document.querySelector(`script[src="${src}"]`))) {
		promise.resolve();
		return promise.promise;
	}
	pendingRequests[src] = promise;
	const script = document.createElement("script");
	script.src = src;
	script.onload = () => {
		promise.resolve();
		delete pendingRequests[src];
	};
	script.onerror = () => {
		promise.reject();
		delete pendingRequests[src];
	};
	setTimeout(() => document.head.append(script), 0);
	return promise.promise;
}
function getRequestCredentials(crossOrigin) {
	return crossOrigin === "use-credentials" ? "include" : isString(crossOrigin) ? "same-origin" : void 0;
}
function getDownloadFile({ title, src, download }) {
	const url = isBoolean(download) || download === "" ? src.src : isString(download) ? download : download?.url;
	if (!isValidFileDownload({
		url,
		src,
		download
	})) return null;
	return {
		url,
		name: !isBoolean(download) && !isString(download) && download?.filename || title.toLowerCase() || "media"
	};
}
function isValidFileDownload({ url, src, download }) {
	return isString(url) && (download && download !== true || isAudioSrc(src) || isVideoSrc(src));
}
var pendingRequests;
var init_network = __esmMin((() => {
	init_std();
	init_mime();
	pendingRequests = {};
}));

//#endregion
//#region src/core/tracks/text/symbols.ts
var CROSS_ORIGIN, READY_STATE, UPDATE_ACTIVE_CUES, CAN_LOAD, ON_MODE_CHANGE, NATIVE, NATIVE_HLS, TextTrackSymbol;
var init_symbols$2 = __esmMin((() => {
	CROSS_ORIGIN = Symbol("TEXT_TRACK_CROSS_ORIGIN"), READY_STATE = Symbol("TEXT_TRACK_READY_STATE"), UPDATE_ACTIVE_CUES = Symbol("TEXT_TRACK_UPDATE_ACTIVE_CUES"), CAN_LOAD = Symbol("TEXT_TRACK_CAN_LOAD"), ON_MODE_CHANGE = Symbol("TEXT_TRACK_ON_MODE_CHANGE"), NATIVE = Symbol("TEXT_TRACK_NATIVE"), NATIVE_HLS = Symbol("TEXT_TRACK_NATIVE_HLS");
	TextTrackSymbol = {
		crossOrigin: CROSS_ORIGIN,
		readyState: READY_STATE,
		updateActiveCues: UPDATE_ACTIVE_CUES,
		canLoad: CAN_LOAD,
		onModeChange: ON_MODE_CHANGE,
		native: NATIVE,
		nativeHLS: NATIVE_HLS
	};
}));

//#endregion
//#region src/core/tracks/text/utils.ts
function findActiveCue(cues, time) {
	for (let i = 0, len = cues.length; i < len; i++) if (isCueActive(cues[i], time)) return cues[i];
	return null;
}
function isCueActive(cue, time) {
	return time >= cue.startTime && time < cue.endTime;
}
function watchActiveTextTrack(tracks, kind, onChange) {
	let currentTrack = null, scope = getScope();
	function onModeChange() {
		const kinds = isString(kind) ? [kind] : kind, track = tracks.toArray().find((track) => kinds.includes(track.kind) && track.mode === "showing");
		if (track === currentTrack) return;
		if (!track) {
			onChange(null);
			currentTrack = null;
			return;
		}
		if (track.readyState == 2) onChange(track);
		else {
			onChange(null);
			scoped(() => {
				const off = listenEvent(track, "load", () => {
					onChange(track);
					off();
				}, { once: true });
			}, scope);
		}
		currentTrack = track;
	}
	onModeChange();
	return listenEvent(tracks, "mode-change", onModeChange);
}
function watchCueTextChange(tracks, kind, callback) {
	watchActiveTextTrack(tracks, kind, (track) => {
		if (!track) {
			callback("");
			return;
		}
		const onCueChange = () => {
			const activeCue = track?.activeCues[0];
			callback(activeCue?.text || "");
		};
		onCueChange();
		listenEvent(track, "cue-change", onCueChange);
	});
}
var init_utils$3 = __esmMin((() => {
	init_dev();
	init_std();
}));

//#endregion
//#region src/core/tracks/text/text-track.ts
function isTrackCaptionKind(track) {
	return captionRE.test(track.kind);
}
function parseJSONCaptionsFile(json, Cue, Region) {
	const content = isString(json) ? JSON.parse(json) : json;
	let regions = [], cues = [];
	if (content.regions && Region) regions = content.regions.map((region) => Object.assign(new Region(), region));
	if (content.cues || isArray$1(content)) cues = (isArray$1(content) ? content : content.cues).filter((content) => isNumber(content.startTime) && isNumber(content.endTime)).map((cue) => Object.assign(new Cue(0, 0, ""), cue));
	return {
		regions,
		cues
	};
}
var TextTrack, captionRE;
var init_text_track = __esmMin((() => {
	init_std();
	init_network();
	init_symbols$2();
	init_utils$3();
	TextTrack = class extends EventsTarget {
		static createId(track) {
			return `vds-${track.type}-${track.kind}-${track.src ?? track.label ?? "?"}`;
		}
		src;
		content;
		type;
		encoding;
		id = "";
		label = "";
		language = "";
		kind;
		default = false;
		#canLoad = false;
		#currentTime = 0;
		#mode = "disabled";
		#metadata = {};
		#regions = [];
		#cues = [];
		#activeCues = [];
		#cueIds = /* @__PURE__ */ new Set();
		/** @internal */
		[TextTrackSymbol.readyState] = 0;
		/** @internal */
		[TextTrackSymbol.crossOrigin];
		/** @internal */
		[TextTrackSymbol.onModeChange] = null;
		/** @internal */
		[TextTrackSymbol.native] = null;
		get metadata() {
			return this.#metadata;
		}
		get regions() {
			return this.#regions;
		}
		get cues() {
			return this.#cues;
		}
		get activeCues() {
			return this.#activeCues;
		}
		/**
		* - 0: Not Loading
		* - 1: Loading
		* - 2: Ready
		* - 3: Error
		*/
		get readyState() {
			return this[TextTrackSymbol.readyState];
		}
		get mode() {
			return this.#mode;
		}
		set mode(mode) {
			this.setMode(mode);
		}
		constructor(init) {
			super();
			for (const prop of Object.keys(init)) this[prop] = init[prop];
			if (!this.type) this.type = "vtt";
			if (init.content) this.#parseContent(init);
			else if (!init.src) this[TextTrackSymbol.readyState] = 2;
			if (isTrackCaptionKind(this) && !this.label) console.warn(`[vidstack] captions text track created without label: \`${this.src}\``);
		}
		addCue(cue, trigger) {
			if (cue.id) {
				if (this.#cueIds.has(cue.id)) return;
				this.#cueIds.add(cue.id);
			}
			let i = 0, length = this.#cues.length;
			for (i = 0; i < length; i++) if (cue.endTime <= this.#cues[i].startTime) break;
			if (i === length) this.#cues.push(cue);
			else this.#cues.splice(i, 0, cue);
			if (!(cue instanceof TextTrackCue)) this[TextTrackSymbol.native]?.track.addCue(cue);
			this.dispatchEvent(new DOMEvent("add-cue", {
				detail: cue,
				trigger
			}));
			if (isCueActive(cue, this.#currentTime)) this[TextTrackSymbol.updateActiveCues](this.#currentTime, trigger);
		}
		removeCue(cue, trigger) {
			const index = this.#cues.indexOf(cue);
			if (index >= 0) {
				const isActive = this.#activeCues.includes(cue);
				if (cue.id) this.#cueIds.delete(cue.id);
				this.#cues.splice(index, 1);
				this[TextTrackSymbol.native]?.track.removeCue(cue);
				this.dispatchEvent(new DOMEvent("remove-cue", {
					detail: cue,
					trigger
				}));
				if (isActive) this[TextTrackSymbol.updateActiveCues](this.#currentTime, trigger);
			}
		}
		setMode(mode, trigger) {
			if (this.#mode === mode) return;
			this.#mode = mode;
			if (mode === "disabled") {
				this.#activeCues = [];
				this.#activeCuesChanged();
			} else if (this.readyState === 2) this[TextTrackSymbol.updateActiveCues](this.#currentTime, trigger);
			else this.#load();
			this.dispatchEvent(new DOMEvent("mode-change", {
				detail: this,
				trigger
			}));
			this[TextTrackSymbol.onModeChange]?.();
		}
		/** @internal */
		[TextTrackSymbol.updateActiveCues](currentTime, trigger) {
			this.#currentTime = currentTime;
			if (this.mode === "disabled" || !this.#cues.length) return;
			const activeCues = [];
			for (let i = 0, length = this.#cues.length; i < length; i++) {
				const cue = this.#cues[i];
				if (isCueActive(cue, currentTime)) activeCues.push(cue);
			}
			let changed = activeCues.length !== this.#activeCues.length;
			if (!changed) {
				for (let i = 0; i < activeCues.length; i++) if (!this.#activeCues.includes(activeCues[i])) {
					changed = true;
					break;
				}
			}
			this.#activeCues = activeCues;
			if (changed) this.#activeCuesChanged(trigger);
		}
		/** @internal */
		[TextTrackSymbol.canLoad]() {
			this.#canLoad = true;
			if (this.#mode !== "disabled") this.#load();
		}
		#parseContent(init) {
			import("../media-captions/dist/prod.js").then(({ parseText, VTTCue, VTTRegion }) => {
				if (!isString(init.content) || init.type === "json") {
					this.#parseJSON(init.content, VTTCue, VTTRegion);
					if (this.readyState !== 3) this.#ready();
				} else parseText(init.content.split("\n").map((line) => line.trim()).join("\n").trim(), { type: init.type }).then(({ cues, regions }) => {
					this.#cues = cues;
					this.#regions = regions;
					this.#ready();
				});
			});
		}
		async #load() {
			if (!this.#canLoad || this[TextTrackSymbol.readyState] > 0) return;
			this[TextTrackSymbol.readyState] = 1;
			this.dispatchEvent(new DOMEvent("load-start"));
			if (!this.src) {
				this.#ready();
				return;
			}
			try {
				const { parseResponse, VTTCue, VTTRegion } = await import("../media-captions/dist/prod.js"), crossOrigin = this[TextTrackSymbol.crossOrigin]?.();
				const response = fetch(this.src, {
					headers: this.type === "json" ? { "Content-Type": "application/json" } : void 0,
					credentials: getRequestCredentials(crossOrigin)
				});
				if (this.type === "json") this.#parseJSON(await (await response).text(), VTTCue, VTTRegion);
				else {
					const { errors, metadata, regions, cues } = await parseResponse(response, {
						type: this.type,
						encoding: this.encoding
					});
					if (errors[0]?.code === 0) throw errors[0];
					else {
						this.#metadata = metadata;
						this.#regions = regions;
						this.#cues = cues;
					}
				}
				this.#ready();
			} catch (error) {
				this.#error(error);
			}
		}
		#ready() {
			this[TextTrackSymbol.readyState] = 2;
			if (!this.src || this.type !== "vtt") {
				const native = this[TextTrackSymbol.native];
				if (native && !native.managed) for (const cue of this.#cues) native.track.addCue(cue);
			}
			const loadEvent = new DOMEvent("load");
			this[TextTrackSymbol.updateActiveCues](this.#currentTime, loadEvent);
			this.dispatchEvent(loadEvent);
		}
		#error(error) {
			this[TextTrackSymbol.readyState] = 3;
			this.dispatchEvent(new DOMEvent("error", { detail: error }));
		}
		#parseJSON(json, VTTCue, VTTRegion) {
			try {
				const { regions, cues } = parseJSONCaptionsFile(json, VTTCue, VTTRegion);
				this.#regions = regions;
				this.#cues = cues;
			} catch (error) {
				console.error(`[vidstack] failed to parse JSON captions at: \`${this.src}\`\n\n`, error);
				this.#error(error);
			}
		}
		#activeCuesChanged(trigger) {
			this.dispatchEvent(new DOMEvent("cue-change", { trigger }));
		}
	};
	captionRE = /captions|subtitles/;
}));

//#endregion
//#region src/core/api/player-state.ts
init_dev();
init_support();
init_time_ranges();
init_text_track();
const mediaState = new State({
	artist: "",
	artwork: null,
	audioTrack: null,
	audioTracks: [],
	autoPlay: false,
	autoPlayError: null,
	audioGain: null,
	buffered: new TimeRange(),
	canLoad: false,
	canLoadPoster: false,
	canFullscreen: false,
	canOrientScreen: canOrientScreen(),
	canPictureInPicture: false,
	canPlay: false,
	clipStartTime: 0,
	clipEndTime: 0,
	controls: false,
	get iOSControls() {
		return IS_IPHONE && this.mediaType === "video" && (!this.playsInline || !fscreen.fullscreenEnabled && this.fullscreen);
	},
	get nativeControls() {
		return this.controls || this.iOSControls;
	},
	controlsVisible: false,
	get controlsHidden() {
		return !this.controlsVisible;
	},
	crossOrigin: null,
	ended: false,
	error: null,
	fullscreen: false,
	get loop() {
		return this.providedLoop || this.userPrefersLoop;
	},
	logLevel: "warn",
	mediaType: "unknown",
	muted: false,
	paused: true,
	played: new TimeRange(),
	playing: false,
	playsInline: false,
	pictureInPicture: false,
	preload: "metadata",
	playbackRate: 1,
	qualities: [],
	quality: null,
	autoQuality: false,
	canSetQuality: true,
	canSetPlaybackRate: true,
	canSetVolume: false,
	canSetAudioGain: false,
	seekable: new TimeRange(),
	seeking: false,
	source: {
		src: "",
		type: ""
	},
	sources: [],
	started: false,
	textTracks: [],
	textTrack: null,
	get hasCaptions() {
		return this.textTracks.filter(isTrackCaptionKind).length > 0;
	},
	volume: 1,
	waiting: false,
	realCurrentTime: 0,
	get currentTime() {
		return this.ended ? this.duration : this.clipStartTime > 0 ? Math.max(0, Math.min(this.realCurrentTime - this.clipStartTime, this.duration)) : this.realCurrentTime;
	},
	providedDuration: -1,
	intrinsicDuration: 0,
	get duration() {
		return this.seekableWindow;
	},
	get title() {
		return this.providedTitle || this.inferredTitle;
	},
	get poster() {
		return this.providedPoster || this.inferredPoster;
	},
	get viewType() {
		return this.providedViewType !== "unknown" ? this.providedViewType : this.inferredViewType;
	},
	get streamType() {
		return this.providedStreamType !== "unknown" ? this.providedStreamType : this.inferredStreamType;
	},
	get currentSrc() {
		return this.source;
	},
	get bufferedStart() {
		const start = getTimeRangesStart(this.buffered) ?? 0;
		return Math.max(start, this.clipStartTime);
	},
	get bufferedEnd() {
		const end = getTimeRangesEnd(this.buffered) ?? 0;
		return Math.min(this.seekableEnd, Math.max(0, end - this.clipStartTime));
	},
	get bufferedWindow() {
		return Math.max(0, this.bufferedEnd - this.bufferedStart);
	},
	get seekableStart() {
		if (this.isLiveDVR && this.liveDVRWindow > 0) return Math.max(0, this.seekableEnd - this.liveDVRWindow);
		const start = getTimeRangesStart(this.seekable) ?? 0;
		return Math.max(start, this.clipStartTime);
	},
	get seekableEnd() {
		if (this.providedDuration > 0) return this.providedDuration;
		const end = this.liveSyncPosition > 0 ? this.liveSyncPosition : this.canPlay ? getTimeRangesEnd(this.seekable) ?? Infinity : 0;
		return this.clipEndTime > 0 ? Math.min(this.clipEndTime, end) : end;
	},
	get seekableWindow() {
		const window = this.seekableEnd - this.seekableStart;
		return !isNaN(window) ? Math.max(0, window) : Infinity;
	},
	canAirPlay: false,
	canGoogleCast: false,
	remotePlaybackState: "disconnected",
	remotePlaybackType: "none",
	remotePlaybackLoader: null,
	remotePlaybackInfo: null,
	get isAirPlayConnected() {
		return this.remotePlaybackType === "airplay" && this.remotePlaybackState === "connected";
	},
	get isGoogleCastConnected() {
		return this.remotePlaybackType === "google-cast" && this.remotePlaybackState === "connected";
	},
	pointer: "fine",
	orientation: "landscape",
	width: 0,
	height: 0,
	mediaWidth: 0,
	mediaHeight: 0,
	lastKeyboardAction: null,
	userBehindLiveEdge: false,
	liveEdgeTolerance: 10,
	minLiveDVRWindow: 60,
	get canSeek() {
		return /unknown|on-demand|:dvr/.test(this.streamType) && Number.isFinite(this.duration) && (!this.isLiveDVR || this.duration >= this.liveDVRWindow);
	},
	get live() {
		return this.streamType.includes("live") || !Number.isFinite(this.duration);
	},
	get liveEdgeStart() {
		return this.live && Number.isFinite(this.seekableEnd) ? Math.max(0, this.seekableEnd - this.liveEdgeTolerance) : 0;
	},
	get liveEdge() {
		return this.live && (!this.canSeek || !this.userBehindLiveEdge && this.currentTime >= this.liveEdgeStart);
	},
	get liveEdgeWindow() {
		return this.live && Number.isFinite(this.seekableEnd) ? this.seekableEnd - this.liveEdgeStart : 0;
	},
	get isLiveDVR() {
		return /:dvr/.test(this.streamType);
	},
	get liveDVRWindow() {
		return Math.max(this.inferredLiveDVRWindow, this.minLiveDVRWindow);
	},
	autoPlaying: false,
	providedTitle: "",
	inferredTitle: "",
	providedLoop: false,
	userPrefersLoop: false,
	providedPoster: "",
	inferredPoster: "",
	inferredViewType: "unknown",
	providedViewType: "unknown",
	providedStreamType: "unknown",
	inferredStreamType: "unknown",
	liveSyncPosition: null,
	inferredLiveDVRWindow: 0,
	savedState: null
});
const RESET_ON_SRC_QUALITY_CHANGE = new Set([
	"autoPlayError",
	"autoPlaying",
	"buffered",
	"canPlay",
	"error",
	"paused",
	"played",
	"playing",
	"seekable",
	"seeking",
	"waiting"
]);
const RESET_ON_SRC_CHANGE = new Set([
	...RESET_ON_SRC_QUALITY_CHANGE,
	"ended",
	"inferredPoster",
	"inferredStreamType",
	"inferredTitle",
	"intrinsicDuration",
	"inferredLiveDVRWindow",
	"liveSyncPosition",
	"realCurrentTime",
	"savedState",
	"started",
	"userBehindLiveEdge"
]);
/**
* Resets all media state and leaves general player state intact.
*/
function softResetMediaState($media, isSourceQualityChange = false) {
	const filter = isSourceQualityChange ? RESET_ON_SRC_QUALITY_CHANGE : RESET_ON_SRC_CHANGE;
	mediaState.reset($media, (prop) => filter.has(prop));
	tick();
}
function boundTime(time, store) {
	const clippedTime = time + store.clipStartTime(), isStart = clippedTime <= store.seekableStart(), isEnd = clippedTime >= store.seekableEnd();
	if (isStart) return store.seekableStart();
	if (isEnd) return store.seekableEnd();
	if (store.isLiveDVR() && store.liveDVRWindow() > 0 && clippedTime < store.seekableEnd() - store.liveDVRWindow()) return store.bufferedStart();
	return Math.min(Math.max(store.seekableStart() + .1, clippedTime), store.seekableEnd() - .1);
}

//#endregion
//#region src/foundation/list/symbols.ts
var ADD, REMOVE, RESET, SELECT, READONLY, SET_READONLY, ON_RESET, ON_REMOVE, ON_USER_SELECT, ListSymbol;
var init_symbols$1 = __esmMin((() => {
	ADD = Symbol("LIST_ADD"), REMOVE = Symbol("LIST_REMOVE"), RESET = Symbol("LIST_RESET"), SELECT = Symbol("LIST_SELECT"), READONLY = Symbol("LIST_READONLY"), SET_READONLY = Symbol("LIST_SET_READONLY"), ON_RESET = Symbol("LIST_ON_RESET"), ON_REMOVE = Symbol("LIST_ON_REMOVE"), ON_USER_SELECT = Symbol("LIST_ON_USER_SELECT");
	ListSymbol = {
		add: ADD,
		remove: REMOVE,
		reset: RESET,
		select: SELECT,
		readonly: READONLY,
		setReadonly: SET_READONLY,
		onReset: ON_RESET,
		onRemove: ON_REMOVE,
		onUserSelect: ON_USER_SELECT
	};
}));

//#endregion
//#region src/foundation/list/list.ts
init_std();
init_symbols$1();
var List = class extends EventsTarget {
	items = [];
	/** @internal */
	[ListSymbol.readonly] = false;
	get length() {
		return this.items.length;
	}
	get readonly() {
		return this[ListSymbol.readonly];
	}
	/**
	* Returns the index of the first occurrence of the given item, or -1 if it is not present.
	*/
	indexOf(item) {
		return this.items.indexOf(item);
	}
	/**
	* Returns an item matching the given `id`, or `null` if not present.
	*/
	getById(id) {
		if (id === "") return null;
		return this.items.find((item) => item.id === id) ?? null;
	}
	/**
	* Transform list to an array.
	*/
	toArray() {
		return [...this.items];
	}
	[Symbol.iterator]() {
		return this.items.values();
	}
	/** @internal */
	[ListSymbol.add](item, trigger) {
		const index = this.items.length;
		if (!("" + index in this)) Object.defineProperty(this, index, { get() {
			return this.items[index];
		} });
		if (this.items.includes(item)) return;
		this.items.push(item);
		this.dispatchEvent(new DOMEvent("add", {
			detail: item,
			trigger
		}));
	}
	/** @internal */
	[ListSymbol.remove](item, trigger) {
		const index = this.items.indexOf(item);
		if (index >= 0) {
			this[ListSymbol.onRemove]?.(item, trigger);
			this.items.splice(index, 1);
			this.dispatchEvent(new DOMEvent("remove", {
				detail: item,
				trigger
			}));
		}
	}
	/** @internal */
	[ListSymbol.reset](trigger) {
		for (const item of [...this.items]) this[ListSymbol.remove](item, trigger);
		this.items = [];
		this[ListSymbol.setReadonly](false, trigger);
		this[ListSymbol.onReset]?.();
	}
	/** @internal */
	[ListSymbol.setReadonly](readonly, trigger) {
		if (this[ListSymbol.readonly] === readonly) return;
		this[ListSymbol.readonly] = readonly;
		this.dispatchEvent(new DOMEvent("readonly-change", {
			detail: readonly,
			trigger
		}));
	}
};

//#endregion
//#region src/foundation/list/select-list.ts
init_std();
init_symbols$1();
const SELECTED = Symbol("SELECTED");
var SelectList = class extends List {
	get selected() {
		return this.items.find((item) => item.selected) ?? null;
	}
	get selectedIndex() {
		return this.items.findIndex((item) => item.selected);
	}
	/** @internal */
	[ListSymbol.onRemove](item, trigger) {
		this[ListSymbol.select](item, false, trigger);
	}
	/** @internal */
	[ListSymbol.add](item, trigger) {
		item[SELECTED] = false;
		Object.defineProperty(item, "selected", {
			get() {
				return this[SELECTED];
			},
			set: (selected) => {
				if (this.readonly) return;
				this[ListSymbol.onUserSelect]?.();
				this[ListSymbol.select](item, selected);
			}
		});
		super[ListSymbol.add](item, trigger);
	}
	/** @internal */
	[ListSymbol.select](item, selected, trigger) {
		if (selected === item?.[SELECTED]) return;
		const prev = this.selected;
		if (item) item[SELECTED] = selected;
		if (!selected ? prev === item : prev !== item) {
			if (prev) prev[SELECTED] = false;
			this.dispatchEvent(new DOMEvent("change", {
				detail: {
					prev,
					current: this.selected
				},
				trigger
			}));
		}
	}
};

//#endregion
//#region src/core/quality/symbols.ts
var SET_AUTO, ENABLE_AUTO, QualitySymbol;
var init_symbols = __esmMin((() => {
	SET_AUTO = Symbol("SET_AUTO_QUALITY");
	ENABLE_AUTO = Symbol("ENABLE_AUTO_QUALITY");
	QualitySymbol = {
		setAuto: SET_AUTO,
		enableAuto: ENABLE_AUTO
	};
}));

//#endregion
//#region src/core/quality/video-quality.ts
init_std();
init_symbols$1();
init_symbols();
/**
* @see {@link https://vidstack.io/docs/player/core-concepts/video-quality#quality-list}
*/
var VideoQualityList = class extends SelectList {
	#auto = false;
	/**
	* Configures quality switching:
	*
	* - `current`: Trigger an immediate quality level switch. This will abort the current fragment
	* request if any, flush the whole buffer, and fetch fragment matching with current position
	* and requested quality level.
	*
	* - `next`: Trigger a quality level switch for next fragment. This could eventually flush
	* already buffered next fragment.
	*
	* - `load`: Set quality level for next loaded fragment.
	*
	* @see {@link https://www.vidstack.io/docs/player/api/video-quality#switch}
	* @see {@link https://github.com/video-dev/hls.js/blob/master/docs/API.md#quality-switch-control-api}
	*/
	switch = "current";
	/**
	* Whether automatic quality selection is enabled.
	*/
	get auto() {
		return this.#auto || this.readonly;
	}
	/** @internal */
	[QualitySymbol.enableAuto];
	/** @internal */
	[ListSymbol.onUserSelect]() {
		this[QualitySymbol.setAuto](false);
	}
	/** @internal */
	[ListSymbol.onReset](trigger) {
		this[QualitySymbol.enableAuto] = void 0;
		this[QualitySymbol.setAuto](false, trigger);
	}
	/**
	* Request automatic quality selection (if supported). This will be a no-op if the list is
	* `readonly` as that already implies auto-selection.
	*/
	autoSelect(trigger) {
		if (this.readonly || this.#auto || !this[QualitySymbol.enableAuto]) return;
		this[QualitySymbol.enableAuto]?.(trigger);
		this[QualitySymbol.setAuto](true, trigger);
	}
	getBySrc(src) {
		return this.items.find((quality) => quality.src === src);
	}
	/** @internal */
	[QualitySymbol.setAuto](auto, trigger) {
		if (this.#auto === auto) return;
		this.#auto = auto;
		this.dispatchEvent(new DOMEvent("auto-change", {
			detail: auto,
			trigger
		}));
	}
};

//#endregion
//#region src/core/state/media-events-logger.ts
init_std();
const MEDIA_EVENTS = [
	"abort",
	"can-play",
	"can-play-through",
	"duration-change",
	"emptied",
	"ended",
	"error",
	"fullscreen-change",
	"loaded-data",
	"loaded-metadata",
	"load-start",
	"media-type-change",
	"pause",
	"play",
	"playing",
	"progress",
	"seeked",
	"seeking",
	"source-change",
	"sources-change",
	"stalled",
	"started",
	"suspend",
	"stream-type-change",
	"replay",
	"view-type-change",
	"volume-change",
	"waiting"
];
var MediaEventsLogger = class extends MediaPlayerController {
	#media;
	constructor(media) {
		super();
		this.#media = media;
	}
	onConnect(el) {
		const events = new EventsController(el), handler = this.#onMediaEvent.bind(this);
		for (const eventType of MEDIA_EVENTS) events.add(eventType, handler);
	}
	#onMediaEvent(event) {
		this.#media.logger?.debugGroup(`📡 dispatching \`${event.type}\``).labelledLog("Media Store", { ...this.$state }).labelledLog("Event", event).dispatch();
	}
};

//#endregion
//#region src/core/state/media-load-controller.ts
init_dev();
init_std();
var MediaLoadController = class extends MediaPlayerController {
	#type;
	#callback;
	constructor(type, callback) {
		super();
		this.#type = type;
		this.#callback = callback;
	}
	async onAttach(el) {
		const load = this.$props[this.#type]();
		if (load === "eager") requestAnimationFrame(this.#callback);
		else if (load === "idle") waitIdlePeriod(this.#callback);
		else if (load === "visible") {
			let dispose, observer = new IntersectionObserver((entries) => {
				if (!this.scope) return;
				if (entries[0].isIntersecting) {
					dispose?.();
					dispose = void 0;
					this.#callback();
				}
			});
			observer.observe(el);
			dispose = onDispose(() => observer.disconnect());
		}
	}
};

//#endregion
//#region src/core/state/media-player-delegate.ts
init_dev();
init_std();
let seenAutoplayWarning = false;
var MediaPlayerDelegate = class {
	#handle;
	#media;
	constructor(handle, media) {
		this.#handle = handle;
		this.#media = media;
	}
	notify(type, ...init) {
		this.#handle(new DOMEvent(type, {
			detail: init?.[0],
			trigger: init?.[1]
		}));
	}
	async ready(info, trigger) {
		return untrack(async () => {
			const { logger } = this.#media, { autoPlay, canPlay, started, duration, seekable, buffered, remotePlaybackInfo, playsInline, savedState, source } = this.#media.$state;
			if (canPlay()) return;
			const detail = {
				duration: info?.duration ?? duration(),
				seekable: info?.seekable ?? seekable(),
				buffered: info?.buffered ?? buffered(),
				provider: this.#media.$provider()
			};
			this.notify("can-play", detail, trigger);
			tick();
			logger?.infoGroup("-~-~-~-~-~-~- ✅ MEDIA READY -~-~-~-~-~-~-").labelledLog("Media", this.#media).labelledLog("Trigger Event", trigger).dispatch();
			let provider = this.#media.$provider(), { storage, qualities } = this.#media, { muted, volume, clipStartTime, playbackRate } = this.#media.$props;
			await storage?.onLoad?.(source());
			const savedPlaybackTime = savedState()?.currentTime, savedPausedState = savedState()?.paused, storageTime = await storage?.getTime(), startTime = savedPlaybackTime ?? storageTime ?? clipStartTime(), shouldAutoPlay = savedPausedState === false || savedPausedState !== true && !started() && autoPlay();
			if (provider) {
				provider.setVolume(await storage?.getVolume() ?? volume());
				provider.setMuted(muted() || !!await storage?.getMuted());
				const audioGain = await storage?.getAudioGain() ?? 1;
				if (audioGain > 1) provider.audioGain?.setGain?.(audioGain);
				provider.setPlaybackRate?.(await storage?.getPlaybackRate() ?? playbackRate());
				provider.setPlaysInline?.(playsInline());
				if (startTime > 0) provider.setCurrentTime(startTime);
			}
			const prefQuality = await storage?.getVideoQuality();
			if (prefQuality && qualities.length) {
				let currentQuality = null, currentScore = Infinity;
				for (const quality of qualities) {
					const score = Math.abs(prefQuality.width - quality.width) + Math.abs(prefQuality.height - quality.height) + (prefQuality.bitrate ? Math.abs(prefQuality.bitrate - (quality.bitrate ?? 0)) : 0);
					if (score < currentScore) {
						currentQuality = quality;
						currentScore = score;
					}
				}
				if (currentQuality) currentQuality.selected = true;
			}
			if (canPlay() && shouldAutoPlay) await this.#attemptAutoplay(trigger);
			else if (storageTime && storageTime > 0) this.notify("started", void 0, trigger);
			remotePlaybackInfo.set(null);
		});
	}
	async #attemptAutoplay(trigger) {
		const { player, $state: { autoPlaying, muted } } = this.#media;
		autoPlaying.set(true);
		const attemptEvent = new DOMEvent("auto-play-attempt", { trigger });
		try {
			await player.play(attemptEvent);
		} catch (error) {
			if (!seenAutoplayWarning) {
				const muteMsg = !muted() ? " Attempting with volume muted will most likely resolve the issue." : "";
				this.#media.logger?.errorGroup("[vidstack] auto-play request failed").labelledLog("Message", `Autoplay was requested but failed most likely due to browser autoplay policies or accessibility reasons.${muteMsg}`).labelledLog("Trigger Event", trigger).labelledLog("Error", error).labelledLog("See", "https://developer.chrome.com/blog/autoplay").dispatch();
				seenAutoplayWarning = true;
			}
		}
	}
};

//#endregion
//#region src/foundation/fullscreen/controller.ts
init_dev();
init_std();
const CAN_FULLSCREEN = fscreen.fullscreenEnabled;
var FullscreenController = class extends ViewController {
	/**
	* Tracks whether we're the active fullscreen event listener. Fullscreen events can only be
	* listened to globally on the document so we need to know if they relate to the current host
	* element or not.
	*/
	#listening = false;
	#active = false;
	get active() {
		return this.#active;
	}
	get supported() {
		return CAN_FULLSCREEN;
	}
	onConnect() {
		new EventsController(fscreen).add("fullscreenchange", this.#onChange.bind(this)).add("fullscreenerror", this.#onError.bind(this));
		onDispose(this.#onDisconnect.bind(this));
	}
	#onDisconnect() {
		if (CAN_FULLSCREEN) this.exit().catch(noop);
	}
	#onChange(event) {
		const active = isFullscreen(this.el);
		if (active === this.#active) return;
		if (!active) this.#listening = false;
		this.#active = active;
		this.dispatch("fullscreen-change", {
			detail: active,
			trigger: event
		});
	}
	#onError(event) {
		if (!this.#listening) return;
		this.dispatch("fullscreen-error", {
			detail: null,
			trigger: event
		});
		this.#listening = false;
	}
	async enter() {
		try {
			this.#listening = true;
			if (!this.el || isFullscreen(this.el)) return;
			assertFullscreenAPI();
			return fscreen.requestFullscreen(this.el);
		} catch (error) {
			this.#listening = false;
			throw error;
		}
	}
	async exit() {
		if (!this.el || !isFullscreen(this.el)) return;
		assertFullscreenAPI();
		return fscreen.exitFullscreen();
	}
};
function isFullscreen(host) {
	if (fscreen.fullscreenElement === host) return true;
	try {
		return host.matches(fscreen.fullscreenPseudoClass);
	} catch (error) {
		return false;
	}
}
function assertFullscreenAPI() {
	if (CAN_FULLSCREEN) return;
	throw Error("[vidstack] fullscreen API is not enabled or supported in this environment");
}

//#endregion
//#region src/foundation/orientation/controller.ts
init_dev();
init_std();
init_support();
var ScreenOrientationController = class ScreenOrientationController extends ViewController {
	#type = signal(this.#getScreenOrientation());
	#locked = signal(false);
	#currentLock;
	/**
	* The current screen orientation type.
	*
	* @signal
	* @see {@link https://developer.mozilla.org/en-US/docs/Web/API/ScreenOrientation}
	* @see https://w3c.github.io/screen-orientation/#screen-orientation-types-and-locks
	*/
	get type() {
		return this.#type();
	}
	/**
	* Whether the screen orientation is currently locked.
	*
	* @signal
	* @see {@link https://developer.mozilla.org/en-US/docs/Web/API/ScreenOrientation}
	* @see https://w3c.github.io/screen-orientation/#screen-orientation-types-and-locks
	*/
	get locked() {
		return this.#locked();
	}
	/**
	* Whether the viewport is in a portrait orientation.
	*
	* @signal
	*/
	get portrait() {
		return this.#type().startsWith("portrait");
	}
	/**
	* Whether the viewport is in a landscape orientation.
	*
	* @signal
	*/
	get landscape() {
		return this.#type().startsWith("landscape");
	}
	/**
	* Whether the native Screen Orientation API is available.
	*/
	static supported = canOrientScreen();
	/**
	* Whether the native Screen Orientation API is available.
	*/
	get supported() {
		return ScreenOrientationController.supported;
	}
	onConnect() {
		if (this.supported) listenEvent(screen.orientation, "change", this.#onOrientationChange.bind(this));
		else {
			const query = window.matchMedia("(orientation: landscape)");
			query.onchange = this.#onOrientationChange.bind(this);
			onDispose(() => query.onchange = null);
		}
		onDispose(this.#onDisconnect.bind(this));
	}
	async #onDisconnect() {
		if (this.supported && this.#locked()) await this.unlock();
	}
	#onOrientationChange(event) {
		this.#type.set(this.#getScreenOrientation());
		this.dispatch("orientation-change", {
			detail: {
				orientation: peek(this.#type),
				lock: this.#currentLock
			},
			trigger: event
		});
	}
	/**
	* Locks the orientation of the screen to the desired orientation type using the
	* Screen Orientation API.
	*
	* @param lockType - The screen lock orientation type.
	* @throws Error - If screen orientation API is unavailable.
	* @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Screen/orientation}
	* @see {@link https://w3c.github.io/screen-orientation}
	*/
	async lock(lockType) {
		if (peek(this.#locked) || this.#currentLock === lockType) return;
		this.#assertScreenOrientationAPI();
		await screen.orientation.lock(lockType);
		this.#locked.set(true);
		this.#currentLock = lockType;
	}
	/**
	* Unlocks the orientation of the screen to it's default state using the Screen Orientation
	* API. This method will throw an error if the API is unavailable.
	*
	* @throws Error - If screen orientation API is unavailable.
	* @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Screen/orientation}
	* @see {@link https://w3c.github.io/screen-orientation}
	*/
	async unlock() {
		if (!peek(this.#locked)) return;
		this.#assertScreenOrientationAPI();
		this.#currentLock = void 0;
		await screen.orientation.unlock();
		this.#locked.set(false);
	}
	#assertScreenOrientationAPI() {
		if (this.supported) return;
		throw Error("[vidstack] screen orientation API is not available");
	}
	#getScreenOrientation() {
		if (this.supported) return window.screen.orientation.type;
		return window.innerWidth >= window.innerHeight ? "landscape-primary" : "portrait-primary";
	}
};

//#endregion
//#region src/foundation/queue/queue.ts
var Queue = class {
	#queue = /* @__PURE__ */ new Map();
	/**
	* Queue the given `item` under the given `key` to be processed at a later time by calling
	* `serve(key)`.
	*/
	enqueue(key, item) {
		this.#queue.set(key, item);
	}
	/**
	* Process item in queue for the given `key`.
	*/
	serve(key) {
		const value = this.peek(key);
		this.#queue.delete(key);
		return value;
	}
	/**
	* Peek at item in queue for the given `key`.
	*/
	peek(key) {
		return this.#queue.get(key);
	}
	/**
	* Removes queued item under the given `key`.
	*/
	delete(key) {
		this.#queue.delete(key);
	}
	/**
	* Clear all items in the queue.
	*/
	clear() {
		this.#queue.clear();
	}
};

//#endregion
//#region src/foundation/queue/request-queue.ts
init_std();
var RequestQueue = class {
	#serving = false;
	#pending = deferredPromise();
	#queue = /* @__PURE__ */ new Map();
	/**
	* The number of callbacks that are currently in queue.
	*/
	get size() {
		return this.#queue.size;
	}
	/**
	* Whether items in the queue are being served immediately, otherwise they're queued to
	* be processed later.
	*/
	get isServing() {
		return this.#serving;
	}
	/**
	* Waits for the queue to be flushed (ie: start serving).
	*/
	async waitForFlush() {
		if (this.#serving) return;
		await this.#pending.promise;
	}
	/**
	* Queue the given `callback` to be invoked at a later time by either calling the `serve()` or
	* `start()` methods. If the queue has started serving (i.e., `start()` was already called),
	* then the callback will be invoked immediately.
	*
	* @param key - Uniquely identifies this callback so duplicates are ignored.
	* @param callback - The function to call when this item in the queue is being served.
	*/
	enqueue(key, callback) {
		if (this.#serving) {
			callback();
			return;
		}
		this.#queue.delete(key);
		this.#queue.set(key, callback);
	}
	/**
	* Invokes the callback with the given `key` in the queue (if it exists).
	*/
	serve(key) {
		this.#queue.get(key)?.();
		this.#queue.delete(key);
	}
	/**
	* Flush all queued items and start serving future requests immediately until `stop()` is called.
	*/
	start() {
		this.#flush();
		this.#serving = true;
		if (this.#queue.size > 0) this.#flush();
	}
	/**
	* Stop serving requests, they'll be queued until you begin processing again by calling `start()`.
	*/
	stop() {
		this.#serving = false;
	}
	/**
	* Stop serving requests, empty the request queue, and release any promises waiting for the
	* queue to flush.
	*/
	reset() {
		this.stop();
		this.#queue.clear();
		this.#release();
	}
	#flush() {
		for (const key of this.#queue.keys()) this.serve(key);
		this.#release();
	}
	#release() {
		this.#pending.resolve();
		this.#pending = deferredPromise();
	}
};

//#endregion
//#region src/utils/aria.ts
function ariaBool(value) {
	return value ? "true" : "false";
}
function $ariaBool(signal) {
	return () => ariaBool(signal());
}
function prefersReducedMotion() {
	if (typeof window === "undefined") return false;
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

//#endregion
//#region src/utils/error.ts
function coerceToError(error) {
	return error instanceof Error ? error : Error(typeof error === "string" ? error : JSON.stringify(error));
}
function assert(condition, message) {
	if (!condition) throw Error(message || "Assertion failed.");
}
var init_error = __esmMin((() => {}));

//#endregion
//#region ../../node_modules/.pnpm/@floating-ui+utils@0.2.11/node_modules/@floating-ui/utils/dist/floating-ui.utils.mjs
function clamp(start, value, end) {
	return max(start, min(value, end));
}
function evaluate(value, param) {
	return typeof value === "function" ? value(param) : value;
}
function getSide(placement) {
	return placement.split("-")[0];
}
function getAlignment(placement) {
	return placement.split("-")[1];
}
function getOppositeAxis(axis) {
	return axis === "x" ? "y" : "x";
}
function getAxisLength(axis) {
	return axis === "y" ? "height" : "width";
}
function getSideAxis(placement) {
	const firstChar = placement[0];
	return firstChar === "t" || firstChar === "b" ? "y" : "x";
}
function getAlignmentAxis(placement) {
	return getOppositeAxis(getSideAxis(placement));
}
function getAlignmentSides(placement, rects, rtl) {
	if (rtl === void 0) rtl = false;
	const alignment = getAlignment(placement);
	const alignmentAxis = getAlignmentAxis(placement);
	const length = getAxisLength(alignmentAxis);
	let mainAlignmentSide = alignmentAxis === "x" ? alignment === (rtl ? "end" : "start") ? "right" : "left" : alignment === "start" ? "bottom" : "top";
	if (rects.reference[length] > rects.floating[length]) mainAlignmentSide = getOppositePlacement(mainAlignmentSide);
	return [mainAlignmentSide, getOppositePlacement(mainAlignmentSide)];
}
function getExpandedPlacements(placement) {
	const oppositePlacement = getOppositePlacement(placement);
	return [
		getOppositeAlignmentPlacement(placement),
		oppositePlacement,
		getOppositeAlignmentPlacement(oppositePlacement)
	];
}
function getOppositeAlignmentPlacement(placement) {
	return placement.includes("start") ? placement.replace("start", "end") : placement.replace("end", "start");
}
function getSideList(side, isStart, rtl) {
	switch (side) {
		case "top":
		case "bottom":
			if (rtl) return isStart ? rlPlacement : lrPlacement;
			return isStart ? lrPlacement : rlPlacement;
		case "left":
		case "right": return isStart ? tbPlacement : btPlacement;
		default: return [];
	}
}
function getOppositeAxisPlacements(placement, flipAlignment, direction, rtl) {
	const alignment = getAlignment(placement);
	let list = getSideList(getSide(placement), direction === "start", rtl);
	if (alignment) {
		list = list.map((side) => side + "-" + alignment);
		if (flipAlignment) list = list.concat(list.map(getOppositeAlignmentPlacement));
	}
	return list;
}
function getOppositePlacement(placement) {
	const side = getSide(placement);
	return oppositeSideMap[side] + placement.slice(side.length);
}
function expandPaddingObject(padding) {
	return {
		top: 0,
		right: 0,
		bottom: 0,
		left: 0,
		...padding
	};
}
function getPaddingObject(padding) {
	return typeof padding !== "number" ? expandPaddingObject(padding) : {
		top: padding,
		right: padding,
		bottom: padding,
		left: padding
	};
}
function rectToClientRect(rect) {
	const { x, y, width, height } = rect;
	return {
		width,
		height,
		top: y,
		left: x,
		right: x + width,
		bottom: y + height,
		x,
		y
	};
}
var min, max, round$1, floor, createCoords, oppositeSideMap, lrPlacement, rlPlacement, tbPlacement, btPlacement;
var init_floating_ui_utils = __esmMin((() => {
	min = Math.min;
	max = Math.max;
	round$1 = Math.round;
	floor = Math.floor;
	createCoords = (v) => ({
		x: v,
		y: v
	});
	oppositeSideMap = {
		left: "right",
		right: "left",
		bottom: "top",
		top: "bottom"
	};
	lrPlacement = ["left", "right"];
	rlPlacement = ["right", "left"];
	tbPlacement = ["top", "bottom"];
	btPlacement = ["bottom", "top"];
}));

//#endregion
//#region ../../node_modules/.pnpm/@floating-ui+core@1.7.5/node_modules/@floating-ui/core/dist/floating-ui.core.mjs
function computeCoordsFromPlacement(_ref, placement, rtl) {
	let { reference, floating } = _ref;
	const sideAxis = getSideAxis(placement);
	const alignmentAxis = getAlignmentAxis(placement);
	const alignLength = getAxisLength(alignmentAxis);
	const side = getSide(placement);
	const isVertical = sideAxis === "y";
	const commonX = reference.x + reference.width / 2 - floating.width / 2;
	const commonY = reference.y + reference.height / 2 - floating.height / 2;
	const commonAlign = reference[alignLength] / 2 - floating[alignLength] / 2;
	let coords;
	switch (side) {
		case "top":
			coords = {
				x: commonX,
				y: reference.y - floating.height
			};
			break;
		case "bottom":
			coords = {
				x: commonX,
				y: reference.y + reference.height
			};
			break;
		case "right":
			coords = {
				x: reference.x + reference.width,
				y: commonY
			};
			break;
		case "left":
			coords = {
				x: reference.x - floating.width,
				y: commonY
			};
			break;
		default: coords = {
			x: reference.x,
			y: reference.y
		};
	}
	switch (getAlignment(placement)) {
		case "start":
			coords[alignmentAxis] -= commonAlign * (rtl && isVertical ? -1 : 1);
			break;
		case "end":
			coords[alignmentAxis] += commonAlign * (rtl && isVertical ? -1 : 1);
			break;
	}
	return coords;
}
/**
* Resolves with an object of overflow side offsets that determine how much the
* element is overflowing a given clipping boundary on each side.
* - positive = overflowing the boundary by that number of pixels
* - negative = how many pixels left before it will overflow
* - 0 = lies flush with the boundary
* @see https://floating-ui.com/docs/detectOverflow
*/
async function detectOverflow(state, options) {
	var _await$platform$isEle;
	if (options === void 0) options = {};
	const { x, y, platform, rects, elements, strategy } = state;
	const { boundary = "clippingAncestors", rootBoundary = "viewport", elementContext = "floating", altBoundary = false, padding = 0 } = evaluate(options, state);
	const paddingObject = getPaddingObject(padding);
	const element = elements[altBoundary ? elementContext === "floating" ? "reference" : "floating" : elementContext];
	const clippingClientRect = rectToClientRect(await platform.getClippingRect({
		element: ((_await$platform$isEle = await (platform.isElement == null ? void 0 : platform.isElement(element))) != null ? _await$platform$isEle : true) ? element : element.contextElement || await (platform.getDocumentElement == null ? void 0 : platform.getDocumentElement(elements.floating)),
		boundary,
		rootBoundary,
		strategy
	}));
	const rect = elementContext === "floating" ? {
		x,
		y,
		width: rects.floating.width,
		height: rects.floating.height
	} : rects.reference;
	const offsetParent = await (platform.getOffsetParent == null ? void 0 : platform.getOffsetParent(elements.floating));
	const offsetScale = await (platform.isElement == null ? void 0 : platform.isElement(offsetParent)) ? await (platform.getScale == null ? void 0 : platform.getScale(offsetParent)) || {
		x: 1,
		y: 1
	} : {
		x: 1,
		y: 1
	};
	const elementClientRect = rectToClientRect(platform.convertOffsetParentRelativeRectToViewportRelativeRect ? await platform.convertOffsetParentRelativeRectToViewportRelativeRect({
		elements,
		rect,
		offsetParent,
		strategy
	}) : rect);
	return {
		top: (clippingClientRect.top - elementClientRect.top + paddingObject.top) / offsetScale.y,
		bottom: (elementClientRect.bottom - clippingClientRect.bottom + paddingObject.bottom) / offsetScale.y,
		left: (clippingClientRect.left - elementClientRect.left + paddingObject.left) / offsetScale.x,
		right: (elementClientRect.right - clippingClientRect.right + paddingObject.right) / offsetScale.x
	};
}
var MAX_RESET_COUNT, computePosition$1, flip$1, shift$1;
var init_floating_ui_core = __esmMin((() => {
	init_floating_ui_utils();
	MAX_RESET_COUNT = 50;
	computePosition$1 = async (reference, floating, config) => {
		const { placement = "bottom", strategy = "absolute", middleware = [], platform } = config;
		const platformWithDetectOverflow = platform.detectOverflow ? platform : {
			...platform,
			detectOverflow
		};
		const rtl = await (platform.isRTL == null ? void 0 : platform.isRTL(floating));
		let rects = await platform.getElementRects({
			reference,
			floating,
			strategy
		});
		let { x, y } = computeCoordsFromPlacement(rects, placement, rtl);
		let statefulPlacement = placement;
		let resetCount = 0;
		const middlewareData = {};
		for (let i = 0; i < middleware.length; i++) {
			const currentMiddleware = middleware[i];
			if (!currentMiddleware) continue;
			const { name, fn } = currentMiddleware;
			const { x: nextX, y: nextY, data, reset } = await fn({
				x,
				y,
				initialPlacement: placement,
				placement: statefulPlacement,
				strategy,
				middlewareData,
				rects,
				platform: platformWithDetectOverflow,
				elements: {
					reference,
					floating
				}
			});
			x = nextX != null ? nextX : x;
			y = nextY != null ? nextY : y;
			middlewareData[name] = {
				...middlewareData[name],
				...data
			};
			if (reset && resetCount < MAX_RESET_COUNT) {
				resetCount++;
				if (typeof reset === "object") {
					if (reset.placement) statefulPlacement = reset.placement;
					if (reset.rects) rects = reset.rects === true ? await platform.getElementRects({
						reference,
						floating,
						strategy
					}) : reset.rects;
					({x, y} = computeCoordsFromPlacement(rects, statefulPlacement, rtl));
				}
				i = -1;
			}
		}
		return {
			x,
			y,
			placement: statefulPlacement,
			strategy,
			middlewareData
		};
	};
	flip$1 = function(options) {
		if (options === void 0) options = {};
		return {
			name: "flip",
			options,
			async fn(state) {
				var _middlewareData$arrow, _middlewareData$flip;
				const { placement, middlewareData, rects, initialPlacement, platform, elements } = state;
				const { mainAxis: checkMainAxis = true, crossAxis: checkCrossAxis = true, fallbackPlacements: specifiedFallbackPlacements, fallbackStrategy = "bestFit", fallbackAxisSideDirection = "none", flipAlignment = true, ...detectOverflowOptions } = evaluate(options, state);
				if ((_middlewareData$arrow = middlewareData.arrow) != null && _middlewareData$arrow.alignmentOffset) return {};
				const side = getSide(placement);
				const initialSideAxis = getSideAxis(initialPlacement);
				const isBasePlacement = getSide(initialPlacement) === initialPlacement;
				const rtl = await (platform.isRTL == null ? void 0 : platform.isRTL(elements.floating));
				const fallbackPlacements = specifiedFallbackPlacements || (isBasePlacement || !flipAlignment ? [getOppositePlacement(initialPlacement)] : getExpandedPlacements(initialPlacement));
				const hasFallbackAxisSideDirection = fallbackAxisSideDirection !== "none";
				if (!specifiedFallbackPlacements && hasFallbackAxisSideDirection) fallbackPlacements.push(...getOppositeAxisPlacements(initialPlacement, flipAlignment, fallbackAxisSideDirection, rtl));
				const placements = [initialPlacement, ...fallbackPlacements];
				const overflow = await platform.detectOverflow(state, detectOverflowOptions);
				const overflows = [];
				let overflowsData = ((_middlewareData$flip = middlewareData.flip) == null ? void 0 : _middlewareData$flip.overflows) || [];
				if (checkMainAxis) overflows.push(overflow[side]);
				if (checkCrossAxis) {
					const sides = getAlignmentSides(placement, rects, rtl);
					overflows.push(overflow[sides[0]], overflow[sides[1]]);
				}
				overflowsData = [...overflowsData, {
					placement,
					overflows
				}];
				if (!overflows.every((side) => side <= 0)) {
					var _middlewareData$flip2, _overflowsData$filter;
					const nextIndex = (((_middlewareData$flip2 = middlewareData.flip) == null ? void 0 : _middlewareData$flip2.index) || 0) + 1;
					const nextPlacement = placements[nextIndex];
					if (nextPlacement) {
						if (!(checkCrossAxis === "alignment" ? initialSideAxis !== getSideAxis(nextPlacement) : false) || overflowsData.every((d) => getSideAxis(d.placement) === initialSideAxis ? d.overflows[0] > 0 : true)) return {
							data: {
								index: nextIndex,
								overflows: overflowsData
							},
							reset: { placement: nextPlacement }
						};
					}
					let resetPlacement = (_overflowsData$filter = overflowsData.filter((d) => d.overflows[0] <= 0).sort((a, b) => a.overflows[1] - b.overflows[1])[0]) == null ? void 0 : _overflowsData$filter.placement;
					if (!resetPlacement) switch (fallbackStrategy) {
						case "bestFit": {
							var _overflowsData$filter2;
							const placement = (_overflowsData$filter2 = overflowsData.filter((d) => {
								if (hasFallbackAxisSideDirection) {
									const currentSideAxis = getSideAxis(d.placement);
									return currentSideAxis === initialSideAxis || currentSideAxis === "y";
								}
								return true;
							}).map((d) => [d.placement, d.overflows.filter((overflow) => overflow > 0).reduce((acc, overflow) => acc + overflow, 0)]).sort((a, b) => a[1] - b[1])[0]) == null ? void 0 : _overflowsData$filter2[0];
							if (placement) resetPlacement = placement;
							break;
						}
						case "initialPlacement":
							resetPlacement = initialPlacement;
							break;
					}
					if (placement !== resetPlacement) return { reset: { placement: resetPlacement } };
				}
				return {};
			}
		};
	};
	shift$1 = function(options) {
		if (options === void 0) options = {};
		return {
			name: "shift",
			options,
			async fn(state) {
				const { x, y, placement, platform } = state;
				const { mainAxis: checkMainAxis = true, crossAxis: checkCrossAxis = false, limiter = { fn: (_ref) => {
					let { x, y } = _ref;
					return {
						x,
						y
					};
				} }, ...detectOverflowOptions } = evaluate(options, state);
				const coords = {
					x,
					y
				};
				const overflow = await platform.detectOverflow(state, detectOverflowOptions);
				const crossAxis = getSideAxis(getSide(placement));
				const mainAxis = getOppositeAxis(crossAxis);
				let mainAxisCoord = coords[mainAxis];
				let crossAxisCoord = coords[crossAxis];
				if (checkMainAxis) {
					const minSide = mainAxis === "y" ? "top" : "left";
					const maxSide = mainAxis === "y" ? "bottom" : "right";
					const min = mainAxisCoord + overflow[minSide];
					const max = mainAxisCoord - overflow[maxSide];
					mainAxisCoord = clamp(min, mainAxisCoord, max);
				}
				if (checkCrossAxis) {
					const minSide = crossAxis === "y" ? "top" : "left";
					const maxSide = crossAxis === "y" ? "bottom" : "right";
					const min = crossAxisCoord + overflow[minSide];
					const max = crossAxisCoord - overflow[maxSide];
					crossAxisCoord = clamp(min, crossAxisCoord, max);
				}
				const limitedCoords = limiter.fn({
					...state,
					[mainAxis]: mainAxisCoord,
					[crossAxis]: crossAxisCoord
				});
				return {
					...limitedCoords,
					data: {
						x: limitedCoords.x - x,
						y: limitedCoords.y - y,
						enabled: {
							[mainAxis]: checkMainAxis,
							[crossAxis]: checkCrossAxis
						}
					}
				};
			}
		};
	};
}));

//#endregion
//#region ../../node_modules/.pnpm/@floating-ui+utils@0.2.11/node_modules/@floating-ui/utils/dist/floating-ui.utils.dom.mjs
function hasWindow() {
	return typeof window !== "undefined";
}
function getNodeName(node) {
	if (isNode(node)) return (node.nodeName || "").toLowerCase();
	return "#document";
}
function getWindow(node) {
	var _node$ownerDocument;
	return (node == null || (_node$ownerDocument = node.ownerDocument) == null ? void 0 : _node$ownerDocument.defaultView) || window;
}
function getDocumentElement(node) {
	var _ref;
	return (_ref = (isNode(node) ? node.ownerDocument : node.document) || window.document) == null ? void 0 : _ref.documentElement;
}
function isNode(value) {
	if (!hasWindow()) return false;
	return value instanceof Node || value instanceof getWindow(value).Node;
}
function isElement(value) {
	if (!hasWindow()) return false;
	return value instanceof Element || value instanceof getWindow(value).Element;
}
function isHTMLElement$1(value) {
	if (!hasWindow()) return false;
	return value instanceof HTMLElement || value instanceof getWindow(value).HTMLElement;
}
function isShadowRoot(value) {
	if (!hasWindow() || typeof ShadowRoot === "undefined") return false;
	return value instanceof ShadowRoot || value instanceof getWindow(value).ShadowRoot;
}
function isOverflowElement(element) {
	const { overflow, overflowX, overflowY, display } = getComputedStyle$1(element);
	return /auto|scroll|overlay|hidden|clip/.test(overflow + overflowY + overflowX) && display !== "inline" && display !== "contents";
}
function isTableElement(element) {
	return /^(table|td|th)$/.test(getNodeName(element));
}
function isTopLayer(element) {
	try {
		if (element.matches(":popover-open")) return true;
	} catch (_e) {}
	try {
		return element.matches(":modal");
	} catch (_e) {
		return false;
	}
}
function isContainingBlock(elementOrCss) {
	const css = isElement(elementOrCss) ? getComputedStyle$1(elementOrCss) : elementOrCss;
	return isNotNone(css.transform) || isNotNone(css.translate) || isNotNone(css.scale) || isNotNone(css.rotate) || isNotNone(css.perspective) || !isWebKit() && (isNotNone(css.backdropFilter) || isNotNone(css.filter)) || willChangeRe.test(css.willChange || "") || containRe.test(css.contain || "");
}
function getContainingBlock(element) {
	let currentNode = getParentNode(element);
	while (isHTMLElement$1(currentNode) && !isLastTraversableNode(currentNode)) {
		if (isContainingBlock(currentNode)) return currentNode;
		else if (isTopLayer(currentNode)) return null;
		currentNode = getParentNode(currentNode);
	}
	return null;
}
function isWebKit() {
	if (isWebKitValue == null) isWebKitValue = typeof CSS !== "undefined" && CSS.supports && CSS.supports("-webkit-backdrop-filter", "none");
	return isWebKitValue;
}
function isLastTraversableNode(node) {
	return /^(html|body|#document)$/.test(getNodeName(node));
}
function getComputedStyle$1(element) {
	return getWindow(element).getComputedStyle(element);
}
function getNodeScroll(element) {
	if (isElement(element)) return {
		scrollLeft: element.scrollLeft,
		scrollTop: element.scrollTop
	};
	return {
		scrollLeft: element.scrollX,
		scrollTop: element.scrollY
	};
}
function getParentNode(node) {
	if (getNodeName(node) === "html") return node;
	const result = node.assignedSlot || node.parentNode || isShadowRoot(node) && node.host || getDocumentElement(node);
	return isShadowRoot(result) ? result.host : result;
}
function getNearestOverflowAncestor(node) {
	const parentNode = getParentNode(node);
	if (isLastTraversableNode(parentNode)) return node.ownerDocument ? node.ownerDocument.body : node.body;
	if (isHTMLElement$1(parentNode) && isOverflowElement(parentNode)) return parentNode;
	return getNearestOverflowAncestor(parentNode);
}
function getOverflowAncestors(node, list, traverseIframes) {
	var _node$ownerDocument2;
	if (list === void 0) list = [];
	if (traverseIframes === void 0) traverseIframes = true;
	const scrollableAncestor = getNearestOverflowAncestor(node);
	const isBody = scrollableAncestor === ((_node$ownerDocument2 = node.ownerDocument) == null ? void 0 : _node$ownerDocument2.body);
	const win = getWindow(scrollableAncestor);
	if (isBody) {
		const frameElement = getFrameElement(win);
		return list.concat(win, win.visualViewport || [], isOverflowElement(scrollableAncestor) ? scrollableAncestor : [], frameElement && traverseIframes ? getOverflowAncestors(frameElement) : []);
	} else return list.concat(scrollableAncestor, getOverflowAncestors(scrollableAncestor, [], traverseIframes));
}
function getFrameElement(win) {
	return win.parent && Object.getPrototypeOf(win.parent) ? win.frameElement : null;
}
var willChangeRe, containRe, isNotNone, isWebKitValue;
var init_floating_ui_utils_dom = __esmMin((() => {
	willChangeRe = /transform|translate|scale|rotate|perspective|filter/;
	containRe = /paint|layout|strict|content/;
	isNotNone = (value) => !!value && value !== "none";
	;
}));

//#endregion
//#region ../../node_modules/.pnpm/@floating-ui+dom@1.7.6/node_modules/@floating-ui/dom/dist/floating-ui.dom.mjs
function getCssDimensions(element) {
	const css = getComputedStyle$1(element);
	let width = parseFloat(css.width) || 0;
	let height = parseFloat(css.height) || 0;
	const hasOffset = isHTMLElement$1(element);
	const offsetWidth = hasOffset ? element.offsetWidth : width;
	const offsetHeight = hasOffset ? element.offsetHeight : height;
	const shouldFallback = round$1(width) !== offsetWidth || round$1(height) !== offsetHeight;
	if (shouldFallback) {
		width = offsetWidth;
		height = offsetHeight;
	}
	return {
		width,
		height,
		$: shouldFallback
	};
}
function unwrapElement(element) {
	return !isElement(element) ? element.contextElement : element;
}
function getScale(element) {
	const domElement = unwrapElement(element);
	if (!isHTMLElement$1(domElement)) return createCoords(1);
	const rect = domElement.getBoundingClientRect();
	const { width, height, $ } = getCssDimensions(domElement);
	let x = ($ ? round$1(rect.width) : rect.width) / width;
	let y = ($ ? round$1(rect.height) : rect.height) / height;
	if (!x || !Number.isFinite(x)) x = 1;
	if (!y || !Number.isFinite(y)) y = 1;
	return {
		x,
		y
	};
}
function getVisualOffsets(element) {
	const win = getWindow(element);
	if (!isWebKit() || !win.visualViewport) return noOffsets;
	return {
		x: win.visualViewport.offsetLeft,
		y: win.visualViewport.offsetTop
	};
}
function shouldAddVisualOffsets(element, isFixed, floatingOffsetParent) {
	if (isFixed === void 0) isFixed = false;
	if (!floatingOffsetParent || isFixed && floatingOffsetParent !== getWindow(element)) return false;
	return isFixed;
}
function getBoundingClientRect(element, includeScale, isFixedStrategy, offsetParent) {
	if (includeScale === void 0) includeScale = false;
	if (isFixedStrategy === void 0) isFixedStrategy = false;
	const clientRect = element.getBoundingClientRect();
	const domElement = unwrapElement(element);
	let scale = createCoords(1);
	if (includeScale) if (offsetParent) {
		if (isElement(offsetParent)) scale = getScale(offsetParent);
	} else scale = getScale(element);
	const visualOffsets = shouldAddVisualOffsets(domElement, isFixedStrategy, offsetParent) ? getVisualOffsets(domElement) : createCoords(0);
	let x = (clientRect.left + visualOffsets.x) / scale.x;
	let y = (clientRect.top + visualOffsets.y) / scale.y;
	let width = clientRect.width / scale.x;
	let height = clientRect.height / scale.y;
	if (domElement) {
		const win = getWindow(domElement);
		const offsetWin = offsetParent && isElement(offsetParent) ? getWindow(offsetParent) : offsetParent;
		let currentWin = win;
		let currentIFrame = getFrameElement(currentWin);
		while (currentIFrame && offsetParent && offsetWin !== currentWin) {
			const iframeScale = getScale(currentIFrame);
			const iframeRect = currentIFrame.getBoundingClientRect();
			const css = getComputedStyle$1(currentIFrame);
			const left = iframeRect.left + (currentIFrame.clientLeft + parseFloat(css.paddingLeft)) * iframeScale.x;
			const top = iframeRect.top + (currentIFrame.clientTop + parseFloat(css.paddingTop)) * iframeScale.y;
			x *= iframeScale.x;
			y *= iframeScale.y;
			width *= iframeScale.x;
			height *= iframeScale.y;
			x += left;
			y += top;
			currentWin = getWindow(currentIFrame);
			currentIFrame = getFrameElement(currentWin);
		}
	}
	return rectToClientRect({
		width,
		height,
		x,
		y
	});
}
function getWindowScrollBarX(element, rect) {
	const leftScroll = getNodeScroll(element).scrollLeft;
	if (!rect) return getBoundingClientRect(getDocumentElement(element)).left + leftScroll;
	return rect.left + leftScroll;
}
function getHTMLOffset(documentElement, scroll) {
	const htmlRect = documentElement.getBoundingClientRect();
	return {
		x: htmlRect.left + scroll.scrollLeft - getWindowScrollBarX(documentElement, htmlRect),
		y: htmlRect.top + scroll.scrollTop
	};
}
function convertOffsetParentRelativeRectToViewportRelativeRect(_ref) {
	let { elements, rect, offsetParent, strategy } = _ref;
	const isFixed = strategy === "fixed";
	const documentElement = getDocumentElement(offsetParent);
	const topLayer = elements ? isTopLayer(elements.floating) : false;
	if (offsetParent === documentElement || topLayer && isFixed) return rect;
	let scroll = {
		scrollLeft: 0,
		scrollTop: 0
	};
	let scale = createCoords(1);
	const offsets = createCoords(0);
	const isOffsetParentAnElement = isHTMLElement$1(offsetParent);
	if (isOffsetParentAnElement || !isOffsetParentAnElement && !isFixed) {
		if (getNodeName(offsetParent) !== "body" || isOverflowElement(documentElement)) scroll = getNodeScroll(offsetParent);
		if (isOffsetParentAnElement) {
			const offsetRect = getBoundingClientRect(offsetParent);
			scale = getScale(offsetParent);
			offsets.x = offsetRect.x + offsetParent.clientLeft;
			offsets.y = offsetRect.y + offsetParent.clientTop;
		}
	}
	const htmlOffset = documentElement && !isOffsetParentAnElement && !isFixed ? getHTMLOffset(documentElement, scroll) : createCoords(0);
	return {
		width: rect.width * scale.x,
		height: rect.height * scale.y,
		x: rect.x * scale.x - scroll.scrollLeft * scale.x + offsets.x + htmlOffset.x,
		y: rect.y * scale.y - scroll.scrollTop * scale.y + offsets.y + htmlOffset.y
	};
}
function getClientRects(element) {
	return Array.from(element.getClientRects());
}
function getDocumentRect(element) {
	const html = getDocumentElement(element);
	const scroll = getNodeScroll(element);
	const body = element.ownerDocument.body;
	const width = max(html.scrollWidth, html.clientWidth, body.scrollWidth, body.clientWidth);
	const height = max(html.scrollHeight, html.clientHeight, body.scrollHeight, body.clientHeight);
	let x = -scroll.scrollLeft + getWindowScrollBarX(element);
	const y = -scroll.scrollTop;
	if (getComputedStyle$1(body).direction === "rtl") x += max(html.clientWidth, body.clientWidth) - width;
	return {
		width,
		height,
		x,
		y
	};
}
function getViewportRect(element, strategy) {
	const win = getWindow(element);
	const html = getDocumentElement(element);
	const visualViewport = win.visualViewport;
	let width = html.clientWidth;
	let height = html.clientHeight;
	let x = 0;
	let y = 0;
	if (visualViewport) {
		width = visualViewport.width;
		height = visualViewport.height;
		const visualViewportBased = isWebKit();
		if (!visualViewportBased || visualViewportBased && strategy === "fixed") {
			x = visualViewport.offsetLeft;
			y = visualViewport.offsetTop;
		}
	}
	const windowScrollbarX = getWindowScrollBarX(html);
	if (windowScrollbarX <= 0) {
		const doc = html.ownerDocument;
		const body = doc.body;
		const bodyStyles = getComputedStyle(body);
		const bodyMarginInline = doc.compatMode === "CSS1Compat" ? parseFloat(bodyStyles.marginLeft) + parseFloat(bodyStyles.marginRight) || 0 : 0;
		const clippingStableScrollbarWidth = Math.abs(html.clientWidth - body.clientWidth - bodyMarginInline);
		if (clippingStableScrollbarWidth <= SCROLLBAR_MAX) width -= clippingStableScrollbarWidth;
	} else if (windowScrollbarX <= SCROLLBAR_MAX) width += windowScrollbarX;
	return {
		width,
		height,
		x,
		y
	};
}
function getInnerBoundingClientRect(element, strategy) {
	const clientRect = getBoundingClientRect(element, true, strategy === "fixed");
	const top = clientRect.top + element.clientTop;
	const left = clientRect.left + element.clientLeft;
	const scale = isHTMLElement$1(element) ? getScale(element) : createCoords(1);
	return {
		width: element.clientWidth * scale.x,
		height: element.clientHeight * scale.y,
		x: left * scale.x,
		y: top * scale.y
	};
}
function getClientRectFromClippingAncestor(element, clippingAncestor, strategy) {
	let rect;
	if (clippingAncestor === "viewport") rect = getViewportRect(element, strategy);
	else if (clippingAncestor === "document") rect = getDocumentRect(getDocumentElement(element));
	else if (isElement(clippingAncestor)) rect = getInnerBoundingClientRect(clippingAncestor, strategy);
	else {
		const visualOffsets = getVisualOffsets(element);
		rect = {
			x: clippingAncestor.x - visualOffsets.x,
			y: clippingAncestor.y - visualOffsets.y,
			width: clippingAncestor.width,
			height: clippingAncestor.height
		};
	}
	return rectToClientRect(rect);
}
function hasFixedPositionAncestor(element, stopNode) {
	const parentNode = getParentNode(element);
	if (parentNode === stopNode || !isElement(parentNode) || isLastTraversableNode(parentNode)) return false;
	return getComputedStyle$1(parentNode).position === "fixed" || hasFixedPositionAncestor(parentNode, stopNode);
}
function getClippingElementAncestors(element, cache) {
	const cachedResult = cache.get(element);
	if (cachedResult) return cachedResult;
	let result = getOverflowAncestors(element, [], false).filter((el) => isElement(el) && getNodeName(el) !== "body");
	let currentContainingBlockComputedStyle = null;
	const elementIsFixed = getComputedStyle$1(element).position === "fixed";
	let currentNode = elementIsFixed ? getParentNode(element) : element;
	while (isElement(currentNode) && !isLastTraversableNode(currentNode)) {
		const computedStyle = getComputedStyle$1(currentNode);
		const currentNodeIsContaining = isContainingBlock(currentNode);
		if (!currentNodeIsContaining && computedStyle.position === "fixed") currentContainingBlockComputedStyle = null;
		if (elementIsFixed ? !currentNodeIsContaining && !currentContainingBlockComputedStyle : !currentNodeIsContaining && computedStyle.position === "static" && !!currentContainingBlockComputedStyle && (currentContainingBlockComputedStyle.position === "absolute" || currentContainingBlockComputedStyle.position === "fixed") || isOverflowElement(currentNode) && !currentNodeIsContaining && hasFixedPositionAncestor(element, currentNode)) result = result.filter((ancestor) => ancestor !== currentNode);
		else currentContainingBlockComputedStyle = computedStyle;
		currentNode = getParentNode(currentNode);
	}
	cache.set(element, result);
	return result;
}
function getClippingRect(_ref) {
	let { element, boundary, rootBoundary, strategy } = _ref;
	const clippingAncestors = [...boundary === "clippingAncestors" ? isTopLayer(element) ? [] : getClippingElementAncestors(element, this._c) : [].concat(boundary), rootBoundary];
	const firstRect = getClientRectFromClippingAncestor(element, clippingAncestors[0], strategy);
	let top = firstRect.top;
	let right = firstRect.right;
	let bottom = firstRect.bottom;
	let left = firstRect.left;
	for (let i = 1; i < clippingAncestors.length; i++) {
		const rect = getClientRectFromClippingAncestor(element, clippingAncestors[i], strategy);
		top = max(rect.top, top);
		right = min(rect.right, right);
		bottom = min(rect.bottom, bottom);
		left = max(rect.left, left);
	}
	return {
		width: right - left,
		height: bottom - top,
		x: left,
		y: top
	};
}
function getDimensions(element) {
	const { width, height } = getCssDimensions(element);
	return {
		width,
		height
	};
}
function getRectRelativeToOffsetParent(element, offsetParent, strategy) {
	const isOffsetParentAnElement = isHTMLElement$1(offsetParent);
	const documentElement = getDocumentElement(offsetParent);
	const isFixed = strategy === "fixed";
	const rect = getBoundingClientRect(element, true, isFixed, offsetParent);
	let scroll = {
		scrollLeft: 0,
		scrollTop: 0
	};
	const offsets = createCoords(0);
	function setLeftRTLScrollbarOffset() {
		offsets.x = getWindowScrollBarX(documentElement);
	}
	if (isOffsetParentAnElement || !isOffsetParentAnElement && !isFixed) {
		if (getNodeName(offsetParent) !== "body" || isOverflowElement(documentElement)) scroll = getNodeScroll(offsetParent);
		if (isOffsetParentAnElement) {
			const offsetRect = getBoundingClientRect(offsetParent, true, isFixed, offsetParent);
			offsets.x = offsetRect.x + offsetParent.clientLeft;
			offsets.y = offsetRect.y + offsetParent.clientTop;
		} else if (documentElement) setLeftRTLScrollbarOffset();
	}
	if (isFixed && !isOffsetParentAnElement && documentElement) setLeftRTLScrollbarOffset();
	const htmlOffset = documentElement && !isOffsetParentAnElement && !isFixed ? getHTMLOffset(documentElement, scroll) : createCoords(0);
	return {
		x: rect.left + scroll.scrollLeft - offsets.x - htmlOffset.x,
		y: rect.top + scroll.scrollTop - offsets.y - htmlOffset.y,
		width: rect.width,
		height: rect.height
	};
}
function isStaticPositioned(element) {
	return getComputedStyle$1(element).position === "static";
}
function getTrueOffsetParent(element, polyfill) {
	if (!isHTMLElement$1(element) || getComputedStyle$1(element).position === "fixed") return null;
	if (polyfill) return polyfill(element);
	let rawOffsetParent = element.offsetParent;
	if (getDocumentElement(element) === rawOffsetParent) rawOffsetParent = rawOffsetParent.ownerDocument.body;
	return rawOffsetParent;
}
function getOffsetParent(element, polyfill) {
	const win = getWindow(element);
	if (isTopLayer(element)) return win;
	if (!isHTMLElement$1(element)) {
		let svgOffsetParent = getParentNode(element);
		while (svgOffsetParent && !isLastTraversableNode(svgOffsetParent)) {
			if (isElement(svgOffsetParent) && !isStaticPositioned(svgOffsetParent)) return svgOffsetParent;
			svgOffsetParent = getParentNode(svgOffsetParent);
		}
		return win;
	}
	let offsetParent = getTrueOffsetParent(element, polyfill);
	while (offsetParent && isTableElement(offsetParent) && isStaticPositioned(offsetParent)) offsetParent = getTrueOffsetParent(offsetParent, polyfill);
	if (offsetParent && isLastTraversableNode(offsetParent) && isStaticPositioned(offsetParent) && !isContainingBlock(offsetParent)) return win;
	return offsetParent || getContainingBlock(element) || win;
}
function isRTL(element) {
	return getComputedStyle$1(element).direction === "rtl";
}
function rectsAreEqual(a, b) {
	return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}
function observeMove(element, onMove) {
	let io = null;
	let timeoutId;
	const root = getDocumentElement(element);
	function cleanup() {
		var _io;
		clearTimeout(timeoutId);
		(_io = io) == null || _io.disconnect();
		io = null;
	}
	function refresh(skip, threshold) {
		if (skip === void 0) skip = false;
		if (threshold === void 0) threshold = 1;
		cleanup();
		const elementRectForRootMargin = element.getBoundingClientRect();
		const { left, top, width, height } = elementRectForRootMargin;
		if (!skip) onMove();
		if (!width || !height) return;
		const insetTop = floor(top);
		const insetRight = floor(root.clientWidth - (left + width));
		const insetBottom = floor(root.clientHeight - (top + height));
		const insetLeft = floor(left);
		const options = {
			rootMargin: -insetTop + "px " + -insetRight + "px " + -insetBottom + "px " + -insetLeft + "px",
			threshold: max(0, min(1, threshold)) || 1
		};
		let isFirstUpdate = true;
		function handleObserve(entries) {
			const ratio = entries[0].intersectionRatio;
			if (ratio !== threshold) {
				if (!isFirstUpdate) return refresh();
				if (!ratio) timeoutId = setTimeout(() => {
					refresh(false, 1e-7);
				}, 1e3);
				else refresh(false, ratio);
			}
			if (ratio === 1 && !rectsAreEqual(elementRectForRootMargin, element.getBoundingClientRect())) refresh();
			isFirstUpdate = false;
		}
		try {
			io = new IntersectionObserver(handleObserve, {
				...options,
				root: root.ownerDocument
			});
		} catch (_e) {
			io = new IntersectionObserver(handleObserve, options);
		}
		io.observe(element);
	}
	refresh(true);
	return cleanup;
}
/**
* Automatically updates the position of the floating element when necessary.
* Should only be called when the floating element is mounted on the DOM or
* visible on the screen.
* @returns cleanup function that should be invoked when the floating element is
* removed from the DOM or hidden from the screen.
* @see https://floating-ui.com/docs/autoUpdate
*/
function autoUpdate(reference, floating, update, options) {
	if (options === void 0) options = {};
	const { ancestorScroll = true, ancestorResize = true, elementResize = typeof ResizeObserver === "function", layoutShift = typeof IntersectionObserver === "function", animationFrame = false } = options;
	const referenceEl = unwrapElement(reference);
	const ancestors = ancestorScroll || ancestorResize ? [...referenceEl ? getOverflowAncestors(referenceEl) : [], ...floating ? getOverflowAncestors(floating) : []] : [];
	ancestors.forEach((ancestor) => {
		ancestorScroll && ancestor.addEventListener("scroll", update, { passive: true });
		ancestorResize && ancestor.addEventListener("resize", update);
	});
	const cleanupIo = referenceEl && layoutShift ? observeMove(referenceEl, update) : null;
	let reobserveFrame = -1;
	let resizeObserver = null;
	if (elementResize) {
		resizeObserver = new ResizeObserver((_ref) => {
			let [firstEntry] = _ref;
			if (firstEntry && firstEntry.target === referenceEl && resizeObserver && floating) {
				resizeObserver.unobserve(floating);
				cancelAnimationFrame(reobserveFrame);
				reobserveFrame = requestAnimationFrame(() => {
					var _resizeObserver;
					(_resizeObserver = resizeObserver) == null || _resizeObserver.observe(floating);
				});
			}
			update();
		});
		if (referenceEl && !animationFrame) resizeObserver.observe(referenceEl);
		if (floating) resizeObserver.observe(floating);
	}
	let frameId;
	let prevRefRect = animationFrame ? getBoundingClientRect(reference) : null;
	if (animationFrame) frameLoop();
	function frameLoop() {
		const nextRefRect = getBoundingClientRect(reference);
		if (prevRefRect && !rectsAreEqual(prevRefRect, nextRefRect)) update();
		prevRefRect = nextRefRect;
		frameId = requestAnimationFrame(frameLoop);
	}
	update();
	return () => {
		var _resizeObserver2;
		ancestors.forEach((ancestor) => {
			ancestorScroll && ancestor.removeEventListener("scroll", update);
			ancestorResize && ancestor.removeEventListener("resize", update);
		});
		cleanupIo?.();
		(_resizeObserver2 = resizeObserver) == null || _resizeObserver2.disconnect();
		resizeObserver = null;
		if (animationFrame) cancelAnimationFrame(frameId);
	};
}
var noOffsets, SCROLLBAR_MAX, getElementRects, platform, shift, flip, computePosition;
var init_floating_ui_dom = __esmMin((() => {
	init_floating_ui_core();
	init_floating_ui_utils();
	init_floating_ui_utils_dom();
	noOffsets = /* @__PURE__ */ createCoords(0);
	SCROLLBAR_MAX = 25;
	getElementRects = async function(data) {
		const getOffsetParentFn = this.getOffsetParent || getOffsetParent;
		const getDimensionsFn = this.getDimensions;
		const floatingDimensions = await getDimensionsFn(data.floating);
		return {
			reference: getRectRelativeToOffsetParent(data.reference, await getOffsetParentFn(data.floating), data.strategy),
			floating: {
				x: 0,
				y: 0,
				width: floatingDimensions.width,
				height: floatingDimensions.height
			}
		};
	};
	platform = {
		convertOffsetParentRelativeRectToViewportRelativeRect,
		getDocumentElement,
		getClippingRect,
		getOffsetParent,
		getElementRects,
		getClientRects,
		getDimensions,
		getScale,
		isElement,
		isRTL
	};
	shift = shift$1;
	flip = flip$1;
	computePosition = (reference, floating, options) => {
		const cache = /* @__PURE__ */ new Map();
		const mergedOptions = {
			platform,
			...options
		};
		const platformWithCache = {
			...mergedOptions.platform,
			_c: cache
		};
		return computePosition$1(reference, floating, {
			...mergedOptions,
			platform: platformWithCache
		});
	};
}));

//#endregion
//#region src/utils/number.ts
/**
* Round a number to the given number of `decimalPlaces`.
*/
function round(num, decimalPlaces = 2) {
	return Number(num.toFixed(decimalPlaces));
}
/**
* Get the number of decimal places in the given `num`.
*
* @example `1 -> 0`
* @example `1.0 -> 0`
* @example `1.1 -> 1`
* @example `1.12 -> 2`
*/
function getNumberOfDecimalPlaces(num) {
	return String(num).split(".")[1]?.length ?? 0;
}
/**
* Clamp a given `value` between a minimum and maximum value.
*/
function clampNumber(min, value, max) {
	return Math.max(min, Math.min(max, value));
}
var init_number = __esmMin((() => {}));

//#endregion
//#region src/utils/dom.ts
function isEventInside(el, event) {
	const target = event.composedPath()[0];
	return isDOMNode(target) && el.contains(target);
}
function scheduleRafJob(job) {
	rafJobs.add(job);
	return () => rafJobs.delete(job);
}
function setAttributeIfEmpty(target, name, value) {
	if (!target.hasAttribute(name)) target.setAttribute(name, value);
}
function setARIALabel(target, $label) {
	if (target.hasAttribute("aria-label") || target.hasAttribute("data-no-label")) return;
	if (!isFunction($label)) {
		setAttribute(target, "aria-label", $label);
		return;
	}
	function updateAriaDescription() {
		setAttribute(target, "aria-label", $label());
	}
	effect(updateAriaDescription);
}
function isElementVisible(el) {
	const style = getComputedStyle(el);
	return style.display !== "none" && parseInt(style.opacity) > 0;
}
function checkVisibility(el) {
	return !!el && ("checkVisibility" in el ? el.checkVisibility({
		checkOpacity: true,
		checkVisibilityCSS: true
	}) : isElementVisible(el));
}
function observeVisibility(el, callback) {
	return scheduleRafJob(() => callback(checkVisibility(el)));
}
function isElementParent(owner, node, test) {
	while (node) if (node === owner) return true;
	else if (test?.(node)) break;
	else node = node.parentElement;
	return false;
}
function onPress(target, handler) {
	return new EventsController(target).add("pointerup", (event) => {
		if (event.button === 0 && !event.defaultPrevented) handler(event);
	}).add("keydown", (event) => {
		if (isKeyboardClick(event)) handler(event);
	});
}
function isTouchPinchEvent(event) {
	return isTouchEvent(event) && (event.touches.length > 1 || event.changedTouches.length > 1);
}
function requestScopedAnimationFrame(callback) {
	let scope = getScope(), id = window.requestAnimationFrame(() => {
		scoped(callback, scope);
		id = -1;
	});
	return () => void window.cancelAnimationFrame(id);
}
function cloneTemplate(template, length, onCreate) {
	let current, prev = template, parent = template.parentElement, content = template.content.firstElementChild, elements = [];
	if (!content && template.firstElementChild) {
		template.innerHTML = template.firstElementChild.outerHTML;
		template.firstElementChild.remove();
		content = template.content.firstElementChild;
	}
	if (content?.nodeType !== 1) throw Error("[vidstack] template must contain root element");
	for (let i = 0; i < length; i++) {
		current = document.importNode(content, true);
		onCreate?.(current, i);
		parent.insertBefore(current, prev.nextSibling);
		elements.push(current);
		prev = current;
	}
	onDispose(() => {
		for (let i = 0; i < elements.length; i++) elements[i].remove();
	});
	return elements;
}
function createTemplate(content) {
	const template = document.createElement("template");
	template.innerHTML = content;
	return template.content;
}
function cloneTemplateContent(content) {
	return content.cloneNode(true).firstElementChild;
}
function autoPlacement(el, trigger, placement, { offsetVarName, xOffset, yOffset, ...options }) {
	if (!el) return;
	const floatingPlacement = placement.replace(" ", "-").replace("-center", "");
	setStyle(el, "visibility", !trigger ? "hidden" : null);
	if (!trigger) return;
	let isTop = placement.includes("top");
	const negateX = (x) => placement.includes("left") ? `calc(-1 * ${x})` : x, negateY = (y) => isTop ? `calc(-1 * ${y})` : y;
	return autoUpdate(trigger, el, () => {
		computePosition(trigger, el, {
			placement: floatingPlacement,
			middleware: [
				...options.middleware ?? [],
				flip({
					fallbackAxisSideDirection: "start",
					crossAxis: false
				}),
				shift()
			],
			...options
		}).then(({ x, y, middlewareData }) => {
			const hasFlipped = !!middlewareData.flip?.index;
			isTop = placement.includes(hasFlipped ? "bottom" : "top");
			el.setAttribute("data-placement", hasFlipped ? placement.startsWith("top") ? placement.replace("top", "bottom") : placement.replace("bottom", "top") : placement);
			Object.assign(el.style, {
				top: `calc(${y + "px"} + ${negateY(yOffset ? yOffset + "px" : `var(--${offsetVarName}-y-offset, 0px)`)})`,
				left: `calc(${x + "px"} + ${negateX(xOffset ? xOffset + "px" : `var(--${offsetVarName}-x-offset, 0px)`)})`
			});
		});
	});
}
function hasAnimation(el) {
	return getComputedStyle(el).animationName !== "none";
}
function isHTMLElement(el) {
	return el instanceof HTMLElement;
}
var rafJobs;
var init_dom = __esmMin((() => {
	init_floating_ui_dom();
	init_dev();
	init_std();
	rafJobs = /* @__PURE__ */ new Set();
	{
		function processJobs() {
			for (const job of rafJobs) try {
				job();
			} catch (e) {
				console.error(`[vidstack] failed job:\n\n${e}`);
			}
			window.requestAnimationFrame(processJobs);
		}
		processJobs();
	}
}));

//#endregion
//#region src/core/controls.ts
init_error();
init_dev();
init_std();
init_dom();
var MediaControls = class extends MediaPlayerController {
	#idleTimer = -2;
	#pausedTracking = false;
	#hideOnMouseLeave = signal(false);
	#isMouseOutside = signal(false);
	#focusedItem = null;
	#canIdle = signal(true);
	/**
	* The default amount of delay in milliseconds while media playback is progressing without user
	* activity to indicate an idle state (i.e., hide controls).
	*
	* @defaultValue 2000
	*/
	defaultDelay = 2e3;
	/**
	* Whether controls can hide after a delay in user interaction. If this is false, controls will
	* not hide and be user controlled.
	*/
	get canIdle() {
		return this.#canIdle();
	}
	set canIdle(canIdle) {
		this.#canIdle.set(canIdle);
	}
	/**
	* Whether controls visibility should be toggled when the mouse enters and leaves the player
	* container.
	*
	* @defaultValue false
	*/
	get hideOnMouseLeave() {
		const { hideControlsOnMouseLeave } = this.$props;
		return this.#hideOnMouseLeave() || hideControlsOnMouseLeave();
	}
	set hideOnMouseLeave(hide) {
		this.#hideOnMouseLeave.set(hide);
	}
	/**
	* Whether media controls are currently visible.
	*/
	get showing() {
		return this.$state.controlsVisible();
	}
	/**
	* Show controls.
	*/
	show(delay = 0, trigger) {
		this.#clearIdleTimer();
		if (!this.#pausedTracking) this.#changeVisibility(true, delay, trigger);
	}
	/**
	* Hide controls.
	*/
	hide(delay = this.defaultDelay, trigger) {
		this.#clearIdleTimer();
		if (!this.#pausedTracking) this.#changeVisibility(false, delay, trigger);
	}
	/**
	* Whether all idle tracking on controls should be paused until resumed again.
	*/
	pause(trigger) {
		this.#pausedTracking = true;
		this.#clearIdleTimer();
		this.#changeVisibility(true, 0, trigger);
	}
	resume(trigger) {
		this.#pausedTracking = false;
		if (this.$state.paused()) return;
		this.#changeVisibility(false, this.defaultDelay, trigger);
	}
	onConnect() {
		effect(this.#init.bind(this));
	}
	#init() {
		const { viewType } = this.$state;
		if (!this.el || !this.#canIdle()) return;
		if (viewType() === "audio") {
			this.show();
			return;
		}
		effect(this.#watchMouse.bind(this));
		effect(this.#watchPaused.bind(this));
		const onPlay = this.#onPlay.bind(this), onPause = this.#onPause.bind(this), onEnd = this.#onEnd.bind(this);
		new EventsController(this.el).add("can-play", (event) => this.show(0, event)).add("play", onPlay).add("pause", onPause).add("end", onEnd).add("auto-play-fail", onPause);
	}
	#watchMouse() {
		if (!this.el) return;
		const { started, pointer, paused } = this.$state;
		if (!started() || pointer() !== "fine") return;
		const events = new EventsController(this.el), shouldHideOnMouseLeave = this.hideOnMouseLeave;
		if (!shouldHideOnMouseLeave || !this.#isMouseOutside()) effect(() => {
			if (!paused()) events.add("pointermove", this.#onStopIdle.bind(this));
		});
		if (shouldHideOnMouseLeave) events.add("mouseenter", this.#onMouseEnter.bind(this)).add("mouseleave", this.#onMouseLeave.bind(this));
	}
	#watchPaused() {
		const { paused, started, autoPlayError } = this.$state;
		if (paused() || autoPlayError() && !started()) return;
		const onStopIdle = this.#onStopIdle.bind(this);
		effect(() => {
			if (!this.el) return;
			const isTouch = this.$state.pointer() === "coarse", events = new EventsController(this.el), eventTypes = [isTouch ? "touchend" : "pointerup", "keydown"];
			for (const eventType of eventTypes) events.add(eventType, onStopIdle, { passive: false });
		});
	}
	#onPlay(event) {
		if (event.triggers.hasType("ended")) return;
		this.show(0, event);
		this.hide(void 0, event);
	}
	#onPause(event) {
		this.show(0, event);
	}
	#onEnd(event) {
		const { loop } = this.$state;
		if (loop()) this.hide(0, event);
	}
	#onMouseEnter(event) {
		this.#isMouseOutside.set(false);
		this.show(0, event);
		this.hide(void 0, event);
	}
	#onMouseLeave(event) {
		this.#isMouseOutside.set(true);
		this.hide(0, event);
	}
	#clearIdleTimer() {
		window.clearTimeout(this.#idleTimer);
		this.#idleTimer = -1;
	}
	#onStopIdle(event) {
		if (event.MEDIA_GESTURE || this.#pausedTracking || isTouchPinchEvent(event)) return;
		if (isKeyboardEvent(event)) {
			if (event.key === "Escape") {
				this.el?.focus();
				this.#focusedItem = null;
			} else if (this.#focusedItem) {
				event.preventDefault();
				requestAnimationFrame(() => {
					this.#focusedItem?.focus();
					this.#focusedItem = null;
				});
			}
		}
		this.show(0, event);
		this.hide(this.defaultDelay, event);
	}
	#changeVisibility(visible, delay, trigger) {
		if (delay === 0) {
			this.#onChange(visible, trigger);
			return;
		}
		this.#idleTimer = window.setTimeout(() => {
			if (!this.scope) return;
			this.#onChange(visible && !this.#pausedTracking, trigger);
		}, delay);
	}
	#onChange(visible, trigger) {
		if (this.$state.controlsVisible() === visible) return;
		this.$state.controlsVisible.set(visible);
		if (!visible && document.activeElement && this.el?.contains(document.activeElement)) {
			this.#focusedItem = document.activeElement;
			requestAnimationFrame(() => {
				this.el?.focus({ preventScroll: true });
			});
		}
		this.dispatch("controls-change", {
			detail: visible,
			trigger
		});
	}
};

//#endregion
//#region src/providers/google-cast/utils.ts
function getCastFrameworkURL() {
	return "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1";
}
/**
* Whether the Google Cast framework has loaded.
*/
function hasLoadedCastFramework() {
	return !!window.cast?.framework;
}
/**
* Whether Google Cast is available on this platform.
*/
function isCastAvailable() {
	return !!window.chrome?.cast?.isAvailable;
}
/**
* Whether the cast sender is connected.
*/
function isCastConnected() {
	return getCastContext().getCastState() === cast.framework.CastState.CONNECTED;
}
/**
* @see {@link https://developers.google.com/cast/docs/reference/web_sender/cast.framework.CastContext}
*/
function getCastContext() {
	return window.cast.framework.CastContext.getInstance();
}
/**
* @see {@link https://developers.google.com/cast/docs/reference/web_sender/cast.framework.CastSession}
*/
function getCastSession() {
	return getCastContext().getCurrentSession();
}
/**
* @see {@link https://developers.google.com/cast/docs/reference/web_sender/chrome.cast.media.Media}
*/
function getCastSessionMedia() {
	return getCastSession()?.getSessionObj().media[0];
}
function hasActiveCastSession(src) {
	return getCastSessionMedia()?.media.contentId === src?.src;
}
/**
* @see {@link https://developers.google.com/cast/docs/reference/web_sender/cast.framework.CastOptions}
*/
function getDefaultCastOptions() {
	return {
		language: "en-US",
		autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
		receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
		resumeSavedSession: true,
		androidReceiverCompatible: true
	};
}
function getCastErrorMessage(code) {
	const defaultMessage = `Google Cast Error Code: ${code}`;
	switch (code) {
		case chrome.cast.ErrorCode.API_NOT_INITIALIZED: return "The API is not initialized.";
		case chrome.cast.ErrorCode.CANCEL: return "The operation was canceled by the user";
		case chrome.cast.ErrorCode.CHANNEL_ERROR: return "A channel to the receiver is not available.";
		case chrome.cast.ErrorCode.EXTENSION_MISSING: return "The Cast extension is not available.";
		case chrome.cast.ErrorCode.INVALID_PARAMETER: return "The parameters to the operation were not valid.";
		case chrome.cast.ErrorCode.RECEIVER_UNAVAILABLE: return "No receiver was compatible with the session request.";
		case chrome.cast.ErrorCode.SESSION_ERROR: return "A session could not be created, or a session was invalid.";
		case chrome.cast.ErrorCode.TIMEOUT: return "The operation timed out.";
		default: return defaultMessage;
	}
	return defaultMessage;
}
function listenCastContextEvent(type, handler) {
	return listenEvent(getCastContext(), type, handler);
}
var init_utils$2 = __esmMin((() => {
	init_std();
}));

//#endregion
//#region src/foundation/observers/raf-loop.ts
var RAFLoop;
var init_raf_loop = __esmMin((() => {
	init_std();
	RAFLoop = class {
		#id;
		#callback;
		constructor(callback) {
			this.#callback = callback;
		}
		start() {
			if (!isUndefined(this.#id)) return;
			this.#loop();
		}
		stop() {
			if (isNumber(this.#id)) window.cancelAnimationFrame(this.#id);
			this.#id = void 0;
		}
		#loop() {
			this.#id = window.requestAnimationFrame(() => {
				if (isUndefined(this.#id)) return;
				this.#callback();
				this.#loop();
			});
		}
	};
}));

//#endregion
//#region src/providers/google-cast/media-info.ts
var GoogleCastMediaInfoBuilder;
var init_media_info = __esmMin((() => {
	GoogleCastMediaInfoBuilder = class {
		#info;
		constructor(src) {
			this.#info = new chrome.cast.media.MediaInfo(src.src, src.type);
		}
		build() {
			return this.#info;
		}
		setStreamType(streamType) {
			if (streamType.includes("live")) this.#info.streamType = chrome.cast.media.StreamType.LIVE;
			else this.#info.streamType = chrome.cast.media.StreamType.BUFFERED;
			return this;
		}
		setTracks(tracks) {
			this.#info.tracks = tracks.map(this.#buildCastTrack);
			return this;
		}
		setMetadata(title, poster) {
			this.#info.metadata = new chrome.cast.media.GenericMediaMetadata();
			this.#info.metadata.title = title;
			this.#info.metadata.images = [{ url: poster }];
			return this;
		}
		#buildCastTrack(track, trackId) {
			const castTrack = new chrome.cast.media.Track(trackId, chrome.cast.media.TrackType.TEXT);
			castTrack.name = track.label;
			castTrack.trackContentId = track.src;
			castTrack.trackContentType = "text/vtt";
			castTrack.language = track.language;
			castTrack.subtype = track.kind.toUpperCase();
			return castTrack;
		}
	};
}));

//#endregion
//#region src/providers/google-cast/tracks.ts
var GoogleCastTracksManager;
var init_tracks = __esmMin((() => {
	init_dev();
	init_std();
	init_symbols$1();
	init_utils$2();
	GoogleCastTracksManager = class {
		#cast;
		#ctx;
		#onNewLocalTracks;
		constructor(cast, ctx, onNewLocalTracks) {
			this.#cast = cast;
			this.#ctx = ctx;
			this.#onNewLocalTracks = onNewLocalTracks;
		}
		setup() {
			const syncRemoteActiveIds = this.syncRemoteActiveIds.bind(this);
			listenEvent(this.#ctx.audioTracks, "change", syncRemoteActiveIds);
			listenEvent(this.#ctx.textTracks, "mode-change", syncRemoteActiveIds);
			effect(this.#syncLocalTracks.bind(this));
		}
		getLocalTextTracks() {
			return this.#ctx.$state.textTracks().filter((track) => track.src && track.type === "vtt");
		}
		#getLocalAudioTracks() {
			return this.#ctx.$state.audioTracks();
		}
		#getRemoteTracks(type) {
			const tracks = this.#cast.mediaInfo?.tracks ?? [];
			return type ? tracks.filter((track) => track.type === type) : tracks;
		}
		#getRemoteActiveIds() {
			const activeIds = [], activeLocalAudioTrack = this.#getLocalAudioTracks().find((track) => track.selected), activeLocalTextTracks = this.getLocalTextTracks().filter((track) => track.mode === "showing");
			if (activeLocalAudioTrack) {
				const remoteAudioTracks = this.#getRemoteTracks(chrome.cast.media.TrackType.AUDIO), remoteAudioTrack = this.#findRemoteTrack(remoteAudioTracks, activeLocalAudioTrack);
				if (remoteAudioTrack) activeIds.push(remoteAudioTrack.trackId);
			}
			if (activeLocalTextTracks?.length) {
				const remoteTextTracks = this.#getRemoteTracks(chrome.cast.media.TrackType.TEXT);
				if (remoteTextTracks.length) for (const localTrack of activeLocalTextTracks) {
					const remoteTextTrack = this.#findRemoteTrack(remoteTextTracks, localTrack);
					if (remoteTextTrack) activeIds.push(remoteTextTrack.trackId);
				}
			}
			return activeIds;
		}
		#syncLocalTracks() {
			const localTextTracks = this.getLocalTextTracks();
			if (!this.#cast.isMediaLoaded) return;
			const remoteTextTracks = this.#getRemoteTracks(chrome.cast.media.TrackType.TEXT);
			for (const localTrack of localTextTracks) if (!this.#findRemoteTrack(remoteTextTracks, localTrack)) {
				untrack(() => this.#onNewLocalTracks?.());
				break;
			}
		}
		syncRemoteTracks(event) {
			if (!this.#cast.isMediaLoaded) return;
			const localAudioTracks = this.#getLocalAudioTracks(), localTextTracks = this.getLocalTextTracks(), remoteAudioTracks = this.#getRemoteTracks(chrome.cast.media.TrackType.AUDIO), remoteTextTracks = this.#getRemoteTracks(chrome.cast.media.TrackType.TEXT);
			for (const remoteAudioTrack of remoteAudioTracks) {
				if (this.#findLocalTrack(localAudioTracks, remoteAudioTrack)) continue;
				const localAudioTrack = {
					id: remoteAudioTrack.trackId.toString(),
					label: remoteAudioTrack.name,
					language: remoteAudioTrack.language,
					kind: remoteAudioTrack.subtype ?? "main",
					selected: false
				};
				this.#ctx.audioTracks[ListSymbol.add](localAudioTrack, event);
			}
			for (const remoteTextTrack of remoteTextTracks) {
				if (this.#findLocalTrack(localTextTracks, remoteTextTrack)) continue;
				const localTextTrack = {
					id: remoteTextTrack.trackId.toString(),
					src: remoteTextTrack.trackContentId,
					label: remoteTextTrack.name,
					language: remoteTextTrack.language,
					kind: remoteTextTrack.subtype.toLowerCase()
				};
				this.#ctx.textTracks.add(localTextTrack, event);
			}
		}
		syncRemoteActiveIds(event) {
			if (!this.#cast.isMediaLoaded) return;
			const activeIds = this.#getRemoteActiveIds(), editRequest = new chrome.cast.media.EditTracksInfoRequest(activeIds);
			this.#editTracksInfo(editRequest).catch((error) => {
				this.#ctx.logger?.errorGroup("[vidstack] failed to edit cast tracks info").labelledLog("Edit Request", editRequest).labelledLog("Error", error).dispatch();
			});
		}
		#editTracksInfo(request) {
			const media = getCastSessionMedia();
			return new Promise((resolve, reject) => media?.editTracksInfo(request, resolve, reject));
		}
		#findLocalTrack(localTracks, remoteTrack) {
			return localTracks.find((localTrack) => this.#isMatch(localTrack, remoteTrack));
		}
		#findRemoteTrack(remoteTracks, localTrack) {
			return remoteTracks.find((remoteTrack) => this.#isMatch(localTrack, remoteTrack));
		}
		#isMatch(localTrack, remoteTrack) {
			return remoteTrack.name === localTrack.label && remoteTrack.language === localTrack.language && remoteTrack.subtype.toLowerCase() === localTrack.kind.toLowerCase();
		}
	};
}));

//#endregion
//#region src/providers/google-cast/provider.ts
var provider_exports$6 = /* @__PURE__ */ __exportAll({ GoogleCastProvider: () => GoogleCastProvider });
var GoogleCastProvider;
var init_provider$7 = __esmMin((() => {
	init_dev();
	init_std();
	init_time_ranges();
	init_raf_loop();
	init_media_info();
	init_tracks();
	init_utils$2();
	GoogleCastProvider = class {
		$$PROVIDER_TYPE = "GOOGLE_CAST";
		scope = createScope();
		#player;
		#ctx;
		#tracks;
		#currentSrc = null;
		#state = "disconnected";
		#currentTime = 0;
		#played = 0;
		#seekableRange = new TimeRange(0, 0);
		#timeRAF = new RAFLoop(this.#onAnimationFrame.bind(this));
		#playerEventHandlers;
		#reloadInfo = null;
		#isIdle = false;
		constructor(player, ctx) {
			this.#player = player;
			this.#ctx = ctx;
			this.#tracks = new GoogleCastTracksManager(player, ctx, this.#onNewLocalTracks.bind(this));
		}
		get type() {
			return "google-cast";
		}
		get currentSrc() {
			return this.#currentSrc;
		}
		/**
		* The Google Cast remote player.
		*
		* @see {@link https://developers.google.com/cast/docs/reference/web_sender/cast.framework.RemotePlayer}
		*/
		get player() {
			return this.#player;
		}
		/**
		* @see {@link https://developers.google.com/cast/docs/reference/web_sender/cast.framework.CastContext}
		*/
		get cast() {
			return getCastContext();
		}
		/**
		* @see {@link https://developers.google.com/cast/docs/reference/web_sender/cast.framework.CastSession}
		*/
		get session() {
			return getCastSession();
		}
		/**
		* @see {@link https://developers.google.com/cast/docs/reference/web_sender/chrome.cast.media.Media}
		*/
		get media() {
			return getCastSessionMedia();
		}
		/**
		* Whether the current Google Cast session belongs to this provider.
		*/
		get hasActiveSession() {
			return hasActiveCastSession(this.#currentSrc);
		}
		setup() {
			this.#attachCastContextEventListeners();
			this.#attachCastPlayerEventListeners();
			this.#tracks.setup();
			this.#ctx.notify("provider-setup", this);
		}
		#attachCastContextEventListeners() {
			listenCastContextEvent(cast.framework.CastContextEventType.CAST_STATE_CHANGED, this.#onCastStateChange.bind(this));
		}
		#attachCastPlayerEventListeners() {
			const Event = cast.framework.RemotePlayerEventType, handlers = {
				[Event.IS_CONNECTED_CHANGED]: this.#onCastStateChange,
				[Event.IS_MEDIA_LOADED_CHANGED]: this.#onMediaLoadedChange,
				[Event.CAN_CONTROL_VOLUME_CHANGED]: this.#onCanControlVolumeChange,
				[Event.CAN_SEEK_CHANGED]: this.#onCanSeekChange,
				[Event.DURATION_CHANGED]: this.#onDurationChange,
				[Event.IS_MUTED_CHANGED]: this.#onVolumeChange,
				[Event.VOLUME_LEVEL_CHANGED]: this.#onVolumeChange,
				[Event.IS_PAUSED_CHANGED]: this.#onPausedChange,
				[Event.LIVE_SEEKABLE_RANGE_CHANGED]: this.#onProgress,
				[Event.PLAYER_STATE_CHANGED]: this.#onPlayerStateChange
			};
			this.#playerEventHandlers = handlers;
			const handler = this.#onRemotePlayerEvent.bind(this);
			for (const type of keysOf(handlers)) this.#player.controller.addEventListener(type, handler);
			onDispose(() => {
				for (const type of keysOf(handlers)) this.#player.controller.removeEventListener(type, handler);
			});
		}
		async play() {
			if (!this.#player.isPaused && !this.#isIdle) return;
			if (this.#isIdle) {
				await this.#reload(false, 0);
				return;
			}
			this.#player.controller?.playOrPause();
		}
		async pause() {
			if (this.#player.isPaused) return;
			this.#player.controller?.playOrPause();
		}
		getMediaStatus(request) {
			return new Promise((resolve, reject) => {
				this.media?.getStatus(request, resolve, reject);
			});
		}
		setMuted(muted) {
			if (muted && !this.#player.isMuted || !muted && this.#player.isMuted) this.#player.controller?.muteOrUnmute();
		}
		setCurrentTime(time) {
			this.#player.currentTime = time;
			this.#ctx.notify("seeking", time);
			this.#player.controller?.seek();
		}
		setVolume(volume) {
			this.#player.volumeLevel = volume;
			this.#player.controller?.setVolumeLevel();
		}
		async loadSource(src) {
			if (this.#reloadInfo?.src !== src) this.#reloadInfo = null;
			if (hasActiveCastSession(src)) {
				this.#resumeSession();
				this.#currentSrc = src;
				return;
			}
			this.#ctx.notify("load-start");
			const loadRequest = this.#buildLoadRequest(src), errorCode = await this.session.loadMedia(loadRequest);
			if (errorCode) {
				this.#currentSrc = null;
				this.#ctx.notify("error", Error(getCastErrorMessage(errorCode)));
				return;
			}
			this.#currentSrc = src;
		}
		destroy() {
			this.#reset();
			this.#endSession();
		}
		#reset() {
			if (!this.#reloadInfo) {
				this.#played = 0;
				this.#seekableRange = new TimeRange(0, 0);
			}
			this.#timeRAF.stop();
			this.#currentTime = 0;
			this.#reloadInfo = null;
		}
		#resumeSession() {
			const resumeSessionEvent = new DOMEvent("resume-session", { detail: this.session });
			this.#onMediaLoadedChange(resumeSessionEvent);
			const { muted, volume, savedState } = this.#ctx.$state, localState = savedState();
			this.setCurrentTime(Math.max(this.#player.currentTime, localState?.currentTime ?? 0));
			this.setMuted(muted());
			this.setVolume(volume());
			if (localState?.paused === false) this.play();
		}
		#endSession() {
			this.cast.endCurrentSession(true);
			const { remotePlaybackLoader } = this.#ctx.$state;
			remotePlaybackLoader.set(null);
		}
		#disconnectFromReceiver() {
			const { savedState } = this.#ctx.$state;
			savedState.set({
				paused: this.#player.isPaused,
				currentTime: this.#player.currentTime
			});
			this.#endSession();
		}
		#onAnimationFrame() {
			this.#onCurrentTimeChange();
		}
		#onRemotePlayerEvent(event) {
			this.#playerEventHandlers[event.type].call(this, event);
		}
		#onCastStateChange(data) {
			const castState = this.cast.getCastState(), state = castState === cast.framework.CastState.CONNECTED ? "connected" : castState === cast.framework.CastState.CONNECTING ? "connecting" : "disconnected";
			if (this.#state === state) return;
			const detail = {
				type: "google-cast",
				state
			}, trigger = this.#createEvent(data);
			this.#state = state;
			this.#ctx.notify("remote-playback-change", detail, trigger);
			if (state === "disconnected") this.#disconnectFromReceiver();
		}
		#onMediaLoadedChange(event) {
			if (!!!this.#player.isMediaLoaded) return;
			const src = peek(this.#ctx.$state.source);
			Promise.resolve().then(() => {
				if (src !== peek(this.#ctx.$state.source) || !this.#player.isMediaLoaded) return;
				this.#reset();
				const duration = this.#player.duration;
				this.#seekableRange = new TimeRange(0, duration);
				const detail = {
					provider: this,
					duration,
					buffered: new TimeRange(0, 0),
					seekable: this.#getSeekableRange()
				}, trigger = this.#createEvent(event);
				this.#ctx.notify("loaded-metadata", void 0, trigger);
				this.#ctx.notify("loaded-data", void 0, trigger);
				this.#ctx.notify("can-play", detail, trigger);
				this.#onCanControlVolumeChange();
				this.#onCanSeekChange(event);
				const { volume, muted } = this.#ctx.$state;
				this.setVolume(volume());
				this.setMuted(muted());
				this.#timeRAF.start();
				this.#tracks.syncRemoteTracks(trigger);
				this.#tracks.syncRemoteActiveIds(trigger);
			});
		}
		#onCanControlVolumeChange() {
			this.#ctx.$state.canSetVolume.set(this.#player.canControlVolume);
		}
		#onCanSeekChange(event) {
			const trigger = this.#createEvent(event);
			this.#ctx.notify("stream-type-change", this.#getStreamType(), trigger);
		}
		#getStreamType() {
			return this.#player.mediaInfo?.streamType === chrome.cast.media.StreamType.LIVE ? this.#player.canSeek ? "live:dvr" : "live" : "on-demand";
		}
		#onCurrentTimeChange() {
			if (this.#reloadInfo) return;
			const currentTime = this.#player.currentTime;
			if (currentTime === this.#currentTime) return;
			this.#ctx.notify("time-change", currentTime);
			if (currentTime > this.#played) {
				this.#played = currentTime;
				this.#onProgress();
			}
			if (this.#ctx.$state.seeking()) this.#ctx.notify("seeked", currentTime);
			this.#currentTime = currentTime;
		}
		#onDurationChange(event) {
			if (!this.#player.isMediaLoaded || this.#reloadInfo) return;
			const duration = this.#player.duration, trigger = this.#createEvent(event);
			this.#seekableRange = new TimeRange(0, duration);
			this.#ctx.notify("duration-change", duration, trigger);
		}
		#onVolumeChange(event) {
			if (!this.#player.isMediaLoaded) return;
			const detail = {
				muted: this.#player.isMuted,
				volume: this.#player.volumeLevel
			}, trigger = this.#createEvent(event);
			this.#ctx.notify("volume-change", detail, trigger);
		}
		#onPausedChange(event) {
			const trigger = this.#createEvent(event);
			if (this.#player.isPaused) this.#ctx.notify("pause", void 0, trigger);
			else this.#ctx.notify("play", void 0, trigger);
		}
		#onProgress(event) {
			const detail = {
				seekable: this.#getSeekableRange(),
				buffered: new TimeRange(0, this.#played)
			}, trigger = event ? this.#createEvent(event) : void 0;
			this.#ctx.notify("progress", detail, trigger);
		}
		#onPlayerStateChange(event) {
			const state = this.#player.playerState, PlayerState = chrome.cast.media.PlayerState;
			this.#isIdle = state === PlayerState.IDLE;
			if (state === PlayerState.PAUSED) return;
			const trigger = this.#createEvent(event);
			switch (state) {
				case PlayerState.PLAYING:
					this.#ctx.notify("playing", void 0, trigger);
					break;
				case PlayerState.BUFFERING:
					this.#ctx.notify("waiting", void 0, trigger);
					break;
				case PlayerState.IDLE:
					this.#timeRAF.stop();
					this.#ctx.notify("pause");
					this.#ctx.notify("end");
					break;
			}
		}
		#getSeekableRange() {
			return this.#player.liveSeekableRange ? new TimeRange(this.#player.liveSeekableRange.start, this.#player.liveSeekableRange.end) : this.#seekableRange;
		}
		#createEvent(detail) {
			return detail instanceof Event ? detail : new DOMEvent(detail.type, { detail });
		}
		#buildMediaInfo(src) {
			const { streamType, title, poster } = this.#ctx.$state;
			return new GoogleCastMediaInfoBuilder(src).setMetadata(title(), poster()).setStreamType(streamType()).setTracks(this.#tracks.getLocalTextTracks()).build();
		}
		#buildLoadRequest(src) {
			const mediaInfo = this.#buildMediaInfo(src), request = new chrome.cast.media.LoadRequest(mediaInfo), savedState = this.#ctx.$state.savedState();
			request.autoplay = (this.#reloadInfo?.paused ?? savedState?.paused) === false;
			request.currentTime = this.#reloadInfo?.time ?? savedState?.currentTime ?? 0;
			return request;
		}
		async #reload(paused, time) {
			const src = peek(this.#ctx.$state.source);
			this.#reloadInfo = {
				src,
				paused,
				time
			};
			await this.loadSource(src);
		}
		#onNewLocalTracks() {
			this.#reload(this.#player.isPaused, this.#player.currentTime).catch((error) => {
				this.#ctx.logger?.errorGroup("[vidstack] cast failed to load new local tracks").labelledLog("Error", error).dispatch();
			});
		}
	};
}));

//#endregion
//#region src/providers/google-cast/loader.ts
var loader_exports = /* @__PURE__ */ __exportAll({ GoogleCastLoader: () => GoogleCastLoader });
var GoogleCastLoader;
var init_loader = __esmMin((() => {
	init_dev();
	init_mime();
	init_network();
	init_support();
	init_utils$2();
	GoogleCastLoader = class {
		name = "google-cast";
		target;
		#player;
		/**
		* @see {@link https://developers.google.com/cast/docs/reference/web_sender/cast.framework.CastContext}
		*/
		get cast() {
			return getCastContext();
		}
		mediaType() {
			return "video";
		}
		canPlay(src) {
			return IS_CHROME && !IS_IOS && canGoogleCastSrc(src);
		}
		async prompt(ctx) {
			let loadEvent, openEvent, errorEvent;
			try {
				loadEvent = await this.#loadCastFramework(ctx);
				if (!this.#player) {
					this.#player = new cast.framework.RemotePlayer();
					new cast.framework.RemotePlayerController(this.#player);
				}
				openEvent = ctx.player.createEvent("google-cast-prompt-open", { trigger: loadEvent });
				ctx.player.dispatchEvent(openEvent);
				this.#notifyRemoteStateChange(ctx, "connecting", openEvent);
				await this.#showPrompt(peek(ctx.$props.googleCast));
				ctx.$state.remotePlaybackInfo.set({ deviceName: getCastSession()?.getCastDevice().friendlyName });
				if (isCastConnected()) this.#notifyRemoteStateChange(ctx, "connected", openEvent);
			} catch (code) {
				const error = code instanceof Error ? code : this.#createError((code + "").toUpperCase(), "Prompt failed.");
				errorEvent = ctx.player.createEvent("google-cast-prompt-error", {
					detail: error,
					trigger: openEvent ?? loadEvent,
					cancelable: true
				});
				ctx.player.dispatch(errorEvent);
				this.#notifyRemoteStateChange(ctx, isCastConnected() ? "connected" : "disconnected", errorEvent);
				throw error;
			} finally {
				ctx.player.dispatch("google-cast-prompt-close", { trigger: errorEvent ?? openEvent ?? loadEvent });
			}
		}
		async load(ctx) {
			if (!this.#player) throw Error("[vidstack] google cast player was not initialized");
			return new (await (Promise.resolve().then(() => (init_provider$7(), provider_exports$6)))).GoogleCastProvider(this.#player, ctx);
		}
		async #loadCastFramework(ctx) {
			if (hasLoadedCastFramework()) return;
			const loadStartEvent = ctx.player.createEvent("google-cast-load-start");
			ctx.player.dispatch(loadStartEvent);
			await loadScript(getCastFrameworkURL());
			await customElements.whenDefined("google-cast-launcher");
			const loadedEvent = ctx.player.createEvent("google-cast-loaded", { trigger: loadStartEvent });
			ctx.player.dispatch(loadedEvent);
			if (!isCastAvailable()) throw this.#createError("CAST_NOT_AVAILABLE", "Google Cast not available on this platform.");
			return loadedEvent;
		}
		async #showPrompt(options) {
			this.#setOptions(options);
			const errorCode = await this.cast.requestSession();
			if (errorCode) throw this.#createError(errorCode.toUpperCase(), getCastErrorMessage(errorCode));
		}
		#setOptions(options) {
			this.cast?.setOptions({
				...getDefaultCastOptions(),
				...options
			});
		}
		#notifyRemoteStateChange(ctx, state, trigger) {
			const detail = {
				type: "google-cast",
				state
			};
			ctx.notify("remote-playback-change", detail, trigger);
		}
		#createError(code, message) {
			const error = Error(message);
			error.code = code;
			return error;
		}
	};
}));

//#endregion
//#region src/core/state/media-request-manager.ts
init_dev();
init_std();
init_mime();
init_network();
init_support();
/**
* This class is responsible for listening to media request events and calling the appropriate
* actions on the current media provider. Do note, actions are queued until a media provider
* has connected.
*/
var MediaRequestManager = class extends MediaPlayerController {
	#stateMgr;
	#request;
	#media;
	controls;
	#fullscreen;
	#orientation;
	#$provider;
	#providerQueue = new RequestQueue();
	constructor(stateMgr, request, media) {
		super();
		this.#stateMgr = stateMgr;
		this.#request = request;
		this.#media = media;
		this.#$provider = media.$provider;
		this.controls = new MediaControls();
		this.#fullscreen = new FullscreenController();
		this.#orientation = new ScreenOrientationController();
	}
	onAttach() {
		this.listen("fullscreen-change", this.#onFullscreenChange.bind(this));
	}
	onConnect(el) {
		const names = Object.getOwnPropertyNames(Object.getPrototypeOf(this)), events = new EventsController(el), handleRequest = this.#handleRequest.bind(this);
		for (const name of names) if (name.startsWith("media-")) events.add(name, handleRequest);
		this.#attachLoadPlayListener();
		effect(this.#watchProvider.bind(this));
		effect(this.#watchControlsDelayChange.bind(this));
		effect(this.#watchAudioGainSupport.bind(this));
		effect(this.#watchAirPlaySupport.bind(this));
		effect(this.#watchGoogleCastSupport.bind(this));
		effect(this.#watchFullscreenSupport.bind(this));
		effect(this.#watchPiPSupport.bind(this));
	}
	onDestroy() {
		try {
			const destroyEvent = this.createEvent("destroy"), { pictureInPicture, fullscreen } = this.$state;
			if (fullscreen()) this.exitFullscreen("prefer-media", destroyEvent);
			if (pictureInPicture()) this.exitPictureInPicture(destroyEvent);
		} catch (e) {}
		this.#providerQueue.reset();
	}
	#attachLoadPlayListener() {
		const { load } = this.$props, { canLoad } = this.$state;
		if (load() !== "play" || canLoad()) return;
		const off = this.listen("media-play-request", (event) => {
			this.#handleLoadPlayStrategy(event);
			off();
		});
	}
	#watchProvider() {
		const provider = this.#$provider(), canPlay = this.$state.canPlay();
		if (provider && canPlay) this.#providerQueue.start();
		return () => {
			this.#providerQueue.stop();
		};
	}
	#handleRequest(event) {
		event.stopPropagation();
		if (event.defaultPrevented) return;
		this.#media.logger?.infoGroup(`📬 received \`${event.type}\``).labelledLog("Request", event).dispatch();
		if (!this[event.type]) return;
		if (peek(this.#$provider)) this[event.type](event);
		else this.#providerQueue.enqueue(event.type, () => {
			if (peek(this.#$provider)) this[event.type](event);
		});
	}
	async play(trigger) {
		const { canPlay, paused, autoPlaying } = this.$state;
		if (this.#handleLoadPlayStrategy(trigger)) return;
		if (!peek(paused)) return;
		if (trigger) this.#request.queue.enqueue("media-play-request", trigger);
		const isAutoPlaying = peek(autoPlaying);
		try {
			const provider = peek(this.#$provider);
			throwIfNotReadyForPlayback(provider, peek(canPlay));
			throwIfAutoplayingWithReducedMotion(isAutoPlaying);
			return await provider.play();
		} catch (error) {
			this.#logError("play request failed", error, trigger);
			const errorEvent = this.createEvent("play-fail", {
				detail: coerceToError(error),
				trigger
			});
			errorEvent.autoPlay = isAutoPlaying;
			this.#stateMgr.handle(errorEvent);
			throw error;
		}
	}
	#handleLoadPlayStrategy(trigger) {
		const { load } = this.$props, { canLoad } = this.$state;
		if (load() === "play" && !canLoad()) {
			const event = this.createEvent("media-start-loading", { trigger });
			this.dispatchEvent(event);
			this.#providerQueue.enqueue("media-play-request", async () => {
				try {
					await this.play(event);
				} catch (error) {}
			});
			return true;
		}
		return false;
	}
	async pause(trigger) {
		const { canPlay, paused } = this.$state;
		if (peek(paused)) return;
		if (trigger) this.#request.queue.enqueue("media-pause-request", trigger);
		try {
			const provider = peek(this.#$provider);
			throwIfNotReadyForPlayback(provider, peek(canPlay));
			return await provider.pause();
		} catch (error) {
			this.#request.queue.delete("media-pause-request");
			this.#logError("pause request failed", error, trigger);
			throw error;
		}
	}
	setAudioGain(gain, trigger) {
		const { audioGain, canSetAudioGain } = this.$state;
		if (audioGain() === gain) return;
		const provider = this.#$provider();
		if (!provider?.audioGain || !canSetAudioGain()) throw Error("[vidstack] audio gain api not available");
		if (trigger) this.#request.queue.enqueue("media-audio-gain-change-request", trigger);
		provider.audioGain.setGain(gain);
	}
	seekToLiveEdge(trigger) {
		const { canPlay, live, liveEdge, canSeek, liveSyncPosition, seekableEnd, userBehindLiveEdge } = this.$state;
		userBehindLiveEdge.set(false);
		if (peek(() => !live() || canSeek() && liveEdge())) return;
		const provider = peek(this.#$provider);
		throwIfNotReadyForPlayback(provider, peek(canPlay));
		const end = seekableEnd() - 2, time = Math.min(end, liveSyncPosition() ?? end);
		if (!Number.isFinite(time)) return;
		if (trigger) this.#request.queue.enqueue("media-seek-request", trigger);
		provider.setCurrentTime(time);
	}
	#wasPIPActive = false;
	async enterFullscreen(target = "prefer-media", trigger) {
		const adapter = this.#getFullscreenAdapter(target);
		throwIfFullscreenNotSupported(target, adapter);
		if (adapter.active) return;
		if (peek(this.$state.pictureInPicture)) {
			this.#wasPIPActive = true;
			await this.exitPictureInPicture(trigger);
		}
		if (trigger) this.#request.queue.enqueue("media-enter-fullscreen-request", trigger);
		return adapter.enter();
	}
	async exitFullscreen(target = "prefer-media", trigger) {
		const adapter = this.#getFullscreenAdapter(target);
		throwIfFullscreenNotSupported(target, adapter);
		if (!adapter.active) return;
		if (trigger) this.#request.queue.enqueue("media-exit-fullscreen-request", trigger);
		try {
			const result = await adapter.exit();
			if (this.#wasPIPActive && peek(this.$state.canPictureInPicture)) await this.enterPictureInPicture();
			return result;
		} finally {
			this.#wasPIPActive = false;
		}
	}
	#getFullscreenAdapter(target) {
		const provider = peek(this.#$provider);
		return target === "prefer-media" && this.#fullscreen.supported || target === "media" ? this.#fullscreen : provider?.fullscreen;
	}
	async enterPictureInPicture(trigger) {
		this.#throwIfPIPNotSupported();
		if (this.$state.pictureInPicture()) return;
		if (trigger) this.#request.queue.enqueue("media-enter-pip-request", trigger);
		return await this.#$provider().pictureInPicture.enter();
	}
	async exitPictureInPicture(trigger) {
		this.#throwIfPIPNotSupported();
		if (!this.$state.pictureInPicture()) return;
		if (trigger) this.#request.queue.enqueue("media-exit-pip-request", trigger);
		try {
			if (document?.pictureInPictureElement && document.exitPictureInPicture) {
				await document.exitPictureInPicture();
				return;
			}
			const provider = this.#$provider();
			if (provider?.pictureInPicture) {
				await provider.pictureInPicture.exit();
				return;
			}
			const videoElements = document?.querySelectorAll?.("video") || [];
			for (const video of videoElements) {
				if (video === document.pictureInPictureElement) {
					if (document.exitPictureInPicture) {
						await document.exitPictureInPicture();
						return;
					}
				}
				if (video.webkitPresentationMode === "picture-in-picture") {
					video.webkitSetPresentationMode("inline");
					return;
				}
			}
		} catch (error) {
			{
				const { logger } = this.#media;
				logger?.errorGroup("[vidstack] failed to force exit picture-in-picture").labelledLog("Error", error).labelledLog("Media Context", { ...this.#media }).dispatch();
			}
		}
	}
	#throwIfPIPNotSupported() {
		if (this.$state.canPictureInPicture()) return;
		throw Error(`[vidstack] picture-in-picture is not currently available`);
	}
	#watchControlsDelayChange() {
		this.controls.defaultDelay = this.$props.controlsDelay();
	}
	#watchAudioGainSupport() {
		const { canSetAudioGain } = this.$state, supported = !!this.#$provider()?.audioGain?.supported;
		canSetAudioGain.set(supported);
	}
	#watchAirPlaySupport() {
		const { canAirPlay } = this.$state, supported = !!this.#$provider()?.airPlay?.supported;
		canAirPlay.set(supported);
	}
	#watchGoogleCastSupport() {
		const { canGoogleCast, source } = this.$state, supported = IS_CHROME && !IS_IOS && canGoogleCastSrc(source());
		canGoogleCast.set(supported);
	}
	#watchFullscreenSupport() {
		const { canFullscreen } = this.$state, supported = this.#fullscreen.supported || !!this.#$provider()?.fullscreen?.supported;
		canFullscreen.set(supported);
	}
	#watchPiPSupport() {
		const { canPictureInPicture } = this.$state, supported = !!this.#$provider()?.pictureInPicture?.supported;
		canPictureInPicture.set(supported);
	}
	async ["media-airplay-request"](event) {
		try {
			await this.requestAirPlay(event);
		} catch (error) {}
	}
	async requestAirPlay(trigger) {
		try {
			const adapter = this.#$provider()?.airPlay;
			if (!adapter?.supported) throw Error("AirPlay adapter not available on provider.");
			if (trigger) this.#request.queue.enqueue("media-airplay-request", trigger);
			return await adapter.prompt();
		} catch (error) {
			this.#request.queue.delete("media-airplay-request");
			this.#logError("airplay request failed", error, trigger);
			throw error;
		}
	}
	async ["media-google-cast-request"](event) {
		try {
			await this.requestGoogleCast(event);
		} catch (error) {}
	}
	#googleCastLoader;
	async requestGoogleCast(trigger) {
		try {
			const { canGoogleCast } = this.$state;
			if (!peek(canGoogleCast)) {
				const error = Error("Google Cast not available on this platform.");
				error.code = "CAST_NOT_AVAILABLE";
				throw error;
			}
			preconnect("https://www.gstatic.com");
			if (!this.#googleCastLoader) {
				const $module = await Promise.resolve().then(() => (init_loader(), loader_exports));
				this.#googleCastLoader = new $module.GoogleCastLoader();
			}
			await this.#googleCastLoader.prompt(this.#media);
			if (trigger) this.#request.queue.enqueue("media-google-cast-request", trigger);
			const isConnecting = peek(this.$state.remotePlaybackState) !== "disconnected";
			if (isConnecting) this.$state.savedState.set({
				paused: peek(this.$state.paused),
				currentTime: peek(this.$state.currentTime)
			});
			this.$state.remotePlaybackLoader.set(isConnecting ? this.#googleCastLoader : null);
		} catch (error) {
			this.#request.queue.delete("media-google-cast-request");
			this.#logError("google cast request failed", error, trigger);
			throw error;
		}
	}
	["media-clip-start-change-request"](event) {
		const { clipStartTime } = this.$state;
		clipStartTime.set(event.detail);
	}
	["media-clip-end-change-request"](event) {
		const { clipEndTime } = this.$state;
		clipEndTime.set(event.detail);
		this.dispatch("duration-change", {
			detail: event.detail,
			trigger: event
		});
	}
	["media-duration-change-request"](event) {
		const { providedDuration, clipEndTime } = this.$state;
		providedDuration.set(event.detail);
		if (clipEndTime() <= 0) this.dispatch("duration-change", {
			detail: event.detail,
			trigger: event
		});
	}
	["media-audio-track-change-request"](event) {
		const { logger, audioTracks } = this.#media;
		if (audioTracks.readonly) {
			logger?.warnGroup(`[vidstack] attempted to change audio track but it is currently read-only`).labelledLog("Request Event", event).dispatch();
			return;
		}
		const index = event.detail, track = audioTracks[index];
		if (track) {
			const key = event.type;
			this.#request.queue.enqueue(key, event);
			track.selected = true;
		} else logger?.warnGroup("[vidstack] failed audio track change request (invalid index)").labelledLog("Audio Tracks", audioTracks.toArray()).labelledLog("Index", index).labelledLog("Request Event", event).dispatch();
	}
	async ["media-enter-fullscreen-request"](event) {
		try {
			await this.enterFullscreen(event.detail, event);
		} catch (error) {
			this.#onFullscreenError(error, event);
		}
	}
	async ["media-exit-fullscreen-request"](event) {
		try {
			await this.exitFullscreen(event.detail, event);
		} catch (error) {
			this.#onFullscreenError(error, event);
		}
	}
	async #onFullscreenChange(event) {
		const lockType = peek(this.$props.fullscreenOrientation), isFullscreen = event.detail;
		if (isUndefined(lockType) || lockType === "none" || !this.#orientation.supported) return;
		if (isFullscreen) {
			if (this.#orientation.locked) return;
			this.dispatch("media-orientation-lock-request", {
				detail: lockType,
				trigger: event
			});
		} else if (this.#orientation.locked) this.dispatch("media-orientation-unlock-request", { trigger: event });
	}
	#onFullscreenError(error, request) {
		this.#logError("fullscreen request failed", error, request);
		this.#stateMgr.handle(this.createEvent("fullscreen-error", { detail: coerceToError(error) }));
	}
	async ["media-orientation-lock-request"](event) {
		const key = event.type;
		try {
			this.#request.queue.enqueue(key, event);
			await this.#orientation.lock(event.detail);
		} catch (error) {
			this.#request.queue.delete(key);
			this.#logError("failed to lock screen orientation", error, event);
		}
	}
	async ["media-orientation-unlock-request"](event) {
		const key = event.type;
		try {
			this.#request.queue.enqueue(key, event);
			await this.#orientation.unlock();
		} catch (error) {
			this.#request.queue.delete(key);
			this.#logError("failed to unlock screen orientation", error, event);
		}
	}
	async ["media-enter-pip-request"](event) {
		try {
			await this.enterPictureInPicture(event);
		} catch (error) {
			this.#onPictureInPictureError(error, event);
		}
	}
	async ["media-exit-pip-request"](event) {
		try {
			await this.exitPictureInPicture(event);
		} catch (error) {
			this.#onPictureInPictureError(error, event);
		}
	}
	#onPictureInPictureError(error, request) {
		this.#logError("pip request failed", error, request);
		this.#stateMgr.handle(this.createEvent("picture-in-picture-error", { detail: coerceToError(error) }));
	}
	["media-live-edge-request"](event) {
		const { live, liveEdge, canSeek } = this.$state;
		if (!live() || canSeek() && liveEdge()) return;
		try {
			this.seekToLiveEdge(event);
		} catch (error) {
			this.#request.queue.delete("media-seek-request");
			this.#logError("seek to live edge fail", error, event);
		}
	}
	async ["media-loop-request"](event) {
		try {
			this.#request.looping = true;
			this.#request.replaying = true;
			await this.play(event);
		} catch (error) {
			this.#request.looping = false;
		}
	}
	["media-user-loop-change-request"](event) {
		this.$state.userPrefersLoop.set(event.detail);
	}
	async ["media-pause-request"](event) {
		if (this.$state.paused()) return;
		try {
			await this.pause(event);
		} catch (error) {}
	}
	async ["media-play-request"](event) {
		if (!this.$state.paused()) return;
		try {
			await this.play(event);
		} catch (e) {}
	}
	["media-rate-change-request"](event) {
		const { playbackRate, canSetPlaybackRate } = this.$state;
		if (playbackRate() === event.detail || !canSetPlaybackRate()) return;
		const provider = this.#$provider();
		if (!provider?.setPlaybackRate) return;
		this.#request.queue.enqueue("media-rate-change-request", event);
		provider.setPlaybackRate(event.detail);
	}
	["media-audio-gain-change-request"](event) {
		try {
			this.setAudioGain(event.detail, event);
		} catch (e) {}
	}
	["media-quality-change-request"](event) {
		const { qualities, storage, logger } = this.#media;
		if (qualities.readonly) {
			logger?.warnGroup(`[vidstack] attempted to change video quality but it is currently read-only`).labelledLog("Request Event", event).dispatch();
			return;
		}
		this.#request.queue.enqueue("media-quality-change-request", event);
		const index = event.detail;
		if (index < 0) {
			qualities.autoSelect(event);
			if (event.isOriginTrusted) storage?.setVideoQuality?.(null);
		} else {
			const quality = qualities[index];
			if (quality) {
				quality.selected = true;
				if (event.isOriginTrusted) storage?.setVideoQuality?.({
					id: quality.id,
					width: quality.width,
					height: quality.height,
					bitrate: quality.bitrate
				});
			} else logger?.warnGroup("[vidstack] failed quality change request (invalid index)").labelledLog("Qualities", qualities.toArray()).labelledLog("Index", index).labelledLog("Request Event", event).dispatch();
		}
	}
	["media-pause-controls-request"](event) {
		const key = event.type;
		this.#request.queue.enqueue(key, event);
		this.controls.pause(event);
	}
	["media-resume-controls-request"](event) {
		const key = event.type;
		this.#request.queue.enqueue(key, event);
		this.controls.resume(event);
	}
	["media-seek-request"](event) {
		const { canSeek, ended, live, seekableEnd, userBehindLiveEdge } = this.$state, seekTime = event.detail;
		if (ended()) this.#request.replaying = true;
		const key = event.type;
		this.#request.seeking = false;
		this.#request.queue.delete(key);
		const boundedTime = boundTime(seekTime, this.$state);
		if (!Number.isFinite(boundedTime) || !canSeek()) return;
		this.#request.queue.enqueue(key, event);
		this.#$provider().setCurrentTime(boundedTime);
		if (live() && event.isOriginTrusted && Math.abs(seekableEnd() - boundedTime) >= 2) userBehindLiveEdge.set(true);
	}
	["media-seeking-request"](event) {
		const key = event.type;
		this.#request.queue.enqueue(key, event);
		this.$state.seeking.set(true);
		this.#request.seeking = true;
	}
	["media-start-loading"](event) {
		if (this.$state.canLoad()) return;
		const key = event.type;
		this.#request.queue.enqueue(key, event);
		this.#stateMgr.handle(this.createEvent("can-load"));
	}
	["media-poster-start-loading"](event) {
		if (this.$state.canLoadPoster()) return;
		const key = event.type;
		this.#request.queue.enqueue(key, event);
		this.#stateMgr.handle(this.createEvent("can-load-poster"));
	}
	["media-text-track-change-request"](event) {
		const { index, mode } = event.detail, track = this.#media.textTracks[index];
		if (track) {
			const key = event.type;
			this.#request.queue.enqueue(key, event);
			track.setMode(mode, event);
		} else this.#media.logger?.warnGroup("[vidstack] failed text track change request (invalid index)").labelledLog("Text Tracks", this.#media.textTracks.toArray()).labelledLog("Index", index).labelledLog("Request Event", event).dispatch();
	}
	["media-mute-request"](event) {
		if (this.$state.muted()) return;
		const key = event.type;
		this.#request.queue.enqueue(key, event);
		this.#$provider().setMuted(true);
	}
	["media-unmute-request"](event) {
		const { muted, volume } = this.$state;
		if (!muted()) return;
		const key = event.type;
		this.#request.queue.enqueue(key, event);
		this.#media.$provider().setMuted(false);
		if (volume() === 0) {
			this.#request.queue.enqueue(key, event);
			this.#$provider().setVolume(.25);
		}
	}
	["media-volume-change-request"](event) {
		const { muted, volume } = this.$state;
		const newVolume = event.detail;
		if (volume() === newVolume) return;
		const key = event.type;
		this.#request.queue.enqueue(key, event);
		this.#$provider().setVolume(newVolume);
		if (newVolume > 0 && muted()) {
			this.#request.queue.enqueue(key, event);
			this.#$provider().setMuted(false);
		}
	}
	#logError(title, error, request) {
		this.#media.logger?.errorGroup(`[vidstack] ${title}`).labelledLog("Error", error).labelledLog("Media Context", { ...this.#media }).labelledLog("Trigger Event", request).dispatch();
	}
};
function throwIfNotReadyForPlayback(provider, canPlay) {
	if (provider && canPlay) return;
	throw Error(`[vidstack] media is not ready - wait for \`can-play\` event.`);
}
function throwIfFullscreenNotSupported(target, fullscreen) {
	if (fullscreen?.supported) return;
	throw Error(`[vidstack] fullscreen is not currently available on target \`${target}\``);
}
function throwIfAutoplayingWithReducedMotion(autoplaying) {
	if (!prefersReducedMotion() || !autoplaying) return;
	throw Error("[vidstack] autoplay is blocked due to user preference for reduced motion");
}
var MediaRequestContext = class {
	seeking = false;
	looping = false;
	replaying = false;
	queue = new Queue();
};

//#endregion
//#region ../../node_modules/.pnpm/just-debounce-it@3.2.0/node_modules/just-debounce-it/index.mjs
var functionDebounce = debounce;
function debounce(fn, wait, callFirst) {
	var timeout = null;
	var debouncedFn = null;
	var clear = function() {
		if (timeout) {
			clearTimeout(timeout);
			debouncedFn = null;
			timeout = null;
		}
	};
	var flush = function() {
		var call = debouncedFn;
		clear();
		if (call) call();
	};
	var debounceWrapper = function() {
		if (!wait) return fn.apply(this, arguments);
		var context = this;
		var args = arguments;
		var callNow = callFirst && !timeout;
		clear();
		debouncedFn = function() {
			fn.apply(context, args);
		};
		timeout = setTimeout(function() {
			timeout = null;
			if (!callNow) {
				var call = debouncedFn;
				debouncedFn = null;
				return call();
			}
		}, wait);
		if (callNow) return debouncedFn();
	};
	debounceWrapper.cancel = clear;
	debounceWrapper.flush = flush;
	return debounceWrapper;
}

//#endregion
//#region ../../node_modules/.pnpm/just-throttle@4.2.0/node_modules/just-throttle/index.mjs
var functionThrottle = throttle;
function throttle(fn, interval, options) {
	var timeoutId = null;
	var throttledFn = null;
	var leading = options && options.leading;
	var trailing = options && options.trailing;
	if (leading == null) leading = true;
	if (trailing == null) trailing = !leading;
	if (leading == true) trailing = false;
	var cancel = function() {
		if (timeoutId) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}
	};
	var flush = function() {
		var call = throttledFn;
		cancel();
		if (call) call();
	};
	var throttleWrapper = function() {
		var callNow = leading && !timeoutId;
		var context = this;
		var args = arguments;
		throttledFn = function() {
			return fn.apply(context, args);
		};
		if (!timeoutId) timeoutId = setTimeout(function() {
			timeoutId = null;
			if (trailing) return throttledFn();
		}, interval);
		if (callNow) {
			callNow = false;
			return throttledFn();
		}
	};
	throttleWrapper.cancel = cancel;
	throttleWrapper.flush = flush;
	return throttleWrapper;
}

//#endregion
//#region src/core/api/src-types.ts
init_std();
function isVideoQualitySrc(src) {
	return !isString(src) && "width" in src && "height" in src && isNumber(src.width) && isNumber(src.height);
}

//#endregion
//#region src/core/state/tracked-media-events.ts
const TRACKED_EVENT = new Set([
	"auto-play",
	"auto-play-fail",
	"can-load",
	"sources-change",
	"source-change",
	"load-start",
	"abort",
	"error",
	"loaded-metadata",
	"loaded-data",
	"can-play",
	"play",
	"play-fail",
	"pause",
	"playing",
	"seeking",
	"seeked",
	"waiting"
]);

//#endregion
//#region src/core/state/media-state-manager.ts
init_dev();
init_std();
init_symbols$1();
init_support();
init_symbols();
init_time_ranges();
init_symbols$2();
/**
* This class is responsible for listening to and normalizing media events, updating the media
* state context, and satisfying media requests.
*/
var MediaStateManager = class extends MediaPlayerController {
	#request;
	#media;
	#trackedEvents = /* @__PURE__ */ new Map();
	#clipEnded = false;
	#playedIntervals = [];
	#playedInterval = [-1, -1];
	#firingWaiting = false;
	#waitingTrigger;
	constructor(request, media) {
		super();
		this.#request = request;
		this.#media = media;
	}
	onAttach(el) {
		el.setAttribute("aria-busy", "true");
		new EventsController(this).add("fullscreen-change", this["fullscreen-change"].bind(this)).add("fullscreen-error", this["fullscreen-error"].bind(this)).add("orientation-change", this["orientation-change"].bind(this));
	}
	onConnect(el) {
		effect(this.#watchCanSetVolume.bind(this));
		this.#addTextTrackListeners();
		this.#addQualityListeners();
		this.#addAudioTrackListeners();
		this.#resumePlaybackOnConnect();
		onDispose(this.#pausePlaybackOnDisconnect.bind(this));
	}
	onDestroy() {
		const { audioTracks, qualities, textTracks } = this.#media;
		audioTracks[ListSymbol.reset]();
		qualities[ListSymbol.reset]();
		textTracks[ListSymbol.reset]();
		this.#stopWatchingQualityResize();
	}
	handle(event) {
		if (!this.scope) return;
		const type = event.type;
		untrack(() => this[event.type]?.(event));
		if (TRACKED_EVENT.has(type)) this.#trackedEvents.set(type, event);
		this.dispatch(event);
	}
	#isPlayingOnDisconnect = false;
	#resumePlaybackOnConnect() {
		if (!this.#isPlayingOnDisconnect) return;
		requestAnimationFrame(() => {
			if (!this.scope) return;
			this.#media.remote.play(new DOMEvent("dom-connect"));
		});
		this.#isPlayingOnDisconnect = false;
	}
	#pausePlaybackOnDisconnect() {
		if (this.#isPlayingOnDisconnect) return;
		this.#isPlayingOnDisconnect = !this.$state.paused();
		this.#media.$provider()?.pause();
	}
	#resetTracking() {
		this.#stopWaiting();
		this.#clipEnded = false;
		this.#request.replaying = false;
		this.#request.looping = false;
		this.#firingWaiting = false;
		this.#waitingTrigger = void 0;
		this.#trackedEvents.clear();
	}
	#satisfyRequest(request, event) {
		const requestEvent = this.#request.queue.serve(request);
		if (!requestEvent) return;
		event.request = requestEvent;
		event.triggers.add(requestEvent);
	}
	#addTextTrackListeners() {
		this.#onTextTracksChange();
		this.#onTextTrackModeChange();
		const textTracks = this.#media.textTracks;
		new EventsController(textTracks).add("add", this.#onTextTracksChange.bind(this)).add("remove", this.#onTextTracksChange.bind(this)).add("mode-change", this.#onTextTrackModeChange.bind(this));
	}
	#addQualityListeners() {
		const qualities = this.#media.qualities;
		new EventsController(qualities).add("add", this.#onQualitiesChange.bind(this)).add("remove", this.#onQualitiesChange.bind(this)).add("change", this.#onQualityChange.bind(this)).add("auto-change", this.#onAutoQualityChange.bind(this)).add("readonly-change", this.#onCanSetQualityChange.bind(this));
	}
	#addAudioTrackListeners() {
		const audioTracks = this.#media.audioTracks;
		new EventsController(audioTracks).add("add", this.#onAudioTracksChange.bind(this)).add("remove", this.#onAudioTracksChange.bind(this)).add("change", this.#onAudioTrackChange.bind(this));
	}
	#onTextTracksChange(event) {
		const { textTracks } = this.$state;
		textTracks.set(this.#media.textTracks.toArray());
		this.dispatch("text-tracks-change", {
			detail: textTracks(),
			trigger: event
		});
	}
	#onTextTrackModeChange(event) {
		if (event) this.#satisfyRequest("media-text-track-change-request", event);
		const current = this.#media.textTracks.selected, { textTrack } = this.$state;
		if (textTrack() !== current) {
			textTrack.set(current);
			this.dispatch("text-track-change", {
				detail: current,
				trigger: event
			});
		}
	}
	#onAudioTracksChange(event) {
		const { audioTracks } = this.$state;
		audioTracks.set(this.#media.audioTracks.toArray());
		this.dispatch("audio-tracks-change", {
			detail: audioTracks(),
			trigger: event
		});
	}
	#onAudioTrackChange(event) {
		const { audioTrack } = this.$state;
		audioTrack.set(this.#media.audioTracks.selected);
		if (event) this.#satisfyRequest("media-audio-track-change-request", event);
		this.dispatch("audio-track-change", {
			detail: audioTrack(),
			trigger: event
		});
	}
	#onQualitiesChange(event) {
		const { qualities } = this.$state;
		qualities.set(this.#media.qualities.toArray());
		this.dispatch("qualities-change", {
			detail: qualities(),
			trigger: event
		});
	}
	#onQualityChange(event) {
		const { quality } = this.$state;
		quality.set(this.#media.qualities.selected);
		if (event) this.#satisfyRequest("media-quality-change-request", event);
		this.dispatch("quality-change", {
			detail: quality(),
			trigger: event
		});
	}
	#onAutoQualityChange() {
		const { qualities } = this.#media, isAuto = qualities.auto;
		this.$state.autoQuality.set(isAuto);
		if (!isAuto) this.#stopWatchingQualityResize();
	}
	#stopQualityResizeEffect = null;
	#watchQualityResize() {
		this.#stopWatchingQualityResize();
		this.#stopQualityResizeEffect = effect(() => {
			const { qualities } = this.#media, { mediaWidth, mediaHeight } = this.$state, w = mediaWidth(), h = mediaHeight();
			if (w === 0 || h === 0) return;
			let selectedQuality = null, minScore = Infinity;
			for (const quality of qualities) {
				const score = Math.abs(quality.width - w) + Math.abs(quality.height - h);
				if (score < minScore) {
					minScore = score;
					selectedQuality = quality;
				}
			}
			if (selectedQuality) qualities[ListSymbol.select](selectedQuality, true, new DOMEvent("resize", { detail: {
				width: w,
				height: h
			} }));
		});
	}
	#stopWatchingQualityResize() {
		this.#stopQualityResizeEffect?.();
		this.#stopQualityResizeEffect = null;
	}
	#onCanSetQualityChange() {
		this.$state.canSetQuality.set(!this.#media.qualities.readonly);
	}
	#watchCanSetVolume() {
		const { canSetVolume, isGoogleCastConnected } = this.$state;
		if (isGoogleCastConnected()) {
			canSetVolume.set(false);
			return;
		}
		canChangeVolume().then(canSetVolume.set);
	}
	["provider-change"](event) {
		const prevProvider = this.#media.$provider(), newProvider = event.detail;
		if (prevProvider?.type === newProvider?.type) return;
		prevProvider?.destroy?.();
		prevProvider?.scope?.dispose();
		this.#media.$provider.set(event.detail);
		if (prevProvider && event.detail === null) this.#resetMediaState(event);
	}
	["provider-loader-change"](event) {
		this.#media.logger?.infoGroup(`Loader change \`${event.detail?.constructor.name}\``).labelledLog("Event", event).dispatch();
	}
	["auto-play"](event) {
		this.$state.autoPlayError.set(null);
	}
	["auto-play-fail"](event) {
		this.$state.autoPlayError.set(event.detail);
		this.#resetTracking();
	}
	["can-load"](event) {
		this.$state.canLoad.set(true);
		this.#trackedEvents.set("can-load", event);
		this.#media.textTracks[TextTrackSymbol.canLoad]();
		this.#satisfyRequest("media-start-loading", event);
	}
	["can-load-poster"](event) {
		this.$state.canLoadPoster.set(true);
		this.#trackedEvents.set("can-load-poster", event);
		this.#satisfyRequest("media-poster-start-loading", event);
	}
	["media-type-change"](event) {
		const sourceChangeEvent = this.#trackedEvents.get("source-change");
		if (sourceChangeEvent) event.triggers.add(sourceChangeEvent);
		const viewType = this.$state.viewType();
		this.$state.mediaType.set(event.detail);
		const providedViewType = this.$state.providedViewType(), currentViewType = providedViewType === "unknown" ? event.detail : providedViewType;
		if (viewType !== currentViewType) setTimeout(() => {
			requestAnimationFrame(() => {
				if (!this.scope) return;
				this.$state.inferredViewType.set(event.detail);
				this.dispatch("view-type-change", {
					detail: currentViewType,
					trigger: event
				});
			});
		}, 0);
	}
	["stream-type-change"](event) {
		const sourceChangeEvent = this.#trackedEvents.get("source-change");
		if (sourceChangeEvent) event.triggers.add(sourceChangeEvent);
		const { streamType, inferredStreamType } = this.$state;
		inferredStreamType.set(event.detail);
		event.detail = streamType();
	}
	["rate-change"](event) {
		const { storage } = this.#media, { canPlay } = this.$state;
		this.$state.playbackRate.set(event.detail);
		this.#satisfyRequest("media-rate-change-request", event);
		if (canPlay()) storage?.setPlaybackRate?.(event.detail);
	}
	["remote-playback-change"](event) {
		const { remotePlaybackState, remotePlaybackType } = this.$state, { type, state } = event.detail, isConnected = state === "connected";
		remotePlaybackType.set(type);
		remotePlaybackState.set(state);
		const key = type === "airplay" ? "media-airplay-request" : "media-google-cast-request";
		if (isConnected) this.#satisfyRequest(key, event);
		else {
			const requestEvent = this.#request.queue.peek(key);
			if (requestEvent) {
				event.request = requestEvent;
				event.triggers.add(requestEvent);
			}
		}
	}
	["sources-change"](event) {
		const prevSources = this.$state.sources(), newSources = event.detail;
		this.$state.sources.set(newSources);
		this.#onSourceQualitiesChange(prevSources, newSources, event);
	}
	#onSourceQualitiesChange(prevSources, newSources, trigger) {
		let { qualities } = this.#media, added = false, removed = false;
		for (const prevSrc of prevSources) {
			if (!isVideoQualitySrc(prevSrc)) continue;
			if (!newSources.some((s) => s.src === prevSrc.src)) {
				const quality = qualities.getBySrc(prevSrc.src);
				if (quality) {
					qualities[ListSymbol.remove](quality, trigger);
					removed = true;
				}
			}
		}
		if (removed && !qualities.length) {
			this.$state.savedState.set(null);
			qualities[ListSymbol.reset](trigger);
		}
		for (const src of newSources) {
			if (!isVideoQualitySrc(src) || qualities.getBySrc(src.src)) continue;
			const quality = {
				id: src.id ?? src.height + "p",
				bitrate: null,
				codec: null,
				...src,
				selected: false
			};
			qualities[ListSymbol.add](quality, trigger);
			added = true;
		}
		if (added && !qualities[QualitySymbol.enableAuto]) {
			this.#watchQualityResize();
			qualities[QualitySymbol.enableAuto] = this.#watchQualityResize.bind(this);
			qualities[QualitySymbol.setAuto](true, trigger);
		}
	}
	["source-change"](event) {
		event.isQualityChange = event.originEvent?.type === "quality-change";
		const source = event.detail;
		this.#resetMediaState(event, event.isQualityChange);
		this.#trackedEvents.set(event.type, event);
		this.$state.source.set(source);
		this.el?.setAttribute("aria-busy", "true");
		this.#media.logger?.infoGroup("📼 Media source change").labelledLog("Source", source).dispatch();
	}
	#resetMediaState(event, isSourceQualityChange = false) {
		const { audioTracks, qualities } = this.#media;
		if (!isSourceQualityChange) {
			this.#playedIntervals = [];
			this.#playedInterval = [-1, -1];
			audioTracks[ListSymbol.reset](event);
			qualities[ListSymbol.reset](event);
			softResetMediaState(this.$state, isSourceQualityChange);
			this.#resetTracking();
			return;
		}
		softResetMediaState(this.$state, isSourceQualityChange);
		this.#resetTracking();
	}
	["abort"](event) {
		const sourceChangeEvent = this.#trackedEvents.get("source-change");
		if (sourceChangeEvent) event.triggers.add(sourceChangeEvent);
		const canLoadEvent = this.#trackedEvents.get("can-load");
		if (canLoadEvent && !event.triggers.hasType("can-load")) event.triggers.add(canLoadEvent);
	}
	["load-start"](event) {
		const sourceChangeEvent = this.#trackedEvents.get("source-change");
		if (sourceChangeEvent) event.triggers.add(sourceChangeEvent);
	}
	["error"](event) {
		this.$state.error.set(event.detail);
		const abortEvent = this.#trackedEvents.get("abort");
		if (abortEvent) event.triggers.add(abortEvent);
		this.#media.logger?.errorGroup("Media Error").labelledLog("Error", event.detail).labelledLog("Event", event).labelledLog("Context", this.#media).dispatch();
	}
	["loaded-metadata"](event) {
		const loadStartEvent = this.#trackedEvents.get("load-start");
		if (loadStartEvent) event.triggers.add(loadStartEvent);
	}
	["loaded-data"](event) {
		const loadStartEvent = this.#trackedEvents.get("load-start");
		if (loadStartEvent) event.triggers.add(loadStartEvent);
	}
	["can-play"](event) {
		const loadedMetadata = this.#trackedEvents.get("loaded-metadata");
		if (loadedMetadata) event.triggers.add(loadedMetadata);
		this.#onCanPlayDetail(event.detail);
		this.el?.setAttribute("aria-busy", "false");
	}
	["can-play-through"](event) {
		this.#onCanPlayDetail(event.detail);
		const canPlay = this.#trackedEvents.get("can-play");
		if (canPlay) event.triggers.add(canPlay);
	}
	#onCanPlayDetail(detail) {
		const { seekable, buffered, intrinsicDuration, canPlay } = this.$state;
		canPlay.set(true);
		buffered.set(detail.buffered);
		seekable.set(detail.seekable);
		const seekableEnd = getTimeRangesEnd(detail.seekable) ?? Infinity;
		intrinsicDuration.set(seekableEnd);
	}
	["duration-change"](event) {
		const { live, intrinsicDuration, providedDuration, clipEndTime, ended } = this.$state, time = event.detail;
		if (!live()) {
			const duration = !Number.isNaN(time) ? time : 0;
			intrinsicDuration.set(duration);
			if (ended()) this.#onEndPrecisionChange(event);
		}
		if (providedDuration() > 0 || clipEndTime() > 0) event.stopImmediatePropagation();
	}
	["progress"](event) {
		const { buffered, seekable } = this.$state, { buffered: newBuffered, seekable: newSeekable } = event.detail, newBufferedEnd = getTimeRangesEnd(newBuffered), hasBufferedLengthChanged = newBuffered.length !== buffered().length, hasBufferedEndChanged = newBufferedEnd !== getTimeRangesEnd(buffered()), newSeekableEnd = getTimeRangesEnd(newSeekable), hasSeekableLengthChanged = newSeekable.length !== seekable().length, hasSeekableEndChanged = newSeekableEnd !== getTimeRangesEnd(seekable());
		if (hasBufferedLengthChanged || hasBufferedEndChanged) buffered.set(newBuffered);
		if (hasSeekableLengthChanged || hasSeekableEndChanged) seekable.set(newSeekable);
	}
	["play"](event) {
		const { paused, autoPlayError, ended, autoPlaying, playsInline, pointer, muted, viewType, live, userBehindLiveEdge } = this.$state;
		this.#resetPlaybackIfNeeded();
		if (!paused()) {
			event.stopImmediatePropagation();
			return;
		}
		event.autoPlay = autoPlaying();
		const waitingEvent = this.#trackedEvents.get("waiting");
		if (waitingEvent) event.triggers.add(waitingEvent);
		this.#satisfyRequest("media-play-request", event);
		this.#trackedEvents.set("play", event);
		paused.set(false);
		autoPlayError.set(null);
		if (event.autoPlay) {
			this.handle(this.createEvent("auto-play", {
				detail: { muted: muted() },
				trigger: event
			}));
			autoPlaying.set(false);
		}
		if (ended() || this.#request.replaying) {
			this.#request.replaying = false;
			ended.set(false);
			this.handle(this.createEvent("replay", { trigger: event }));
		}
		if (!playsInline() && viewType() === "video" && pointer() === "coarse") this.#media.remote.enterFullscreen("prefer-media", event);
		if (live() && !userBehindLiveEdge()) this.#media.remote.seekToLiveEdge(event);
	}
	#resetPlaybackIfNeeded(trigger) {
		if (!peek(this.#media.$provider)) return;
		const { ended, seekableStart, clipEndTime, currentTime, realCurrentTime, duration } = this.$state;
		const shouldReset = ended() || realCurrentTime() < seekableStart() || clipEndTime() > 0 && realCurrentTime() >= clipEndTime() || Math.abs(currentTime() - duration()) < .1;
		if (shouldReset) this.dispatch("media-seek-request", {
			detail: seekableStart(),
			trigger
		});
		return shouldReset;
	}
	["play-fail"](event) {
		const { muted, autoPlaying } = this.$state;
		const playEvent = this.#trackedEvents.get("play");
		if (playEvent) event.triggers.add(playEvent);
		this.#satisfyRequest("media-play-request", event);
		const { paused, playing } = this.$state;
		paused.set(true);
		playing.set(false);
		this.#resetTracking();
		this.#trackedEvents.set("play-fail", event);
		if (event.autoPlay) {
			this.handle(this.createEvent("auto-play-fail", {
				detail: {
					muted: muted(),
					error: event.detail
				},
				trigger: event
			}));
			autoPlaying.set(false);
		}
	}
	["playing"](event) {
		const playEvent = this.#trackedEvents.get("play"), seekedEvent = this.#trackedEvents.get("seeked");
		if (playEvent) event.triggers.add(playEvent);
		else if (seekedEvent) event.triggers.add(seekedEvent);
		setTimeout(() => this.#resetTracking(), 0);
		const { paused, playing, live, liveSyncPosition, seekableEnd, started, currentTime, seeking, ended } = this.$state;
		paused.set(false);
		playing.set(true);
		seeking.set(false);
		ended.set(false);
		if (this.#request.looping) {
			this.#request.looping = false;
			return;
		}
		if (live() && !started() && currentTime() === 0) {
			const end = liveSyncPosition() ?? seekableEnd() - 2;
			if (Number.isFinite(end)) this.#media.$provider().setCurrentTime(end);
		}
		this["started"](event);
	}
	["started"](event) {
		const { started } = this.$state;
		if (!started()) {
			started.set(true);
			this.handle(this.createEvent("started", { trigger: event }));
		}
	}
	["pause"](event) {
		if (!this.el?.isConnected) this.#isPlayingOnDisconnect = true;
		this.#satisfyRequest("media-pause-request", event);
		const seekedEvent = this.#trackedEvents.get("seeked");
		if (seekedEvent) event.triggers.add(seekedEvent);
		const { paused, playing } = this.$state;
		paused.set(true);
		playing.set(false);
		if (this.#clipEnded) setTimeout(() => {
			this.handle(this.createEvent("end", { trigger: event }));
			this.#clipEnded = false;
		}, 0);
		this.#resetTracking();
	}
	["time-change"](event) {
		if (this.#request.looping) {
			event.stopImmediatePropagation();
			return;
		}
		let { waiting, played, clipEndTime, realCurrentTime, currentTime } = this.$state, newTime = event.detail, endTime = clipEndTime();
		realCurrentTime.set(newTime);
		this.#updatePlayed();
		waiting.set(false);
		for (const track of this.#media.textTracks) track[TextTrackSymbol.updateActiveCues](newTime, event);
		if (endTime > 0 && newTime >= endTime) {
			this.#clipEnded = true;
			this.dispatch("media-pause-request", { trigger: event });
		}
		this.#saveTime();
		this.dispatch("time-update", {
			detail: {
				currentTime: currentTime(),
				played: played()
			},
			trigger: event
		});
	}
	#updatePlayed() {
		const { currentTime, played, paused } = this.$state;
		if (paused()) return;
		this.#playedInterval = updateTimeIntervals(this.#playedIntervals, this.#playedInterval, currentTime());
		played.set(new TimeRange(this.#playedIntervals));
	}
	#onEndPrecisionChange(trigger) {
		const { clipStartTime, clipEndTime, duration } = this.$state;
		if (clipStartTime() > 0 || clipEndTime() > 0) return;
		this.handle(this.createEvent("time-change", {
			detail: duration(),
			trigger
		}));
	}
	#saveTime() {
		const { storage } = this.#media, { canPlay, realCurrentTime } = this.$state;
		if (canPlay()) storage?.setTime?.(realCurrentTime());
	}
	["audio-gain-change"](event) {
		const { storage } = this.#media, { canPlay, audioGain } = this.$state;
		audioGain.set(event.detail);
		this.#satisfyRequest("media-audio-gain-change-request", event);
		if (canPlay()) storage?.setAudioGain?.(audioGain());
	}
	["volume-change"](event) {
		const { storage } = this.#media, { volume, muted, canPlay } = this.$state, detail = event.detail;
		volume.set(detail.volume);
		muted.set(detail.muted || detail.volume === 0);
		this.#satisfyRequest("media-volume-change-request", event);
		this.#satisfyRequest(detail.muted ? "media-mute-request" : "media-unmute-request", event);
		if (canPlay()) {
			storage?.setVolume?.(volume());
			storage?.setMuted?.(muted());
		}
	}
	["seeking"] = functionThrottle((event) => {
		const { seeking, realCurrentTime, paused } = this.$state;
		seeking.set(true);
		realCurrentTime.set(event.detail);
		this.#satisfyRequest("media-seeking-request", event);
		if (paused()) {
			this.#waitingTrigger = event;
			this.#fireWaiting();
		}
		this.#playedInterval = [-1, -1];
	}, 150, { leading: true });
	["seeked"](event) {
		const { seeking, currentTime, realCurrentTime, paused, seekableEnd, ended, live } = this.$state;
		if (this.#request.seeking) {
			seeking.set(true);
			event.stopImmediatePropagation();
		} else if (seeking()) {
			const waitingEvent = this.#trackedEvents.get("waiting");
			if (waitingEvent) event.triggers.add(waitingEvent);
			const seekingEvent = this.#trackedEvents.get("seeking");
			if (seekingEvent && !event.triggers.has(seekingEvent)) event.triggers.add(seekingEvent);
			if (paused()) this.#stopWaiting();
			seeking.set(false);
			realCurrentTime.set(event.detail);
			this.#satisfyRequest("media-seek-request", event);
			const origin = event?.originEvent;
			if (origin?.isTrusted && !(origin instanceof MessageEvent) && !/seek/.test(origin.type)) this["started"](event);
		}
		if (!live()) if (Math.floor(currentTime()) !== Math.floor(seekableEnd())) ended.set(false);
		else this.end(event);
	}
	["waiting"](event) {
		if (this.#firingWaiting || this.#request.seeking) return;
		event.stopImmediatePropagation();
		this.#waitingTrigger = event;
		this.#fireWaiting();
	}
	#fireWaiting = functionDebounce(() => {
		if (!this.#waitingTrigger) return;
		this.#firingWaiting = true;
		const { waiting, playing } = this.$state;
		waiting.set(true);
		playing.set(false);
		const event = this.createEvent("waiting", { trigger: this.#waitingTrigger });
		this.#trackedEvents.set("waiting", event);
		this.dispatch(event);
		this.#waitingTrigger = void 0;
		this.#firingWaiting = false;
	}, 300);
	["end"](event) {
		const { loop, ended } = this.$state;
		if (!loop() && ended()) return;
		if (loop()) {
			setTimeout(() => {
				requestAnimationFrame(() => {
					this.#resetPlaybackIfNeeded(event);
					this.dispatch("media-loop-request", { trigger: event });
				});
			}, 10);
			return;
		}
		setTimeout(() => this.#onEnded(event), 0);
	}
	#onEnded(event) {
		const { storage } = this.#media, { paused, seeking, ended, duration } = this.$state;
		this.#onEndPrecisionChange(event);
		if (!paused()) this.dispatch("pause", { trigger: event });
		if (seeking()) this.dispatch("seeked", {
			detail: duration(),
			trigger: event
		});
		ended.set(true);
		this.#resetTracking();
		storage?.setTime?.(duration(), true);
		this.dispatch("ended", { trigger: event });
	}
	#stopWaiting() {
		this.#fireWaiting.cancel();
		this.$state.waiting.set(false);
	}
	["fullscreen-change"](event) {
		const isFullscreen = event.detail;
		this.$state.fullscreen.set(isFullscreen);
		this.#satisfyRequest(isFullscreen ? "media-enter-fullscreen-request" : "media-exit-fullscreen-request", event);
	}
	["fullscreen-error"](event) {
		this.#satisfyRequest("media-enter-fullscreen-request", event);
		this.#satisfyRequest("media-exit-fullscreen-request", event);
	}
	["orientation-change"](event) {
		const isLocked = event.detail.lock;
		this.#satisfyRequest(isLocked ? "media-orientation-lock-request" : "media-orientation-unlock-request", event);
	}
	["picture-in-picture-change"](event) {
		const isPiP = event.detail;
		this.$state.pictureInPicture.set(isPiP);
		this.#satisfyRequest(isPiP ? "media-enter-pip-request" : "media-exit-pip-request", event);
	}
	["picture-in-picture-error"](event) {
		this.#satisfyRequest("media-enter-pip-request", event);
		this.#satisfyRequest("media-exit-pip-request", event);
	}
	["title-change"](event) {
		if (!event.trigger) return;
		event.stopImmediatePropagation();
		this.$state.inferredTitle.set(event.detail);
	}
	["poster-change"](event) {
		if (!event.trigger) return;
		event.stopImmediatePropagation();
		this.$state.inferredPoster.set(event.detail);
	}
};

//#endregion
//#region src/core/state/media-state-sync.ts
init_dev();
/**
* Sync player props with internal store and dispatch change events.
*/
var MediaStateSync = class extends MediaPlayerController {
	onSetup() {
		this.#init();
		effect(this.#watchLogLevel.bind(this));
		const effects = [
			this.#watchMetadata,
			this.#watchAutoplay,
			this.#watchClipStartTime,
			this.#watchClipEndTime,
			this.#watchControls,
			this.#watchCrossOrigin,
			this.#watchDuration,
			this.#watchLive,
			this.#watchLiveEdge,
			this.#watchLiveTolerance,
			this.#watchLoop,
			this.#watchPlaysInline,
			this.#watchPoster,
			this.#watchProvidedTypes,
			this.#watchTitle
		];
		for (const callback of effects) effect(callback.bind(this));
	}
	#init() {
		const providedProps = {
			duration: "providedDuration",
			loop: "providedLoop",
			poster: "providedPoster",
			streamType: "providedStreamType",
			title: "providedTitle",
			viewType: "providedViewType"
		};
		const skip = new Set([
			"currentTime",
			"paused",
			"playbackRate",
			"volume"
		]);
		for (const prop of Object.keys(this.$props)) {
			if (skip.has(prop)) continue;
			this.$state[providedProps[prop] ?? prop]?.set(this.$props[prop]());
		}
		this.$state.muted.set(this.$props.muted() || this.$props.volume() === 0);
	}
	#watchProvidedTypes() {
		const { viewType, streamType, title, poster, loop } = this.$props, $state = this.$state;
		$state.providedPoster.set(poster());
		$state.providedStreamType.set(streamType());
		$state.providedViewType.set(viewType());
		$state.providedTitle.set(title());
		$state.providedLoop.set(loop());
	}
	#watchLogLevel() {
		this.$state.logLevel.set(this.$props.logLevel());
	}
	#watchMetadata() {
		const { artist, artwork } = this.$props;
		this.$state.artist.set(artist());
		this.$state.artwork.set(artwork());
	}
	#watchTitle() {
		const { title } = this.$state;
		this.dispatch("title-change", { detail: title() });
	}
	#watchAutoplay() {
		const autoPlay = this.$props.autoPlay() || this.$props.autoplay();
		this.$state.autoPlay.set(autoPlay);
		this.dispatch("auto-play-change", { detail: autoPlay });
	}
	#watchLoop() {
		const loop = this.$state.loop();
		this.dispatch("loop-change", { detail: loop });
	}
	#watchControls() {
		const controls = this.$props.controls();
		this.$state.controls.set(controls);
	}
	#watchPoster() {
		const { poster } = this.$state;
		this.dispatch("poster-change", { detail: poster() });
	}
	#watchCrossOrigin() {
		const crossOrigin = this.$props.crossOrigin() ?? this.$props.crossorigin(), value = crossOrigin === true ? "" : crossOrigin;
		this.$state.crossOrigin.set(value);
	}
	#watchDuration() {
		const { duration } = this.$props;
		this.dispatch("media-duration-change-request", { detail: duration() });
	}
	#watchPlaysInline() {
		const inline = this.$props.playsInline() || this.$props.playsinline();
		this.$state.playsInline.set(inline);
		this.dispatch("plays-inline-change", { detail: inline });
	}
	#watchClipStartTime() {
		const { clipStartTime } = this.$props;
		this.dispatch("media-clip-start-change-request", { detail: clipStartTime() });
	}
	#watchClipEndTime() {
		const { clipEndTime } = this.$props;
		this.dispatch("media-clip-end-change-request", { detail: clipEndTime() });
	}
	#watchLive() {
		this.dispatch("live-change", { detail: this.$state.live() });
	}
	#watchLiveTolerance() {
		this.$state.liveEdgeTolerance.set(this.$props.liveEdgeTolerance());
		this.$state.minLiveDVRWindow.set(this.$props.minLiveDVRWindow());
	}
	#watchLiveEdge() {
		this.dispatch("live-edge-change", { detail: this.$state.liveEdge() });
	}
};

//#endregion
//#region src/utils/storage.ts
/**
* A safe wrapper around `localStorage` for environments where it's not available. In some
* mobile WebViews (or when the user has disabled storage) `localStorage` can be `null` or throw
* on access, which would otherwise crash the player.
*
* @see {@link https://github.com/vidstack/player/issues/1444}
*/
const LocalStorage = {
	getItem(key) {
		try {
			return localStorage.getItem(key);
		} catch {
			return null;
		}
	},
	setItem(key, value) {
		try {
			localStorage.setItem(key, value);
		} catch {}
	},
	removeItem(key) {
		try {
			localStorage.removeItem(key);
		} catch {}
	}
};

//#endregion
//#region src/core/state/media-storage.ts
var LocalMediaStorage = class {
	playerId = "vds-player";
	mediaId = null;
	#data = {
		volume: null,
		muted: null,
		audioGain: null,
		time: null,
		lang: null,
		captions: null,
		rate: null,
		quality: null
	};
	async getVolume() {
		return this.#data.volume;
	}
	async setVolume(volume) {
		this.#data.volume = volume;
		this.save();
	}
	async getMuted() {
		return this.#data.muted;
	}
	async setMuted(muted) {
		this.#data.muted = muted;
		this.save();
	}
	async getTime() {
		return this.#data.time;
	}
	async setTime(time, ended) {
		const shouldClear = time < 0;
		this.#data.time = !shouldClear ? time : null;
		if (shouldClear || ended) this.saveTime();
		else this.saveTimeThrottled();
	}
	async getLang() {
		return this.#data.lang;
	}
	async setLang(lang) {
		this.#data.lang = lang;
		this.save();
	}
	async getCaptions() {
		return this.#data.captions;
	}
	async setCaptions(enabled) {
		this.#data.captions = enabled;
		this.save();
	}
	async getPlaybackRate() {
		return this.#data.rate;
	}
	async setPlaybackRate(rate) {
		this.#data.rate = rate;
		this.save();
	}
	async getAudioGain() {
		return this.#data.audioGain;
	}
	async setAudioGain(gain) {
		this.#data.audioGain = gain;
		this.save();
	}
	async getVideoQuality() {
		return this.#data.quality;
	}
	async setVideoQuality(quality) {
		this.#data.quality = quality;
		this.save();
	}
	onChange(src, mediaId, playerId = "vds-player") {
		const savedData = playerId ? LocalStorage.getItem(playerId) : null, savedTime = mediaId ? LocalStorage.getItem(mediaId) : null;
		this.playerId = playerId;
		this.mediaId = mediaId;
		this.#data = {
			volume: null,
			muted: null,
			audioGain: null,
			lang: null,
			captions: null,
			rate: null,
			quality: null,
			...savedData ? JSON.parse(savedData) : {},
			time: savedTime ? +savedTime : null
		};
	}
	save() {
		if (!this.playerId) return;
		const data = JSON.stringify({
			...this.#data,
			time: void 0
		});
		LocalStorage.setItem(this.playerId, data);
	}
	saveTimeThrottled = functionThrottle(this.saveTime.bind(this), 1e3);
	saveTime() {
		if (!this.mediaId) return;
		const data = (this.#data.time ?? 0).toString();
		LocalStorage.setItem(this.mediaId, data);
	}
};

//#endregion
//#region src/core/state/navigator-media-session.ts
init_dev();
init_std();
const actions = [
	"play",
	"pause",
	"seekforward",
	"seekbackward",
	"seekto"
];
var NavigatorMediaSession = class extends MediaPlayerController {
	onConnect() {
		effect(this.#onMetadataChange.bind(this));
		effect(this.#onPlaybackStateChange.bind(this));
		const handleAction = this.#handleAction.bind(this);
		for (const action of actions) navigator.mediaSession.setActionHandler(action, handleAction);
		onDispose(this.#onDisconnect.bind(this));
	}
	#onDisconnect() {
		for (const action of actions) navigator.mediaSession.setActionHandler(action, null);
	}
	#onMetadataChange() {
		const { title, artist, artwork, poster } = this.$state;
		navigator.mediaSession.metadata = new MediaMetadata({
			title: title(),
			artist: artist(),
			artwork: artwork() ?? [{ src: poster() }]
		});
	}
	#onPlaybackStateChange() {
		const { canPlay, paused } = this.$state;
		navigator.mediaSession.playbackState = !canPlay() ? "none" : paused() ? "paused" : "playing";
	}
	#handleAction(details) {
		const trigger = new DOMEvent(`media-session-action`, { detail: details });
		switch (details.action) {
			case "play":
				this.dispatch("media-play-request", { trigger });
				break;
			case "pause":
				this.dispatch("media-pause-request", { trigger });
				break;
			case "seekto":
			case "seekforward":
			case "seekbackward":
				this.dispatch("media-seek-request", {
					detail: isNumber(details.seekTime) ? details.seekTime : this.$state.currentTime() + (details.seekOffset ?? (details.action === "seekforward" ? 10 : -10)),
					trigger
				});
				break;
		}
	}
};

//#endregion
//#region src/foundation/logger/grouped-log.ts
const GROUPED_LOG = Symbol("GROUPED_LOG");
var GroupedLog = class GroupedLog {
	logger;
	level;
	title;
	root;
	parent;
	[GROUPED_LOG] = true;
	logs = [];
	constructor(logger, level, title, root, parent) {
		this.logger = logger;
		this.level = level;
		this.title = title;
		this.root = root;
		this.parent = parent;
	}
	log(...data) {
		this.logs.push({ data });
		return this;
	}
	labelledLog(label, ...data) {
		this.logs.push({
			label,
			data
		});
		return this;
	}
	groupStart(title) {
		return new GroupedLog(this.logger, this.level, title, this.root ?? this, this);
	}
	groupEnd() {
		this.parent?.logs.push(this);
		return this.parent ?? this;
	}
	dispatch() {
		return this.logger.dispatch(this.level, this.root ?? this);
	}
};
function isGroupedLog(data) {
	return !!data?.[GROUPED_LOG];
}

//#endregion
//#region src/foundation/logger/controller.ts
init_std();
var Logger = class {
	#target = null;
	error(...data) {
		return this.dispatch("error", ...data);
	}
	warn(...data) {
		return this.dispatch("warn", ...data);
	}
	info(...data) {
		return this.dispatch("info", ...data);
	}
	debug(...data) {
		return this.dispatch("debug", ...data);
	}
	errorGroup(title) {
		return new GroupedLog(this, "error", title);
	}
	warnGroup(title) {
		return new GroupedLog(this, "warn", title);
	}
	infoGroup(title) {
		return new GroupedLog(this, "info", title);
	}
	debugGroup(title) {
		return new GroupedLog(this, "debug", title);
	}
	setTarget(newTarget) {
		this.#target = newTarget;
	}
	dispatch(level, ...data) {
		return this.#target?.dispatchEvent(new DOMEvent("vds-log", {
			bubbles: true,
			composed: true,
			detail: {
				level,
				data
			}
		})) || false;
	}
};

//#endregion
//#region src/core/state/remote-control.ts
init_dev();
init_std();
init_text_track();
/**
* A simple facade for dispatching media requests to the nearest media player element.
*
* @docs {@link https://www.vidstack.io/docs/player/core-concepts/state-management#updating}
*
*/
var MediaRemoteControl = class {
	#target = null;
	#player = null;
	#prevTrackIndex = -1;
	#logger;
	constructor(logger = new Logger()) {
		this.#logger = logger;
	}
	/**
	* Set the target from which to dispatch media requests events from. The events should bubble
	* up from this target to the player element.
	*
	* @example
	* ```ts
	* const button = document.querySelector('button');
	* remote.setTarget(button);
	* ```
	*/
	setTarget(target) {
		this.#target = target;
		this.#logger?.setTarget(target);
	}
	/**
	* Returns the current player element. This method will attempt to find the player by
	* searching up from either the given `target` or default target set via `remote.setTarget`.
	*
	* @example
	* ```ts
	* const player = remote.getPlayer();
	* ```
	*/
	getPlayer(target) {
		if (this.#player) return this.#player;
		(target ?? this.#target)?.dispatchEvent(new DOMEvent("find-media-player", {
			detail: (player) => void (this.#player = player),
			bubbles: true,
			composed: true
		}));
		return this.#player;
	}
	/**
	* Set the current player element so the remote can support toggle methods such as
	* `togglePaused` as they rely on the current media state.
	*/
	setPlayer(player) {
		this.#player = player;
	}
	/**
	* Dispatch a request to start the media loading process. This will only work if the media
	* player has been initialized with a custom loading strategy `load="custom">`.
	*
	* @docs {@link https://www.vidstack.io/docs/player/core-concepts/loading#load-strategies}
	*/
	startLoading(trigger) {
		this.#dispatchRequest("media-start-loading", trigger);
	}
	/**
	* Dispatch a request to start the poster loading process. This will only work if the media
	* player has been initialized with a custom poster loading strategy `posterLoad="custom">`.
	*
	* @docs {@link https://www.vidstack.io/docs/player/core-concepts/loading#load-strategies}
	*/
	startLoadingPoster(trigger) {
		this.#dispatchRequest("media-poster-start-loading", trigger);
	}
	/**
	* Dispatch a request to connect to AirPlay.
	*
	* @see {@link https://www.apple.com/au/airplay}
	*/
	requestAirPlay(trigger) {
		this.#dispatchRequest("media-airplay-request", trigger);
	}
	/**
	* Dispatch a request to connect to Google Cast.
	*
	* @see {@link https://developers.google.com/cast/docs/overview}
	*/
	requestGoogleCast(trigger) {
		this.#dispatchRequest("media-google-cast-request", trigger);
	}
	/**
	* Dispatch a request to begin/resume media playback.
	*/
	play(trigger) {
		this.#dispatchRequest("media-play-request", trigger);
	}
	/**
	* Dispatch a request to pause media playback.
	*/
	pause(trigger) {
		this.#dispatchRequest("media-pause-request", trigger);
	}
	/**
	* Dispatch a request to set the media volume to mute (0).
	*/
	mute(trigger) {
		this.#dispatchRequest("media-mute-request", trigger);
	}
	/**
	* Dispatch a request to unmute the media volume and set it back to it's previous state.
	*/
	unmute(trigger) {
		this.#dispatchRequest("media-unmute-request", trigger);
	}
	/**
	* Dispatch a request to enter fullscreen.
	*
	* @docs {@link https://www.vidstack.io/docs/player/api/fullscreen#remote-control}
	*/
	enterFullscreen(target, trigger) {
		this.#dispatchRequest("media-enter-fullscreen-request", trigger, target);
	}
	/**
	* Dispatch a request to exit fullscreen.
	*
	* @docs {@link https://www.vidstack.io/docs/player/api/fullscreen#remote-control}
	*/
	exitFullscreen(target, trigger) {
		this.#dispatchRequest("media-exit-fullscreen-request", trigger, target);
	}
	/**
	* Dispatch a request to lock the screen orientation.
	*
	* @docs {@link https://www.vidstack.io/docs/player/screen-orientation#remote-control}
	*/
	lockScreenOrientation(lockType, trigger) {
		this.#dispatchRequest("media-orientation-lock-request", trigger, lockType);
	}
	/**
	* Dispatch a request to unlock the screen orientation.
	*
	* @docs {@link https://www.vidstack.io/docs/player/api/screen-orientation#remote-control}
	*/
	unlockScreenOrientation(trigger) {
		this.#dispatchRequest("media-orientation-unlock-request", trigger);
	}
	/**
	* Dispatch a request to enter picture-in-picture mode.
	*
	* @docs {@link https://www.vidstack.io/docs/player/api/picture-in-picture#remote-control}
	*/
	enterPictureInPicture(trigger) {
		this.#dispatchRequest("media-enter-pip-request", trigger);
	}
	/**
	* Dispatch a request to exit picture-in-picture mode.
	*
	* @docs {@link https://www.vidstack.io/docs/player/api/picture-in-picture#remote-control}
	*/
	exitPictureInPicture(trigger) {
		this.#dispatchRequest("media-exit-pip-request", trigger);
	}
	/**
	* Notify the media player that a seeking process is happening and to seek to the given `time`.
	*/
	seeking(time, trigger) {
		this.#dispatchRequest("media-seeking-request", trigger, time);
	}
	/**
	* Notify the media player that a seeking operation has completed and to seek to the given `time`.
	* This is generally called after a series of `remote.seeking()` calls.
	*/
	seek(time, trigger) {
		this.#dispatchRequest("media-seek-request", trigger, time);
	}
	seekToLiveEdge(trigger) {
		this.#dispatchRequest("media-live-edge-request", trigger);
	}
	/**
	* Dispatch a request to update the length of the media in seconds.
	*
	* @example
	* ```ts
	* remote.changeDuration(100); // 100 seconds
	* ```
	*/
	changeDuration(duration, trigger) {
		this.#dispatchRequest("media-duration-change-request", trigger, duration);
	}
	/**
	* Dispatch a request to update the clip start time. This is the time at which media playback
	* should start at.
	*
	* @example
	* ```ts
	* remote.changeClipStart(100); // start at 100 seconds
	* ```
	*/
	changeClipStart(startTime, trigger) {
		this.#dispatchRequest("media-clip-start-change-request", trigger, startTime);
	}
	/**
	* Dispatch a request to update the clip end time. This is the time at which media playback
	* should end at.
	*
	* @example
	* ```ts
	* remote.changeClipEnd(100); // end at 100 seconds
	* ```
	*/
	changeClipEnd(endTime, trigger) {
		this.#dispatchRequest("media-clip-end-change-request", trigger, endTime);
	}
	/**
	* Dispatch a request to update the media volume to the given `volume` level which is a value
	* between 0 and 1.
	*
	* @docs {@link https://www.vidstack.io/docs/player/api/audio-gain#remote-control}
	* @example
	* ```ts
	* remote.changeVolume(0); // 0%
	* remote.changeVolume(0.05); // 5%
	* remote.changeVolume(0.5); // 50%
	* remote.changeVolume(0.75); // 70%
	* remote.changeVolume(1); // 100%
	* ```
	*/
	changeVolume(volume, trigger) {
		this.#dispatchRequest("media-volume-change-request", trigger, Math.max(0, Math.min(1, volume)));
	}
	/**
	* Dispatch a request to change the current audio track.
	*
	* @example
	* ```ts
	* remote.changeAudioTrack(1); // track at index 1
	* ```
	*/
	changeAudioTrack(index, trigger) {
		this.#dispatchRequest("media-audio-track-change-request", trigger, index);
	}
	/**
	* Dispatch a request to change the video quality. The special value `-1` represents auto quality
	* selection.
	*
	* @example
	* ```ts
	* remote.changeQuality(-1); // auto
	* remote.changeQuality(1); // quality at index 1
	* ```
	*/
	changeQuality(index, trigger) {
		this.#dispatchRequest("media-quality-change-request", trigger, index);
	}
	/**
	* Request auto quality selection.
	*/
	requestAutoQuality(trigger) {
		this.changeQuality(-1, trigger);
	}
	/**
	* Dispatch a request to change the mode of the text track at the given index.
	*
	* @example
	* ```ts
	* remote.changeTextTrackMode(1, 'showing'); // track at index 1
	* ```
	*/
	changeTextTrackMode(index, mode, trigger) {
		this.#dispatchRequest("media-text-track-change-request", trigger, {
			index,
			mode
		});
	}
	/**
	* Dispatch a request to change the media playback rate.
	*
	* @example
	* ```ts
	* remote.changePlaybackRate(0.5); // Half the normal speed
	* remote.changePlaybackRate(1); // Normal speed
	* remote.changePlaybackRate(1.5); // 50% faster than normal
	* remote.changePlaybackRate(2); // Double the normal speed
	* ```
	*/
	changePlaybackRate(rate, trigger) {
		this.#dispatchRequest("media-rate-change-request", trigger, rate);
	}
	/**
	* Dispatch a request to change the media audio gain.
	*
	* @example
	* ```ts
	* remote.changeAudioGain(1); // Disable audio gain
	* remote.changeAudioGain(1.5); // 50% louder
	* remote.changeAudioGain(2); // 100% louder
	* ```
	*/
	changeAudioGain(gain, trigger) {
		this.#dispatchRequest("media-audio-gain-change-request", trigger, gain);
	}
	/**
	* Dispatch a request to resume idle tracking on controls.
	*/
	resumeControls(trigger) {
		this.#dispatchRequest("media-resume-controls-request", trigger);
	}
	/**
	* Dispatch a request to pause controls idle tracking. Pausing tracking will result in the
	* controls being visible until `remote.resumeControls()` is called. This method
	* is generally used when building custom controls and you'd like to prevent the UI from
	* disappearing.
	*
	* @example
	* ```ts
	* // Prevent controls hiding while menu is being interacted with.
	* function onSettingsOpen() {
	*   remote.pauseControls();
	* }
	*
	* function onSettingsClose() {
	*   remote.resumeControls();
	* }
	* ```
	*/
	pauseControls(trigger) {
		this.#dispatchRequest("media-pause-controls-request", trigger);
	}
	/**
	* Dispatch a request to toggle the media playback state.
	*/
	togglePaused(trigger) {
		const player = this.getPlayer(trigger?.target);
		if (!player) {
			this.#noPlayerWarning(this.togglePaused.name);
			return;
		}
		if (player.state.paused) this.play(trigger);
		else this.pause(trigger);
	}
	/**
	* Dispatch a request to toggle the controls visibility.
	*/
	toggleControls(trigger) {
		const player = this.getPlayer(trigger?.target);
		if (!player) {
			this.#noPlayerWarning(this.toggleControls.name);
			return;
		}
		if (!player.controls.showing) player.controls.show(0, trigger);
		else player.controls.hide(0, trigger);
	}
	/**
	* Dispatch a request to toggle the media muted state.
	*/
	toggleMuted(trigger) {
		const player = this.getPlayer(trigger?.target);
		if (!player) {
			this.#noPlayerWarning(this.toggleMuted.name);
			return;
		}
		if (player.state.muted) this.unmute(trigger);
		else this.mute(trigger);
	}
	/**
	* Dispatch a request to toggle the media fullscreen state.
	*
	* @docs {@link https://www.vidstack.io/docs/player/api/fullscreen#remote-control}
	*/
	toggleFullscreen(target, trigger) {
		const player = this.getPlayer(trigger?.target);
		if (!player) {
			this.#noPlayerWarning(this.toggleFullscreen.name);
			return;
		}
		if (player.state.fullscreen) this.exitFullscreen(target, trigger);
		else this.enterFullscreen(target, trigger);
	}
	/**
	* Dispatch a request to toggle the media picture-in-picture mode.
	*
	* @docs {@link https://www.vidstack.io/docs/player/api/picture-in-picture#remote-control}
	*/
	togglePictureInPicture(trigger) {
		const player = this.getPlayer(trigger?.target);
		if (!player) {
			this.#noPlayerWarning(this.togglePictureInPicture.name);
			return;
		}
		if (player.state.pictureInPicture) this.exitPictureInPicture(trigger);
		else this.enterPictureInPicture(trigger);
	}
	/**
	* Show captions.
	*/
	showCaptions(trigger) {
		const player = this.getPlayer(trigger?.target);
		if (!player) {
			this.#noPlayerWarning(this.showCaptions.name);
			return;
		}
		let tracks = player.state.textTracks, index = this.#prevTrackIndex;
		if (!tracks[index] || !isTrackCaptionKind(tracks[index])) index = -1;
		if (index === -1) index = tracks.findIndex((track) => isTrackCaptionKind(track) && track.default);
		if (index === -1) index = tracks.findIndex((track) => isTrackCaptionKind(track));
		if (index >= 0) this.changeTextTrackMode(index, "showing", trigger);
		this.#prevTrackIndex = -1;
	}
	/**
	* Turn captions off.
	*/
	disableCaptions(trigger) {
		const player = this.getPlayer(trigger?.target);
		if (!player) {
			this.#noPlayerWarning(this.disableCaptions.name);
			return;
		}
		const tracks = player.state.textTracks, track = player.state.textTrack;
		if (track) {
			const index = tracks.indexOf(track);
			this.changeTextTrackMode(index, "disabled", trigger);
			this.#prevTrackIndex = index;
		}
	}
	/**
	* Dispatch a request to toggle the current captions mode.
	*/
	toggleCaptions(trigger) {
		const player = this.getPlayer(trigger?.target);
		if (!player) {
			this.#noPlayerWarning(this.toggleCaptions.name);
			return;
		}
		if (player.state.textTrack) this.disableCaptions();
		else this.showCaptions();
	}
	userPrefersLoopChange(prefersLoop, trigger) {
		this.#dispatchRequest("media-user-loop-change-request", trigger, prefersLoop);
	}
	#dispatchRequest(type, trigger, detail) {
		const request = new DOMEvent(type, {
			bubbles: true,
			composed: true,
			cancelable: true,
			detail,
			trigger
		});
		let target = trigger?.target || null;
		if (target && target instanceof Component) target = target.el;
		target = !target || target === document || target === window || target === document.body || this.#player?.el && target instanceof Node && !this.#player.el.contains(target) ? this.#target ?? this.getPlayer()?.el : target ?? this.#target;
		this.#logger?.debugGroup(`📨 dispatching \`${type}\``).labelledLog("Target", target).labelledLog("Player", this.#player).labelledLog("Request Event", request).labelledLog("Trigger Event", trigger).dispatch();
		if (this.#player) if (type === "media-play-request" && !this.#player.state.canLoad) target?.dispatchEvent(request);
		else this.#player.canPlayQueue.enqueue(type, () => target?.dispatchEvent(request));
		else target?.dispatchEvent(request);
	}
	#noPlayerWarning(method) {
		console.warn(`[vidstack] attempted to call \`MediaRemoteControl.${method}\`() that requires player but failed because remote could not find a parent player element from target`);
	}
};

//#endregion
//#region src/core/tracks/audio/audio-tracks.ts
/**
* @see {@link https://vidstack.io/docs/player/api/audio-tracks}
*/
var AudioTrackList = class extends SelectList {};

//#endregion
//#region src/core/tracks/text/render/native-text-renderer.ts
init_dom();
init_symbols$2();
var NativeTextRenderer = class {
	priority = 0;
	#display = true;
	#video = null;
	#track = null;
	#tracks = /* @__PURE__ */ new Set();
	canRender(_, video) {
		return !!video;
	}
	attach(video) {
		this.#video = video;
		if (video) video.textTracks.onchange = this.#onChange.bind(this);
	}
	addTrack(track) {
		this.#tracks.add(track);
		this.#attachTrack(track);
	}
	removeTrack(track) {
		track[TextTrackSymbol.native]?.remove?.();
		track[TextTrackSymbol.native] = null;
		this.#tracks.delete(track);
	}
	changeTrack(track) {
		const current = track?.[TextTrackSymbol.native];
		if (current && current.track.mode !== "showing") current.track.mode = "showing";
		this.#track = track;
	}
	setDisplay(display) {
		this.#display = display;
		this.#onChange();
	}
	detach() {
		if (this.#video) this.#video.textTracks.onchange = null;
		for (const track of this.#tracks) this.removeTrack(track);
		this.#tracks.clear();
		this.#video = null;
		this.#track = null;
	}
	#attachTrack(track) {
		if (!this.#video) return;
		const el = track[TextTrackSymbol.native] ??= this.#createTrackElement(track);
		if (isHTMLElement(el)) {
			this.#video.append(el);
			el.track.mode = el.default ? "showing" : "disabled";
		}
	}
	#createTrackElement(track) {
		const el = document.createElement("track"), isDefault = track.default || track.mode === "showing", isSupported = track.src && track.type === "vtt";
		el.id = track.id;
		el.src = isSupported ? track.src : "";
		el.label = track.label;
		el.kind = track.kind;
		el.default = isDefault;
		track.language && (el.srclang = track.language);
		if (isDefault && !isSupported) this.#copyCues(track, el.track);
		return el;
	}
	#copyCues(track, native) {
		if (track.src && track.type === "vtt" || native.cues?.length) return;
		for (const cue of track.cues) native.addCue(cue);
	}
	#onChange(event) {
		for (const track of this.#tracks) {
			const native = track[TextTrackSymbol.native];
			if (!native) continue;
			if (!this.#display) {
				native.track.mode = native.managed ? "hidden" : "disabled";
				continue;
			}
			const isShowing = native.track.mode === "showing";
			if (isShowing) this.#copyCues(track, native.track);
			track.setMode(isShowing ? "showing" : "disabled", event);
		}
	}
};

//#endregion
//#region src/core/tracks/text/render/text-renderer.ts
init_dev();
init_std();
init_symbols$2();
init_text_track();
var TextRenderers = class {
	#video = null;
	#textTracks;
	#renderers = [];
	#media;
	#nativeDisplay = false;
	#nativeRenderer = null;
	#customRenderer = null;
	constructor(media) {
		this.#media = media;
		const textTracks = media.textTracks;
		this.#textTracks = textTracks;
		effect(this.#watchControls.bind(this));
		onDispose(this.#detach.bind(this));
		new EventsController(textTracks).add("add", this.#onAddTrack.bind(this)).add("remove", this.#onRemoveTrack.bind(this)).add("mode-change", this.#update.bind(this));
	}
	#watchControls() {
		const { nativeControls } = this.#media.$state;
		this.#nativeDisplay = nativeControls();
		this.#update();
	}
	add(renderer) {
		this.#renderers.push(renderer);
		untrack(this.#update.bind(this));
	}
	remove(renderer) {
		renderer.detach();
		this.#renderers.splice(this.#renderers.indexOf(renderer), 1);
		untrack(this.#update.bind(this));
	}
	/** @internal */
	attachVideo(video) {
		requestAnimationFrame(() => {
			this.#video = video;
			if (video) {
				this.#nativeRenderer = new NativeTextRenderer();
				this.#nativeRenderer.attach(video);
				for (const track of this.#textTracks) this.#addNativeTrack(track);
			}
			this.#update();
		});
	}
	#addNativeTrack(track) {
		if (!isTrackCaptionKind(track)) return;
		this.#nativeRenderer?.addTrack(track);
	}
	#removeNativeTrack(track) {
		if (!isTrackCaptionKind(track)) return;
		this.#nativeRenderer?.removeTrack(track);
	}
	#onAddTrack(event) {
		this.#addNativeTrack(event.detail);
	}
	#onRemoveTrack(event) {
		this.#removeNativeTrack(event.detail);
	}
	#update() {
		const currentTrack = this.#textTracks.selected;
		if (this.#video && (this.#nativeDisplay || currentTrack?.[TextTrackSymbol.nativeHLS])) {
			this.#customRenderer?.changeTrack(null);
			this.#nativeRenderer?.setDisplay(true);
			this.#nativeRenderer?.changeTrack(currentTrack);
			return;
		}
		this.#nativeRenderer?.setDisplay(false);
		this.#nativeRenderer?.changeTrack(null);
		if (!currentTrack) {
			this.#customRenderer?.changeTrack(null);
			return;
		}
		const customRenderer = this.#renderers.sort((a, b) => a.priority - b.priority).find((renderer) => renderer.canRender(currentTrack, this.#video));
		if (this.#customRenderer !== customRenderer) {
			this.#customRenderer?.detach();
			customRenderer?.attach(this.#video);
			this.#customRenderer = customRenderer ?? null;
		}
		customRenderer?.changeTrack(currentTrack);
	}
	#detach() {
		this.#nativeRenderer?.detach();
		this.#nativeRenderer = null;
		this.#customRenderer?.detach();
		this.#customRenderer = null;
	}
};

//#endregion
//#region src/core/tracks/text/text-tracks.ts
init_std();
init_symbols$1();
init_symbols$2();
init_text_track();
/**
* @see {@link https://vidstack.io/docs/player/api/text-tracks}
*/
var TextTrackList = class extends List {
	#canLoad = false;
	#defaults = {};
	#storage = null;
	#preferredLang = null;
	/** @internal */
	[TextTrackSymbol.crossOrigin];
	constructor() {
		super();
	}
	get selected() {
		return this.items.find((t) => t.mode === "showing" && isTrackCaptionKind(t)) ?? null;
	}
	get selectedIndex() {
		const selected = this.selected;
		return selected ? this.indexOf(selected) : -1;
	}
	get preferredLang() {
		return this.#preferredLang;
	}
	set preferredLang(lang) {
		this.#preferredLang = lang;
		this.#saveLang(lang);
	}
	add(init, trigger) {
		const track = init instanceof TextTrack ? init : new TextTrack(init), kind = init.kind === "captions" || init.kind === "subtitles" ? "captions" : init.kind;
		if (this.#defaults[kind] && init.default) delete init.default;
		track.addEventListener("mode-change", this.#onTrackModeChangeBind);
		this[ListSymbol.add](track, trigger);
		track[TextTrackSymbol.crossOrigin] = this[TextTrackSymbol.crossOrigin];
		if (this.#canLoad) track[TextTrackSymbol.canLoad]();
		if (init.default) this.#defaults[kind] = track;
		this.#selectTracks();
		return this;
	}
	remove(track, trigger) {
		this.#pendingRemoval = track;
		if (!this.items.includes(track)) return;
		if (track === this.#defaults[track.kind]) delete this.#defaults[track.kind];
		track.mode = "disabled";
		track[TextTrackSymbol.onModeChange] = null;
		track.removeEventListener("mode-change", this.#onTrackModeChangeBind);
		this[ListSymbol.remove](track, trigger);
		this.#pendingRemoval = null;
		return this;
	}
	clear(trigger) {
		for (const track of [...this.items]) this.remove(track, trigger);
		return this;
	}
	getByKind(kind) {
		const kinds = Array.isArray(kind) ? kind : [kind];
		return this.items.filter((track) => kinds.includes(track.kind));
	}
	/** @internal */
	[TextTrackSymbol.canLoad]() {
		if (this.#canLoad) return;
		for (const track of this.items) track[TextTrackSymbol.canLoad]();
		this.#canLoad = true;
		this.#selectTracks();
	}
	#selectTracks = functionDebounce(async () => {
		if (!this.#canLoad) return;
		if (!this.#preferredLang && this.#storage) this.#preferredLang = await this.#storage.getLang();
		const showCaptions = await this.#storage?.getCaptions();
		for (const kind of [
			["captions", "subtitles"],
			"chapters",
			"descriptions",
			"metadata"
		]) {
			const tracks = this.getByKind(kind);
			if (tracks.find((t) => t.mode === "showing")) continue;
			const preferredTrack = this.#preferredLang ? tracks.find((track) => track.language === this.#preferredLang) : null;
			const defaultTrack = isArray$1(kind) ? this.#defaults[kind.find((kind) => this.#defaults[kind]) || ""] : this.#defaults[kind];
			const track = preferredTrack ?? defaultTrack, isCaptionsKind = track && isTrackCaptionKind(track);
			if (track && (!isCaptionsKind || showCaptions !== false)) {
				track.mode = "showing";
				if (isCaptionsKind) this.#saveCaptionsTrack(track);
			}
		}
	}, 300);
	#pendingRemoval = null;
	#onTrackModeChangeBind = this.#onTrackModeChange.bind(this);
	#onTrackModeChange(event) {
		const track = event.detail;
		if (this.#storage && isTrackCaptionKind(track) && track !== this.#pendingRemoval) this.#saveCaptionsTrack(track);
		if (track.mode === "showing") {
			const kinds = isTrackCaptionKind(track) ? ["captions", "subtitles"] : [track.kind];
			for (const t of this.items) if (t.mode === "showing" && t != track && kinds.includes(t.kind)) t.mode = "disabled";
		}
		this.dispatchEvent(new DOMEvent("mode-change", {
			detail: event.detail,
			trigger: event
		}));
	}
	#saveCaptionsTrack(track) {
		if (track.mode !== "disabled") this.#saveLang(track.language);
		this.#storage?.setCaptions?.(track.mode === "showing");
	}
	#saveLang(lang) {
		this.#storage?.setLang?.(this.#preferredLang = lang);
	}
	setStorage(storage) {
		this.#storage = storage;
	}
};

//#endregion
//#region src/foundation/logger/colors.ts
const LOCAL_STORAGE_KEY = "@vidstack/log-colors";
const savedColors = init();
function getLogColor(key) {
	return savedColors.get(key);
}
function saveLogColor(key, { color = generateColor(), overwrite = false } = {}) {
	if (!savedColors.has(key) || overwrite) {
		savedColors.set(key, color);
		LocalStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(Object.entries(savedColors)));
	}
}
function generateColor() {
	return `hsl(${Math.random() * 360}, 55%, 70%)`;
}
function init() {
	let colors;
	try {
		colors = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY));
	} catch {}
	return new Map(Object.entries(colors ?? {}));
}

//#endregion
//#region src/foundation/logger/log-level.ts
const LogLevelValue = Object.freeze({
	silent: 0,
	error: 1,
	warn: 2,
	info: 3,
	debug: 4
});
const LogLevelColor = Object.freeze({
	silent: "white",
	error: "hsl(6, 58%, 50%)",
	warn: "hsl(51, 58%, 50%)",
	info: "hsl(219, 58%, 50%)",
	debug: "hsl(280, 58%, 50%)"
});

//#endregion
//#region src/foundation/logger/ms.ts
init_number();
const s = 1e3;
const m = s * 60;
const h = m * 60;
const d$1 = h * 24;
/**
* @see https://github.com/vercel/ms
*/
function ms(val) {
	const msAbs = Math.abs(val);
	if (msAbs >= d$1) return Math.round(val / d$1) + "d";
	if (msAbs >= h) return Math.round(val / h) + "h";
	if (msAbs >= m) return Math.round(val / m) + "m";
	if (msAbs >= s) return Math.round(val / s) + "s";
	return round(val, 2) + "ms";
}

//#endregion
//#region src/foundation/logger/log-printer.ts
init_dev();
init_std();
var LogPrinter = class extends ViewController {
	#level = "warn";
	#lastLogged;
	/**
	* The current log level.
	*/
	get logLevel() {
		return this.#level;
	}
	set logLevel(level) {
		this.#level = level;
	}
	onConnect() {
		this.listen("vds-log", (event) => {
			event.stopPropagation();
			const element = event.path?.[0] ?? (event.target instanceof ViewController ? event.target.el : event.target), eventTargetName = element?.$$COMPONENT_NAME?.replace(/^_/, "").replace(/Instance$/, "") ?? element?.tagName.toLowerCase() ?? "unknown";
			const { level = "warn", data } = event.detail ?? {};
			if (LogLevelValue[this.#level] < LogLevelValue[level]) return;
			saveLogColor(eventTargetName);
			const hint = data?.length === 1 && isGroupedLog(data[0]) ? data[0].title : isString(data?.[0]) ? data[0] : "";
			console.groupCollapsed(`%c${level.toUpperCase()}%c ${eventTargetName}%c ${hint.slice(0, 50)}${hint.length > 50 ? "..." : ""}`, `background: ${LogLevelColor[level]}; color: white; padding: 1.5px 2.2px; border-radius: 2px; font-size: 11px;`, `color: ${getLogColor(eventTargetName)}; padding: 4px 0px; font-size: 11px;`, "color: gray; font-size: 11px; padding-left: 4px;");
			if (data?.length === 1 && isGroupedLog(data[0])) {
				if (element) data[0].logs.unshift({
					label: "Element",
					data: [element]
				});
				printGroup(level, data[0]);
			} else if (data) print(level, ...data);
			this.#printTimeDiff();
			printStackTrace();
			console.groupEnd();
		});
		onDispose(() => {
			this.#lastLogged = void 0;
		});
	}
	#printTimeDiff() {
		labelledPrint("Time since last log", this.#calcLastLogTimeDiff());
	}
	#calcLastLogTimeDiff() {
		const time = performance.now();
		const diff = time - (this.#lastLogged ?? (this.#lastLogged = performance.now()));
		this.#lastLogged = time;
		return ms(diff);
	}
};
function print(level, ...data) {
	console[level](...data);
}
function labelledPrint(label, ...data) {
	console.log(`%c${label}:`, "color: gray", ...data);
}
function printStackTrace() {
	console.groupCollapsed("%cStack Trace", "color: gray");
	console.trace();
	console.groupEnd();
}
function printGroup(level, groupedLog) {
	for (const log of groupedLog.logs) if (isGroupedLog(log)) {
		console.groupCollapsed(groupedLog.title);
		printGroup(level, log);
		console.groupEnd();
	} else if ("label" in log && !isUndefined(log.label)) labelledPrint(log.label, ...log.data);
	else print(level, ...log.data);
}

//#endregion
//#region src/foundation/observers/focus-visible.ts
init_dev();
init_std();
let $keyboard = signal(false);
listenEvent(document, "pointerdown", () => {
	$keyboard.set(false);
});
listenEvent(document, "keydown", (e) => {
	if (e.metaKey || e.altKey || e.ctrlKey) return;
	$keyboard.set(true);
});
var FocusVisibleController = class extends ViewController {
	#focused = signal(false);
	onConnect(el) {
		effect(() => {
			const events = new EventsController(el);
			if (!$keyboard()) {
				this.#focused.set(false);
				updateFocusAttr(el, false);
				events.add("pointerenter", this.#onPointerEnter.bind(this)).add("pointerleave", this.#onPointerLeave.bind(this));
				return;
			}
			const active = document.activeElement === el;
			this.#focused.set(active);
			updateFocusAttr(el, active);
			events.add("focus", this.#onFocus.bind(this)).add("blur", this.#onBlur.bind(this));
		});
	}
	focused() {
		return this.#focused();
	}
	#onFocus() {
		this.#focused.set(true);
		updateFocusAttr(this.el, true);
	}
	#onBlur() {
		this.#focused.set(false);
		updateFocusAttr(this.el, false);
	}
	#onPointerEnter() {
		updateHoverAttr(this.el, true);
	}
	#onPointerLeave() {
		updateHoverAttr(this.el, false);
	}
};
function updateFocusAttr(el, isFocused) {
	setAttribute(el, "data-focus", isFocused);
	setAttribute(el, "data-hocus", isFocused);
}
function updateHoverAttr(el, isHovering) {
	setAttribute(el, "data-hocus", isHovering);
	setAttribute(el, "data-hover", isHovering);
}

//#endregion
//#region src/components/player.ts
init_dev();
init_std();
init_symbols$2();
init_text_track();
init_dom();
init_number();
init_support();
/**
* All media elements exist inside the `<media-player>` component. This component's main
* responsibilities are to manage media state updates, dispatch media events, handle media
* requests, and expose media state through HTML attributes and CSS properties for styling
* purposes.
*
* @attr data-airplay - Whether AirPlay is connected.
* @attr data-autoplay - Autoplay has successfully started.
* @attr data-autoplay-error - Autoplay has failed to start.
* @attr data-buffering - Media is not ready for playback or waiting for more data.
* @attr data-can-airplay - Whether AirPlay is available.
* @attr data-can-fullscreen - Fullscreen mode is available.
* @attr data-can-google-cast - Whether Google Cast is available.
* @attr data-can-load - Media can now begin loading.
* @attr data-can-pip - Picture-in-Picture mode is available.
* @attr data-can-play - Media is ready for playback.
* @attr data-can-seek - Seeking operations are permitted.
* @attr data-captions - Captions are available and visible.
* @attr data-controls - Controls are visible.
* @attr data-ended - Playback has ended.
* @attr data-error - Issue with media loading/playback.
* @attr data-fullscreen - Fullscreen mode is active.
* @attr data-google-cast - Whether Google Cast is connected.
* @attr data-ios-controls - iOS controls are visible.
* @attr data-load - Specified load strategy.
* @attr data-live - Media is live stream.
* @attr data-live-edge - Playback is at the live edge.
* @attr data-loop - Media is set to replay on end.
* @attr data-media-type - Current media type (audio/video).
* @attr data-muted - Whether volume is muted (0).
* @attr data-orientation - Current screen orientation (landscape/portrait).
* @attr data-paused - Whether playback is paused.
* @attr data-pip - Picture-in-picture mode is active.
* @attr data-playing - Playback is active.
* @attr data-playsinline - Media should play inline by default (iOS).
* @attr data-pointer - The user's pointer device type (coarse/fine).
* @attr data-preview - The user is interacting with the time slider.
* @attr data-remote-type - The remote playback type (airplay/google-cast).
* @attr data-remote-state - The remote playback state (connecting/connected/disconnected).
* @attr data-seeking - User is seeking to a new playback position.
* @attr data-started - Media playback has started.
* @attr data-stream-type - Current stream type.
* @attr data-view-type - Current view type (audio/video).
* @attr data-waiting - Media is waiting for more data to resume playback.
* @attr data-focus - Whether player is being keyboard focused.
* @attr data-hocus - Whether player is being keyboard focused or hovered over.
* @docs {@link https://www.vidstack.io/docs/player/components/media/player}
* @deprecated Vidstack is deprecated in favour of Video.js 10 (https://videojs.org) and receives
* security fixes only until January 2028. Migration guide: https://videojs.org/docs/framework/html/guides/migrate-from-vidstack
*/
var MediaPlayer = class MediaPlayer extends Component {
	static props = mediaPlayerProps;
	static state = mediaState;
	#media;
	#stateMgr;
	#requestMgr;
	canPlayQueue = new RequestQueue();
	remoteControl;
	get #provider() {
		return this.#media.$provider();
	}
	get #props() {
		return this.$props;
	}
	constructor() {
		super();
		new MediaStateSync();
		const context = {
			player: this,
			qualities: new VideoQualityList(),
			audioTracks: new AudioTrackList(),
			storage: null,
			$provider: signal(null),
			$providerSetup: signal(false),
			$props: this.$props,
			$state: this.$state
		};
		{
			const logPrinter = new LogPrinter();
			effect(() => {
				logPrinter.logLevel = this.$props.logLevel();
			});
		}
		context.logger = new Logger();
		context.remote = this.remoteControl = new MediaRemoteControl(context.logger);
		context.remote.setPlayer(this);
		context.textTracks = new TextTrackList();
		context.textTracks[TextTrackSymbol.crossOrigin] = this.$state.crossOrigin;
		context.textRenderers = new TextRenderers(context);
		context.ariaKeys = {};
		this.#media = context;
		provideContext(mediaContext, context);
		this.orientation = new ScreenOrientationController();
		new FocusVisibleController();
		new MediaKeyboardController(context);
		new MediaEventsLogger(context);
		const request = new MediaRequestContext();
		this.#stateMgr = new MediaStateManager(request, context);
		this.#requestMgr = new MediaRequestManager(this.#stateMgr, request, context);
		context.delegate = new MediaPlayerDelegate(this.#stateMgr.handle.bind(this.#stateMgr), context);
		context.notify = context.delegate.notify.bind(context.delegate);
		if (typeof navigator !== "undefined" && "mediaSession" in navigator) new NavigatorMediaSession();
		new MediaLoadController("load", this.startLoading.bind(this));
		new MediaLoadController("posterLoad", this.startLoadingPoster.bind(this));
	}
	onSetup() {
		this.#setupMediaAttributes();
		effect(this.#watchCanPlay.bind(this));
		effect(this.#watchMuted.bind(this));
		effect(this.#watchPaused.bind(this));
		effect(this.#watchVolume.bind(this));
		effect(this.#watchCurrentTime.bind(this));
		effect(this.#watchPlaysInline.bind(this));
		effect(this.#watchPlaybackRate.bind(this));
	}
	onAttach(el) {
		el.setAttribute("data-media-player", "");
		setAttributeIfEmpty(el, "tabindex", "0");
		setAttributeIfEmpty(el, "role", "region");
		effect(this.#watchStorage.bind(this));
		effect(this.#watchTitle.bind(this));
		effect(this.#watchOrientation.bind(this));
		listenEvent(el, "find-media-player", this.#onFindPlayer.bind(this));
	}
	onConnect(el) {
		logDeprecationNotice();
		if (IS_IPHONE) setAttribute(el, "data-iphone", "");
		const pointerQuery = window.matchMedia("(pointer: coarse)");
		this.#onPointerChange(pointerQuery);
		pointerQuery.onchange = this.#onPointerChange.bind(this);
		const resize = new ResizeObserver(animationFrameThrottle(this.#onResize.bind(this)));
		resize.observe(el);
		effect(this.#onResize.bind(this));
		this.dispatch("media-player-connect", {
			detail: this,
			bubbles: true,
			composed: true
		});
		this.#media.logger.setTarget(el);
		onDispose(() => {
			resize.disconnect();
			pointerQuery.onchange = null;
			this.#media.logger.setTarget(null);
		});
	}
	onDestroy() {
		this.#media.player = null;
		this.canPlayQueue.reset();
	}
	#skipTitleUpdate = false;
	#watchTitle() {
		const el = this.$el, { ariaLabel } = this.$props, { title, live, viewType, providedTitle } = this.$state, isLive = live(), type = uppercaseFirstChar(viewType()), typeText = type !== "Unknown" ? `${isLive ? "Live " : ""}${type}` : isLive ? "Live" : "Media", currentTitle = title(), label = ariaLabel() || `${typeText} Player` + (currentTitle ? ` - ${currentTitle}` : "");
		setAttribute(this.el, "aria-label", label);
		if (el?.hasAttribute("title")) {
			this.#skipTitleUpdate = true;
			el?.removeAttribute("title");
		}
	}
	#watchOrientation() {
		const orientation = this.orientation.landscape ? "landscape" : "portrait";
		this.$state.orientation.set(orientation);
		setAttribute(this.el, "data-orientation", orientation);
		this.#onResize();
	}
	#watchCanPlay() {
		if (this.$state.canPlay() && this.#provider) this.canPlayQueue.start();
		else this.canPlayQueue.stop();
	}
	#setupMediaAttributes() {
		if (MediaPlayer[MEDIA_ATTRIBUTES]) {
			this.setAttributes(MediaPlayer[MEDIA_ATTRIBUTES]);
			return;
		}
		const $attrs = {
			"data-load": function() {
				return this.$props.load();
			},
			"data-captions": function() {
				const track = this.$state.textTrack();
				return !!track && isTrackCaptionKind(track);
			},
			"data-ios-controls": function() {
				return this.$state.iOSControls();
			},
			"data-controls": function() {
				return this.controls.showing;
			},
			"data-buffering": function() {
				const { canLoad, canPlay, waiting } = this.$state;
				return canLoad() && (!canPlay() || waiting());
			},
			"data-error": function() {
				const { error } = this.$state;
				return !!error();
			},
			"data-autoplay-error": function() {
				const { autoPlayError } = this.$state;
				return !!autoPlayError();
			}
		};
		const alias = {
			autoPlay: "autoplay",
			canAirPlay: "can-airplay",
			canPictureInPicture: "can-pip",
			pictureInPicture: "pip",
			playsInline: "playsinline",
			remotePlaybackState: "remote-state",
			remotePlaybackType: "remote-type",
			isAirPlayConnected: "airplay",
			isGoogleCastConnected: "google-cast"
		};
		for (const prop of mediaAttributes) {
			const attrName = "data-" + (alias[prop] ?? camelToKebabCase(prop));
			$attrs[attrName] = function() {
				return this.$state[prop]();
			};
		}
		delete $attrs.title;
		MediaPlayer[MEDIA_ATTRIBUTES] = $attrs;
		this.setAttributes($attrs);
	}
	#onFindPlayer(event) {
		event.detail(this);
	}
	#onResize() {
		if (!this.el) return;
		const width = this.el.clientWidth, height = this.el.clientHeight;
		this.$state.width.set(width);
		this.$state.height.set(height);
		setStyle(this.el, "--player-width", width + "px");
		setStyle(this.el, "--player-height", height + "px");
	}
	#onPointerChange(queryList) {
		const pointer = queryList.matches ? "coarse" : "fine";
		setAttribute(this.el, "data-pointer", pointer);
		this.$state.pointer.set(pointer);
		this.#onResize();
	}
	/**
	* The current media provider.
	*/
	get provider() {
		return this.#provider;
	}
	/**
	* Media controls settings.
	*/
	get controls() {
		return this.#requestMgr.controls;
	}
	set controls(controls) {
		this.#props.controls.set(controls);
	}
	/**
	* Controls the screen orientation of the current browser window and dispatches orientation
	* change events on the player.
	*/
	orientation;
	/**
	* The title of the current media.
	*/
	get title() {
		return peek(this.$state.title);
	}
	set title(newTitle) {
		if (this.#skipTitleUpdate) {
			this.#skipTitleUpdate = false;
			return;
		}
		this.#props.title.set(newTitle);
	}
	/**
	* A list of all `VideoQuality` objects representing the set of available video renditions.
	*
	* @see {@link https://vidstack.io/docs/player/api/video-quality}
	*/
	get qualities() {
		return this.#media.qualities;
	}
	/**
	* A list of all `AudioTrack` objects representing the set of available audio tracks.
	*
	* @see {@link https://vidstack.io/docs/player/api/audio-tracks}
	*/
	get audioTracks() {
		return this.#media.audioTracks;
	}
	/**
	* A list of all `TextTrack` objects representing the set of available text tracks.
	*
	* @see {@link https://vidstack.io/docs/player/api/text-tracks}
	*/
	get textTracks() {
		return this.#media.textTracks;
	}
	/**
	* Contains text renderers which are responsible for loading, parsing, and rendering text
	* tracks.
	*/
	get textRenderers() {
		return this.#media.textRenderers;
	}
	get duration() {
		return this.$state.duration();
	}
	set duration(duration) {
		this.#props.duration.set(duration);
	}
	get paused() {
		return peek(this.$state.paused);
	}
	set paused(paused) {
		this.#queuePausedUpdate(paused);
	}
	#watchPaused() {
		this.#queuePausedUpdate(this.$props.paused());
	}
	#queuePausedUpdate(paused) {
		if (paused) this.canPlayQueue.enqueue("paused", () => this.#requestMgr.pause());
		else this.canPlayQueue.enqueue("paused", () => this.#requestMgr.play());
	}
	get muted() {
		return peek(this.$state.muted);
	}
	set muted(muted) {
		this.#queueMutedUpdate(muted);
	}
	#watchMuted() {
		this.#queueMutedUpdate(this.$props.muted());
	}
	#queueMutedUpdate(muted) {
		this.canPlayQueue.enqueue("muted", () => {
			peek(() => {
				if (this.#provider) this.#provider.setMuted(muted);
			});
		});
	}
	get currentTime() {
		return peek(this.$state.currentTime);
	}
	set currentTime(time) {
		this.#queueCurrentTimeUpdate(time);
	}
	#watchCurrentTime() {
		this.#queueCurrentTimeUpdate(this.$props.currentTime());
	}
	#queueCurrentTimeUpdate(time) {
		this.canPlayQueue.enqueue("currentTime", () => {
			const { currentTime } = this.$state;
			if (time === peek(currentTime)) return;
			peek(() => {
				if (!this.#provider) return;
				const boundedTime = boundTime(time, this.$state);
				if (Number.isFinite(boundedTime)) this.#provider.setCurrentTime(boundedTime);
			});
		});
	}
	get volume() {
		return peek(this.$state.volume);
	}
	set volume(volume) {
		this.#queueVolumeUpdate(volume);
	}
	#watchVolume() {
		this.#queueVolumeUpdate(this.$props.volume());
	}
	#queueVolumeUpdate(volume) {
		const clampedVolume = clampNumber(0, volume, 1);
		this.canPlayQueue.enqueue("volume", () => {
			if (this.#provider) this.#provider.setVolume(clampedVolume);
		});
	}
	get playbackRate() {
		return peek(this.$state.playbackRate);
	}
	set playbackRate(rate) {
		this.#queuePlaybackRateUpdate(rate);
	}
	#watchPlaybackRate() {
		this.#queuePlaybackRateUpdate(this.$props.playbackRate());
	}
	#queuePlaybackRateUpdate(rate) {
		this.canPlayQueue.enqueue("rate", () => {
			if (this.#provider) this.#provider.setPlaybackRate?.(rate);
		});
	}
	#watchPlaysInline() {
		this.#queuePlaysInlineUpdate(this.$props.playsInline());
	}
	#queuePlaysInlineUpdate(inline) {
		this.canPlayQueue.enqueue("playsinline", () => {
			if (this.#provider) this.#provider.setPlaysInline?.(inline);
		});
	}
	#watchStorage() {
		let storageValue = this.$props.storage(), storage = isString(storageValue) ? new LocalMediaStorage() : storageValue;
		if (storage?.onChange) {
			const { source } = this.$state, playerId = isString(storageValue) ? storageValue : this.el?.id, mediaId = computed(this.#computeMediaId.bind(this));
			effect(() => storage.onChange(source(), mediaId(), playerId || void 0));
		}
		this.#media.storage = storage;
		this.#media.textTracks.setStorage(storage);
		onDispose(() => {
			storage?.onDestroy?.();
			this.#media.storage = null;
			this.#media.textTracks.setStorage(null);
		});
	}
	#computeMediaId() {
		const { clipStartTime, clipEndTime } = this.$props, { source } = this.$state, src = source();
		return src.src ? `${src.src}:${clipStartTime()}:${clipEndTime()}` : null;
	}
	/**
	* Begins/resumes playback of the media. If this method is called programmatically before the
	* user has interacted with the player, the promise may be rejected subject to the browser's
	* autoplay policies. This method will throw if called before media is ready for playback.
	*
	* @see {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play}
	*/
	async play(trigger) {
		return this.#requestMgr.play(trigger);
	}
	/**
	* Pauses playback of the media. This method will throw if called before media is ready for
	* playback.
	*
	* @see {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/pause}
	*/
	async pause(trigger) {
		return this.#requestMgr.pause(trigger);
	}
	/**
	* Attempts to display the player in fullscreen. The promise will resolve if successful, and
	* reject if not. This method will throw if any fullscreen API is _not_ currently available.
	*
	* @see {@link https://vidstack.io/docs/player/api/fullscreen}
	*/
	async enterFullscreen(target, trigger) {
		return this.#requestMgr.enterFullscreen(target, trigger);
	}
	/**
	* Attempts to display the player inline by exiting fullscreen. This method will throw if any
	* fullscreen API is _not_ currently available.
	*
	* @see {@link https://vidstack.io/docs/player/api/fullscreen}
	*/
	async exitFullscreen(target, trigger) {
		return this.#requestMgr.exitFullscreen(target, trigger);
	}
	/**
	* Attempts to display the player in picture-in-picture mode. This method will throw if PIP is
	* not supported. This method will also return a `PictureInPictureWindow` if the current
	* provider supports it.
	*
	* @see {@link https://vidstack.io/docs/player/api/picture-in-picture}
	*/
	enterPictureInPicture(trigger) {
		return this.#requestMgr.enterPictureInPicture(trigger);
	}
	/**
	* Attempts to display the player in inline by exiting picture-in-picture mode. This method
	* will throw if not supported.
	*
	* @see {@link https://vidstack.io/docs/player/api/picture-in-picture}
	*/
	exitPictureInPicture(trigger) {
		return this.#requestMgr.exitPictureInPicture(trigger);
	}
	/**
	* Sets the current time to the live edge (i.e., `duration`). This is a no-op for non-live
	* streams and will throw if called before media is ready for playback.
	*
	* @see {@link https://vidstack.io/docs/player/api/live}
	*/
	seekToLiveEdge(trigger) {
		this.#requestMgr.seekToLiveEdge(trigger);
	}
	/**
	* Called when media can begin loading. Calling this method will trigger the initial provider
	* loading process. Calling it more than once has no effect.
	*
	* @see {@link https://vidstack.io/docs/player/core-concepts/loading#load-strategies}
	*/
	startLoading(trigger) {
		this.#media.notify("can-load", void 0, trigger);
	}
	/**
	* Called when the poster image can begin loading. Calling it more than once has no effect.
	*
	* @see {@link https://vidstack.io/docs/player/core-concepts/loading#load-strategies}
	*/
	startLoadingPoster(trigger) {
		this.#media.notify("can-load-poster", void 0, trigger);
	}
	/**
	* Request Apple AirPlay picker to open.
	*/
	requestAirPlay(trigger) {
		return this.#requestMgr.requestAirPlay(trigger);
	}
	/**
	* Request Google Cast device picker to open. The Google Cast framework will be loaded if it
	* hasn't yet.
	*/
	requestGoogleCast(trigger) {
		return this.#requestMgr.requestGoogleCast(trigger);
	}
	/**
	* Set the audio gain, amplifying volume and enabling a maximum volume above 100%.
	*
	* @see {@link https://vidstack.io/docs/player/api/audio-gain}
	*/
	setAudioGain(gain, trigger) {
		return this.#requestMgr.setAudioGain(gain, trigger);
	}
	destroy() {
		super.destroy();
		this.#media.remote.setPlayer(null);
		this.dispatch("destroy");
	}
};
const mediaplayer__proto = MediaPlayer.prototype;
prop(mediaplayer__proto, "canPlayQueue");
prop(mediaplayer__proto, "remoteControl");
prop(mediaplayer__proto, "provider");
prop(mediaplayer__proto, "controls");
prop(mediaplayer__proto, "orientation");
prop(mediaplayer__proto, "title");
prop(mediaplayer__proto, "qualities");
prop(mediaplayer__proto, "audioTracks");
prop(mediaplayer__proto, "textTracks");
prop(mediaplayer__proto, "textRenderers");
prop(mediaplayer__proto, "duration");
prop(mediaplayer__proto, "paused");
prop(mediaplayer__proto, "muted");
prop(mediaplayer__proto, "currentTime");
prop(mediaplayer__proto, "volume");
prop(mediaplayer__proto, "playbackRate");
method(mediaplayer__proto, "play");
method(mediaplayer__proto, "pause");
method(mediaplayer__proto, "enterFullscreen");
method(mediaplayer__proto, "exitFullscreen");
method(mediaplayer__proto, "enterPictureInPicture");
method(mediaplayer__proto, "exitPictureInPicture");
method(mediaplayer__proto, "seekToLiveEdge");
method(mediaplayer__proto, "startLoading");
method(mediaplayer__proto, "startLoadingPoster");
method(mediaplayer__proto, "requestAirPlay");
method(mediaplayer__proto, "requestGoogleCast");
method(mediaplayer__proto, "setAudioGain");
let hasLoggedDeprecationNotice = false;
function logDeprecationNotice() {
	if (hasLoggedDeprecationNotice) return;
	hasLoggedDeprecationNotice = true;
	console.info("[vidstack] Vidstack is deprecated in favour of Video.js 10, from the teams behind Vidstack, Plyr, Media Chrome, and Video.js. Security fixes only until January 2028. Migration guides: https://videojs.org/docs/framework/react/guides/migrate-from-vidstack (React) and https://videojs.org/docs/framework/html/guides/migrate-from-vidstack (web components and other frameworks)");
}

//#endregion
//#region src/elements/define/player-element.ts
/**
* @docs {@link https://www.vidstack.io/docs/wc/player/components/core/player}
* @example
* ```html
* <media-player src="...">
*   <media-provider></media-provider>
*   <!-- Other components that use/manage media state here. -->
* </media-player>
* ```
* @deprecated Vidstack is deprecated in favour of Video.js 10 (https://videojs.org) and receives
* security fixes only until January 2028. Migration guide: https://videojs.org/docs/framework/html/guides/migrate-from-vidstack
*/
var MediaPlayerElement = class extends Host(HTMLElement, MediaPlayer) {
	static tagName = "media-player";
	static attrs = {
		ariaLabel: "aria-label",
		autoPlay: "autoplay",
		crossOrigin: "crossorigin",
		playsInline: "playsinline",
		preferNativeHLS: "prefer-native-hls",
		minLiveDVRWindow: "min-live-dvr-window"
	};
};

//#endregion
//#region src/providers/html/audio/audio-context.ts
function getOrCreateAudioCtx() {
	return audioContext ??= new AudioContext();
}
function createGainNode() {
	const audioCtx = getOrCreateAudioCtx(), gainNode = audioCtx.createGain();
	gainNode.connect(audioCtx.destination);
	gainNodes.push(gainNode);
	return gainNode;
}
function createElementSource(el, gainNode) {
	const src = getOrCreateAudioCtx().createMediaElementSource(el);
	if (gainNode) src.connect(gainNode);
	elAudioSources.push(src);
	return src;
}
function destroyGainNode(node) {
	const idx = gainNodes.indexOf(node);
	if (idx !== -1) {
		gainNodes.splice(idx, 1);
		node.disconnect();
		freeAudioCtxWhenAllResourcesFreed();
	}
}
function destroyElementSource(src) {
	const idx = elAudioSources.indexOf(src);
	if (idx !== -1) {
		elAudioSources.splice(idx, 1);
		src.disconnect();
		freeAudioCtxWhenAllResourcesFreed();
	}
}
function freeAudioCtxWhenAllResourcesFreed() {
	if (audioContext && gainNodes.length === 0 && elAudioSources.length === 0) audioContext.close().then(() => {
		audioContext = null;
	});
}
var audioContext, gainNodes, elAudioSources;
var init_audio_context = __esmMin((() => {
	audioContext = null, gainNodes = [], elAudioSources = [];
}));

//#endregion
//#region src/providers/html/audio/audio-gain.ts
var AudioGain;
var init_audio_gain = __esmMin((() => {
	init_audio_context();
	AudioGain = class {
		#media;
		#onChange;
		#gainNode = null;
		#srcAudioNode = null;
		get currentGain() {
			return this.#gainNode?.gain?.value ?? null;
		}
		get supported() {
			return true;
		}
		constructor(media, onChange) {
			this.#media = media;
			this.#onChange = onChange;
		}
		setGain(gain) {
			const currGain = this.currentGain;
			if (gain === this.currentGain) return;
			if (gain === 1 && currGain !== 1) {
				this.removeGain();
				return;
			}
			if (!this.#gainNode) {
				this.#gainNode = createGainNode();
				if (this.#srcAudioNode) this.#srcAudioNode.connect(this.#gainNode);
			}
			if (!this.#srcAudioNode) this.#srcAudioNode = createElementSource(this.#media, this.#gainNode);
			this.#gainNode.gain.value = gain;
			this.#onChange(gain);
		}
		removeGain() {
			if (!this.#gainNode) return;
			if (this.#srcAudioNode) this.#srcAudioNode.connect(getOrCreateAudioCtx().destination);
			this.#destroyGainNode();
			this.#onChange(null);
		}
		destroy() {
			this.#destroySrcNode();
			this.#destroyGainNode();
		}
		#destroySrcNode() {
			if (!this.#srcAudioNode) return;
			try {
				destroyElementSource(this.#srcAudioNode);
			} catch (e) {} finally {
				this.#srcAudioNode = null;
			}
		}
		#destroyGainNode() {
			if (!this.#gainNode) return;
			try {
				destroyGainNode(this.#gainNode);
			} catch (e) {} finally {
				this.#gainNode = null;
			}
		}
	};
}));

//#endregion
//#region src/foundation/observers/page-visibility.ts
function determinePageState(event) {
	if (event?.type === "blur" || document.visibilityState === "hidden") return "hidden";
	if (document.hasFocus()) return "active";
	return "passive";
}
var PAGE_EVENTS, PageVisibility;
var init_page_visibility = __esmMin((() => {
	init_dev();
	init_std();
	init_support();
	PAGE_EVENTS = [
		"focus",
		"blur",
		"visibilitychange",
		"pageshow",
		"pagehide"
	];
	PageVisibility = class {
		#state = signal(determinePageState());
		#visibility = signal(document.visibilityState);
		#safariBeforeUnloadTimeout;
		connect() {
			const events = new EventsController(window), handlePageEvent = this.#handlePageEvent.bind(this);
			for (const eventType of PAGE_EVENTS) events.add(eventType, handlePageEvent);
			/**
			* Safari does not reliably fire the `pagehide` or `visibilitychange` events when closing a
			* tab, so we have to use `beforeunload` with a timeout to check whether the default action
			* was prevented.
			*
			* We only add this to Safari because adding it to Firefox would prevent the page from being
			* eligible for `bfcache`.
			*
			* @see https://bugs.webkit.org/show_bug.cgi?id=151610
			* @see https://bugs.webkit.org/show_bug.cgi?id=151234
			*/
			if (IS_SAFARI) events.add("beforeunload", (event) => {
				this.#safariBeforeUnloadTimeout = setTimeout(() => {
					if (!(event.defaultPrevented || event.returnValue.length > 0)) {
						this.#state.set("hidden");
						this.#visibility.set("hidden");
					}
				}, 0);
			});
		}
		/**
		* The current page state. Important to note we only account for a subset of page states, as
		* the rest aren't valuable to the player at the moment.
		*
		* - **active:** A page is in the active state if it is visible and has input focus.
		* - **passive:** A page is in the passive state if it is visible and does not have input focus.
		* - **hidden:** A page is in the hidden state if it is not visible.
		*
		* @see https://developers.google.com/web/updates/2018/07/page-lifecycle-api#states
		*/
		get pageState() {
			return this.#state();
		}
		/**
		* The current document visibility state.
		*
		* - **visible:** The page content may be at least partially visible. In practice, this means that
		* the page is the foreground tab of a non-minimized window.
		* - **hidden:** The page content is not visible to the user. In practice this means that the
		* document is either a background tab or part of a minimized window, or the OS screen lock is
		* active.
		*
		* @see https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilityState
		*/
		get visibility() {
			return this.#visibility();
		}
		#handlePageEvent(event) {
			if (IS_SAFARI) window.clearTimeout(this.#safariBeforeUnloadTimeout);
			if (event.type !== "blur" || this.#state() === "active") {
				this.#state.set(determinePageState(event));
				this.#visibility.set(document.visibilityState == "hidden" ? "hidden" : "visible");
			}
		}
	};
}));

//#endregion
//#region src/providers/html/html–media-events.ts
var HTMLMediaEvents;
var init_html_media_events = __esmMin((() => {
	init_dev();
	init_std();
	init_page_visibility();
	init_raf_loop();
	init_mime();
	init_number();
	init_support();
	HTMLMediaEvents = class {
		#provider;
		#ctx;
		#waiting = false;
		#attachedLoadStart = false;
		#attachedCanPlay = false;
		#timeRAF = new RAFLoop(this.#onAnimationFrame.bind(this));
		#pageVisibility = new PageVisibility();
		#events;
		get #media() {
			return this.#provider.media;
		}
		constructor(provider, ctx) {
			this.#provider = provider;
			this.#ctx = ctx;
			this.#events = new EventsController(provider.media);
			this.#attachInitialListeners();
			this.#pageVisibility.connect();
			effect(this.#attachTimeUpdate.bind(this));
			onDispose(this.#onDispose.bind(this));
		}
		#onDispose() {
			this.#attachedLoadStart = false;
			this.#attachedCanPlay = false;
			this.#timeRAF.stop();
			this.#events.abort();
			this.#devHandlers?.clear();
		}
		/**
		* The `timeupdate` event fires surprisingly infrequently during playback, meaning your progress
		* bar (or whatever else is synced to the currentTime) moves in a choppy fashion. This helps
		* resolve that by retrieving time updates in a request animation frame loop.
		*/
		#lastSeenTime = 0;
		#seekedTo = -1;
		#onAnimationFrame() {
			const newTime = this.#media.currentTime;
			if (!(IS_SAFARI && newTime - this.#seekedTo < .35) && this.#lastSeenTime !== newTime) {
				this.#updateCurrentTime(newTime);
				this.#lastSeenTime = newTime;
			}
		}
		#attachInitialListeners() {
			this.#ctx.logger?.info("attaching initial listeners");
			this.#attachEventListener("loadstart", this.#onLoadStart);
			this.#attachEventListener("abort", this.#onAbort);
			this.#attachEventListener("emptied", this.#onEmptied);
			this.#attachEventListener("error", this.#onError);
			this.#attachEventListener("volumechange", this.#onVolumeChange);
			this.#ctx.logger?.debug("attached initial media event listeners");
		}
		#attachLoadStartListeners() {
			if (this.#attachedLoadStart) return;
			this.#ctx.logger?.info("attaching load start listeners");
			this.#attachEventListener("loadeddata", this.#onLoadedData);
			this.#attachEventListener("loadedmetadata", this.#onLoadedMetadata);
			this.#attachEventListener("canplay", this.#onCanPlay);
			this.#attachEventListener("canplaythrough", this.#onCanPlayThrough);
			this.#attachEventListener("durationchange", this.#onDurationChange);
			this.#attachEventListener("play", this.#onPlay);
			this.#attachEventListener("progress", this.#onProgress);
			this.#attachEventListener("stalled", this.#onStalled);
			this.#attachEventListener("suspend", this.#onSuspend);
			this.#attachEventListener("ratechange", this.#onRateChange);
			this.#attachedLoadStart = true;
		}
		#attachCanPlayListeners() {
			if (this.#attachedCanPlay) return;
			this.#ctx.logger?.info("attaching can play listeners");
			this.#attachEventListener("pause", this.#onPause);
			this.#attachEventListener("playing", this.#onPlaying);
			this.#attachEventListener("seeked", this.#onSeeked);
			this.#attachEventListener("seeking", this.#onSeeking);
			this.#attachEventListener("ended", this.#onEnded);
			this.#attachEventListener("waiting", this.#onWaiting);
			this.#attachedCanPlay = true;
		}
		#devHandlers = /* @__PURE__ */ new Map();
		#handleDevEvent = this.#onDevEvent.bind(this);
		#attachEventListener(eventType, handler) {
			this.#devHandlers.set(eventType, handler);
			this.#events.add(eventType, this.#handleDevEvent);
		}
		#onDevEvent(event) {
			this.#ctx.logger?.debugGroup(`📺 provider fired \`${event.type}\``).labelledLog("Provider", this.#provider).labelledLog("Event", event).labelledLog("Media Store", { ...this.#ctx.$state }).dispatch();
			this.#devHandlers.get(event.type)?.call(this, event);
		}
		#updateCurrentTime(time, trigger) {
			const newTime = Math.min(time, this.#ctx.$state.seekableEnd());
			this.#ctx.notify("time-change", newTime, trigger);
		}
		#onLoadStart(event) {
			if (this.#media.networkState === 3) {
				this.#onAbort(event);
				return;
			}
			this.#attachLoadStartListeners();
			this.#ctx.notify("load-start", void 0, event);
		}
		#onAbort(event) {
			this.#ctx.notify("abort", void 0, event);
		}
		#onEmptied(event) {
			this.#ctx.notify("emptied", void 0, event);
		}
		#onLoadedData(event) {
			this.#ctx.notify("loaded-data", void 0, event);
		}
		#onLoadedMetadata(event) {
			this.#lastSeenTime = 0;
			this.#seekedTo = -1;
			this.#attachCanPlayListeners();
			this.#ctx.notify("loaded-metadata", void 0, event);
			if (IS_IOS || IS_SAFARI && isHLSSrc(this.#ctx.$state.source())) this.#ctx.delegate.ready(this.#getCanPlayDetail(), event);
		}
		#getCanPlayDetail() {
			return {
				provider: peek(this.#ctx.$provider),
				duration: this.#media.duration,
				buffered: this.#media.buffered,
				seekable: this.#media.seekable
			};
		}
		#onPlay(event) {
			if (!this.#ctx.$state.canPlay()) return;
			this.#ctx.notify("play", void 0, event);
		}
		#onPause(event) {
			if (this.#media.readyState === 1 && !this.#waiting) return;
			this.#waiting = false;
			this.#timeRAF.stop();
			this.#ctx.notify("pause", void 0, event);
		}
		#onCanPlay(event) {
			this.#ctx.delegate.ready(this.#getCanPlayDetail(), event);
		}
		#onCanPlayThrough(event) {
			if (this.#ctx.$state.started()) return;
			this.#ctx.notify("can-play-through", this.#getCanPlayDetail(), event);
		}
		#onPlaying(event) {
			if (this.#media.paused) return;
			this.#waiting = false;
			this.#ctx.notify("playing", void 0, event);
			this.#timeRAF.start();
		}
		#onStalled(event) {
			this.#ctx.notify("stalled", void 0, event);
			if (this.#media.readyState < 3) {
				this.#waiting = true;
				this.#ctx.notify("waiting", void 0, event);
			}
		}
		#onWaiting(event) {
			if (this.#media.readyState < 3) {
				this.#waiting = true;
				this.#ctx.notify("waiting", void 0, event);
			}
		}
		#onEnded(event) {
			this.#timeRAF.stop();
			this.#updateCurrentTime(this.#media.duration, event);
			this.#ctx.notify("end", void 0, event);
			if (this.#ctx.$state.loop()) {
				if (isNil(this.#media.controls)) this.#media.controls = false;
			}
		}
		#attachTimeUpdate() {
			const isPaused = this.#ctx.$state.paused(), isPageHidden = this.#pageVisibility.visibility === "hidden";
			if (isPaused || isPageHidden) listenEvent(this.#media, "timeupdate", this.#onTimeUpdate.bind(this));
		}
		#onTimeUpdate(event) {
			this.#updateCurrentTime(this.#media.currentTime, event);
		}
		#onDurationChange(event) {
			if (this.#ctx.$state.ended()) this.#updateCurrentTime(this.#media.duration, event);
			this.#ctx.notify("duration-change", this.#media.duration, event);
		}
		#onVolumeChange(event) {
			const detail = {
				volume: this.#media.volume,
				muted: this.#media.muted
			};
			this.#ctx.notify("volume-change", detail, event);
		}
		#onSeeked(event) {
			this.#seekedTo = this.#media.currentTime;
			this.#updateCurrentTime(this.#media.currentTime, event);
			this.#ctx.notify("seeked", this.#media.currentTime, event);
			if (Math.trunc(this.#media.currentTime) === Math.trunc(this.#media.duration) && getNumberOfDecimalPlaces(this.#media.duration) > getNumberOfDecimalPlaces(this.#media.currentTime)) {
				this.#updateCurrentTime(this.#media.duration, event);
				if (!this.#media.ended) this.#ctx.player.dispatch(new DOMEvent("media-play-request", { trigger: event }));
			}
		}
		#onSeeking(event) {
			this.#ctx.notify("seeking", this.#media.currentTime, event);
		}
		#onProgress(event) {
			const detail = {
				buffered: this.#media.buffered,
				seekable: this.#media.seekable
			};
			this.#ctx.notify("progress", detail, event);
		}
		#onSuspend(event) {
			this.#ctx.notify("suspend", void 0, event);
		}
		#onRateChange(event) {
			this.#ctx.notify("rate-change", this.#media.playbackRate, event);
		}
		#onError(event) {
			const error = this.#media.error;
			if (!error) return;
			const detail = {
				message: error.message,
				code: error.code,
				mediaError: error
			};
			this.#ctx.notify("error", detail, event);
		}
	};
}));

//#endregion
//#region src/providers/html/native-audio-tracks.ts
var NativeAudioTracks;
var init_native_audio_tracks = __esmMin((() => {
	init_std();
	init_symbols$1();
	NativeAudioTracks = class {
		#provider;
		#ctx;
		get #nativeTracks() {
			return this.#provider.media.audioTracks;
		}
		constructor(provider, ctx) {
			this.#provider = provider;
			this.#ctx = ctx;
			this.#nativeTracks.onaddtrack = this.#onAddNativeTrack.bind(this);
			this.#nativeTracks.onremovetrack = this.#onRemoveNativeTrack.bind(this);
			this.#nativeTracks.onchange = this.#onChangeNativeTrack.bind(this);
			listenEvent(this.#ctx.audioTracks, "change", this.#onChangeTrack.bind(this));
		}
		#onAddNativeTrack(event) {
			const nativeTrack = event.track;
			if (nativeTrack.label === "") return;
			const audioTrack = {
				id: nativeTrack.id.toString() || `native-audio-${this.#ctx.audioTracks.length}`,
				label: nativeTrack.label,
				language: nativeTrack.language,
				kind: nativeTrack.kind,
				selected: false
			};
			this.#ctx.audioTracks[ListSymbol.add](audioTrack, event);
			if (nativeTrack.enabled) audioTrack.selected = true;
		}
		#onRemoveNativeTrack(event) {
			const track = this.#ctx.audioTracks.getById(event.track.id);
			if (track) this.#ctx.audioTracks[ListSymbol.remove](track, event);
		}
		#onChangeNativeTrack(event) {
			let enabledTrack = this.#getEnabledNativeTrack();
			if (!enabledTrack) return;
			const track = this.#ctx.audioTracks.getById(enabledTrack.id);
			if (track) this.#ctx.audioTracks[ListSymbol.select](track, true, event);
		}
		#getEnabledNativeTrack() {
			return Array.from(this.#nativeTracks).find((track) => track.enabled);
		}
		#onChangeTrack(event) {
			const { current } = event.detail;
			if (!current) return;
			const track = this.#nativeTracks.getTrackById(current.id);
			if (track) {
				const prev = this.#getEnabledNativeTrack();
				if (prev) prev.enabled = false;
				track.enabled = true;
			}
		}
	};
}));

//#endregion
//#region src/providers/html/provider.ts
var HTMLMediaProvider;
var init_provider$6 = __esmMin((() => {
	init_dev();
	init_std();
	init_mime();
	init_audio_gain();
	init_html_media_events();
	init_native_audio_tracks();
	HTMLMediaProvider = class {
		media;
		ctx;
		scope = createScope();
		currentSrc = null;
		audioGain;
		constructor(media, ctx) {
			this.media = media;
			this.ctx = ctx;
			this.audioGain = new AudioGain(media, (gain) => {
				this.ctx.notify("audio-gain-change", gain);
			});
		}
		setup() {
			new HTMLMediaEvents(this, this.ctx);
			if ("audioTracks" in this.media) new NativeAudioTracks(this, this.ctx);
			onDispose(() => {
				this.audioGain.destroy();
				this.media.srcObject = null;
				this.media.removeAttribute("src");
				for (const source of this.media.querySelectorAll("source")) source.remove();
				this.media.load();
			});
		}
		get type() {
			return "";
		}
		setPlaybackRate(rate) {
			this.media.playbackRate = rate;
		}
		async play() {
			return this.media.play();
		}
		async pause() {
			return this.media.pause();
		}
		setMuted(muted) {
			this.media.muted = muted;
		}
		setVolume(volume) {
			this.media.volume = volume;
		}
		setCurrentTime(time) {
			this.media.currentTime = time;
		}
		setPlaysInline(inline) {
			setAttribute(this.media, "playsinline", inline);
		}
		async loadSource({ src, type }, preload) {
			this.media.preload = preload || "";
			if (isMediaStream(src)) {
				this.removeSource();
				this.media.srcObject = src;
			} else {
				this.media.srcObject = null;
				if (isString(src)) if (type !== "?") this.appendSource({
					src,
					type
				});
				else {
					this.removeSource();
					this.media.src = this.#appendMediaFragment(src);
				}
				else {
					this.removeSource();
					this.media.src = window.URL.createObjectURL(src);
				}
			}
			this.media.load();
			this.currentSrc = {
				src,
				type
			};
		}
		/**
		* Append source so it works when requesting AirPlay since hls.js will remove it.
		*/
		appendSource(src, defaultType) {
			const prevSource = this.media.querySelector("source[data-vds]"), source = prevSource ?? document.createElement("source");
			setAttribute(source, "src", this.#appendMediaFragment(src.src));
			setAttribute(source, "type", src.type !== "?" ? src.type : defaultType);
			setAttribute(source, "data-vds", "");
			if (!prevSource) this.media.append(source);
		}
		removeSource() {
			this.media.querySelector("source[data-vds]")?.remove();
		}
		#appendMediaFragment(src) {
			const { clipStartTime, clipEndTime } = this.ctx.$state, startTime = clipStartTime(), endTime = clipEndTime();
			if (startTime > 0 && endTime > 0) return `${src}#t=${startTime},${endTime}`;
			else if (startTime > 0) return `${src}#t=${startTime}`;
			else if (endTime > 0) return `${src}#t=0,${endTime}`;
			return src;
		}
	};
}));

//#endregion
//#region src/providers/html/remote-playback.ts
var HTMLRemotePlaybackAdapter, HTMLAirPlayAdapter;
var init_remote_playback = __esmMin((() => {
	init_dev();
	init_std();
	HTMLRemotePlaybackAdapter = class {
		#media;
		#ctx;
		#state;
		#supported = signal(false);
		get supported() {
			return this.#supported();
		}
		constructor(media, ctx) {
			this.#media = media;
			this.#ctx = ctx;
			this.#setup();
		}
		#setup() {
			if (!this.#media?.remote || !this.canPrompt) return;
			this.#media.remote.watchAvailability((available) => {
				this.#supported.set(available);
			}).catch(() => {
				this.#supported.set(false);
			});
			effect(this.#watchSupported.bind(this));
		}
		#watchSupported() {
			if (!this.#supported()) return;
			const events = [
				"connecting",
				"connect",
				"disconnect"
			], onStateChange = this.#onStateChange.bind(this);
			onStateChange();
			listenEvent(this.#media, "playing", onStateChange);
			const remoteEvents = new EventsController(this.#media.remote);
			for (const type of events) remoteEvents.add(type, onStateChange);
		}
		async prompt() {
			if (!this.supported) throw Error("Not supported on this platform.");
			if (this.type === "airplay" && this.#media.webkitShowPlaybackTargetPicker) return this.#media.webkitShowPlaybackTargetPicker();
			return this.#media.remote.prompt();
		}
		#onStateChange(event) {
			const state = this.#media.remote.state;
			if (state === this.#state) return;
			const detail = {
				type: this.type,
				state
			};
			this.#ctx.notify("remote-playback-change", detail, event);
			this.#state = state;
		}
	};
	HTMLAirPlayAdapter = class extends HTMLRemotePlaybackAdapter {
		type = "airplay";
		get canPrompt() {
			return "WebKitPlaybackTargetAvailabilityEvent" in window;
		}
	};
}));

//#endregion
//#region src/providers/audio/provider.ts
var provider_exports$5 = /* @__PURE__ */ __exportAll({ AudioProvider: () => AudioProvider });
var AudioProvider;
var init_provider$5 = __esmMin((() => {
	init_dev();
	init_provider$6();
	init_remote_playback();
	AudioProvider = class extends HTMLMediaProvider {
		$$PROVIDER_TYPE = "AUDIO";
		get type() {
			return "audio";
		}
		airPlay;
		constructor(audio, ctx) {
			super(audio, ctx);
			scoped(() => {
				this.airPlay = new HTMLAirPlayAdapter(this.media, ctx);
			}, this.scope);
		}
		setup() {
			super.setup();
			if (this.type === "audio") this.ctx.notify("provider-setup", this);
		}
		/**
		* The native HTML `<audio>` element.
		*
		* @see {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLAudioElement}
		*/
		get audio() {
			return this.media;
		}
	};
}));

//#endregion
//#region src/providers/audio/loader.ts
init_std();
init_mime();
init_support();
var AudioProviderLoader = class {
	name = "audio";
	target;
	canPlay(src) {
		if (!isAudioSrc(src)) return false;
		return !isString(src.src) || src.type === "?" || canPlayAudioType(this.target, src.type);
	}
	mediaType() {
		return "audio";
	}
	async load(ctx) {
		if (!this.target) throw Error("[vidstack] `<audio>` element was not found - did you forget to include `<media-provider>`?");
		return new (await (Promise.resolve().then(() => (init_provider$5(), provider_exports$5)))).AudioProvider(this.target, ctx);
	}
};

//#endregion
//#region src/providers/video/native-hls-text-tracks.ts
function findTextTrackElement(video, track) {
	return Array.from(video.children).find((el) => el.track === track);
}
var NativeHLSTextTracks;
var init_native_hls_text_tracks = __esmMin((() => {
	init_dev();
	init_symbols$2();
	init_text_track();
	NativeHLSTextTracks = class {
		#video;
		#ctx;
		constructor(video, ctx) {
			this.#video = video;
			this.#ctx = ctx;
			video.textTracks.onaddtrack = this.#onAddTrack.bind(this);
			onDispose(this.#onDispose.bind(this));
		}
		#onAddTrack(event) {
			const nativeTrack = event.track;
			if (!nativeTrack || findTextTrackElement(this.#video, nativeTrack)) return;
			const track = new TextTrack({
				id: nativeTrack.id,
				kind: nativeTrack.kind,
				label: nativeTrack.label ?? "",
				language: nativeTrack.language,
				type: "vtt"
			});
			track[TextTrackSymbol.native] = { track: nativeTrack };
			track[TextTrackSymbol.readyState] = 2;
			track[TextTrackSymbol.nativeHLS] = true;
			let lastIndex = 0;
			const onCueChange = (event) => {
				if (!nativeTrack.cues) return;
				for (let i = lastIndex; i < nativeTrack.cues.length; i++) {
					track.addCue(nativeTrack.cues[i], event);
					lastIndex++;
				}
			};
			onCueChange(event);
			nativeTrack.oncuechange = onCueChange;
			this.#ctx.textTracks.add(track, event);
			track.setMode(nativeTrack.mode, event);
		}
		#onDispose() {
			this.#video.textTracks.onaddtrack = null;
			for (const track of this.#ctx.textTracks) {
				const nativeTrack = track[TextTrackSymbol.native]?.track;
				if (nativeTrack?.oncuechange) nativeTrack.oncuechange = null;
			}
		}
	};
}));

//#endregion
//#region src/providers/video/picture-in-picture.ts
var VideoPictureInPicture;
var init_picture_in_picture = __esmMin((() => {
	init_std();
	init_support();
	VideoPictureInPicture = class {
		#video;
		#media;
		constructor(video, media) {
			this.#video = video;
			this.#media = media;
			new EventsController(video).add("enterpictureinpicture", this.#onEnter.bind(this)).add("leavepictureinpicture", this.#onExit.bind(this));
		}
		get active() {
			return document.pictureInPictureElement === this.#video;
		}
		get supported() {
			return canUsePictureInPicture(this.#video);
		}
		async enter() {
			return this.#video.requestPictureInPicture();
		}
		exit() {
			return document.exitPictureInPicture();
		}
		#onEnter(event) {
			this.#onChange(true, event);
		}
		#onExit(event) {
			this.#onChange(false, event);
		}
		#onChange = (active, event) => {
			this.#media.notify("picture-in-picture-change", active, event);
		};
	};
}));

//#endregion
//#region src/providers/video/presentation/video-presentation.ts
var VideoPresentation, FullscreenPresentationAdapter, PIPPresentationAdapter;
var init_video_presentation = __esmMin((() => {
	init_std();
	init_support();
	VideoPresentation = class {
		#video;
		#media;
		#mode = "inline";
		get mode() {
			return this.#mode;
		}
		constructor(video, media) {
			this.#video = video;
			this.#media = media;
			listenEvent(video, "webkitpresentationmodechanged", this.#onModeChange.bind(this));
		}
		get supported() {
			return canUseVideoPresentation(this.#video);
		}
		async setPresentationMode(mode) {
			if (this.#mode === mode) return;
			this.#video.webkitSetPresentationMode(mode);
		}
		#onModeChange(event) {
			const prevMode = this.#mode;
			this.#mode = this.#video.webkitPresentationMode;
			this.#media.logger?.infoGroup("presentation mode change").labelledLog("Mode", this.#mode).labelledLog("Event", event).dispatch();
			this.#media.player?.dispatch(new DOMEvent("video-presentation-change", {
				detail: this.#mode,
				trigger: event
			}));
			["fullscreen", "picture-in-picture"].forEach((type) => {
				if (this.#mode === type || prevMode === type) this.#media.notify(`${type}-change`, this.#mode === type, event);
			});
		}
	};
	FullscreenPresentationAdapter = class {
		#presentation;
		get active() {
			return this.#presentation.mode === "fullscreen";
		}
		get supported() {
			return this.#presentation.supported;
		}
		constructor(presentation) {
			this.#presentation = presentation;
		}
		async enter() {
			this.#presentation.setPresentationMode("fullscreen");
		}
		async exit() {
			this.#presentation.setPresentationMode("inline");
		}
	};
	PIPPresentationAdapter = class {
		#presentation;
		get active() {
			return this.#presentation.mode === "picture-in-picture";
		}
		get supported() {
			return this.#presentation.supported;
		}
		constructor(presentation) {
			this.#presentation = presentation;
		}
		async enter() {
			this.#presentation.setPresentationMode("picture-in-picture");
		}
		async exit() {
			this.#presentation.setPresentationMode("inline");
		}
	};
}));

//#endregion
//#region src/providers/video/provider.ts
var provider_exports$4 = /* @__PURE__ */ __exportAll({ VideoProvider: () => VideoProvider });
var VideoProvider;
var init_provider$4 = __esmMin((() => {
	init_dev();
	init_support();
	init_provider$6();
	init_remote_playback();
	init_native_hls_text_tracks();
	init_picture_in_picture();
	init_video_presentation();
	VideoProvider = class extends HTMLMediaProvider {
		$$PROVIDER_TYPE = "VIDEO";
		get type() {
			return "video";
		}
		airPlay;
		fullscreen;
		pictureInPicture;
		constructor(video, ctx) {
			super(video, ctx);
			scoped(() => {
				this.airPlay = new HTMLAirPlayAdapter(video, ctx);
				if (canUseVideoPresentation(video)) {
					const presentation = new VideoPresentation(video, ctx);
					this.fullscreen = new FullscreenPresentationAdapter(presentation);
					this.pictureInPicture = new PIPPresentationAdapter(presentation);
				} else if (canUsePictureInPicture(video)) this.pictureInPicture = new VideoPictureInPicture(video, ctx);
			}, this.scope);
		}
		setup() {
			super.setup();
			if (canPlayHLSNatively(this.video)) new NativeHLSTextTracks(this.video, this.ctx);
			this.ctx.textRenderers.attachVideo(this.video);
			onDispose(() => {
				this.ctx.textRenderers.attachVideo(null);
			});
			if (this.type === "video") this.ctx.notify("provider-setup", this);
		}
		/**
		* The native HTML `<video>` element.
		*
		* @see {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement}
		*/
		get video() {
			return this.media;
		}
	};
}));

//#endregion
//#region src/providers/video/loader.ts
init_std();
init_mime();
init_support();
var VideoProviderLoader = class {
	name = "video";
	target;
	canPlay(src) {
		if (!isVideoSrc(src)) return false;
		return !isString(src.src) || src.type === "?" || canPlayVideoType(this.target, src.type);
	}
	mediaType() {
		return "video";
	}
	async load(ctx) {
		if (!this.target) throw Error("[vidstack] `<video>` element was not found - did you forget to include media provider?");
		return new (await (Promise.resolve().then(() => (init_provider$4(), provider_exports$4)))).VideoProvider(this.target, ctx);
	}
};

//#endregion
//#region src/utils/language.ts
/**
* Gets the language name corresponding to the provided language code.
*
* @param {string} langCode - The language code (e.g.,"en", "en-us", "es-es", "fr-fr").
* @returns {string} The localized language name based on the user's preferred languages,
*                   or `null` if the language code is not recognized.
*/
function getLangName(langCode) {
	try {
		return new Intl.DisplayNames(navigator.languages, { type: "language" }).of(langCode) ?? null;
	} catch (err) {
		return null;
	}
}
var init_language = __esmMin((() => {}));

//#endregion
//#region src/providers/dash/dash.ts
var toDOMEventType$1, DASHController;
var init_dash = __esmMin((() => {
	init_dev();
	init_std();
	init_symbols();
	init_symbols$2();
	init_text_track();
	init_symbols$1();
	init_raf_loop();
	init_language();
	init_support();
	toDOMEventType$1 = (type) => `dash-${camelToKebabCase(type)}`;
	DASHController = class {
		#video;
		#ctx;
		#instance = null;
		#callbacks = /* @__PURE__ */ new Set();
		#stopLiveSync = null;
		config = {};
		get instance() {
			return this.#instance;
		}
		constructor(video, ctx) {
			this.#video = video;
			this.#ctx = ctx;
		}
		setup(ctor) {
			this.#instance = ctor().create();
			const dispatcher = this.#dispatchDASHEvent.bind(this);
			for (const event of Object.values(ctor.events)) this.#instance.on(event, dispatcher);
			this.#instance.on(ctor.events.ERROR, this.#onError.bind(this));
			for (const callback of this.#callbacks) callback(this.#instance);
			this.#ctx.player.dispatch("dash-instance", { detail: this.#instance });
			this.#instance.initialize(this.#video, void 0, false);
			this.#instance.updateSettings({
				streaming: {
					text: {
						defaultEnabled: false,
						dispatchForManualRendering: true
					},
					buffer: { fastSwitchEnabled: true }
				},
				...this.config
			});
			this.#instance.on(ctor.events.FRAGMENT_LOADING_STARTED, this.#onFragmentLoadStart.bind(this));
			this.#instance.on(ctor.events.FRAGMENT_LOADING_COMPLETED, this.#onFragmentLoadComplete.bind(this));
			this.#instance.on(ctor.events.MANIFEST_LOADED, this.#onManifestLoaded.bind(this));
			this.#instance.on(ctor.events.QUALITY_CHANGE_RENDERED, this.#onQualityChange.bind(this));
			this.#instance.on(ctor.events.TEXT_TRACKS_ADDED, this.#onTextTracksAdded.bind(this));
			this.#instance.on(ctor.events.TRACK_CHANGE_RENDERED, this.#onTrackChange.bind(this));
			this.#ctx.qualities[QualitySymbol.enableAuto] = this.#enableAutoQuality.bind(this);
			listenEvent(this.#ctx.qualities, "change", this.#onUserQualityChange.bind(this));
			listenEvent(this.#ctx.audioTracks, "change", this.#onUserAudioChange.bind(this));
			this.#stopLiveSync = effect(this.#liveSync.bind(this));
		}
		#createDOMEvent(event) {
			return new DOMEvent(toDOMEventType$1(event.type), { detail: event });
		}
		#liveSync() {
			if (!this.#ctx.$state.live()) return;
			const raf = new RAFLoop(this.#liveSyncPosition.bind(this));
			raf.start();
			return raf.stop.bind(raf);
		}
		#liveSyncPosition() {
			if (!this.#instance) return;
			const position = this.#instance.duration() - this.#instance.time();
			this.#ctx.$state.liveSyncPosition.set(!isNaN(position) ? position : Infinity);
		}
		#dispatchDASHEvent(event) {
			this.#ctx.player?.dispatch(this.#createDOMEvent(event));
		}
		#currentTrack = null;
		#cueTracker = {};
		#onTextFragmentLoaded(event) {
			const native = this.#currentTrack?.[TextTrackSymbol.native], cues = (native?.track).cues;
			if (!native || !cues) return;
			const id = this.#currentTrack.id, startIndex = this.#cueTracker[id] ?? 0, trigger = this.#createDOMEvent(event);
			for (let i = startIndex; i < cues.length; i++) {
				const cue = cues[i];
				if (!cue.positionAlign) cue.positionAlign = "auto";
				this.#currentTrack.addCue(cue, trigger);
			}
			this.#cueTracker[id] = cues.length;
		}
		#onTextTracksAdded(event) {
			if (!this.#instance) return;
			const data = event.tracks, nativeTextTracks = [...this.#video.textTracks].filter((track) => "manualMode" in track), trigger = this.#createDOMEvent(event);
			for (let i = 0; i < nativeTextTracks.length; i++) {
				const textTrackInfo = data[i], nativeTextTrack = nativeTextTracks[i];
				const track = new TextTrack({
					id: `dash-${textTrackInfo.kind}-${i}`,
					label: textTrackInfo?.label ?? textTrackInfo.labels.find((t) => t.text)?.text ?? (textTrackInfo?.lang && getLangName(textTrackInfo.lang)) ?? textTrackInfo?.lang ?? void 0,
					language: textTrackInfo.lang ?? void 0,
					kind: textTrackInfo.kind,
					default: textTrackInfo.defaultTrack
				});
				track[TextTrackSymbol.native] = {
					managed: true,
					track: nativeTextTrack
				};
				track[TextTrackSymbol.readyState] = 2;
				track[TextTrackSymbol.onModeChange] = () => {
					if (!this.#instance) return;
					if (track.mode === "showing") {
						this.#instance.setTextTrack(i);
						this.#currentTrack = track;
					} else {
						this.#instance.setTextTrack(-1);
						this.#currentTrack = null;
					}
				};
				this.#ctx.textTracks.add(track, trigger);
			}
		}
		#onTrackChange(event) {
			const { mediaType, newMediaInfo } = event;
			if (mediaType === "audio") {
				const track = this.#ctx.audioTracks.getById(`dash-audio-${newMediaInfo.index}`);
				if (track) {
					const trigger = this.#createDOMEvent(event);
					this.#ctx.audioTracks[ListSymbol.select](track, true, trigger);
				}
			}
		}
		#onQualityChange(event) {
			if (event.mediaType !== "video") return;
			const quality = this.#ctx.qualities[event.newQuality];
			if (quality) {
				const trigger = this.#createDOMEvent(event);
				this.#ctx.qualities[ListSymbol.select](quality, true, trigger);
			}
		}
		#onManifestLoaded(event) {
			if (this.#ctx.$state.canPlay() || !this.#instance) return;
			const { type, mediaPresentationDuration } = event.data, trigger = this.#createDOMEvent(event);
			this.#ctx.notify("stream-type-change", type !== "static" ? "live" : "on-demand", trigger);
			this.#ctx.notify("duration-change", mediaPresentationDuration, trigger);
			this.#ctx.qualities[QualitySymbol.setAuto](true, trigger);
			const media = this.#instance.getVideoElement();
			const videoQualities = this.#instance.getTracksForTypeFromManifest("video", event.data);
			const supportedVideoMimeType = [...new Set(videoQualities.map((e) => e.mimeType))].find((type) => type && canPlayVideoType(media, type));
			const videoQuality = videoQualities.find((track) => supportedVideoMimeType === track.mimeType);
			let audioTracks = this.#instance.getTracksForTypeFromManifest("audio", event.data);
			const supportedAudioMimeType = [...new Set(audioTracks.map((e) => e.mimeType))].find((type) => type && canPlayAudioType(media, type));
			audioTracks = audioTracks.filter((track) => supportedAudioMimeType === track.mimeType);
			if (videoQuality) {
				videoQuality.bitrateList.forEach((bitrate, index) => {
					const quality = {
						id: bitrate.id?.toString() ?? `dash-bitrate-${index}`,
						width: bitrate.width ?? 0,
						height: bitrate.height ?? 0,
						bitrate: bitrate.bandwidth ?? 0,
						codec: videoQuality.codec,
						index
					};
					this.#ctx.qualities[ListSymbol.add](quality, trigger);
				});
				if (isNumber(videoQuality.index)) {
					const quality = this.#ctx.qualities[videoQuality.index];
					if (quality) this.#ctx.qualities[ListSymbol.select](quality, true, trigger);
				}
			}
			audioTracks.forEach((audioTrack, index) => {
				const label = audioTrack.labels.find((label) => {
					return navigator.languages.some((language) => {
						return label.lang && language.toLowerCase().startsWith(label.lang.toLowerCase());
					});
				}) || audioTrack.labels[0];
				const localTrack = {
					id: `dash-audio-${audioTrack?.index}`,
					label: label?.text ?? (audioTrack.lang && getLangName(audioTrack.lang)) ?? audioTrack.lang ?? "",
					language: audioTrack.lang ?? "",
					kind: "main",
					mimeType: audioTrack.mimeType,
					codec: audioTrack.codec,
					index
				};
				this.#ctx.audioTracks[ListSymbol.add](localTrack, trigger);
			});
			media.dispatchEvent(new DOMEvent("canplay", { trigger }));
		}
		#onError(event) {
			const { type: eventType, error: data } = event;
			this.#ctx.logger?.errorGroup(`[vidstack] DASH error \`${data.message}\``).labelledLog("Media Element", this.#video).labelledLog("DASH Instance", this.#instance).labelledLog("Event Type", eventType).labelledLog("Data", data).labelledLog("Src", peek(this.#ctx.$state.source)).labelledLog("Media Store", { ...this.#ctx.$state }).dispatch();
			switch (data.code) {
				case 27:
					this.#onNetworkError(data);
					break;
				default:
					this.#onFatalError(data);
					break;
			}
		}
		#onFragmentLoadStart() {
			if (this.#retryLoadingTimer >= 0) this.#clearRetryTimer();
		}
		#onFragmentLoadComplete(event) {
			if (event.mediaType === "text") requestAnimationFrame(this.#onTextFragmentLoaded.bind(this, event));
		}
		#retryLoadingTimer = -1;
		#onNetworkError(error) {
			this.#clearRetryTimer();
			this.#instance?.play();
			this.#retryLoadingTimer = window.setTimeout(() => {
				this.#retryLoadingTimer = -1;
				this.#onFatalError(error);
			}, 5e3);
		}
		#clearRetryTimer() {
			clearTimeout(this.#retryLoadingTimer);
			this.#retryLoadingTimer = -1;
		}
		#onFatalError(error) {
			this.#ctx.notify("error", {
				message: error.message ?? "",
				code: 1,
				error
			});
		}
		#enableAutoQuality() {
			this.#switchAutoBitrate("video", true);
			const { qualities } = this.#ctx;
			this.#instance?.setQualityFor("video", qualities.selectedIndex, true);
		}
		#switchAutoBitrate(type, auto) {
			this.#instance?.updateSettings({ streaming: { abr: { autoSwitchBitrate: { [type]: auto } } } });
		}
		#onUserQualityChange() {
			const { qualities } = this.#ctx;
			if (!this.#instance || qualities.auto || !qualities.selected) return;
			this.#switchAutoBitrate("video", false);
			this.#instance.setQualityFor("video", qualities.selectedIndex, qualities.switch === "current");
			/**
			* Chrome has some strange issue with detecting keyframes inserted before the current
			* playhead position. This can cause playback to freeze until a new keyframe. It seems
			* setting the current time forces chrome to seek back to the last keyframe and adjust
			* playback. Weird fix, but it works!
			*/
			if (IS_CHROME) this.#video.currentTime = this.#video.currentTime;
		}
		#onUserAudioChange() {
			if (!this.#instance) return;
			const { audioTracks } = this.#ctx, selectedTrack = this.#instance.getTracksFor("audio").find((track) => audioTracks.selected && audioTracks.selected.id === `dash-audio-${track.index}`);
			if (selectedTrack) this.#instance.setCurrentTrack(selectedTrack);
		}
		#reset() {
			this.#clearRetryTimer();
			this.#currentTrack = null;
			this.#cueTracker = {};
		}
		onInstance(callback) {
			this.#callbacks.add(callback);
			return () => this.#callbacks.delete(callback);
		}
		loadSource(src) {
			this.#reset();
			if (!isString(src.src)) return;
			this.#instance?.attachSource(src.src);
		}
		destroy() {
			this.#reset();
			this.#instance?.destroy();
			this.#instance = null;
			this.#stopLiveSync?.();
			this.#stopLiveSync = null;
			this.#ctx?.logger?.info("🏗️ Destroyed DASH instance");
		}
	};
}));

//#endregion
//#region src/providers/dash/lib-loader.ts
async function importDASH(loader, callbacks = {}) {
	if (isUndefined(loader)) return void 0;
	callbacks.onLoadStart?.();
	if (isDASHConstructor(loader)) {
		callbacks.onLoaded?.(loader);
		return loader;
	}
	if (isDASHNamespace(loader)) {
		const ctor = loader.MediaPlayer;
		callbacks.onLoaded?.(ctor);
		return ctor;
	}
	try {
		const ctor = (await loader())?.default;
		if (isDASHNamespace(ctor)) {
			callbacks.onLoaded?.(ctor.MediaPlayer);
			return ctor.MediaPlayer;
		}
		if (ctor) callbacks.onLoaded?.(ctor);
		else throw Error("[vidstack] failed importing `dash.js`. Dynamic import returned invalid object.");
		return ctor;
	} catch (err) {
		callbacks.onLoadError?.(err);
	}
}
/**
* Loads `dash.js` from the remote source given via `library` into the window namespace. This
* is because `dash.js` in {currentYear} still doesn't provide a ESM export. This method will
* return `undefined` if it fails to load the script. Listen to `dash-lib-load-error` to be
* notified of any failures.
*/
async function loadDASHScript(src, callbacks = {}) {
	if (!isString(src)) return void 0;
	callbacks.onLoadStart?.();
	try {
		await loadScript(src);
		if (!isFunction(window.dashjs.MediaPlayer)) throw Error("[vidstack] failed loading `dash.js`. Could not find a valid `Dash` constructor on window");
		const ctor = window.dashjs.MediaPlayer;
		callbacks.onLoaded?.(ctor);
		return ctor;
	} catch (err) {
		callbacks.onLoadError?.(err);
	}
}
function isDASHConstructor(value) {
	return value && value.prototype && value.prototype !== Function;
}
function isDASHNamespace(value) {
	return value && "MediaPlayer" in value;
}
var DASHLibLoader;
var init_lib_loader$1 = __esmMin((() => {
	init_std();
	init_error();
	init_network();
	DASHLibLoader = class {
		#lib;
		#ctx;
		#callback;
		constructor(lib, ctx, callback) {
			this.#lib = lib;
			this.#ctx = ctx;
			this.#callback = callback;
			this.#startLoading();
		}
		async #startLoading() {
			this.#ctx.logger?.info("🏗️ Loading DASH Library");
			const callbacks = {
				onLoadStart: this.#onLoadStart.bind(this),
				onLoaded: this.#onLoaded.bind(this),
				onLoadError: this.#onLoadError.bind(this)
			};
			let ctor = await loadDASHScript(this.#lib, callbacks);
			if (isUndefined(ctor) && !isString(this.#lib)) ctor = await importDASH(this.#lib, callbacks);
			if (!ctor) return null;
			if (!window.dashjs.supportsMediaSource()) {
				const message = "[vidstack] `dash.js` is not supported in this environment";
				this.#ctx.logger?.error(message);
				this.#ctx.player.dispatch(new DOMEvent("dash-unsupported"));
				this.#ctx.notify("error", {
					message,
					code: 4
				});
				return null;
			}
			return ctor;
		}
		#onLoadStart() {
			this.#ctx.logger?.infoGroup("Starting to load `dash.js`").labelledLog("URL", this.#lib).dispatch();
			this.#ctx.player.dispatch(new DOMEvent("dash-lib-load-start"));
		}
		#onLoaded(ctor) {
			this.#ctx.logger?.infoGroup("Loaded `dash.js`").labelledLog("Library", this.#lib).labelledLog("Constructor", ctor).dispatch();
			this.#ctx.player.dispatch(new DOMEvent("dash-lib-loaded", { detail: ctor }));
			this.#callback(ctor);
		}
		#onLoadError(e) {
			const error = coerceToError(e);
			this.#ctx.logger?.errorGroup("[vidstack] Failed to load `dash.js`").labelledLog("Library", this.#lib).labelledLog("Error", e).dispatch();
			this.#ctx.player.dispatch(new DOMEvent("dash-lib-load-error", { detail: error }));
			this.#ctx.notify("error", {
				message: error.message,
				code: 4,
				error
			});
		}
	};
}));

//#endregion
//#region src/providers/dash/provider.ts
var provider_exports$3 = /* @__PURE__ */ __exportAll({ DASHProvider: () => DASHProvider });
var JS_DELIVR_CDN$1, DASHProvider;
var init_provider$3 = __esmMin((() => {
	init_dev();
	init_std();
	init_network();
	init_support();
	init_provider$4();
	init_dash();
	init_lib_loader$1();
	JS_DELIVR_CDN$1 = "https://cdn.jsdelivr.net";
	DASHProvider = class extends VideoProvider {
		$$PROVIDER_TYPE = "DASH";
		#ctor = null;
		#controller = new DASHController(this.video, this.ctx);
		/**
		* The `dash.js` constructor.
		*/
		get ctor() {
			return this.#ctor;
		}
		/**
		* The current `dash.js` instance.
		*/
		get instance() {
			return this.#controller.instance;
		}
		/**
		* Whether `dash.js` is supported in this environment.
		*/
		static supported = isDASHSupported();
		get type() {
			return "dash";
		}
		get canLiveSync() {
			return true;
		}
		#library = `${JS_DELIVR_CDN$1}/npm/dashjs@4.7.4/dist/dash.all.debug.js`;
		/**
		* The `dash.js` configuration object.
		*
		* @see {@link https://cdn.dashjs.org/latest/jsdoc/module-Settings.html}
		*/
		get config() {
			return this.#controller.config;
		}
		set config(config) {
			this.#controller.config = config;
		}
		/**
		* The `dash.js` constructor (supports dynamic imports) or a URL of where it can be found.
		*
		* @defaultValue `https://cdn.jsdelivr.net/npm/dashjs@4.7.4/dist/dash.all.min.js`
		*/
		get library() {
			return this.#library;
		}
		set library(library) {
			this.#library = library;
		}
		preconnect() {
			if (!isString(this.#library)) return;
			preconnect(this.#library);
		}
		setup() {
			super.setup();
			new DASHLibLoader(this.#library, this.ctx, (ctor) => {
				this.#ctor = ctor;
				this.#controller.setup(ctor);
				this.ctx.notify("provider-setup", this);
				const src = peek(this.ctx.$state.source);
				if (src) this.loadSource(src);
			});
		}
		async loadSource(src, preload) {
			if (!isString(src.src)) {
				this.removeSource();
				return;
			}
			this.media.preload = preload || "";
			this.appendSource(src, "application/x-mpegurl");
			this.#controller.loadSource(src);
			this.currentSrc = src;
		}
		/**
		* The given callback is invoked when a new `dash.js` instance is created and right before it's
		* attached to media.
		*/
		onInstance(callback) {
			const instance = this.#controller.instance;
			if (instance) callback(instance);
			return this.#controller.onInstance(callback);
		}
		destroy() {
			this.#controller.destroy();
		}
	};
}));

//#endregion
//#region src/providers/dash/loader.ts
init_mime();
init_support();
var DASHProviderLoader = class DASHProviderLoader extends VideoProviderLoader {
	static supported = isDASHSupported();
	name = "dash";
	canPlay(src) {
		return DASHProviderLoader.supported && isDASHSrc(src);
	}
	async load(context) {
		if (!this.target) throw Error("[vidstack] `<video>` element was not found - did you forget to include `<media-provider>`?");
		return new (await (Promise.resolve().then(() => (init_provider$3(), provider_exports$3)))).DASHProvider(this.target, context);
	}
};

//#endregion
//#region src/providers/hls/hls.ts
var toDOMEventType, HLSController;
var init_hls = __esmMin((() => {
	init_dev();
	init_std();
	init_symbols();
	init_symbols$2();
	init_text_track();
	init_symbols$1();
	init_raf_loop();
	init_support();
	toDOMEventType = (type) => camelToKebabCase(type);
	HLSController = class {
		#video;
		#ctx;
		#instance = null;
		#stopLiveSync = null;
		config = {};
		#callbacks = /* @__PURE__ */ new Set();
		get instance() {
			return this.#instance;
		}
		constructor(video, ctx) {
			this.#video = video;
			this.#ctx = ctx;
		}
		setup(ctor) {
			const { streamType } = this.#ctx.$state;
			const isLive = peek(streamType).includes("live"), isLiveLowLatency = peek(streamType).includes("ll-");
			const instance = this.#instance = new ctor({
				lowLatencyMode: isLiveLowLatency,
				backBufferLength: isLiveLowLatency ? 4 : isLive ? 8 : void 0,
				renderTextTracksNatively: false,
				...this.config
			});
			const guard = (callback) => (eventType, data) => {
				if (this.#instance !== instance) return;
				callback(eventType, data);
			};
			const dispatcher = guard(this.#dispatchHLSEvent.bind(this));
			for (const event of Object.values(ctor.Events)) instance.on(event, dispatcher);
			instance.on(ctor.Events.ERROR, guard(this.#onError.bind(this)));
			for (const callback of this.#callbacks) callback(instance);
			this.#ctx.player.dispatch("hls-instance", { detail: instance });
			instance.attachMedia(this.#video);
			instance.on(ctor.Events.AUDIO_TRACK_SWITCHED, guard(this.#onAudioSwitch.bind(this)));
			instance.on(ctor.Events.LEVEL_SWITCHED, guard(this.#onLevelSwitched.bind(this)));
			instance.on(ctor.Events.LEVEL_LOADED, guard(this.#onLevelLoaded.bind(this, instance)));
			instance.on(ctor.Events.LEVEL_UPDATED, guard(this.#onLevelUpdated.bind(this)));
			instance.on(ctor.Events.NON_NATIVE_TEXT_TRACKS_FOUND, guard(this.#onTracksFound.bind(this, instance)));
			instance.on(ctor.Events.CUES_PARSED, guard(this.#onCuesParsed.bind(this, instance)));
			this.#ctx.qualities[QualitySymbol.enableAuto] = this.#enableAutoQuality.bind(this);
			listenEvent(this.#ctx.qualities, "change", this.#onUserQualityChange.bind(this));
			listenEvent(this.#ctx.audioTracks, "change", this.#onUserAudioChange.bind(this));
			this.#stopLiveSync = effect(this.#liveSync.bind(this));
		}
		#createDOMEvent(type, data) {
			return new DOMEvent(toDOMEventType(type), { detail: data });
		}
		#liveSync() {
			if (!this.#ctx.$state.live()) return;
			const raf = new RAFLoop(this.#liveSyncPosition.bind(this));
			raf.start();
			return raf.stop.bind(raf);
		}
		#liveSyncPosition() {
			this.#ctx.$state.liveSyncPosition.set(this.#instance?.liveSyncPosition ?? Infinity);
		}
		#dispatchHLSEvent(type, data) {
			this.#ctx.player?.dispatch(this.#createDOMEvent(type, data));
		}
		#onTracksFound(instance, eventType, data) {
			const event = this.#createDOMEvent(eventType, data);
			let currentTrack = -1;
			for (let i = 0; i < data.tracks.length; i++) {
				const nonNativeTrack = data.tracks[i], init = nonNativeTrack.subtitleTrack ?? nonNativeTrack.closedCaptions, track = new TextTrack({
					id: `hls-${nonNativeTrack.kind}-${i}`,
					src: init?.url,
					label: nonNativeTrack.label,
					language: init?.lang,
					kind: nonNativeTrack.kind,
					default: nonNativeTrack.default
				});
				track[TextTrackSymbol.readyState] = 2;
				track[TextTrackSymbol.onModeChange] = () => {
					if (this.#instance !== instance) return;
					if (track.mode === "showing") {
						instance.subtitleTrack = i;
						currentTrack = i;
					} else if (currentTrack === i) {
						instance.subtitleTrack = -1;
						currentTrack = -1;
					}
				};
				this.#ctx.textTracks.add(track, event);
			}
		}
		#onCuesParsed(instance, eventType, data) {
			const index = instance.subtitleTrack, track = this.#ctx.textTracks.getById(`hls-${data.type}-${index}`);
			if (!track) return;
			const event = this.#createDOMEvent(eventType, data);
			for (const cue of data.cues) {
				cue.positionAlign = "auto";
				track.addCue(cue, event);
			}
		}
		#onAudioSwitch(eventType, data) {
			const track = this.#ctx.audioTracks[data.id];
			if (track) {
				const trigger = this.#createDOMEvent(eventType, data);
				this.#ctx.audioTracks[ListSymbol.select](track, true, trigger);
			}
		}
		#onLevelSwitched(eventType, data) {
			const quality = this.#ctx.qualities[data.level];
			if (quality) {
				const trigger = this.#createDOMEvent(eventType, data);
				this.#ctx.qualities[ListSymbol.select](quality, true, trigger);
			}
		}
		#onLevelUpdated(eventType, data) {
			if (data.details.totalduration > 0) this.#ctx.$state.inferredLiveDVRWindow.set(data.details.totalduration);
		}
		#onLevelLoaded(instance, eventType, data) {
			if (this.#ctx.$state.canPlay()) return;
			const media = instance.media;
			if (!media) return;
			const { type, live, totalduration: duration, targetduration } = data.details, trigger = this.#createDOMEvent(eventType, data);
			this.#ctx.notify("stream-type-change", live ? type === "EVENT" && Number.isFinite(duration) && targetduration >= 10 ? "live:dvr" : "live" : "on-demand", trigger);
			this.#ctx.notify("duration-change", duration, trigger);
			if (instance.currentLevel === -1) this.#ctx.qualities[QualitySymbol.setAuto](true, trigger);
			for (const remoteTrack of instance.audioTracks) {
				const localTrack = {
					id: remoteTrack.id.toString(),
					label: remoteTrack.name,
					language: remoteTrack.lang || "",
					kind: "main"
				};
				this.#ctx.audioTracks[ListSymbol.add](localTrack, trigger);
			}
			for (const level of instance.levels) {
				const videoQuality = {
					id: level.id?.toString() ?? level.height + "p",
					width: level.width,
					height: level.height,
					codec: level.codecSet,
					bitrate: level.bitrate
				};
				this.#ctx.qualities[ListSymbol.add](videoQuality, trigger);
			}
			media.dispatchEvent(new DOMEvent("canplay", { trigger }));
		}
		#onError(eventType, data) {
			this.#ctx.logger?.errorGroup(`[vidstack] HLS error \`${eventType}\``).labelledLog("Media Element", this.#instance?.media).labelledLog("HLS Instance", this.#instance).labelledLog("Event Type", eventType).labelledLog("Data", data).labelledLog("Src", peek(this.#ctx.$state.source)).labelledLog("Media Store", { ...this.#ctx.$state }).dispatch();
			if (data.fatal) switch (data.type) {
				case "mediaError":
					this.#instance?.recoverMediaError();
					break;
				default:
					this.#onFatalError(data.error);
					break;
			}
		}
		#onFatalError(error) {
			this.#ctx.notify("error", {
				message: error.message,
				code: 1,
				error
			});
		}
		#enableAutoQuality() {
			if (this.#instance) this.#instance.currentLevel = -1;
		}
		#onUserQualityChange() {
			const { qualities } = this.#ctx;
			if (!this.#instance || qualities.auto) return;
			this.#instance[qualities.switch + "Level"] = qualities.selectedIndex;
			/**
			* Chrome has some strange issue with detecting keyframes inserted before the current
			* playhead position. This can cause playback to freeze until a new keyframe. It seems
			* setting the current time forces chrome to seek back to the last keyframe and adjust
			* playback. Weird fix, but it works!
			*/
			if (IS_CHROME) this.#video.currentTime = this.#video.currentTime;
		}
		#onUserAudioChange() {
			const { audioTracks } = this.#ctx;
			if (this.#instance && this.#instance.audioTrack !== audioTracks.selectedIndex) this.#instance.audioTrack = audioTracks.selectedIndex;
		}
		onInstance(callback) {
			this.#callbacks.add(callback);
			return () => this.#callbacks.delete(callback);
		}
		loadSource(src) {
			if (!isString(src.src)) return;
			this.#instance?.loadSource(src.src);
		}
		destroy() {
			this.#instance?.destroy();
			this.#instance = null;
			this.#stopLiveSync?.();
			this.#stopLiveSync = null;
			this.#ctx?.logger?.info("🏗️ Destroyed HLS instance");
		}
	};
}));

//#endregion
//#region src/providers/hls/lib-loader.ts
async function importHLS(loader, callbacks = {}) {
	if (isUndefined(loader)) return void 0;
	callbacks.onLoadStart?.();
	if (loader.prototype && loader.prototype !== Function) {
		callbacks.onLoaded?.(loader);
		return loader;
	}
	try {
		const ctor = (await loader())?.default;
		if (ctor && !!ctor.isSupported) callbacks.onLoaded?.(ctor);
		else throw Error("[vidstack] failed importing `hls.js`. Dynamic import returned invalid constructor.");
		return ctor;
	} catch (err) {
		callbacks.onLoadError?.(err);
	}
}
/**
* Loads `hls.js` from the remote source given via `library` into the window namespace. This
* is because `hls.js` in {currentYear} still doesn't provide a ESM export. This method will
* return `undefined` if it fails to load the script. Listen to `hls-lib-load-error` to be
* notified of any failures.
*/
async function loadHLSScript(src, callbacks = {}) {
	if (!isString(src)) return void 0;
	callbacks.onLoadStart?.();
	try {
		await loadScript(src);
		if (!isFunction(window.Hls)) throw Error("[vidstack] failed loading `hls.js`. Could not find a valid `Hls` constructor on window");
		const ctor = window.Hls;
		callbacks.onLoaded?.(ctor);
		return ctor;
	} catch (err) {
		callbacks.onLoadError?.(err);
	}
}
var HLSLibLoader;
var init_lib_loader = __esmMin((() => {
	init_std();
	init_error();
	init_network();
	HLSLibLoader = class {
		#lib;
		#ctx;
		#callback;
		constructor(lib, ctx, callback) {
			this.#lib = lib;
			this.#ctx = ctx;
			this.#callback = callback;
			this.#startLoading();
		}
		async #startLoading() {
			this.#ctx.logger?.info("🏗️ Loading HLS Library");
			const callbacks = {
				onLoadStart: this.#onLoadStart.bind(this),
				onLoaded: this.#onLoaded.bind(this),
				onLoadError: this.#onLoadError.bind(this)
			};
			let ctor = await loadHLSScript(this.#lib, callbacks);
			if (isUndefined(ctor) && !isString(this.#lib)) ctor = await importHLS(this.#lib, callbacks);
			if (!ctor) return null;
			if (!ctor.isSupported()) {
				const message = "[vidstack] `hls.js` is not supported in this environment";
				this.#ctx.logger?.error(message);
				this.#ctx.player.dispatch(new DOMEvent("hls-unsupported"));
				this.#ctx.notify("error", {
					message,
					code: 4
				});
				return null;
			}
			return ctor;
		}
		#onLoadStart() {
			this.#ctx.logger?.infoGroup("Starting to load `hls.js`").labelledLog("URL", this.#lib).dispatch();
			this.#ctx.player.dispatch(new DOMEvent("hls-lib-load-start"));
		}
		#onLoaded(ctor) {
			this.#ctx.logger?.infoGroup("Loaded `hls.js`").labelledLog("Library", this.#lib).labelledLog("Constructor", ctor).dispatch();
			this.#ctx.player.dispatch(new DOMEvent("hls-lib-loaded", { detail: ctor }));
			this.#callback(ctor);
		}
		#onLoadError(e) {
			const error = coerceToError(e);
			this.#ctx.logger?.errorGroup("[vidstack] Failed to load `hls.js`").labelledLog("Library", this.#lib).labelledLog("Error", e).dispatch();
			this.#ctx.player.dispatch(new DOMEvent("hls-lib-load-error", { detail: error }));
			this.#ctx.notify("error", {
				message: error.message,
				code: 4,
				error
			});
		}
	};
}));

//#endregion
//#region src/providers/hls/provider.ts
var provider_exports$2 = /* @__PURE__ */ __exportAll({ HLSProvider: () => HLSProvider });
var JS_DELIVR_CDN, HLSProvider;
var init_provider$2 = __esmMin((() => {
	init_dev();
	init_std();
	init_network();
	init_support();
	init_provider$4();
	init_hls();
	init_lib_loader();
	JS_DELIVR_CDN = "https://cdn.jsdelivr.net";
	HLSProvider = class extends VideoProvider {
		$$PROVIDER_TYPE = "HLS";
		#ctor = null;
		#controller = new HLSController(this.video, this.ctx);
		/**
		* The `hls.js` constructor.
		*/
		get ctor() {
			return this.#ctor;
		}
		/**
		* The current `hls.js` instance.
		*/
		get instance() {
			return this.#controller.instance;
		}
		/**
		* Whether `hls.js` is supported in this environment.
		*/
		static supported = isHLSSupported();
		get type() {
			return "hls";
		}
		get canLiveSync() {
			return true;
		}
		#library = `${JS_DELIVR_CDN}/npm/hls.js@^1.5.0/dist/hls.js`;
		/**
		* The `hls.js` configuration object.
		*
		* @see {@link https://github.com/video-dev/hls.js/blob/master/docs/API.md#fine-tuning}
		*/
		get config() {
			return this.#controller.config;
		}
		set config(config) {
			this.#controller.config = config;
		}
		/**
		* The `hls.js` constructor (supports dynamic imports) or a URL of where it can be found.
		*
		* @defaultValue `../hls.js/dist/hls.min.js`
		*/
		get library() {
			return this.#library;
		}
		set library(library) {
			this.#library = library;
		}
		preconnect() {
			if (!isString(this.#library)) return;
			preconnect(this.#library);
		}
		setup() {
			super.setup();
			new HLSLibLoader(this.#library, this.ctx, (ctor) => {
				this.#ctor = ctor;
				this.#controller.setup(ctor);
				this.ctx.notify("provider-setup", this);
				const src = peek(this.ctx.$state.source);
				if (src) this.loadSource(src);
			});
		}
		async loadSource(src, preload) {
			if (!isString(src.src)) {
				this.removeSource();
				return;
			}
			this.media.preload = preload || "";
			this.appendSource(src, "application/x-mpegurl");
			this.#controller.loadSource(src);
			this.currentSrc = src;
		}
		/**
		* The given callback is invoked when a new `hls.js` instance is created and right before it's
		* attached to media.
		*/
		onInstance(callback) {
			const instance = this.#controller.instance;
			if (instance) callback(instance);
			return this.#controller.onInstance(callback);
		}
		destroy() {
			this.#controller.destroy();
		}
	};
}));

//#endregion
//#region src/providers/hls/loader.ts
init_mime();
init_support();
var HLSProviderLoader = class HLSProviderLoader extends VideoProviderLoader {
	static supported = isHLSSupported();
	name = "hls";
	canPlay(src) {
		return HLSProviderLoader.supported && isHLSSrc(src);
	}
	async load(context) {
		const target = this.target;
		if (!target) throw Error("[vidstack] `<video>` element was not found - did you forget to include `<media-provider>`?");
		const { HLSProvider } = await Promise.resolve().then(() => (init_provider$2(), provider_exports$2));
		if (!target) throw Error("[vidstack] `<video>` element was not found - did you forget to include `<media-provider>`?");
		return new HLSProvider(target, context);
	}
};

//#endregion
//#region src/providers/embed/EmbedProvider.ts
var EmbedProvider;
var init_EmbedProvider = __esmMin((() => {
	init_dev();
	init_std();
	init_network();
	EmbedProvider = class {
		#iframe;
		src = signal("");
		/**
		* Defines which referrer is sent when fetching the resource.
		*
		* @see {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLIFrameElement/referrerPolicy}
		*/
		referrerPolicy = null;
		get iframe() {
			return this.#iframe;
		}
		constructor(iframe) {
			this.#iframe = iframe;
			iframe.setAttribute("frameBorder", "0");
			iframe.setAttribute("aria-hidden", "true");
			iframe.setAttribute("allow", "autoplay; fullscreen; encrypted-media; picture-in-picture; accelerometer; gyroscope");
			if (this.referrerPolicy !== null) iframe.setAttribute("referrerpolicy", this.referrerPolicy);
		}
		setup() {
			listenEvent(window, "message", this.#onWindowMessage.bind(this));
			listenEvent(this.#iframe, "load", this.onLoad.bind(this));
			effect(this.#watchSrc.bind(this));
		}
		#watchSrc() {
			const src = this.src();
			if (!src.length) {
				this.#iframe.setAttribute("src", "");
				return;
			}
			const params = peek(() => this.buildParams());
			this.#iframe.setAttribute("src", appendParamsToURL(src, params));
		}
		postMessage(message, target) {
			this.#iframe.contentWindow?.postMessage(JSON.stringify(message), target ?? "*");
		}
		#onWindowMessage(event) {
			const origin = this.getOrigin();
			if (!((event.source === null || event.source === this.#iframe?.contentWindow) && (!isString(origin) || origin === event.origin))) return;
			try {
				const message = JSON.parse(event.data);
				if (message) this.onMessage(message, event);
				return;
			} catch (e) {}
			if (event.data) this.onMessage(event.data, event);
		}
	};
}));

//#endregion
//#region src/providers/vimeo/embed/event.ts
var trackedVimeoEvents;
var init_event = __esmMin((() => {
	trackedVimeoEvents = [
		"bufferend",
		"bufferstart",
		"durationchange",
		"ended",
		"enterpictureinpicture",
		"error",
		"fullscreenchange",
		"leavepictureinpicture",
		"loaded",
		"playProgress",
		"loadProgress",
		"pause",
		"play",
		"playbackratechange",
		"qualitychange",
		"seeked",
		"seeking",
		"timeupdate",
		"volumechange",
		"waiting"
	];
}));

//#endregion
//#region src/providers/vimeo/utils.ts
var utils_exports$1 = /* @__PURE__ */ __exportAll({
	getVimeoVideoInfo: () => getVimeoVideoInfo,
	resolveVimeoVideoId: () => resolveVimeoVideoId
});
function resolveVimeoVideoId(src) {
	const matches = src.match(videoIdRE$1);
	return {
		videoId: matches?.[1],
		hash: matches?.[2]
	};
}
async function getVimeoVideoInfo(videoId, abort, videoHash) {
	if (infoCache.has(videoId)) return infoCache.get(videoId);
	if (pendingFetch$1.has(videoId)) return pendingFetch$1.get(videoId);
	let oembedSrc = `https://vimeo.com/api/oembed.json?url=https://player.vimeo.com/video/${videoId}`;
	if (videoHash) oembedSrc = oembedSrc.concat(`?h=${videoHash}`);
	const promise = window.fetch(oembedSrc, {
		mode: "cors",
		signal: abort.signal
	}).then((response) => response.json()).then((data) => {
		const info = {
			title: data?.title ?? "",
			duration: data?.duration ?? 0,
			poster: resolveVimeoPoster(data),
			pro: data.account_type !== "basic"
		};
		infoCache.set(videoId, info);
		return info;
	}).finally(() => pendingFetch$1.delete(videoId));
	pendingFetch$1.set(videoId, promise);
	return promise;
}
function resolveVimeoPoster(data) {
	const thumbnailUrl = data?.thumbnail_url ?? "", thumbnailId = thumbnailUrl.match(/vimeocdn\.com\/video\/([^_/?#]+)_/)?.[1];
	if (!thumbnailId) return thumbnailUrl;
	const dimensions = resolvePosterDimensions(data);
	return dimensions ? `https://i.vimeocdn.com/video/${thumbnailId}_${dimensions.width}x${dimensions.height}.webp` : thumbnailUrl;
}
function resolvePosterDimensions(data) {
	const width = data.width || data.thumbnail_width, height = data.height || data.thumbnail_height;
	if (!width || !height) return null;
	if (width > height) return {
		width: posterMaxSize,
		height: Math.round(posterMaxSize * height / width)
	};
	return {
		width: Math.round(posterMaxSize * width / height),
		height: posterMaxSize
	};
}
var videoIdRE$1, infoCache, pendingFetch$1, posterMaxSize;
var init_utils$1 = __esmMin((() => {
	videoIdRE$1 = /(?:https:\/\/)?(?:player\.)?vimeo(?:\.com)?\/(?:video\/)?(\d+)(?:(?:\?hash=|\?h=|\/)(.*))?/;
	infoCache = /* @__PURE__ */ new Map();
	pendingFetch$1 = /* @__PURE__ */ new Map();
	posterMaxSize = 1920;
}));

//#endregion
//#region src/providers/vimeo/provider.ts
var provider_exports$1 = /* @__PURE__ */ __exportAll({ VimeoProvider: () => VimeoProvider });
var VimeoProvider;
var init_provider$1 = __esmMin((() => {
	init_dev();
	init_std();
	init_symbols();
	init_time_ranges();
	init_text_track();
	init_symbols$1();
	init_raf_loop();
	init_network();
	init_EmbedProvider();
	init_event();
	init_utils$1();
	VimeoProvider = class extends EmbedProvider {
		$$PROVIDER_TYPE = "VIMEO";
		scope = createScope();
		fullscreen;
		#ctx;
		#videoId = signal("");
		#pro = signal(false);
		#hash = null;
		#currentSrc = null;
		#fullscreenActive = false;
		#seekableRange = new TimeRange(0, 0);
		#timeRAF = new RAFLoop(this.#onAnimationFrame.bind(this));
		#currentCue = null;
		#chaptersTrack = null;
		#promises = /* @__PURE__ */ new Map();
		#videoInfoPromise = null;
		constructor(iframe, ctx) {
			super(iframe);
			this.#ctx = ctx;
			const self = this;
			this.fullscreen = {
				get active() {
					return self.#fullscreenActive;
				},
				supported: true,
				enter: () => this.#remote("requestFullscreen"),
				exit: () => this.#remote("exitFullscreen")
			};
		}
		/**
		* Whether tracking session data should be enabled on the embed, including cookies and analytics.
		* This is turned off by default to be GDPR-compliant.
		*
		* @defaultValue `false`
		*/
		cookies = false;
		title = true;
		byline = true;
		portrait = true;
		color = "00ADEF";
		get type() {
			return "vimeo";
		}
		get currentSrc() {
			return this.#currentSrc;
		}
		get videoId() {
			return this.#videoId();
		}
		get hash() {
			return this.#hash;
		}
		get isPro() {
			return this.#pro();
		}
		preconnect() {
			preconnect(this.getOrigin());
		}
		setup() {
			super.setup();
			effect(this.#watchVideoId.bind(this));
			effect(this.#watchVideoInfo.bind(this));
			effect(this.#watchPro.bind(this));
			this.#ctx.notify("provider-setup", this);
		}
		destroy() {
			this.#reset();
			this.fullscreen = void 0;
			const message = "provider destroyed";
			for (const promises of this.#promises.values()) for (const { reject } of promises) reject(message);
			this.#promises.clear();
			this.#remote("destroy");
		}
		async play() {
			return this.#remote("play");
		}
		async pause() {
			return this.#remote("pause");
		}
		setMuted(muted) {
			this.#remote("setMuted", muted);
		}
		setCurrentTime(time) {
			this.#remote("seekTo", time);
			this.#ctx.notify("seeking", time);
		}
		setVolume(volume) {
			this.#remote("setVolume", volume);
			this.#remote("setMuted", peek(this.#ctx.$state.muted));
		}
		setPlaybackRate(rate) {
			this.#remote("setPlaybackRate", rate);
		}
		async loadSource(src) {
			if (!isString(src.src)) {
				this.#currentSrc = null;
				this.#hash = null;
				this.#videoId.set("");
				return;
			}
			const { videoId, hash } = resolveVimeoVideoId(src.src);
			this.#videoId.set(videoId ?? "");
			this.#hash = hash ?? null;
			this.#currentSrc = src;
		}
		#watchVideoId() {
			this.#reset();
			const videoId = this.#videoId();
			if (!videoId) {
				this.src.set("");
				return;
			}
			this.src.set(`${this.getOrigin()}/video/${videoId}`);
			this.#ctx.notify("load-start");
		}
		#watchVideoInfo() {
			const videoId = this.#videoId();
			if (!videoId) return;
			const promise = deferredPromise(), abort = new AbortController();
			this.#videoInfoPromise = promise;
			getVimeoVideoInfo(videoId, abort, this.#hash).then((info) => {
				promise.resolve(info);
			}).catch((e) => {
				promise.reject();
				this.#ctx.logger?.warnGroup(`Failed to fetch vimeo video info for id \`${videoId}\`.`).labelledLog("Error", e).dispatch();
			});
			return () => {
				promise.reject();
				abort.abort();
			};
		}
		#watchPro() {
			const isPro = this.#pro(), { $state, qualities } = this.#ctx;
			$state.canSetPlaybackRate.set(isPro);
			qualities[ListSymbol.setReadonly](!isPro);
			if (isPro) return listenEvent(qualities, "change", () => {
				if (qualities.auto) return;
				const id = qualities.selected?.id;
				if (id) this.#remote("setQuality", id);
			});
		}
		getOrigin() {
			return "https://player.vimeo.com";
		}
		buildParams() {
			const { keyDisabled } = this.#ctx.$props, { playsInline, nativeControls } = this.#ctx.$state, showControls = nativeControls();
			return {
				title: this.title,
				byline: this.byline,
				color: this.color,
				portrait: this.portrait,
				controls: showControls,
				h: this.hash,
				keyboard: showControls && !keyDisabled(),
				transparent: true,
				playsinline: playsInline(),
				dnt: !this.cookies
			};
		}
		#onAnimationFrame() {
			this.#remote("getCurrentTime");
		}
		#preventTimeUpdates = false;
		#onTimeUpdate(time, trigger) {
			if (this.#preventTimeUpdates && time === 0) return;
			const { realCurrentTime, paused, bufferedEnd, seekableEnd, live } = this.#ctx.$state;
			if (realCurrentTime() === time) return;
			const prevTime = realCurrentTime();
			this.#ctx.notify("time-change", time, trigger);
			if (Math.abs(prevTime - time) > 1.5) {
				this.#ctx.notify("seeking", time, trigger);
				if (!paused() && bufferedEnd() < time) this.#ctx.notify("waiting", void 0, trigger);
			}
			if (!live() && seekableEnd() - time < .01) {
				this.#ctx.notify("end", void 0, trigger);
				this.#preventTimeUpdates = true;
				setTimeout(() => {
					this.#preventTimeUpdates = false;
				}, 500);
			}
		}
		#onSeeked(time, trigger) {
			this.#ctx.notify("seeked", time, trigger);
		}
		#onLoaded(trigger) {
			const videoId = this.#videoId();
			this.#videoInfoPromise?.promise.then((info) => {
				if (!info) return;
				const { title, poster, duration, pro } = info;
				this.#pro.set(pro);
				this.#ctx.notify("title-change", title, trigger);
				this.#ctx.notify("poster-change", poster, trigger);
				this.#ctx.notify("duration-change", duration, trigger);
				this.#onReady(duration, trigger);
			}).catch(() => {
				if (videoId !== this.#videoId()) return;
				this.#remote("getVideoTitle");
				this.#remote("getDuration");
			});
		}
		#onReady(duration, trigger) {
			const { nativeControls } = this.#ctx.$state, showEmbedControls = nativeControls();
			this.#seekableRange = new TimeRange(0, duration);
			const detail = {
				buffered: new TimeRange(0, 0),
				seekable: this.#seekableRange,
				duration
			};
			this.#ctx.delegate.ready(detail, trigger);
			if (!showEmbedControls) this.#remote("_hideOverlay");
			this.#remote("getQualities");
			this.#remote("getChapters");
		}
		#onMethod(method, data, trigger) {
			switch (method) {
				case "getVideoTitle":
					const videoTitle = data;
					this.#ctx.notify("title-change", videoTitle, trigger);
					break;
				case "getDuration":
					const duration = data;
					if (!this.#ctx.$state.canPlay()) this.#onReady(duration, trigger);
					else this.#ctx.notify("duration-change", duration, trigger);
					break;
				case "getCurrentTime":
					this.#onTimeUpdate(data, trigger);
					break;
				case "getBuffered":
					if (isArray$1(data) && data.length) this.#onLoadProgress(data[data.length - 1][1], trigger);
					break;
				case "setMuted":
				case "getMuted":
					this.#onVolumeChange(peek(this.#ctx.$state.volume), data, trigger);
					break;
				case "getChapters":
					this.#onChaptersChange(data);
					break;
				case "getQualities":
					this.#onQualitiesChange(data, trigger);
					break;
			}
			this.#getPromise(method)?.resolve();
		}
		#attachListeners() {
			for (const type of trackedVimeoEvents) this.#remote("addEventListener", type);
		}
		#onPause(trigger) {
			this.#timeRAF.stop();
			this.#ctx.notify("pause", void 0, trigger);
		}
		async #onPlay(trigger) {
			this.#timeRAF.start();
			await this.#remote("getMuted");
			this.#ctx.notify("play", void 0, trigger);
		}
		#onPlayProgress(trigger) {
			const { paused } = this.#ctx.$state;
			if (!paused() && !this.#preventTimeUpdates) this.#ctx.notify("playing", void 0, trigger);
		}
		#onLoadProgress(buffered, trigger) {
			const detail = {
				buffered: new TimeRange(0, buffered),
				seekable: this.#seekableRange
			};
			this.#ctx.notify("progress", detail, trigger);
		}
		#onBufferStart(trigger) {
			this.#ctx.notify("waiting", void 0, trigger);
		}
		#onBufferEnd(trigger) {
			const { paused } = this.#ctx.$state;
			if (!paused()) this.#ctx.notify("playing", void 0, trigger);
		}
		async #onWaiting(trigger) {
			const { paused } = this.#ctx.$state;
			if (paused()) {
				await this.#remote("getMuted");
				this.#ctx.notify("play", void 0, trigger);
			}
			this.#ctx.notify("waiting", void 0, trigger);
		}
		#onVolumeChange(volume, muted, trigger) {
			const detail = {
				volume,
				muted
			};
			this.#ctx.notify("volume-change", detail, trigger);
		}
		#onChaptersChange(chapters) {
			this.#removeChapters();
			if (!chapters.length) return;
			const track = new TextTrack({
				kind: "chapters",
				default: true
			}), { seekableEnd } = this.#ctx.$state;
			for (let i = 0; i < chapters.length; i++) {
				const chapter = chapters[i], nextChapter = chapters[i + 1];
				track.addCue(new window.VTTCue(chapter.startTime, nextChapter?.startTime ?? seekableEnd(), chapter.title));
			}
			this.#chaptersTrack = track;
			this.#ctx.textTracks.add(track);
		}
		#removeChapters() {
			if (!this.#chaptersTrack) return;
			this.#ctx.textTracks.remove(this.#chaptersTrack);
			this.#chaptersTrack = null;
		}
		#onQualitiesChange(qualities, trigger) {
			this.#ctx.qualities[QualitySymbol.enableAuto] = qualities.some((q) => q.id === "auto") ? () => this.#remote("setQuality", "auto") : void 0;
			for (const quality of qualities) {
				if (quality.id === "auto") continue;
				const height = +quality.id.slice(0, -1);
				if (isNaN(height)) continue;
				this.#ctx.qualities[ListSymbol.add]({
					id: quality.id,
					width: height * (16 / 9),
					height,
					codec: "avc1,h.264",
					bitrate: -1
				}, trigger);
			}
			this.#onQualityChange(qualities.find((q) => q.active), trigger);
		}
		#onQualityChange({ id } = {}, trigger) {
			if (!id) return;
			const isAuto = id === "auto", newQuality = this.#ctx.qualities.getById(id);
			if (isAuto) {
				this.#ctx.qualities[QualitySymbol.setAuto](isAuto, trigger);
				this.#ctx.qualities[ListSymbol.select](void 0, true, trigger);
			} else this.#ctx.qualities[ListSymbol.select](newQuality ?? void 0, true, trigger);
		}
		#onEvent(event, payload, trigger) {
			switch (event) {
				case "ready":
					this.#attachListeners();
					break;
				case "loaded":
					this.#onLoaded(trigger);
					break;
				case "play":
					this.#onPlay(trigger);
					break;
				case "playProgress":
					this.#onPlayProgress(trigger);
					break;
				case "pause":
					this.#onPause(trigger);
					break;
				case "loadProgress":
					this.#onLoadProgress(payload.seconds, trigger);
					break;
				case "waiting":
					this.#onWaiting(trigger);
					break;
				case "bufferstart":
					this.#onBufferStart(trigger);
					break;
				case "bufferend":
					this.#onBufferEnd(trigger);
					break;
				case "volumechange":
					this.#onVolumeChange(payload.volume, peek(this.#ctx.$state.muted), trigger);
					break;
				case "durationchange":
					this.#seekableRange = new TimeRange(0, payload.duration);
					this.#ctx.notify("duration-change", payload.duration, trigger);
					break;
				case "playbackratechange":
					this.#ctx.notify("rate-change", payload.playbackRate, trigger);
					break;
				case "qualitychange":
					this.#onQualityChange(payload, trigger);
					break;
				case "fullscreenchange":
					this.#fullscreenActive = payload.fullscreen;
					this.#ctx.notify("fullscreen-change", payload.fullscreen, trigger);
					break;
				case "enterpictureinpicture":
					this.#ctx.notify("picture-in-picture-change", true, trigger);
					break;
				case "leavepictureinpicture":
					this.#ctx.notify("picture-in-picture-change", false, trigger);
					break;
				case "ended":
					this.#ctx.notify("end", void 0, trigger);
					break;
				case "error":
					this.#onError(payload, trigger);
					break;
				case "seek":
				case "seeked":
					this.#onSeeked(payload.seconds, trigger);
					break;
			}
		}
		#onError(error, trigger) {
			const { message, method } = error;
			if (method === "setPlaybackRate") this.#pro.set(false);
			if (method) this.#getPromise(method)?.reject(message);
			this.#ctx.logger?.errorGroup(`[vimeo]: ${message}`).labelledLog("Error", error).labelledLog("Provider", this).labelledLog("Event", trigger).dispatch();
		}
		onMessage(message, event) {
			if (message.event) this.#onEvent(message.event, message.data, event);
			else if (message.method) this.#onMethod(message.method, message.value, event);
		}
		onLoad() {}
		async #remote(command, arg) {
			let promise = deferredPromise(), promises = this.#promises.get(command);
			if (!promises) this.#promises.set(command, promises = []);
			promises.push(promise);
			this.postMessage({
				method: command,
				value: arg
			});
			return promise.promise;
		}
		#reset() {
			this.#timeRAF.stop();
			this.#seekableRange = new TimeRange(0, 0);
			this.#videoInfoPromise = null;
			this.#currentCue = null;
			this.#pro.set(false);
			this.#removeChapters();
		}
		#getPromise(command) {
			return this.#promises.get(command)?.shift();
		}
	};
}));

//#endregion
//#region src/providers/vimeo/loader.ts
init_std();
init_network();
var VimeoProviderLoader = class {
	name = "vimeo";
	target;
	preconnect() {
		for (const url of [
			"https://i.vimeocdn.com",
			"https://f.vimeocdn.com",
			"https://fresnel.vimeocdn.com"
		]) preconnect(url);
	}
	canPlay(src) {
		return isString(src.src) && src.type === "video/vimeo";
	}
	mediaType() {
		return "video";
	}
	async load(ctx) {
		if (!this.target) throw Error("[vidstack] `<iframe>` element was not found - did you forget to include media provider?");
		return new (await (Promise.resolve().then(() => (init_provider$1(), provider_exports$1)))).VimeoProvider(this.target, ctx);
	}
	async loadPoster(src, ctx, abort) {
		const { resolveVimeoVideoId, getVimeoVideoInfo } = await Promise.resolve().then(() => (init_utils$1(), utils_exports$1));
		if (!isString(src.src)) return null;
		const { videoId, hash } = resolveVimeoVideoId(src.src);
		if (videoId) return getVimeoVideoInfo(videoId, abort, hash).then((info) => info ? info.poster : null);
		return null;
	}
};

//#endregion
//#region src/providers/youtube/embed/state.ts
var YouTubePlayerState;
var init_state = __esmMin((() => {
	YouTubePlayerState = {
		Unstarted: -1,
		Ended: 0,
		Playing: 1,
		Paused: 2,
		Buffering: 3,
		Cued: 5
	};
}));

//#endregion
//#region src/providers/youtube/utils.ts
var utils_exports = /* @__PURE__ */ __exportAll({
	findYouTubePoster: () => findYouTubePoster,
	resolveYouTubeVideoId: () => resolveYouTubeVideoId
});
function resolveYouTubeVideoId(src) {
	return src.match(videoIdRE)?.[1];
}
async function findYouTubePoster(videoId, abort) {
	if (posterCache.has(videoId)) return posterCache.get(videoId);
	if (pendingFetch.has(videoId)) return pendingFetch.get(videoId);
	const pending = new Promise(async (resolve) => {
		for (const size of [
			"maxresdefault",
			"sddefault",
			"hqdefault"
		]) for (const webp of [true, false]) {
			const url = resolveYouTubePosterURL(videoId, size, webp);
			if ((await fetch(url, {
				mode: "no-cors",
				signal: abort.signal
			})).status < 400) {
				posterCache.set(videoId, url);
				resolve(url);
				return;
			}
		}
	}).catch(() => "").finally(() => pendingFetch.delete(videoId));
	pendingFetch.set(videoId, pending);
	return pending;
}
function resolveYouTubePosterURL(videoId, size, webp) {
	return `https://i.ytimg.com/${webp ? "vi_webp" : "vi"}/${videoId}/${size}.${webp ? "webp" : "jpg"}`;
}
var videoIdRE, posterCache, pendingFetch;
var init_utils = __esmMin((() => {
	videoIdRE = /(?:youtu\.be|youtube|youtube\.com|youtube-nocookie\.com)(?:\/shorts)?\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|)((?:\w|-){11})/;
	posterCache = /* @__PURE__ */ new Map();
	pendingFetch = /* @__PURE__ */ new Map();
}));

//#endregion
//#region src/providers/youtube/provider.ts
var provider_exports = /* @__PURE__ */ __exportAll({ YouTubeProvider: () => YouTubeProvider });
var YouTubeProvider;
var init_provider = __esmMin((() => {
	init_dev();
	init_std();
	init_time_ranges();
	init_network();
	init_EmbedProvider();
	init_state();
	init_utils();
	YouTubeProvider = class extends EmbedProvider {
		$$PROVIDER_TYPE = "YOUTUBE";
		scope = createScope();
		#ctx;
		#videoId = signal("");
		#state = -1;
		#currentSrc = null;
		#seekingTimer = -1;
		#invalidPlay = false;
		#promises = /* @__PURE__ */ new Map();
		constructor(iframe, ctx) {
			super(iframe);
			this.#ctx = ctx;
		}
		/**
		* Sets the player's interface language. The parameter value is an ISO 639-1 two-letter
		* language code or a fully specified locale. For example, fr and fr-ca are both valid values.
		* Other language input codes, such as IETF language tags (BCP 47) might also be handled properly.
		*
		* The interface language is used for tooltips in the player and also affects the default caption
		* track. Note that YouTube might select a different caption track language for a particular
		* user based on the user's individual language preferences and the availability of caption tracks.
		*
		* @defaultValue 'en'
		*/
		language = "en";
		color = "red";
		/**
		* Whether cookies should be enabled on the embed. This is turned off by default to be
		* GDPR-compliant.
		*
		* @defaultValue `false`
		*/
		cookies = false;
		get currentSrc() {
			return this.#currentSrc;
		}
		get type() {
			return "youtube";
		}
		get videoId() {
			return this.#videoId();
		}
		preconnect() {
			preconnect(this.getOrigin());
		}
		setup() {
			super.setup();
			effect(this.#watchVideoId.bind(this));
			this.#ctx.notify("provider-setup", this);
		}
		destroy() {
			this.#reset();
			const message = "provider destroyed";
			for (const promises of this.#promises.values()) for (const { reject } of promises) reject(message);
			this.#promises.clear();
		}
		async play() {
			return this.#remote("playVideo");
		}
		#playFail(message) {
			this.#getPromise("playVideo")?.reject(message);
		}
		async pause() {
			return this.#remote("pauseVideo");
		}
		#pauseFail(message) {
			this.#getPromise("pauseVideo")?.reject(message);
		}
		setMuted(muted) {
			if (muted) this.#remote("mute");
			else this.#remote("unMute");
		}
		setCurrentTime(time) {
			this.#remote("seekTo", [time, true]);
			this.#ctx.notify("seeking", time);
		}
		setVolume(volume) {
			this.#remote("setVolume", volume * 100);
		}
		setPlaybackRate(rate) {
			this.#remote("setPlaybackRate", rate);
		}
		async loadSource(src) {
			if (!isString(src.src)) {
				this.#currentSrc = null;
				this.#videoId.set("");
				return;
			}
			const videoId = resolveYouTubeVideoId(src.src);
			this.#videoId.set(videoId ?? "");
			this.#currentSrc = src;
		}
		getOrigin() {
			return !this.cookies ? "https://www.youtube-nocookie.com" : "https://www.youtube.com";
		}
		#watchVideoId() {
			this.#reset();
			const videoId = this.#videoId();
			if (!videoId) {
				this.src.set("");
				return;
			}
			this.src.set(`${this.getOrigin()}/embed/${videoId}`);
			this.#ctx.notify("load-start");
		}
		buildParams() {
			const { keyDisabled } = this.#ctx.$props, { muted, playsInline, nativeControls } = this.#ctx.$state, showControls = nativeControls();
			return {
				rel: 0,
				autoplay: 0,
				cc_lang_pref: this.language,
				cc_load_policy: showControls ? 1 : void 0,
				color: this.color,
				controls: showControls ? 1 : 0,
				disablekb: !showControls || keyDisabled() ? 1 : 0,
				enablejsapi: 1,
				fs: 1,
				hl: this.language,
				iv_load_policy: showControls ? 1 : 3,
				mute: muted() ? 1 : 0,
				playsinline: playsInline() ? 1 : 0
			};
		}
		#remote(command, arg) {
			let promise = deferredPromise(), promises = this.#promises.get(command);
			if (!promises) this.#promises.set(command, promises = []);
			promises.push(promise);
			const args = Array.isArray(arg) ? arg : arg ? [arg] : void 0;
			this.postMessage({
				event: "command",
				func: command,
				args
			});
			return promise.promise;
		}
		onLoad() {
			window.setTimeout(() => this.postMessage({ event: "listening" }), 100);
		}
		#onReady(trigger) {
			this.#ctx.notify("loaded-metadata");
			this.#ctx.notify("loaded-data");
			this.#ctx.delegate.ready(void 0, trigger);
		}
		#onPause(trigger) {
			this.#getPromise("pauseVideo")?.resolve();
			this.#ctx.notify("pause", void 0, trigger);
		}
		#onTimeUpdate(time, trigger) {
			const { duration, realCurrentTime } = this.#ctx.$state, hasEnded = this.#state === YouTubePlayerState.Ended, boundTime = hasEnded ? duration() : time;
			this.#ctx.notify("time-change", boundTime, trigger);
			if (!hasEnded && Math.abs(boundTime - realCurrentTime()) > 1) this.#ctx.notify("seeking", boundTime, trigger);
		}
		#onProgress(buffered, seekable, trigger) {
			const detail = {
				buffered: new TimeRange(0, buffered),
				seekable
			};
			this.#ctx.notify("progress", detail, trigger);
			const { seeking, realCurrentTime } = this.#ctx.$state;
			/**
			* This is the only way to detect `seeked`. Unfortunately while the player is `paused` `seeking`
			* and `seeked` will fire at the same time, there are no updates in-between -_-. We need an
			* artificial delay between the two events.
			*/
			if (seeking() && buffered > realCurrentTime()) this.#onSeeked(trigger);
		}
		#onSeeked(trigger) {
			const { paused, realCurrentTime } = this.#ctx.$state;
			window.clearTimeout(this.#seekingTimer);
			this.#seekingTimer = window.setTimeout(() => {
				this.#ctx.notify("seeked", realCurrentTime(), trigger);
				this.#seekingTimer = -1;
			}, paused() ? 100 : 0);
		}
		#onEnded(trigger) {
			const { seeking } = this.#ctx.$state;
			if (seeking()) this.#onSeeked(trigger);
			this.#ctx.notify("pause", void 0, trigger);
			this.#ctx.notify("end", void 0, trigger);
		}
		#onStateChange(state, trigger) {
			const { paused, seeking } = this.#ctx.$state, isPlaying = state === YouTubePlayerState.Playing, isBuffering = state === YouTubePlayerState.Buffering, isPendingPlay = this.#isPending("playVideo"), isPlay = paused() && (isBuffering || isPlaying);
			if (isBuffering) this.#ctx.notify("waiting", void 0, trigger);
			if (seeking() && isPlaying) this.#onSeeked(trigger);
			if (this.#invalidPlay && isPlaying) {
				this.pause();
				this.#invalidPlay = false;
				this.setMuted(this.#ctx.$state.muted());
				return;
			}
			if (!isPendingPlay && isPlay) {
				this.#invalidPlay = true;
				this.setMuted(true);
				return;
			}
			if (isPlay) {
				this.#getPromise("playVideo")?.resolve();
				this.#ctx.notify("play", void 0, trigger);
			}
			switch (state) {
				case YouTubePlayerState.Cued:
					this.#onReady(trigger);
					break;
				case YouTubePlayerState.Playing:
					this.#ctx.notify("playing", void 0, trigger);
					break;
				case YouTubePlayerState.Paused:
					this.#onPause(trigger);
					break;
				case YouTubePlayerState.Ended:
					this.#onEnded(trigger);
					break;
			}
			this.#state = state;
		}
		onMessage({ info }, event) {
			if (!info) return;
			const { title, intrinsicDuration, playbackRate } = this.#ctx.$state;
			if (isObject(info.videoData) && info.videoData.title !== title()) this.#ctx.notify("title-change", info.videoData.title, event);
			if (isNumber(info.duration) && info.duration !== intrinsicDuration()) {
				if (isNumber(info.videoLoadedFraction)) {
					const buffered = info.progressState?.loaded ?? info.videoLoadedFraction * info.duration, seekable = new TimeRange(0, info.duration);
					this.#onProgress(buffered, seekable, event);
				}
				this.#ctx.notify("duration-change", info.duration, event);
			}
			if (isNumber(info.playbackRate) && info.playbackRate !== playbackRate()) this.#ctx.notify("rate-change", info.playbackRate, event);
			if (info.progressState) {
				const { current, seekableStart, seekableEnd, loaded, duration } = info.progressState;
				this.#onTimeUpdate(current, event);
				this.#onProgress(loaded, new TimeRange(seekableStart, seekableEnd), event);
				if (duration !== intrinsicDuration()) this.#ctx.notify("duration-change", duration, event);
			}
			if (isNumber(info.volume) && isBoolean(info.muted) && !this.#invalidPlay) {
				const detail = {
					muted: info.muted,
					volume: info.volume / 100
				};
				this.#ctx.notify("volume-change", detail, event);
			}
			if (isNumber(info.playerState) && info.playerState !== this.#state) this.#onStateChange(info.playerState, event);
		}
		#reset() {
			this.#state = -1;
			this.#seekingTimer = -1;
			this.#invalidPlay = false;
		}
		#getPromise(command) {
			return this.#promises.get(command)?.shift();
		}
		#isPending(command) {
			return Boolean(this.#promises.get(command)?.length);
		}
	};
}));

//#endregion
//#region src/providers/youtube/loader.ts
init_std();
init_network();
var YouTubeProviderLoader = class {
	name = "youtube";
	target;
	preconnect() {
		for (const url of [
			"https://www.google.com",
			"https://i.ytimg.com",
			"https://googleads.g.doubleclick.net",
			"https://static.doubleclick.net"
		]) preconnect(url);
	}
	canPlay(src) {
		return isString(src.src) && src.type === "video/youtube";
	}
	mediaType() {
		return "video";
	}
	async load(ctx) {
		if (!this.target) throw Error("[vidstack] `<iframe>` element was not found - did you forget to include media provider?");
		return new (await (Promise.resolve().then(() => (init_provider(), provider_exports)))).YouTubeProvider(this.target, ctx);
	}
	async loadPoster(src, ctx, abort) {
		const { findYouTubePoster, resolveYouTubeVideoId } = await Promise.resolve().then(() => (init_utils(), utils_exports));
		const videoId = isString(src.src) && resolveYouTubeVideoId(src.src);
		if (videoId) return findYouTubePoster(videoId, abort);
		return null;
	}
};

//#endregion
//#region src/utils/manifest.ts
function resolveStreamTypeFromDASHManifest(manifestSrc, requestInit) {
	return fetch(manifestSrc, requestInit).then((res) => res.text()).then((manifest) => {
		return /type="static"/.test(manifest) ? "on-demand" : "live";
	});
}
function resolveStreamTypeFromHLSManifest(manifestSrc, requestInit) {
	return fetch(manifestSrc, requestInit).then((res) => res.text()).then((manifest) => {
		const renditionURI = resolveHLSRenditionURI(manifest);
		if (renditionURI) return resolveStreamTypeFromHLSManifest(/^https?:/.test(renditionURI) ? renditionURI : new URL(renditionURI, manifestSrc).href, requestInit);
		const streamType = /EXT-X-PLAYLIST-TYPE:\s*VOD/.test(manifest) ? "on-demand" : "live";
		if (streamType === "live" && resolveTargetDuration(manifest) >= 10 && (/#EXT-X-DVR-ENABLED:\s*true/.test(manifest) || manifest.includes("#EXT-X-DISCONTINUITY"))) return "live:dvr";
		return streamType;
	});
}
function resolveHLSRenditionURI(manifest) {
	const matches = manifest.match(/#EXT-X-STREAM-INF:[^\n]+(\n[^\n]+)*/g);
	return matches ? matches[0].split("\n")[1].trim() : null;
}
function resolveTargetDuration(manifest) {
	const lines = manifest.split("\n");
	for (const line of lines) if (line.startsWith("#EXT-X-TARGETDURATION")) {
		const duration = parseFloat(line.split(":")[1]);
		if (!isNaN(duration)) return duration;
	}
	return -1;
}

//#endregion
//#region src/components/provider/source-select.ts
init_dev();
init_std();
init_mime();
init_network();
init_support();
let warned$1 = /* @__PURE__ */ new Set();
const sourceTypes = /* @__PURE__ */ new Map();
var SourceSelection = class {
	#initialize = false;
	#loaders;
	#domSources;
	#media;
	#loader;
	constructor(domSources, media, loader, customLoaders = []) {
		this.#domSources = domSources;
		this.#media = media;
		this.#loader = loader;
		const DASH_LOADER = new DASHProviderLoader(), HLS_LOADER = new HLSProviderLoader(), VIDEO_LOADER = new VideoProviderLoader(), AUDIO_LOADER = new AudioProviderLoader(), EMBED_LOADERS = [new YouTubeProviderLoader(), new VimeoProviderLoader()];
		this.#loaders = computed(() => {
			const remoteLoader = media.$state.remotePlaybackLoader();
			const loaders = media.$props.preferNativeHLS() ? [
				VIDEO_LOADER,
				AUDIO_LOADER,
				DASH_LOADER,
				HLS_LOADER,
				...EMBED_LOADERS,
				...customLoaders
			] : [
				HLS_LOADER,
				VIDEO_LOADER,
				AUDIO_LOADER,
				DASH_LOADER,
				...EMBED_LOADERS,
				...customLoaders
			];
			return remoteLoader ? [remoteLoader, ...loaders] : loaders;
		});
		const { $state } = media;
		$state.sources.set(normalizeSrc(media.$props.src()));
		for (const src of $state.sources()) {
			const loader = this.#loaders().find((loader) => loader.canPlay(src));
			if (!loader) continue;
			const mediaType = loader.mediaType(src);
			media.$state.source.set(src);
			media.$state.mediaType.set(mediaType);
			media.$state.inferredViewType.set(mediaType);
			this.#loader.set(loader);
			this.#initialize = true;
			break;
		}
	}
	connect() {
		const loader = this.#loader();
		if (this.#initialize) {
			this.#notifySourceChange(this.#media.$state.source(), loader);
			this.#notifyLoaderChange(loader);
			this.#initialize = false;
		}
		effect(this.#onSourcesChange.bind(this));
		effect(this.#onSourceChange.bind(this));
		effect(this.#onSetup.bind(this));
		effect(this.#onLoadSource.bind(this));
		effect(this.#onLoadPoster.bind(this));
	}
	#onSourcesChange() {
		this.#media.notify("sources-change", [...normalizeSrc(this.#media.$props.src()), ...this.#domSources()]);
	}
	#onSourceChange() {
		const { $state } = this.#media;
		const sources = $state.sources(), currentSource = peek($state.source), newSource = this.#findNewSource(currentSource, sources), noMatch = sources[0]?.src && !newSource.src && !newSource.type;
		if (noMatch && !warned$1.has(newSource.src) && !peek(this.#loader)) {
			const source = sources[0];
			console.warn(`[vidstack] could not find a loader for any of the given media sources, consider providing \`type\`:\n\n--- HTML ---\n\n<media-provider>\n  <source src="${source.src}" type="video/mp4" />\n</media-provider>"\n\n--- React ---\n\n<MediaPlayer src={{ src: "${source.src}", type: "video/mp4" }}>

---

Falling back to fetching source headers...`);
			warned$1.add(newSource.src);
		}
		if (noMatch) {
			const { crossOrigin } = $state, credentials = getRequestCredentials(crossOrigin()), abort = new AbortController();
			Promise.all(sources.map((source) => isString(source.src) && source.type === "?" ? fetch(source.src, {
				method: "HEAD",
				credentials,
				signal: abort.signal
			}).then((res) => {
				source.type = res.headers.get("content-type") || "??";
				sourceTypes.set(source.src, source.type);
				return source;
			}).catch(() => source) : source)).then((sources) => {
				if (abort.signal.aborted) return;
				const newSource = this.#findNewSource(peek($state.source), sources);
				tick();
				if (!newSource.src) this.#media.notify("error", {
					message: "Failed to load resource.",
					code: 4
				});
			});
			return () => abort.abort();
		}
		tick();
	}
	#findNewSource(currentSource, sources) {
		let newSource = {
			src: "",
			type: ""
		}, newLoader = null, triggerEvent = new DOMEvent("sources-change", { detail: { sources } }), loaders = this.#loaders(), { started, paused, currentTime, quality, savedState } = this.#media.$state;
		for (const src of sources) {
			const loader = loaders.find((loader) => loader.canPlay(src));
			if (loader) {
				newSource = src;
				newLoader = loader;
				break;
			}
		}
		if (isVideoQualitySrc(newSource)) {
			const currentQuality = quality(), sourceQuality = sources.find((s) => s.src === currentQuality?.src);
			if (peek(started)) savedState.set({
				paused: peek(paused),
				currentTime: peek(currentTime)
			});
			else savedState.set(null);
			if (sourceQuality) {
				newSource = sourceQuality;
				triggerEvent = new DOMEvent("quality-change", { detail: { quality: currentQuality } });
			}
		}
		if (!isSameSrc(currentSource, newSource)) this.#notifySourceChange(newSource, newLoader, triggerEvent);
		if (newLoader !== peek(this.#loader)) this.#notifyLoaderChange(newLoader, triggerEvent);
		return newSource;
	}
	#notifySourceChange(src, loader, trigger) {
		this.#media.notify("source-change", src, trigger);
		this.#media.notify("media-type-change", loader?.mediaType(src) || "unknown", trigger);
	}
	#notifyLoaderChange(loader, trigger) {
		this.#media.$providerSetup.set(false);
		this.#media.notify("provider-change", null, trigger);
		loader && peek(() => loader.preconnect?.(this.#media));
		this.#loader.set(loader);
		this.#media.notify("provider-loader-change", loader, trigger);
	}
	#onSetup() {
		const provider = this.#media.$provider();
		if (!provider || peek(this.#media.$providerSetup)) return;
		if (this.#media.$state.canLoad()) {
			scoped(() => provider.setup(), provider.scope);
			this.#media.$providerSetup.set(true);
			return;
		}
		peek(() => provider.preconnect?.());
	}
	#onLoadSource() {
		if (!this.#media.$providerSetup()) return;
		const provider = this.#media.$provider(), source = this.#media.$state.source(), crossOrigin = peek(this.#media.$state.crossOrigin), preferNativeHLS = peek(this.#media.$props.preferNativeHLS);
		if (isSameSrc(provider?.currentSrc, source)) return;
		if (this.#media.$state.canLoad()) {
			const abort = new AbortController();
			if (isHLSSrc(source)) {
				if (preferNativeHLS || !isHLSSupported()) resolveStreamTypeFromHLSManifest(source.src, {
					credentials: getRequestCredentials(crossOrigin),
					signal: abort.signal
				}).then((streamType) => {
					this.#media.notify("stream-type-change", streamType);
				}).catch(noop);
			} else if (isDASHSrc(source)) resolveStreamTypeFromDASHManifest(source.src, {
				credentials: getRequestCredentials(crossOrigin),
				signal: abort.signal
			}).then((streamType) => {
				this.#media.notify("stream-type-change", streamType);
			}).catch(noop);
			else this.#media.notify("stream-type-change", "on-demand");
			peek(() => {
				const preload = peek(this.#media.$state.preload);
				return provider?.loadSource(source, preload).catch((error) => {
					this.#media.logger?.errorGroup("[vidstack] failed to load source").labelledLog("Error", error).labelledLog("Source", source).labelledLog("Provider", provider).labelledLog("Media Context", { ...this.#media }).dispatch();
				});
			});
			return () => abort.abort();
		}
		try {
			isString(source.src) && preconnect(new URL(source.src).origin);
		} catch (error) {
			this.#media.logger?.infoGroup(`Failed to preconnect to source: ${source.src}`).labelledLog("Error", error).dispatch();
		}
	}
	#onLoadPoster() {
		const loader = this.#loader(), { providedPoster, source, canLoadPoster } = this.#media.$state;
		if (!loader || !loader.loadPoster || !source() || !canLoadPoster() || providedPoster()) return;
		const abort = new AbortController(), trigger = new DOMEvent("source-change", { detail: source });
		loader.loadPoster(source(), this.#media, abort).then((url) => {
			this.#media.notify("poster-change", url || "", trigger);
		}).catch(() => {
			this.#media.notify("poster-change", "", trigger);
		});
		return () => {
			abort.abort();
		};
	}
};
function normalizeSrc(src) {
	return (isArray$1(src) ? src : [src]).map((src) => {
		if (isString(src)) return {
			src,
			type: inferType(src)
		};
		else return {
			...src,
			type: inferType(src.src, src.type)
		};
	});
}
function inferType(src, type) {
	if (isString(type) && type.length) return type;
	else if (isString(src) && sourceTypes.has(src)) return sourceTypes.get(src);
	else if (!type && isHLSSrc({
		src,
		type: ""
	})) return "application/x-mpegurl";
	else if (!type && isDASHSrc({
		src,
		type: ""
	})) return "application/dash+xml";
	else if (!isString(src) || src.startsWith("blob:")) return "video/object";
	else if (src.includes("youtube") || src.includes("youtu.be")) return "video/youtube";
	else if (src.includes("vimeo") && !src.includes("progressive_redirect") && !src.includes(".m3u8")) return "video/vimeo";
	return "?";
}
function isSameSrc(a, b) {
	return a?.src === b?.src && a?.type === b?.type;
}

//#endregion
//#region src/components/provider/tracks.ts
init_dev();
init_text_track();
var Tracks = class {
	#domTracks;
	#media;
	#prevTracks = [];
	constructor(domTracks, media) {
		this.#domTracks = domTracks;
		this.#media = media;
		effect(this.#onTracksChange.bind(this));
	}
	#onTracksChange() {
		const newTracks = this.#domTracks();
		for (const oldTrack of this.#prevTracks) if (!newTracks.some((t) => t.id === oldTrack.id)) {
			const track = oldTrack.id && this.#media.textTracks.getById(oldTrack.id);
			if (track) this.#media.textTracks.remove(track);
		}
		for (const newTrack of newTracks) {
			const id = newTrack.id || TextTrack.createId(newTrack);
			if (!this.#media.textTracks.getById(id)) {
				newTrack.id = id;
				this.#media.textTracks.add(newTrack);
			}
		}
		this.#prevTracks = newTracks;
	}
};

//#endregion
//#region src/components/provider/provider.ts
init_dev();
init_std();
init_text_track();
/**
* Used to render the current provider.
*
* @docs {@link https://www.vidstack.io/docs/player/components/media/provider}
*/
var MediaProvider = class extends Component {
	static props = { loaders: [] };
	static state = new State({ loader: null });
	#media;
	#sources;
	#domSources = signal([]);
	#domTracks = signal([]);
	#loader = null;
	#target = null;
	#connected = false;
	onSetup() {
		this.#media = useMediaContext();
		this.#sources = new SourceSelection(this.#domSources, this.#media, this.$state.loader, this.$props.loaders());
	}
	onAttach(el) {
		el.setAttribute("data-media-provider", "");
	}
	onConnect(el) {
		this.#connected = true;
		this.#sources.connect();
		new Tracks(this.#domTracks, this.#media);
		const resize = new ResizeObserver(animationFrameThrottle(this.#onResize.bind(this)));
		resize.observe(el);
		const mutations = new MutationObserver(this.#onMutation.bind(this));
		mutations.observe(el, {
			attributes: true,
			childList: true
		});
		this.#onResize();
		this.#onMutation();
		if (this.#target) this.load(this.#target);
		onDispose(() => {
			this.#connected = false;
			resize.disconnect();
			mutations.disconnect();
		});
	}
	#loadRafId = -1;
	load(target) {
		this.#target = target || null;
		target?.setAttribute("aria-hidden", "true");
		if (!this.#connected) return;
		window.cancelAnimationFrame(this.#loadRafId);
		this.#loadRafId = requestAnimationFrame(() => this.#runLoader(target));
		onDispose(() => {
			window.cancelAnimationFrame(this.#loadRafId);
		});
	}
	#runLoader(target) {
		if (!this.scope) return;
		const loader = this.$state.loader(), { $provider } = this.#media;
		if (this.#loader === loader && loader?.target === target && peek($provider)) return;
		this.#destroyProvider();
		this.#loader = loader;
		if (loader) loader.target = target || null;
		if (!loader || !target) return;
		loader.load(this.#media).then((provider) => {
			if (!this.scope) return;
			if (peek(this.$state.loader) !== loader) return;
			this.#media.notify("provider-change", provider);
		});
	}
	onDestroy() {
		this.#loader = null;
		this.#destroyProvider();
	}
	#destroyProvider() {
		this.#media?.notify("provider-change", null);
	}
	#onResize() {
		if (!this.el) return;
		const { player, $state } = this.#media, width = this.el.offsetWidth, height = this.el.offsetHeight;
		if (!player) return;
		$state.mediaWidth.set(width);
		$state.mediaHeight.set(height);
		if (player.el) {
			setStyle(player.el, "--media-width", width + "px");
			setStyle(player.el, "--media-height", height + "px");
		}
	}
	#onMutation() {
		const sources = [], tracks = [], children = this.el.children;
		for (const el of children) {
			if (el.hasAttribute("data-vds")) continue;
			if (el instanceof HTMLSourceElement) {
				const src = {
					id: el.id,
					src: el.src,
					type: el.type
				};
				for (const prop of [
					"id",
					"src",
					"width",
					"height",
					"bitrate",
					"codec"
				]) {
					const value = el.getAttribute(`data-${prop}`);
					if (isString(value)) src[prop] = /id|src|codec/.test(prop) ? value : Number(value);
				}
				sources.push(src);
			} else if (el instanceof HTMLTrackElement) {
				const track = {
					src: el.src,
					kind: el.track.kind,
					language: el.srclang,
					label: el.label,
					default: el.default,
					type: el.getAttribute("data-type")
				};
				tracks.push({
					id: el.id || TextTrack.createId(track),
					...track
				});
			}
		}
		this.#domSources.set(sources);
		this.#domTracks.set(tracks);
		tick();
	}
};
const mediaprovider__proto = MediaProvider.prototype;
method(mediaprovider__proto, "load");

//#endregion
//#region ../../node_modules/.pnpm/media-icons@1.1.5/node_modules/media-icons/dist/icons/chromecast.js
var Icon$24;
var init_chromecast = __esmMin((() => {
	Icon$24 = `<path fill-rule="evenodd" clip-rule="evenodd" d="M6 7C5.63181 7 5.33333 7.29848 5.33333 7.66667V14.8667C5.33333 14.9403 5.39361 14.9999 5.46724 15.0009C10.8844 15.0719 15.2614 19.449 15.3325 24.8661C15.3334 24.9397 15.393 25 15.4667 25H26C26.3682 25 26.6667 24.7015 26.6667 24.3333V7.66667C26.6667 7.29848 26.3682 7 26 7H6ZM17.0119 22.2294C17.0263 22.29 17.0802 22.3333 17.1425 22.3333H23.3333C23.7015 22.3333 24 22.0349 24 21.6667V10.3333C24 9.96514 23.7015 9.66667 23.3333 9.66667H8.66667C8.29848 9.66667 8 9.96514 8 10.3333V13.1909C8 13.2531 8.04332 13.3071 8.10392 13.3214C12.5063 14.3618 15.9715 17.827 17.0119 22.2294Z" fill="currentColor"/> <path d="M13.2 25C13.2736 25 13.3334 24.9398 13.3322 24.8661C13.2615 20.5544 9.77889 17.0718 5.46718 17.0011C5.39356 16.9999 5.33333 17.0597 5.33333 17.1333V18.8667C5.33333 18.9403 5.39348 18.9999 5.4671 19.0015C8.67465 19.0716 11.2617 21.6587 11.3319 24.8662C11.3335 24.9399 11.393 25 11.4667 25H13.2Z" fill="currentColor"/> <path d="M5.33333 21.1333C5.33333 21.0597 5.39332 20.9998 5.46692 21.0022C7.57033 21.0712 9.26217 22.763 9.33114 24.8664C9.33356 24.94 9.27364 25 9.2 25H6C5.63181 25 5.33333 24.7015 5.33333 24.3333V21.1333Z" fill="currentColor"/>`;
}));

//#endregion
//#region src/elements/define/provider-cast-display.ts
var provider_cast_display_exports = /* @__PURE__ */ __exportAll({ insertContent: () => insertContent });
function insertContent(container, $state) {
	const icon = cloneTemplateContent(svgTemplate);
	icon.innerHTML = Icon$24;
	container.append(icon);
	const text = document.createElement("span");
	text.classList.add("vds-google-cast-info");
	container.append(text);
	const deviceName = document.createElement("span");
	deviceName.classList.add("vds-google-cast-device-name");
	effect(() => {
		const { remotePlaybackInfo } = $state, info = remotePlaybackInfo();
		if (info?.deviceName) {
			deviceName.textContent = info.deviceName;
			text.append("Google Cast on ", deviceName);
		}
		return () => {
			text.textContent = "";
		};
	});
}
var svgTemplate;
var init_provider_cast_display = __esmMin((() => {
	init_dev();
	init_chromecast();
	init_dom();
	svgTemplate = /* @__PURE__ */ createTemplate(`<svg viewBox="0 0 32 32" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"></svg>`);
}));

//#endregion
//#region src/elements/define/provider-element.ts
init_dev();
init_std();
/**
* @docs {@link https://www.vidstack.io/docs/wc/player/components/core/provider}
* @example
* ```html
* <media-player>
*   <media-provider></media-provider>
*   <!-- ... -->
* </media-player>
* ```
*/
var MediaProviderElement = class extends Host(HTMLElement, MediaProvider) {
	static tagName = "media-provider";
	#media;
	#target = null;
	#blocker = null;
	onSetup() {
		this.#media = useMediaContext();
		this.setAttribute("keep-alive", "");
	}
	onDestroy() {
		this.#blocker?.remove();
		this.#blocker = null;
		this.#target?.remove();
		this.#target = null;
	}
	onConnect() {
		effect(() => {
			const loader = this.$state.loader(), isYouTubeEmbed = loader?.name === "youtube", isVimeoEmbed = loader?.name === "vimeo", isEmbed = isYouTubeEmbed || isVimeoEmbed, isGoogleCast = loader?.name === "google-cast";
			const target = loader ? isGoogleCast ? this.#createGoogleCastContainer() : isEmbed ? this.#createIFrame() : loader.mediaType() === "audio" ? this.#createAudio() : this.#createVideo() : null;
			if (this.#target !== target) {
				const parent = this.#target?.parentElement ?? this;
				this.#target?.remove();
				this.#target = target;
				if (target) parent.prepend(target);
				if (isEmbed && target) effect(() => {
					const { nativeControls, viewType } = this.#media.$state, showNativeControls = nativeControls(), isAudioView = viewType() === "audio";
					if (!showNativeControls && !isAudioView) {
						this.#blocker = this.querySelector(".vds-blocker");
						if (!this.#blocker) {
							this.#blocker = document.createElement("div");
							this.#blocker.classList.add("vds-blocker");
							target.after(this.#blocker);
						}
					} else {
						this.#blocker?.remove();
						this.#blocker = null;
					}
					setAttribute(target, "data-no-controls", !showNativeControls);
				});
			}
			if (isYouTubeEmbed) target?.classList.add("vds-youtube");
			else if (isVimeoEmbed) target?.classList.add("vds-vimeo");
			if (!isEmbed) {
				this.#blocker?.remove();
				this.#blocker = null;
			}
			this.load(target);
		});
	}
	#createAudio() {
		const audio = this.#target instanceof HTMLAudioElement ? this.#target : document.createElement("audio");
		const { controls, crossOrigin } = this.#media.$state;
		effect(() => {
			setAttribute(audio, "controls", controls());
			setAttribute(audio, "crossorigin", crossOrigin());
		});
		return audio;
	}
	#createVideo() {
		const video = this.#target instanceof HTMLVideoElement ? this.#target : document.createElement("video");
		const { crossOrigin, poster, nativeControls } = this.#media.$state, $controls = computed(() => nativeControls() ? "true" : null), $poster = computed(() => poster() && nativeControls() ? poster() : null);
		effect(() => {
			setAttribute(video, "controls", $controls());
			setAttribute(video, "crossorigin", crossOrigin());
			setAttribute(video, "poster", $poster());
		});
		return video;
	}
	#createIFrame() {
		const iframe = this.#target instanceof HTMLIFrameElement ? this.#target : document.createElement("iframe"), { nativeControls } = this.#media.$state;
		effect(() => setAttribute(iframe, "tabindex", !nativeControls() ? -1 : null));
		return iframe;
	}
	#createGoogleCastContainer() {
		if (this.#target?.classList.contains("vds-google-cast")) return this.#target;
		const container = document.createElement("div");
		container.classList.add("vds-google-cast");
		Promise.resolve().then(() => (init_provider_cast_display(), provider_cast_display_exports)).then(({ insertContent }) => {
			insertContent(container, this.#media.$state);
		});
		return container;
	}
};

//#endregion
//#region src/elements/bundles/player.ts
defineCustomElement(MediaPlayerElement);
defineCustomElement(MediaProviderElement);

//#endregion
//#region src/core/keyboard/aria-shortcuts.ts
init_dev();
init_std();
var ARIAKeyShortcuts = class extends ViewController {
	#shortcut;
	constructor(shortcut) {
		super();
		this.#shortcut = shortcut;
	}
	onAttach(el) {
		const { $props, ariaKeys } = useMediaContext(), keys = el.getAttribute("aria-keyshortcuts");
		if (keys) {
			ariaKeys[this.#shortcut] = keys;
			onDispose(() => {
				delete ariaKeys[this.#shortcut];
			});
			return;
		}
		const shortcuts = $props.keyShortcuts()[this.#shortcut];
		if (shortcuts) {
			const keys = isArray$1(shortcuts) ? shortcuts.join(" ") : isString(shortcuts) ? shortcuts : shortcuts?.keys;
			el.setAttribute("aria-keyshortcuts", isArray$1(keys) ? keys.join(" ") : keys);
		}
	}
};

//#endregion
//#region src/components/ui/buttons/toggle-button-controller.ts
init_dev();
init_std();
init_dom();
var ToggleButtonController = class extends ViewController {
	static props = { disabled: false };
	#delegate;
	constructor(delegate) {
		super();
		this.#delegate = delegate;
		new FocusVisibleController();
		if (delegate.keyShortcut) new ARIAKeyShortcuts(delegate.keyShortcut);
	}
	onSetup() {
		const { disabled } = this.$props;
		this.setAttributes({
			"data-pressed": this.#delegate.isPresssed,
			"aria-pressed": this.#isARIAPressed.bind(this),
			"aria-disabled": () => disabled() ? "true" : null
		});
	}
	onAttach(el) {
		setAttributeIfEmpty(el, "tabindex", "0");
		setAttributeIfEmpty(el, "role", "button");
		setAttributeIfEmpty(el, "type", "button");
	}
	onConnect(el) {
		const events = onPress(el, this.#onMaybePress.bind(this));
		for (const type of ["click", "touchstart"]) events.add(type, this.#onInteraction.bind(this), { passive: true });
	}
	#isARIAPressed() {
		return ariaBool$1(this.#delegate.isPresssed());
	}
	#onPressed(event) {
		if (isWriteSignal(this.#delegate.isPresssed)) this.#delegate.isPresssed.set((p) => !p);
	}
	#onMaybePress(event) {
		if (this.$props.disabled() || this.el.hasAttribute("data-disabled")) {
			event.preventDefault();
			event.stopImmediatePropagation();
			return;
		}
		event.preventDefault();
		(this.#delegate.onPress ?? this.#onPressed).call(this, event);
	}
	#onInteraction(event) {
		if (this.$props.disabled()) {
			event.preventDefault();
			event.stopImmediatePropagation();
		}
	}
};

//#endregion
//#region src/components/ui/buttons/airplay-button.ts
init_dev();
init_dom();
/**
* A button for requesting remote playback via Apple AirPlay.
*
* @attr data-active - Whether AirPlay is connected.
* @attr data-supported - Whether AirPlay is available.
* @attr data-state - Current connection state.
* @see {@link https://www.apple.com/au/airplay}
* @docs {@link https://www.vidstack.io/docs/player/components/buttons/airplay-button}
*/
var AirPlayButton$1 = class extends Component {
	static props = ToggleButtonController.props;
	#media;
	constructor() {
		super();
		new ToggleButtonController({
			isPresssed: this.#isPressed.bind(this),
			onPress: this.#onPress.bind(this)
		});
	}
	onSetup() {
		this.#media = useMediaContext();
		const { canAirPlay, isAirPlayConnected } = this.#media.$state;
		this.setAttributes({
			"data-active": isAirPlayConnected,
			"data-supported": canAirPlay,
			"data-state": this.#getState.bind(this),
			"aria-hidden": $ariaBool(() => !canAirPlay())
		});
	}
	onAttach(el) {
		el.setAttribute("data-media-tooltip", "airplay");
		setARIALabel(el, this.#getDefaultLabel.bind(this));
	}
	#onPress(event) {
		this.#media.remote.requestAirPlay(event);
	}
	#isPressed() {
		const { remotePlaybackType, remotePlaybackState } = this.#media.$state;
		return remotePlaybackType() === "airplay" && remotePlaybackState() !== "disconnected";
	}
	#getState() {
		const { remotePlaybackType, remotePlaybackState } = this.#media.$state;
		return remotePlaybackType() === "airplay" && remotePlaybackState();
	}
	#getDefaultLabel() {
		const { remotePlaybackState } = this.#media.$state;
		return `AirPlay ${remotePlaybackState()}`;
	}
};

//#endregion
//#region src/elements/define/buttons/airplay-button-element.ts
/**
* @example
* ```html
* <media-airplay-button>
*   <media-icon type="airplay"></media-icon>
* </media-airplay-button>
* ```
*/
var MediaAirPlayButtonElement = class extends Host(HTMLElement, AirPlayButton$1) {
	static tagName = "media-airplay-button";
};

//#endregion
//#region src/components/ui/buttons/caption-button.ts
init_dev();
init_text_track();
init_dom();
/**
* A button for toggling the showing state of the captions.
*
* @attr data-supported - Whether captions/subtitles are available.
* @attr data-active - Whether closed captions or subtitles are on.
* @docs {@link https://www.vidstack.io/docs/player/components/buttons/caption-button}
*/
var CaptionButton = class extends Component {
	static props = ToggleButtonController.props;
	#media;
	constructor() {
		super();
		new ToggleButtonController({
			isPresssed: this.#isPressed.bind(this),
			keyShortcut: "toggleCaptions",
			onPress: this.#onPress.bind(this)
		});
	}
	onSetup() {
		this.#media = useMediaContext();
		this.setAttributes({
			"data-active": this.#isPressed.bind(this),
			"data-supported": () => !this.#isHidden(),
			"aria-hidden": $ariaBool(this.#isHidden.bind(this))
		});
	}
	onAttach(el) {
		el.setAttribute("data-media-tooltip", "caption");
		setARIALabel(el, "Captions");
	}
	#onPress(event) {
		this.#media.remote.toggleCaptions(event);
	}
	#isPressed() {
		const { textTrack } = this.#media.$state, track = textTrack();
		return !!track && isTrackCaptionKind(track);
	}
	#isHidden() {
		const { hasCaptions } = this.#media.$state;
		return !hasCaptions();
	}
};

//#endregion
//#region src/elements/define/buttons/caption-button-element.ts
/**
* @example
* ```html
* <media-caption-button>
*   <media-icon type="closed-captions-on"></media-icon>
*   <media-icon type="closed-captions"></media-icon>
* </media-caption-button>
* ```
*/
var MediaCaptionButtonElement = class extends Host(HTMLElement, CaptionButton) {
	static tagName = "media-caption-button";
};

//#endregion
//#region src/components/ui/buttons/fullscreen-button.ts
init_dev();
init_dom();
/**
* A button for toggling the fullscreen mode of the player.
*
* @attr data-active - Whether fullscreen mode is active.
* @attr data-supported - Whether fullscreen mode is supported.
* @docs {@link https://www.vidstack.io/docs/player/components/buttons/fullscreen-button}
* @see {@link https://www.vidstack.io/docs/player/api/fullscreen}
*/
var FullscreenButton$1 = class extends Component {
	static props = {
		...ToggleButtonController.props,
		target: "prefer-media"
	};
	#media;
	constructor() {
		super();
		new ToggleButtonController({
			isPresssed: this.#isPressed.bind(this),
			keyShortcut: "toggleFullscreen",
			onPress: this.#onPress.bind(this)
		});
	}
	onSetup() {
		this.#media = useMediaContext();
		const { fullscreen } = this.#media.$state, isSupported = this.#isSupported.bind(this);
		this.setAttributes({
			"data-active": fullscreen,
			"data-supported": isSupported,
			"aria-hidden": $ariaBool(() => !isSupported())
		});
	}
	onAttach(el) {
		el.setAttribute("data-media-tooltip", "fullscreen");
		setARIALabel(el, "Fullscreen");
	}
	#onPress(event) {
		const remote = this.#media.remote, target = this.$props.target();
		this.#isPressed() ? remote.exitFullscreen(target, event) : remote.enterFullscreen(target, event);
	}
	#isPressed() {
		const { fullscreen } = this.#media.$state;
		return fullscreen();
	}
	#isSupported() {
		const { canFullscreen } = this.#media.$state;
		return canFullscreen();
	}
};

//#endregion
//#region src/elements/define/buttons/fullscreen-button-element.ts
/**
* @example
* ```html
* <media-fullscreen-button>
*   <media-icon type="fullscreen"></media-icon>
*   <media-icon type="fullscreen-exit"></media-icon>
* </media-fullscreen-button>
* ```
*/
var MediaFullscreenButtonElement = class extends Host(HTMLElement, FullscreenButton$1) {
	static tagName = "media-fullscreen-button";
};

//#endregion
//#region src/components/ui/buttons/live-button.ts
init_dev();
init_dom();
/**
* This component displays the current live status of the stream. This includes whether it's
* live, at the live edge, or not live. In addition, when this button is pressed it will skip
* ahead to the live edge.
*
* @attr data-edge - Playback is at the live edge.
* @attr data-hidden - Whether current media is _not_ live.
* @attr data-focus - Whether button is being keyboard focused.
* @attr data-hocus - Whether button is being keyboard focused or hovered over.
* @docs {@link https://www.vidstack.io/docs/player/components/buttons/live-button}
*/
var LiveButton = class extends Component {
	static props = { disabled: false };
	#media;
	constructor() {
		super();
		new FocusVisibleController();
	}
	onSetup() {
		this.#media = useMediaContext();
		const { disabled } = this.$props, { live, liveEdge } = this.#media.$state, isHidden = () => !live();
		this.setAttributes({
			"data-edge": liveEdge,
			"data-hidden": isHidden,
			"aria-disabled": $ariaBool(() => disabled() || liveEdge()),
			"aria-hidden": $ariaBool(isHidden)
		});
	}
	onAttach(el) {
		setAttributeIfEmpty(el, "tabindex", "0");
		setAttributeIfEmpty(el, "role", "button");
		setAttributeIfEmpty(el, "type", "button");
		el.setAttribute("data-media-tooltip", "live");
	}
	onConnect(el) {
		onPress(el, this.#onPress.bind(this));
	}
	#onPress(event) {
		const { disabled } = this.$props, { liveEdge } = this.#media.$state;
		if (disabled() || liveEdge()) return;
		this.#media.remote.seekToLiveEdge(event);
	}
};

//#endregion
//#region src/elements/define/buttons/live-button-element.ts
/**
* @docs {@link https://www.vidstack.io/docs/wc/player/components/buttons/live-button}
* @example
* ```html
* <media-live-button>
*   <!-- ... -->
* </media-live-button>
* ```
*/
var MediaLiveButtonElement = class extends Host(HTMLElement, LiveButton) {
	static tagName = "media-live-button";
};

//#endregion
//#region src/components/ui/buttons/mute-button.ts
init_dev();
init_dom();
/**
* A button for toggling the muted state of the player.
*
* @attr data-muted - Whether volume is muted (0).
* @attr data-state - Current volume setting (low/high/muted).
* @docs {@link https://www.vidstack.io/docs/player/components/buttons/mute-button}
*/
var MuteButton$1 = class extends Component {
	static props = ToggleButtonController.props;
	#media;
	constructor() {
		super();
		new ToggleButtonController({
			isPresssed: this.#isPressed.bind(this),
			keyShortcut: "toggleMuted",
			onPress: this.#onPress.bind(this)
		});
	}
	onSetup() {
		this.#media = useMediaContext();
		this.setAttributes({
			"data-muted": this.#isPressed.bind(this),
			"data-state": this.#getState.bind(this)
		});
	}
	onAttach(el) {
		el.setAttribute("data-media-mute-button", "");
		el.setAttribute("data-media-tooltip", "mute");
		setARIALabel(el, "Mute");
	}
	#onPress(event) {
		const remote = this.#media.remote;
		this.#isPressed() ? remote.unmute(event) : remote.mute(event);
	}
	#isPressed() {
		const { muted, volume } = this.#media.$state;
		return muted() || volume() === 0;
	}
	#getState() {
		const { muted, volume } = this.#media.$state, $volume = volume();
		if (muted() || $volume === 0) return "muted";
		else if ($volume >= .5) return "high";
		else if ($volume < .5) return "low";
	}
};

//#endregion
//#region src/elements/define/buttons/mute-button-element.ts
/**
* @example
* ```html
* <media-mute-button>
*   <media-icon type="mute"></media-icon>
*   <media-icon type="volume-low"></media-icon>
*   <media-icon type="volume-high"></media-icon>
* </media-mute-button>
* ```
*/
var MediaMuteButtonElement = class extends Host(HTMLElement, MuteButton$1) {
	static tagName = "media-mute-button";
};

//#endregion
//#region src/components/ui/buttons/pip-button.ts
init_dev();
init_dom();
/**
* A button for toggling the picture-in-picture (PIP) mode of the player.
*
* @attr data-active - Whether picture-in-picture mode is active.
* @attr data-supported - Whether picture-in-picture mode is available.
* @docs {@link https://www.vidstack.io/docs/player/components/buttons/pip-button}
* @see {@link https://www.vidstack.io/docs/player/api/picture-in-picture}
*/
var PIPButton$1 = class extends Component {
	static props = ToggleButtonController.props;
	#media;
	constructor() {
		super();
		new ToggleButtonController({
			isPresssed: this.#isPressed.bind(this),
			keyShortcut: "togglePictureInPicture",
			onPress: this.#onPress.bind(this)
		});
	}
	onSetup() {
		this.#media = useMediaContext();
		const { pictureInPicture } = this.#media.$state, isSupported = this.#isSupported.bind(this);
		this.setAttributes({
			"data-active": pictureInPicture,
			"data-supported": isSupported,
			"aria-hidden": $ariaBool(() => !isSupported())
		});
	}
	onAttach(el) {
		el.setAttribute("data-media-tooltip", "pip");
		setARIALabel(el, "PiP");
	}
	#onPress(event) {
		const remote = this.#media.remote;
		this.#isPressed() ? remote.exitPictureInPicture(event) : remote.enterPictureInPicture(event);
	}
	#isPressed() {
		const { pictureInPicture } = this.#media.$state;
		return pictureInPicture();
	}
	#isSupported() {
		const { canPictureInPicture } = this.#media.$state;
		return canPictureInPicture();
	}
};

//#endregion
//#region src/elements/define/buttons/pip-button-element.ts
/**
* @example
* ```html
* <media-pip-button>
*   <media-icon type="picture-in-picture"></media-icon>
*   <media-icon type="picture-in-picture-exit"></media-icon>
* </media-pip-button>
* ```
*/
var MediaPIPButtonElement = class extends Host(HTMLElement, PIPButton$1) {
	static tagName = "media-pip-button";
};

//#endregion
//#region src/components/ui/buttons/play-button.ts
init_dev();
init_dom();
/**
* A button for toggling the playback state (play/pause) of the current media.
*
* @attr data-paused - Whether playback has stopped.
* @attr data-ended - Whether playback has ended.
* @docs {@link https://www.vidstack.io/docs/player/components/buttons/play-button}
*/
var PlayButton$1 = class extends Component {
	static props = ToggleButtonController.props;
	#media;
	constructor() {
		super();
		new ToggleButtonController({
			isPresssed: this.#isPressed.bind(this),
			keyShortcut: "togglePaused",
			onPress: this.#onPress.bind(this)
		});
	}
	onSetup() {
		this.#media = useMediaContext();
		const { paused, ended } = this.#media.$state;
		this.setAttributes({
			"data-paused": paused,
			"data-ended": ended
		});
	}
	onAttach(el) {
		el.setAttribute("data-media-tooltip", "play");
		setARIALabel(el, "Play");
	}
	#onPress(event) {
		const remote = this.#media.remote;
		this.#isPressed() ? remote.pause(event) : remote.play(event);
	}
	#isPressed() {
		const { paused } = this.#media.$state;
		return !paused();
	}
};

//#endregion
//#region src/elements/define/buttons/play-button-element.ts
/**
* @example
* ```html
* <media-play-button>
*   <media-icon type="play"></media-icon>
*   <media-icon type="pause"></media-icon>
*   <media-icon type="replay"></media-icon>
* </media-play-button>
* ```
*/
var MediaPlayButtonElement = class extends Host(HTMLElement, PlayButton$1) {
	static tagName = "media-play-button";
};

//#endregion
//#region src/components/ui/buttons/seek-button.ts
init_dev();
init_dom();
/**
* A button for seeking the current media playback forwards or backwards by a specified amount.
*
* @attr data-seeking - Whether a seeking operation is in progress.
* @attr data-supported - Whether seeking operations are permitted.
* @attr data-focus - Whether button is being keyboard focused.
* @attr data-hocus - Whether button is being keyboard focused or hovered over.
* @docs {@link https://www.vidstack.io/docs/player/components/buttons/seek-button}
*/
var SeekButton = class extends Component {
	static props = {
		disabled: false,
		seconds: 30
	};
	#media;
	constructor() {
		super();
		new FocusVisibleController();
	}
	onSetup() {
		this.#media = useMediaContext();
		const { seeking } = this.#media.$state, { seconds } = this.$props, isSupported = this.#isSupported.bind(this);
		this.setAttributes({
			seconds,
			"data-seeking": seeking,
			"data-supported": isSupported,
			"aria-hidden": $ariaBool(() => !isSupported())
		});
	}
	onAttach(el) {
		setAttributeIfEmpty(el, "tabindex", "0");
		setAttributeIfEmpty(el, "role", "button");
		setAttributeIfEmpty(el, "type", "button");
		el.setAttribute("data-media-tooltip", "seek");
		setARIALabel(el, this.#getDefaultLabel.bind(this));
	}
	onConnect(el) {
		onPress(el, this.#onPress.bind(this));
	}
	#isSupported() {
		const { canSeek } = this.#media.$state;
		return canSeek();
	}
	#getDefaultLabel() {
		const { seconds } = this.$props;
		return `Seek ${seconds() > 0 ? "forward" : "backward"} ${seconds()} seconds`;
	}
	#onPress(event) {
		const { seconds, disabled } = this.$props;
		if (disabled()) return;
		const { currentTime } = this.#media.$state, seekTo = currentTime() + seconds();
		this.#media.remote.seek(seekTo, event);
	}
};

//#endregion
//#region src/elements/define/buttons/seek-button-element.ts
/**
* @example
* ```html
* <!-- Forward +30s on each press. -->
* <media-seek-button seconds="+30">
*   <media-icon type="seek-forward"></media-icon>
* </media-seek-button>
* <!-- Backward -30s on each press. -->
* <media-seek-button seconds="-30">
*   <media-icon type="seek-backward"></media-icon>
* </media-seek-button>
* ```
*/
var MediaSeekButtonElement = class extends Host(HTMLElement, SeekButton) {
	static tagName = "media-seek-button";
};

//#endregion
//#region ../../node_modules/.pnpm/lit-html@2.8.0/node_modules/lit-html/development/lit-html.js
/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
var _a$1, _b$1, _c, _d;
const global = window;
/**
* Useful for visualizing and logging insights into what the Lit template system is doing.
*
* Compiled out of prod mode builds.
*/
const debugLogEvent = (event) => {
	if (!global.emitLitDebugLogEvents) return;
	global.dispatchEvent(new CustomEvent("lit-debug", { detail: event }));
};
let debugLogRenderId = 0;
let issueWarning;
(_a$1 = global.litIssuedWarnings) !== null && _a$1 !== void 0 || (global.litIssuedWarnings = /* @__PURE__ */ new Set());
issueWarning = (code, warning) => {
	warning += code ? ` See https://lit.dev/msg/${code} for more information.` : "";
	if (!global.litIssuedWarnings.has(warning)) {
		console.warn(warning);
		global.litIssuedWarnings.add(warning);
	}
};
issueWarning("dev-mode", `Lit is in dev mode. Not recommended for production!`);
const wrap$1 = ((_b$1 = global.ShadyDOM) === null || _b$1 === void 0 ? void 0 : _b$1.inUse) && ((_c = global.ShadyDOM) === null || _c === void 0 ? void 0 : _c.noPatch) === true ? global.ShadyDOM.wrap : (node) => node;
const trustedTypes = global.trustedTypes;
/**
* Our TrustedTypePolicy for HTML which is declared using the html template
* tag function.
*
* That HTML is a developer-authored constant, and is parsed with innerHTML
* before any untrusted expressions have been mixed in. Therefor it is
* considered safe by construction.
*/
const policy = trustedTypes ? trustedTypes.createPolicy("lit-html", { createHTML: (s) => s }) : void 0;
const identityFunction = (value) => value;
const noopSanitizer = (_node, _name, _type) => identityFunction;
/** Sets the global sanitizer factory. */
const setSanitizer = (newSanitizer) => {
	if (sanitizerFactoryInternal !== noopSanitizer) throw new Error("Attempted to overwrite existing lit-html security policy. setSanitizeDOMValueFactory should be called at most once.");
	sanitizerFactoryInternal = newSanitizer;
};
/**
* Only used in internal tests, not a part of the public API.
*/
const _testOnlyClearSanitizerFactoryDoNotCallOrElse = () => {
	sanitizerFactoryInternal = noopSanitizer;
};
const createSanitizer = (node, name, type) => {
	return sanitizerFactoryInternal(node, name, type);
};
const boundAttributeSuffix = "$lit$";
const marker = `lit$${String(Math.random()).slice(9)}$`;
const markerMatch = "?" + marker;
const nodeMarker = `<${markerMatch}>`;
const d = document;
const createMarker = () => d.createComment("");
const isPrimitive = (value) => value === null || typeof value != "object" && typeof value != "function";
const isArray = Array.isArray;
const isIterable = (value) => isArray(value) || typeof (value === null || value === void 0 ? void 0 : value[Symbol.iterator]) === "function";
const SPACE_CHAR = `[ \t\n\f\r]`;
const ATTR_VALUE_CHAR = `[^ \t\n\f\r"'\`<>=]`;
const NAME_CHAR = `[^\\s"'>=/]`;
/**
* End of text is: `<` followed by:
*   (comment start) or (tag) or (dynamic tag binding)
*/
const textEndRegex = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
const COMMENT_START = 1;
const TAG_NAME = 2;
const DYNAMIC_TAG_NAME = 3;
const commentEndRegex = /-->/g;
/**
* Comments not started with <!--, like </{, can be ended by a single `>`
*/
const comment2EndRegex = />/g;
/**
* The tagEnd regex matches the end of the "inside an opening" tag syntax
* position. It either matches a `>`, an attribute-like sequence, or the end
* of the string after a space (attribute-name position ending).
*
* See attributes in the HTML spec:
* https://www.w3.org/TR/html5/syntax.html#elements-attributes
*
* " \t\n\f\r" are HTML space characters:
* https://infra.spec.whatwg.org/#ascii-whitespace
*
* So an attribute is:
*  * The name: any character except a whitespace character, ("), ('), ">",
*    "=", or "/". Note: this is different from the HTML spec which also excludes control characters.
*  * Followed by zero or more space characters
*  * Followed by "="
*  * Followed by zero or more space characters
*  * Followed by:
*    * Any character except space, ('), ("), "<", ">", "=", (`), or
*    * (") then any non-("), or
*    * (') then any non-(')
*/
const tagEndRegex = new RegExp(`>|${SPACE_CHAR}(?:(${NAME_CHAR}+)(${SPACE_CHAR}*=${SPACE_CHAR}*(?:${ATTR_VALUE_CHAR}|("|')|))|$)`, "g");
const ENTIRE_MATCH = 0;
const ATTRIBUTE_NAME = 1;
const SPACES_AND_EQUALS = 2;
const QUOTE_CHAR = 3;
const singleQuoteAttrEndRegex = /'/g;
const doubleQuoteAttrEndRegex = /"/g;
/**
* Matches the raw text elements.
*
* Comments are not parsed within raw text elements, so we need to search their
* text content for marker strings.
*/
const rawTextElement = /^(?:script|style|textarea|title)$/i;
/** TemplateResult types */
const HTML_RESULT$1 = 1;
const SVG_RESULT$1 = 2;
const ATTRIBUTE_PART = 1;
const CHILD_PART = 2;
const PROPERTY_PART = 3;
const BOOLEAN_ATTRIBUTE_PART = 4;
const EVENT_PART = 5;
const ELEMENT_PART = 6;
const COMMENT_PART = 7;
/**
* Generates a template literal tag function that returns a TemplateResult with
* the given result type.
*/
const tag = (type) => (strings, ...values) => {
	if (strings.some((s) => s === void 0)) console.warn("Some template strings are undefined.\nThis is probably caused by illegal octal escape sequences.");
	return {
		["_$litType$"]: type,
		strings,
		values
	};
};
/**
* Interprets a template literal as an HTML template that can efficiently
* render to and update a container.
*
* ```ts
* const header = (title: string) => html`<h1>${title}</h1>`;
* ```
*
* The `html` tag returns a description of the DOM to render as a value. It is
* lazy, meaning no work is done until the template is rendered. When rendering,
* if a template comes from the same expression as a previously rendered result,
* it's efficiently updated instead of replaced.
*/
const html = tag(HTML_RESULT$1);
/**
* Interprets a template literal as an SVG fragment that can efficiently
* render to and update a container.
*
* ```ts
* const rect = svg`<rect width="10" height="10"></rect>`;
*
* const myImage = html`
*   <svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
*     ${rect}
*   </svg>`;
* ```
*
* The `svg` *tag function* should only be used for SVG fragments, or elements
* that would be contained **inside** an `<svg>` HTML element. A common error is
* placing an `<svg>` *element* in a template tagged with the `svg` tag
* function. The `<svg>` element is an HTML element and should be used within a
* template tagged with the {@linkcode html} tag function.
*
* In LitElement usage, it's invalid to return an SVG fragment from the
* `render()` method, as the SVG fragment will be contained within the element's
* shadow root and thus cannot be used within an `<svg>` HTML element.
*/
const svg = tag(SVG_RESULT$1);
/**
* A sentinel value that signals that a value was handled by a directive and
* should not be written to the DOM.
*/
const noChange = Symbol.for("lit-noChange");
/**
* A sentinel value that signals a ChildPart to fully clear its content.
*
* ```ts
* const button = html`${
*  user.isAdmin
*    ? html`<button>DELETE</button>`
*    : nothing
* }`;
* ```
*
* Prefer using `nothing` over other falsy values as it provides a consistent
* behavior between various expression binding contexts.
*
* In child expressions, `undefined`, `null`, `''`, and `nothing` all behave the
* same and render no nodes. In attribute expressions, `nothing` _removes_ the
* attribute, while `undefined` and `null` will render an empty string. In
* property expressions `nothing` becomes `undefined`.
*/
const nothing = Symbol.for("lit-nothing");
/**
* The cache of prepared templates, keyed by the tagged TemplateStringsArray
* and _not_ accounting for the specific template tag used. This means that
* template tags cannot be dynamic - the must statically be one of html, svg,
* or attr. This restriction simplifies the cache lookup, which is on the hot
* path for rendering.
*/
const templateCache = /* @__PURE__ */ new WeakMap();
const walker = d.createTreeWalker(d, 129, null, false);
let sanitizerFactoryInternal = noopSanitizer;
function trustFromTemplateString(tsa, stringFromTSA) {
	if (!Array.isArray(tsa) || !tsa.hasOwnProperty("raw")) {
		let message = "invalid template strings array";
		message = `
          Internal Error: expected template strings to be an array
          with a 'raw' field. Faking a template strings array by
          calling html or svg like an ordinary function is effectively
          the same as calling unsafeHtml and can lead to major security
          issues, e.g. opening your code up to XSS attacks.
          If you're using the html or svg tagged template functions normally
          and still seeing this error, please file a bug at
          https://github.com/lit/lit/issues/new?template=bug_report.md
          and include information about your build tooling, if any.
        `.trim().replace(/\n */g, "\n");
		throw new Error(message);
	}
	return policy !== void 0 ? policy.createHTML(stringFromTSA) : stringFromTSA;
}
/**
* Returns an HTML string for the given TemplateStringsArray and result type
* (HTML or SVG), along with the case-sensitive bound attribute names in
* template order. The HTML contains comment markers denoting the `ChildPart`s
* and suffixes on bound attributes denoting the `AttributeParts`.
*
* @param strings template strings array
* @param type HTML or SVG
* @return Array containing `[html, attrNames]` (array returned for terseness,
*     to avoid object fields since this code is shared with non-minified SSR
*     code)
*/
const getTemplateHtml = (strings, type) => {
	const l = strings.length - 1;
	const attrNames = [];
	let html = type === SVG_RESULT$1 ? "<svg>" : "";
	let rawTextEndRegex;
	let regex = textEndRegex;
	for (let i = 0; i < l; i++) {
		const s = strings[i];
		let attrNameEndIndex = -1;
		let attrName;
		let lastIndex = 0;
		let match;
		while (lastIndex < s.length) {
			regex.lastIndex = lastIndex;
			match = regex.exec(s);
			if (match === null) break;
			lastIndex = regex.lastIndex;
			if (regex === textEndRegex) {
				if (match[COMMENT_START] === "!--") regex = commentEndRegex;
				else if (match[COMMENT_START] !== void 0) regex = comment2EndRegex;
				else if (match[TAG_NAME] !== void 0) {
					if (rawTextElement.test(match[TAG_NAME])) rawTextEndRegex = new RegExp(`</${match[TAG_NAME]}`, "g");
					regex = tagEndRegex;
				} else if (match[DYNAMIC_TAG_NAME] !== void 0) throw new Error("Bindings in tag names are not supported. Please use static templates instead. See https://lit.dev/docs/templates/expressions/#static-expressions");
			} else if (regex === tagEndRegex) if (match[ENTIRE_MATCH] === ">") {
				regex = rawTextEndRegex !== null && rawTextEndRegex !== void 0 ? rawTextEndRegex : textEndRegex;
				attrNameEndIndex = -1;
			} else if (match[ATTRIBUTE_NAME] === void 0) attrNameEndIndex = -2;
			else {
				attrNameEndIndex = regex.lastIndex - match[SPACES_AND_EQUALS].length;
				attrName = match[ATTRIBUTE_NAME];
				regex = match[QUOTE_CHAR] === void 0 ? tagEndRegex : match[QUOTE_CHAR] === "\"" ? doubleQuoteAttrEndRegex : singleQuoteAttrEndRegex;
			}
			else if (regex === doubleQuoteAttrEndRegex || regex === singleQuoteAttrEndRegex) regex = tagEndRegex;
			else if (regex === commentEndRegex || regex === comment2EndRegex) regex = textEndRegex;
			else {
				regex = tagEndRegex;
				rawTextEndRegex = void 0;
			}
		}
		console.assert(attrNameEndIndex === -1 || regex === tagEndRegex || regex === singleQuoteAttrEndRegex || regex === doubleQuoteAttrEndRegex, "unexpected parse state B");
		const end = regex === tagEndRegex && strings[i + 1].startsWith("/>") ? " " : "";
		html += regex === textEndRegex ? s + nodeMarker : attrNameEndIndex >= 0 ? (attrNames.push(attrName), s.slice(0, attrNameEndIndex) + boundAttributeSuffix + s.slice(attrNameEndIndex)) + marker + end : s + marker + (attrNameEndIndex === -2 ? (attrNames.push(void 0), i) : end);
	}
	return [trustFromTemplateString(strings, html + (strings[l] || "<?>") + (type === SVG_RESULT$1 ? "</svg>" : "")), attrNames];
};
var Template = class Template {
	constructor({ strings, ["_$litType$"]: type }, options) {
		this.parts = [];
		let node;
		let nodeIndex = 0;
		let attrNameIndex = 0;
		const partCount = strings.length - 1;
		const parts = this.parts;
		const [html, attrNames] = getTemplateHtml(strings, type);
		this.el = Template.createElement(html, options);
		walker.currentNode = this.el.content;
		if (type === SVG_RESULT$1) {
			const content = this.el.content;
			const svgElement = content.firstChild;
			svgElement.remove();
			content.append(...svgElement.childNodes);
		}
		while ((node = walker.nextNode()) !== null && parts.length < partCount) {
			if (node.nodeType === 1) {
				{
					const tag = node.localName;
					if (/^(?:textarea|template)$/i.test(tag) && node.innerHTML.includes(marker)) {
						const m = `Expressions are not supported inside \`${tag}\` elements. See https://lit.dev/msg/expression-in-${tag} for more information.`;
						if (tag === "template") throw new Error(m);
						else issueWarning("", m);
					}
				}
				if (node.hasAttributes()) {
					const attrsToRemove = [];
					for (const name of node.getAttributeNames()) if (name.endsWith(boundAttributeSuffix) || name.startsWith(marker)) {
						const realName = attrNames[attrNameIndex++];
						attrsToRemove.push(name);
						if (realName !== void 0) {
							const statics = node.getAttribute(realName.toLowerCase() + boundAttributeSuffix).split(marker);
							const m = /([.?@])?(.*)/.exec(realName);
							parts.push({
								type: ATTRIBUTE_PART,
								index: nodeIndex,
								name: m[2],
								strings: statics,
								ctor: m[1] === "." ? PropertyPart : m[1] === "?" ? BooleanAttributePart : m[1] === "@" ? EventPart : AttributePart
							});
						} else parts.push({
							type: ELEMENT_PART,
							index: nodeIndex
						});
					}
					for (const name of attrsToRemove) node.removeAttribute(name);
				}
				if (rawTextElement.test(node.tagName)) {
					const strings = node.textContent.split(marker);
					const lastIndex = strings.length - 1;
					if (lastIndex > 0) {
						node.textContent = trustedTypes ? trustedTypes.emptyScript : "";
						for (let i = 0; i < lastIndex; i++) {
							node.append(strings[i], createMarker());
							walker.nextNode();
							parts.push({
								type: CHILD_PART,
								index: ++nodeIndex
							});
						}
						node.append(strings[lastIndex], createMarker());
					}
				}
			} else if (node.nodeType === 8) if (node.data === markerMatch) parts.push({
				type: CHILD_PART,
				index: nodeIndex
			});
			else {
				let i = -1;
				while ((i = node.data.indexOf(marker, i + 1)) !== -1) {
					parts.push({
						type: COMMENT_PART,
						index: nodeIndex
					});
					i += marker.length - 1;
				}
			}
			nodeIndex++;
		}
		debugLogEvent === null || debugLogEvent === void 0 || debugLogEvent({
			kind: "template prep",
			template: this,
			clonableTemplate: this.el,
			parts: this.parts,
			strings
		});
	}
	/** @nocollapse */
	static createElement(html, _options) {
		const el = d.createElement("template");
		el.innerHTML = html;
		return el;
	}
};
function resolveDirective(part, value, parent = part, attributeIndex) {
	var _a, _b, _c;
	var _d;
	if (value === noChange) return value;
	let currentDirective = attributeIndex !== void 0 ? (_a = parent.__directives) === null || _a === void 0 ? void 0 : _a[attributeIndex] : parent.__directive;
	const nextDirectiveConstructor = isPrimitive(value) ? void 0 : value["_$litDirective$"];
	if ((currentDirective === null || currentDirective === void 0 ? void 0 : currentDirective.constructor) !== nextDirectiveConstructor) {
		(_b = currentDirective === null || currentDirective === void 0 ? void 0 : currentDirective["_$notifyDirectiveConnectionChanged"]) === null || _b === void 0 || _b.call(currentDirective, false);
		if (nextDirectiveConstructor === void 0) currentDirective = void 0;
		else {
			currentDirective = new nextDirectiveConstructor(part);
			currentDirective._$initialize(part, parent, attributeIndex);
		}
		if (attributeIndex !== void 0) ((_c = (_d = parent).__directives) !== null && _c !== void 0 ? _c : _d.__directives = [])[attributeIndex] = currentDirective;
		else parent.__directive = currentDirective;
	}
	if (currentDirective !== void 0) value = resolveDirective(part, currentDirective._$resolve(part, value.values), currentDirective, attributeIndex);
	return value;
}
/**
* An updateable instance of a Template. Holds references to the Parts used to
* update the template instance.
*/
var TemplateInstance = class {
	constructor(template, parent) {
		this._$parts = [];
		/** @internal */
		this._$disconnectableChildren = void 0;
		this._$template = template;
		this._$parent = parent;
	}
	get parentNode() {
		return this._$parent.parentNode;
	}
	get _$isConnected() {
		return this._$parent._$isConnected;
	}
	_clone(options) {
		var _a;
		const { el: { content }, parts } = this._$template;
		const fragment = ((_a = options === null || options === void 0 ? void 0 : options.creationScope) !== null && _a !== void 0 ? _a : d).importNode(content, true);
		walker.currentNode = fragment;
		let node = walker.nextNode();
		let nodeIndex = 0;
		let partIndex = 0;
		let templatePart = parts[0];
		while (templatePart !== void 0) {
			if (nodeIndex === templatePart.index) {
				let part;
				if (templatePart.type === CHILD_PART) part = new ChildPart$1(node, node.nextSibling, this, options);
				else if (templatePart.type === ATTRIBUTE_PART) part = new templatePart.ctor(node, templatePart.name, templatePart.strings, this, options);
				else if (templatePart.type === ELEMENT_PART) part = new ElementPart(node, this, options);
				this._$parts.push(part);
				templatePart = parts[++partIndex];
			}
			if (nodeIndex !== (templatePart === null || templatePart === void 0 ? void 0 : templatePart.index)) {
				node = walker.nextNode();
				nodeIndex++;
			}
		}
		walker.currentNode = d;
		return fragment;
	}
	_update(values) {
		let i = 0;
		for (const part of this._$parts) {
			if (part !== void 0) {
				debugLogEvent === null || debugLogEvent === void 0 || debugLogEvent({
					kind: "set part",
					part,
					value: values[i],
					valueIndex: i,
					values,
					templateInstance: this
				});
				if (part.strings !== void 0) {
					part._$setValue(values, part, i);
					i += part.strings.length - 2;
				} else part._$setValue(values[i]);
			}
			i++;
		}
	}
};
var ChildPart$1 = class ChildPart$1 {
	constructor(startNode, endNode, parent, options) {
		var _a;
		this.type = CHILD_PART;
		this._$committedValue = nothing;
		/** @internal */
		this._$disconnectableChildren = void 0;
		this._$startNode = startNode;
		this._$endNode = endNode;
		this._$parent = parent;
		this.options = options;
		this.__isConnected = (_a = options === null || options === void 0 ? void 0 : options.isConnected) !== null && _a !== void 0 ? _a : true;
		this._textSanitizer = void 0;
	}
	get _$isConnected() {
		var _a, _b;
		return (_b = (_a = this._$parent) === null || _a === void 0 ? void 0 : _a._$isConnected) !== null && _b !== void 0 ? _b : this.__isConnected;
	}
	/**
	* The parent node into which the part renders its content.
	*
	* A ChildPart's content consists of a range of adjacent child nodes of
	* `.parentNode`, possibly bordered by 'marker nodes' (`.startNode` and
	* `.endNode`).
	*
	* - If both `.startNode` and `.endNode` are non-null, then the part's content
	* consists of all siblings between `.startNode` and `.endNode`, exclusively.
	*
	* - If `.startNode` is non-null but `.endNode` is null, then the part's
	* content consists of all siblings following `.startNode`, up to and
	* including the last child of `.parentNode`. If `.endNode` is non-null, then
	* `.startNode` will always be non-null.
	*
	* - If both `.endNode` and `.startNode` are null, then the part's content
	* consists of all child nodes of `.parentNode`.
	*/
	get parentNode() {
		let parentNode = wrap$1(this._$startNode).parentNode;
		const parent = this._$parent;
		if (parent !== void 0 && (parentNode === null || parentNode === void 0 ? void 0 : parentNode.nodeType) === 11) parentNode = parent.parentNode;
		return parentNode;
	}
	/**
	* The part's leading marker node, if any. See `.parentNode` for more
	* information.
	*/
	get startNode() {
		return this._$startNode;
	}
	/**
	* The part's trailing marker node, if any. See `.parentNode` for more
	* information.
	*/
	get endNode() {
		return this._$endNode;
	}
	_$setValue(value, directiveParent = this) {
		var _a;
		if (this.parentNode === null) throw new Error(`This \`ChildPart\` has no \`parentNode\` and therefore cannot accept a value. This likely means the element containing the part was manipulated in an unsupported way outside of Lit's control such that the part's marker nodes were ejected from DOM. For example, setting the element's \`innerHTML\` or \`textContent\` can do this.`);
		value = resolveDirective(this, value, directiveParent);
		if (isPrimitive(value)) {
			if (value === nothing || value == null || value === "") {
				if (this._$committedValue !== nothing) {
					debugLogEvent === null || debugLogEvent === void 0 || debugLogEvent({
						kind: "commit nothing to child",
						start: this._$startNode,
						end: this._$endNode,
						parent: this._$parent,
						options: this.options
					});
					this._$clear();
				}
				this._$committedValue = nothing;
			} else if (value !== this._$committedValue && value !== noChange) this._commitText(value);
		} else if (value["_$litType$"] !== void 0) this._commitTemplateResult(value);
		else if (value.nodeType !== void 0) {
			if (((_a = this.options) === null || _a === void 0 ? void 0 : _a.host) === value) {
				this._commitText("[probable mistake: rendered a template's host in itself (commonly caused by writing ${this} in a template]");
				console.warn(`Attempted to render the template host`, value, `inside itself. This is almost always a mistake, and in dev mode `, `we render some warning text. In production however, we'll `, `render it, which will usually result in an error, and sometimes `, `in the element disappearing from the DOM.`);
				return;
			}
			this._commitNode(value);
		} else if (isIterable(value)) this._commitIterable(value);
		else this._commitText(value);
	}
	_insert(node) {
		return wrap$1(wrap$1(this._$startNode).parentNode).insertBefore(node, this._$endNode);
	}
	_commitNode(value) {
		var _a;
		if (this._$committedValue !== value) {
			this._$clear();
			if (sanitizerFactoryInternal !== noopSanitizer) {
				const parentNodeName = (_a = this._$startNode.parentNode) === null || _a === void 0 ? void 0 : _a.nodeName;
				if (parentNodeName === "STYLE" || parentNodeName === "SCRIPT") {
					let message = "Forbidden";
					if (parentNodeName === "STYLE") message = "Lit does not support binding inside style nodes. This is a security risk, as style injection attacks can exfiltrate data and spoof UIs. Consider instead using css`...` literals to compose styles, and make do dynamic styling with css custom properties, ::parts, <slot>s, and by mutating the DOM rather than stylesheets.";
					else message = "Lit does not support binding inside script nodes. This is a security risk, as it could allow arbitrary code execution.";
					throw new Error(message);
				}
			}
			debugLogEvent === null || debugLogEvent === void 0 || debugLogEvent({
				kind: "commit node",
				start: this._$startNode,
				parent: this._$parent,
				value,
				options: this.options
			});
			this._$committedValue = this._insert(value);
		}
	}
	_commitText(value) {
		if (this._$committedValue !== nothing && isPrimitive(this._$committedValue)) {
			const node = wrap$1(this._$startNode).nextSibling;
			if (this._textSanitizer === void 0) this._textSanitizer = createSanitizer(node, "data", "property");
			value = this._textSanitizer(value);
			debugLogEvent === null || debugLogEvent === void 0 || debugLogEvent({
				kind: "commit text",
				node,
				value,
				options: this.options
			});
			node.data = value;
		} else {
			const textNode = d.createTextNode("");
			this._commitNode(textNode);
			if (this._textSanitizer === void 0) this._textSanitizer = createSanitizer(textNode, "data", "property");
			value = this._textSanitizer(value);
			debugLogEvent === null || debugLogEvent === void 0 || debugLogEvent({
				kind: "commit text",
				node: textNode,
				value,
				options: this.options
			});
			textNode.data = value;
		}
		this._$committedValue = value;
	}
	_commitTemplateResult(result) {
		var _a;
		const { values, ["_$litType$"]: type } = result;
		const template = typeof type === "number" ? this._$getTemplate(result) : (type.el === void 0 && (type.el = Template.createElement(trustFromTemplateString(type.h, type.h[0]), this.options)), type);
		if (((_a = this._$committedValue) === null || _a === void 0 ? void 0 : _a._$template) === template) {
			debugLogEvent === null || debugLogEvent === void 0 || debugLogEvent({
				kind: "template updating",
				template,
				instance: this._$committedValue,
				parts: this._$committedValue._$parts,
				options: this.options,
				values
			});
			this._$committedValue._update(values);
		} else {
			const instance = new TemplateInstance(template, this);
			const fragment = instance._clone(this.options);
			debugLogEvent === null || debugLogEvent === void 0 || debugLogEvent({
				kind: "template instantiated",
				template,
				instance,
				parts: instance._$parts,
				options: this.options,
				fragment,
				values
			});
			instance._update(values);
			debugLogEvent === null || debugLogEvent === void 0 || debugLogEvent({
				kind: "template instantiated and updated",
				template,
				instance,
				parts: instance._$parts,
				options: this.options,
				fragment,
				values
			});
			this._commitNode(fragment);
			this._$committedValue = instance;
		}
	}
	/** @internal */
	_$getTemplate(result) {
		let template = templateCache.get(result.strings);
		if (template === void 0) templateCache.set(result.strings, template = new Template(result));
		return template;
	}
	_commitIterable(value) {
		if (!isArray(this._$committedValue)) {
			this._$committedValue = [];
			this._$clear();
		}
		const itemParts = this._$committedValue;
		let partIndex = 0;
		let itemPart;
		for (const item of value) {
			if (partIndex === itemParts.length) itemParts.push(itemPart = new ChildPart$1(this._insert(createMarker()), this._insert(createMarker()), this, this.options));
			else itemPart = itemParts[partIndex];
			itemPart._$setValue(item);
			partIndex++;
		}
		if (partIndex < itemParts.length) {
			this._$clear(itemPart && wrap$1(itemPart._$endNode).nextSibling, partIndex);
			itemParts.length = partIndex;
		}
	}
	/**
	* Removes the nodes contained within this Part from the DOM.
	*
	* @param start Start node to clear from, for clearing a subset of the part's
	*     DOM (used when truncating iterables)
	* @param from  When `start` is specified, the index within the iterable from
	*     which ChildParts are being removed, used for disconnecting directives in
	*     those Parts.
	*
	* @internal
	*/
	_$clear(start = wrap$1(this._$startNode).nextSibling, from) {
		var _a;
		(_a = this._$notifyConnectionChanged) === null || _a === void 0 || _a.call(this, false, true, from);
		while (start && start !== this._$endNode) {
			const n = wrap$1(start).nextSibling;
			wrap$1(start).remove();
			start = n;
		}
	}
	/**
	* Implementation of RootPart's `isConnected`. Note that this metod
	* should only be called on `RootPart`s (the `ChildPart` returned from a
	* top-level `render()` call). It has no effect on non-root ChildParts.
	* @param isConnected Whether to set
	* @internal
	*/
	setConnected(isConnected) {
		var _a;
		if (this._$parent === void 0) {
			this.__isConnected = isConnected;
			(_a = this._$notifyConnectionChanged) === null || _a === void 0 || _a.call(this, isConnected);
		} else throw new Error("part.setConnected() may only be called on a RootPart returned from render().");
	}
};
var AttributePart = class {
	constructor(element, name, strings, parent, options) {
		this.type = ATTRIBUTE_PART;
		/** @internal */
		this._$committedValue = nothing;
		/** @internal */
		this._$disconnectableChildren = void 0;
		this.element = element;
		this.name = name;
		this._$parent = parent;
		this.options = options;
		if (strings.length > 2 || strings[0] !== "" || strings[1] !== "") {
			this._$committedValue = new Array(strings.length - 1).fill(/* @__PURE__ */ new String());
			this.strings = strings;
		} else this._$committedValue = nothing;
		this._sanitizer = void 0;
	}
	get tagName() {
		return this.element.tagName;
	}
	get _$isConnected() {
		return this._$parent._$isConnected;
	}
	/**
	* Sets the value of this part by resolving the value from possibly multiple
	* values and static strings and committing it to the DOM.
	* If this part is single-valued, `this._strings` will be undefined, and the
	* method will be called with a single value argument. If this part is
	* multi-value, `this._strings` will be defined, and the method is called
	* with the value array of the part's owning TemplateInstance, and an offset
	* into the value array from which the values should be read.
	* This method is overloaded this way to eliminate short-lived array slices
	* of the template instance values, and allow a fast-path for single-valued
	* parts.
	*
	* @param value The part value, or an array of values for multi-valued parts
	* @param valueIndex the index to start reading values from. `undefined` for
	*   single-valued parts
	* @param noCommit causes the part to not commit its value to the DOM. Used
	*   in hydration to prime attribute parts with their first-rendered value,
	*   but not set the attribute, and in SSR to no-op the DOM operation and
	*   capture the value for serialization.
	*
	* @internal
	*/
	_$setValue(value, directiveParent = this, valueIndex, noCommit) {
		const strings = this.strings;
		let change = false;
		if (strings === void 0) {
			value = resolveDirective(this, value, directiveParent, 0);
			change = !isPrimitive(value) || value !== this._$committedValue && value !== noChange;
			if (change) this._$committedValue = value;
		} else {
			const values = value;
			value = strings[0];
			let i, v;
			for (i = 0; i < strings.length - 1; i++) {
				v = resolveDirective(this, values[valueIndex + i], directiveParent, i);
				if (v === noChange) v = this._$committedValue[i];
				change || (change = !isPrimitive(v) || v !== this._$committedValue[i]);
				if (v === nothing) value = nothing;
				else if (value !== nothing) value += (v !== null && v !== void 0 ? v : "") + strings[i + 1];
				this._$committedValue[i] = v;
			}
		}
		if (change && !noCommit) this._commitValue(value);
	}
	/** @internal */
	_commitValue(value) {
		if (value === nothing) wrap$1(this.element).removeAttribute(this.name);
		else {
			if (this._sanitizer === void 0) this._sanitizer = sanitizerFactoryInternal(this.element, this.name, "attribute");
			value = this._sanitizer(value !== null && value !== void 0 ? value : "");
			debugLogEvent === null || debugLogEvent === void 0 || debugLogEvent({
				kind: "commit attribute",
				element: this.element,
				name: this.name,
				value,
				options: this.options
			});
			wrap$1(this.element).setAttribute(this.name, value !== null && value !== void 0 ? value : "");
		}
	}
};
var PropertyPart = class extends AttributePart {
	constructor() {
		super(...arguments);
		this.type = PROPERTY_PART;
	}
	/** @internal */
	_commitValue(value) {
		if (this._sanitizer === void 0) this._sanitizer = sanitizerFactoryInternal(this.element, this.name, "property");
		value = this._sanitizer(value);
		debugLogEvent === null || debugLogEvent === void 0 || debugLogEvent({
			kind: "commit property",
			element: this.element,
			name: this.name,
			value,
			options: this.options
		});
		this.element[this.name] = value === nothing ? void 0 : value;
	}
};
const emptyStringForBooleanAttribute = trustedTypes ? trustedTypes.emptyScript : "";
var BooleanAttributePart = class extends AttributePart {
	constructor() {
		super(...arguments);
		this.type = BOOLEAN_ATTRIBUTE_PART;
	}
	/** @internal */
	_commitValue(value) {
		debugLogEvent === null || debugLogEvent === void 0 || debugLogEvent({
			kind: "commit boolean attribute",
			element: this.element,
			name: this.name,
			value: !!(value && value !== nothing),
			options: this.options
		});
		if (value && value !== nothing) wrap$1(this.element).setAttribute(this.name, emptyStringForBooleanAttribute);
		else wrap$1(this.element).removeAttribute(this.name);
	}
};
var EventPart = class extends AttributePart {
	constructor(element, name, strings, parent, options) {
		super(element, name, strings, parent, options);
		this.type = EVENT_PART;
		if (this.strings !== void 0) throw new Error(`A \`<${element.localName}>\` has a \`@${name}=...\` listener with invalid content. Event listeners in templates must have exactly one expression and no surrounding text.`);
	}
	/** @internal */
	_$setValue(newListener, directiveParent = this) {
		var _a;
		newListener = (_a = resolveDirective(this, newListener, directiveParent, 0)) !== null && _a !== void 0 ? _a : nothing;
		if (newListener === noChange) return;
		const oldListener = this._$committedValue;
		const shouldRemoveListener = newListener === nothing && oldListener !== nothing || newListener.capture !== oldListener.capture || newListener.once !== oldListener.once || newListener.passive !== oldListener.passive;
		const shouldAddListener = newListener !== nothing && (oldListener === nothing || shouldRemoveListener);
		debugLogEvent === null || debugLogEvent === void 0 || debugLogEvent({
			kind: "commit event listener",
			element: this.element,
			name: this.name,
			value: newListener,
			options: this.options,
			removeListener: shouldRemoveListener,
			addListener: shouldAddListener,
			oldListener
		});
		if (shouldRemoveListener) this.element.removeEventListener(this.name, this, oldListener);
		if (shouldAddListener) this.element.addEventListener(this.name, this, newListener);
		this._$committedValue = newListener;
	}
	handleEvent(event) {
		var _a, _b;
		if (typeof this._$committedValue === "function") this._$committedValue.call((_b = (_a = this.options) === null || _a === void 0 ? void 0 : _a.host) !== null && _b !== void 0 ? _b : this.element, event);
		else this._$committedValue.handleEvent(event);
	}
};
var ElementPart = class {
	constructor(element, parent, options) {
		this.element = element;
		this.type = ELEMENT_PART;
		/** @internal */
		this._$disconnectableChildren = void 0;
		this._$parent = parent;
		this.options = options;
	}
	get _$isConnected() {
		return this._$parent._$isConnected;
	}
	_$setValue(value) {
		debugLogEvent === null || debugLogEvent === void 0 || debugLogEvent({
			kind: "commit to element binding",
			element: this.element,
			value,
			options: this.options
		});
		resolveDirective(this, value);
	}
};
/**
* END USERS SHOULD NOT RELY ON THIS OBJECT.
*
* Private exports for use by other Lit packages, not intended for use by
* external users.
*
* We currently do not make a mangled rollup build of the lit-ssr code. In order
* to keep a number of (otherwise private) top-level exports  mangled in the
* client side code, we export a _$LH object containing those members (or
* helper methods for accessing private fields of those members), and then
* re-export them for use in lit-ssr. This keeps lit-ssr agnostic to whether the
* client-side code is being used in `dev` mode or `prod` mode.
*
* This has a unique name, to disambiguate it from private exports in
* lit-element, which re-exports all of lit-html.
*
* @private
*/
const _$LH = {
	_boundAttributeSuffix: boundAttributeSuffix,
	_marker: marker,
	_markerMatch: markerMatch,
	_HTML_RESULT: HTML_RESULT$1,
	_getTemplateHtml: getTemplateHtml,
	_TemplateInstance: TemplateInstance,
	_isIterable: isIterable,
	_resolveDirective: resolveDirective,
	_ChildPart: ChildPart$1,
	_AttributePart: AttributePart,
	_BooleanAttributePart: BooleanAttributePart,
	_EventPart: EventPart,
	_PropertyPart: PropertyPart,
	_ElementPart: ElementPart
};
const polyfillSupport = global.litHtmlPolyfillSupportDevMode;
polyfillSupport === null || polyfillSupport === void 0 || polyfillSupport(Template, ChildPart$1);
((_d = global.litHtmlVersions) !== null && _d !== void 0 ? _d : global.litHtmlVersions = []).push("2.8.0");
if (global.litHtmlVersions.length > 1) issueWarning("multiple-versions", "Multiple versions of Lit loaded. Loading multiple versions is not recommended.");
/**
* Renders a value, usually a lit-html TemplateResult, to the container.
*
* This example renders the text "Hello, Zoe!" inside a paragraph tag, appending
* it to the container `document.body`.
*
* ```js
* import {html, render} from 'lit';
*
* const name = "Zoe";
* render(html`<p>Hello, ${name}!</p>`, document.body);
* ```
*
* @param value Any [renderable
*   value](https://lit.dev/docs/templates/expressions/#child-expressions),
*   typically a {@linkcode TemplateResult} created by evaluating a template tag
*   like {@linkcode html} or {@linkcode svg}.
* @param container A DOM container to render to. The first render will append
*   the rendered value to the container, and subsequent renders will
*   efficiently update the rendered value if the same result type was
*   previously rendered there.
* @param options See {@linkcode RenderOptions} for options documentation.
* @see
* {@link https://lit.dev/docs/libraries/standalone-templates/#rendering-lit-html-templates| Rendering Lit HTML Templates}
*/
const render = (value, container, options) => {
	var _a, _b;
	if (container == null) throw new TypeError(`The container to render into may not be ${container}`);
	const renderId = debugLogRenderId++;
	const partOwnerNode = (_a = options === null || options === void 0 ? void 0 : options.renderBefore) !== null && _a !== void 0 ? _a : container;
	let part = partOwnerNode["_$litPart$"];
	debugLogEvent === null || debugLogEvent === void 0 || debugLogEvent({
		kind: "begin render",
		id: renderId,
		value,
		container,
		options,
		part
	});
	if (part === void 0) {
		const endNode = (_b = options === null || options === void 0 ? void 0 : options.renderBefore) !== null && _b !== void 0 ? _b : null;
		partOwnerNode["_$litPart$"] = part = new ChildPart$1(container.insertBefore(createMarker(), endNode), endNode, void 0, options !== null && options !== void 0 ? options : {});
	}
	part._$setValue(value);
	debugLogEvent === null || debugLogEvent === void 0 || debugLogEvent({
		kind: "end render",
		id: renderId,
		value,
		container,
		options,
		part
	});
	return part;
};
render.setSanitizer = setSanitizer;
render.createSanitizer = createSanitizer;
render._testOnlyClearSanitizerFactoryDoNotCallOrElse = _testOnlyClearSanitizerFactoryDoNotCallOrElse;

//#endregion
//#region src/components/layouts/plyr/context.ts
init_dev();
const plyrLayoutContext = createContext();
function usePlyrLayoutContext() {
	return useContext(plyrLayoutContext);
}

//#endregion
//#region src/components/layouts/plyr/props.ts
const plyrLayoutProps = {
	clickToPlay: true,
	clickToFullscreen: true,
	controls: [
		"play-large",
		"play",
		"progress",
		"current-time",
		"mute+volume",
		"captions",
		"settings",
		"pip",
		"airplay",
		"fullscreen"
	],
	customIcons: false,
	displayDuration: false,
	download: null,
	markers: null,
	invertTime: true,
	thumbnails: null,
	toggleTime: true,
	translations: null,
	seekTime: 10,
	speed: [
		.5,
		.75,
		1,
		1.25,
		1.5,
		1.75,
		2,
		4
	]
};

//#endregion
//#region src/components/layouts/plyr/plyr-layout.ts
init_dev();
init_std();
var PlyrLayout = class extends Component {
	static props = plyrLayoutProps;
	#media;
	onSetup() {
		this.#media = useMediaContext();
		provideContext(plyrLayoutContext, {
			...this.$props,
			previewTime: signal(0)
		});
	}
};
function usePlyrLayoutClasses(el, media) {
	const { canAirPlay, canFullscreen, canPictureInPicture, controlsHidden, currentTime, fullscreen, hasCaptions, isAirPlayConnected, paused, pictureInPicture, playing, pointer, poster, textTrack, viewType, waiting } = media.$state;
	el.classList.add("plyr");
	el.classList.add("plyr--full-ui");
	const classes = {
		"plyr--airplay-active": isAirPlayConnected,
		"plyr--airplay-supported": canAirPlay,
		"plyr--fullscreen-active": fullscreen,
		"plyr--fullscreen-enabled": canFullscreen,
		"plyr--hide-controls": controlsHidden,
		"plyr--is-touch": () => pointer() === "coarse",
		"plyr--loading": waiting,
		"plyr--paused": paused,
		"plyr--pip-active": pictureInPicture,
		"plyr--pip-enabled": canPictureInPicture,
		"plyr--playing": playing,
		"plyr__poster-enabled": poster,
		"plyr--stopped": () => paused() && currentTime() === 0,
		"plyr--captions-active": textTrack,
		"plyr--captions-enabled": hasCaptions
	};
	const disposal = createDisposalBin();
	for (const token of Object.keys(classes)) disposal.add(effect(() => void el.classList.toggle(token, !!classes[token]())));
	disposal.add(effect(() => {
		const token = `plyr--${viewType()}`;
		el.classList.add(token);
		return () => el.classList.remove(token);
	}), effect(() => {
		const { $provider } = media, type = $provider()?.type, token = `plyr--${isHTMLProvider(type) ? "html5" : type}`;
		el.classList.toggle(token, !!type);
		return () => el.classList.remove(token);
	}));
	return () => disposal.empty();
}
function isHTMLProvider(type) {
	return type === "audio" || type === "video";
}

//#endregion
//#region ../../node_modules/.pnpm/lit-html@2.8.0/node_modules/lit-html/development/directive-helpers.js
/**
* @license
* Copyright 2020 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
var _a, _b;
const { _ChildPart: ChildPart } = _$LH;
const wrap = ((_a = window.ShadyDOM) === null || _a === void 0 ? void 0 : _a.inUse) && ((_b = window.ShadyDOM) === null || _b === void 0 ? void 0 : _b.noPatch) === true ? window.ShadyDOM.wrap : (node) => node;
/**
* Tests whether a part has only a single-expression with no strings to
* interpolate between.
*
* Only AttributePart and PropertyPart can have multiple expressions.
* Multi-expression parts have a `strings` property and single-expression
* parts do not.
*/
const isSingleExpression = (part) => part.strings === void 0;

//#endregion
//#region ../../node_modules/.pnpm/lit-html@2.8.0/node_modules/lit-html/development/directive.js
/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
const PartType = {
	ATTRIBUTE: 1,
	CHILD: 2,
	PROPERTY: 3,
	BOOLEAN_ATTRIBUTE: 4,
	EVENT: 5,
	ELEMENT: 6
};
/**
* Creates a user-facing directive function from a Directive class. This
* function has the same parameters as the directive's render() method.
*/
const directive = (c) => (...values) => ({
	["_$litDirective$"]: c,
	values
});
/**
* Base class for creating custom directives. Users should extend this class,
* implement `render` and/or `update`, and then pass their subclass to
* `directive`.
*/
var Directive = class {
	constructor(_partInfo) {}
	get _$isConnected() {
		return this._$parent._$isConnected;
	}
	/** @internal */
	_$initialize(part, parent, attributeIndex) {
		this.__part = part;
		this._$parent = parent;
		this.__attributeIndex = attributeIndex;
	}
	/** @internal */
	_$resolve(part, props) {
		return this.update(part, props);
	}
	update(_part, props) {
		return this.render(...props);
	}
};

//#endregion
//#region ../../node_modules/.pnpm/lit-html@2.8.0/node_modules/lit-html/development/async-directive.js
/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
/**
* Recursively walks down the tree of Parts/TemplateInstances/Directives to set
* the connected state of directives and run `disconnected`/ `reconnected`
* callbacks.
*
* @return True if there were children to disconnect; false otherwise
*/
const notifyChildrenConnectedChanged = (parent, isConnected) => {
	var _a, _b;
	const children = parent._$disconnectableChildren;
	if (children === void 0) return false;
	for (const obj of children) {
		(_b = (_a = obj)["_$notifyDirectiveConnectionChanged"]) === null || _b === void 0 || _b.call(_a, isConnected, false);
		notifyChildrenConnectedChanged(obj, isConnected);
	}
	return true;
};
/**
* Removes the given child from its parent list of disconnectable children, and
* if the parent list becomes empty as a result, removes the parent from its
* parent, and so forth up the tree when that causes subsequent parent lists to
* become empty.
*/
const removeDisconnectableFromParent = (obj) => {
	let parent, children;
	do {
		if ((parent = obj._$parent) === void 0) break;
		children = parent._$disconnectableChildren;
		children.delete(obj);
		obj = parent;
	} while ((children === null || children === void 0 ? void 0 : children.size) === 0);
};
const addDisconnectableToParent = (obj) => {
	for (let parent; parent = obj._$parent; obj = parent) {
		let children = parent._$disconnectableChildren;
		if (children === void 0) parent._$disconnectableChildren = children = /* @__PURE__ */ new Set();
		else if (children.has(obj)) break;
		children.add(obj);
		installDisconnectAPI(parent);
	}
};
/**
* Changes the parent reference of the ChildPart, and updates the sparse tree of
* Disconnectable children accordingly.
*
* Note, this method will be patched onto ChildPart instances and called from
* the core code when parts are moved between different parents.
*/
function reparentDisconnectables(newParent) {
	if (this._$disconnectableChildren !== void 0) {
		removeDisconnectableFromParent(this);
		this._$parent = newParent;
		addDisconnectableToParent(this);
	} else this._$parent = newParent;
}
/**
* Sets the connected state on any directives contained within the committed
* value of this part (i.e. within a TemplateInstance or iterable of
* ChildParts) and runs their `disconnected`/`reconnected`s, as well as within
* any directives stored on the ChildPart (when `valueOnly` is false).
*
* `isClearingValue` should be passed as `true` on a top-level part that is
* clearing itself, and not as a result of recursively disconnecting directives
* as part of a `clear` operation higher up the tree. This both ensures that any
* directive on this ChildPart that produced a value that caused the clear
* operation is not disconnected, and also serves as a performance optimization
* to avoid needless bookkeeping when a subtree is going away; when clearing a
* subtree, only the top-most part need to remove itself from the parent.
*
* `fromPartIndex` is passed only in the case of a partial `_clear` running as a
* result of truncating an iterable.
*
* Note, this method will be patched onto ChildPart instances and called from the
* core code when parts are cleared or the connection state is changed by the
* user.
*/
function notifyChildPartConnectedChanged(isConnected, isClearingValue = false, fromPartIndex = 0) {
	const value = this._$committedValue;
	const children = this._$disconnectableChildren;
	if (children === void 0 || children.size === 0) return;
	if (isClearingValue) {
		if (Array.isArray(value)) for (let i = fromPartIndex; i < value.length; i++) {
			notifyChildrenConnectedChanged(value[i], false);
			removeDisconnectableFromParent(value[i]);
		}
		else if (value != null) {
			notifyChildrenConnectedChanged(value, false);
			removeDisconnectableFromParent(value);
		}
	} else notifyChildrenConnectedChanged(this, isConnected);
}
/**
* Patches disconnection API onto ChildParts.
*/
const installDisconnectAPI = (obj) => {
	var _a, _b;
	var _c, _d;
	if (obj.type == PartType.CHILD) {
		(_a = (_c = obj)._$notifyConnectionChanged) !== null && _a !== void 0 || (_c._$notifyConnectionChanged = notifyChildPartConnectedChanged);
		(_b = (_d = obj)._$reparentDisconnectables) !== null && _b !== void 0 || (_d._$reparentDisconnectables = reparentDisconnectables);
	}
};
/**
* An abstract `Directive` base class whose `disconnected` method will be
* called when the part containing the directive is cleared as a result of
* re-rendering, or when the user calls `part.setConnected(false)` on
* a part that was previously rendered containing the directive (as happens
* when e.g. a LitElement disconnects from the DOM).
*
* If `part.setConnected(true)` is subsequently called on a
* containing part, the directive's `reconnected` method will be called prior
* to its next `update`/`render` callbacks. When implementing `disconnected`,
* `reconnected` should also be implemented to be compatible with reconnection.
*
* Note that updates may occur while the directive is disconnected. As such,
* directives should generally check the `this.isConnected` flag during
* render/update to determine whether it is safe to subscribe to resources
* that may prevent garbage collection.
*/
var AsyncDirective = class extends Directive {
	constructor() {
		super(...arguments);
		this._$disconnectableChildren = void 0;
	}
	/**
	* Initialize the part with internal fields
	* @param part
	* @param parent
	* @param attributeIndex
	*/
	_$initialize(part, parent, attributeIndex) {
		super._$initialize(part, parent, attributeIndex);
		addDisconnectableToParent(this);
		this.isConnected = part._$isConnected;
	}
	/**
	* Called from the core code when a directive is going away from a part (in
	* which case `shouldRemoveFromParent` should be true), and from the
	* `setChildrenConnected` helper function when recursively changing the
	* connection state of a tree (in which case `shouldRemoveFromParent` should
	* be false).
	*
	* @param isConnected
	* @param isClearingDirective - True when the directive itself is being
	*     removed; false when the tree is being disconnected
	* @internal
	*/
	["_$notifyDirectiveConnectionChanged"](isConnected, isClearingDirective = true) {
		var _a, _b;
		if (isConnected !== this.isConnected) {
			this.isConnected = isConnected;
			if (isConnected) (_a = this.reconnected) === null || _a === void 0 || _a.call(this);
			else (_b = this.disconnected) === null || _b === void 0 || _b.call(this);
		}
		if (isClearingDirective) {
			notifyChildrenConnectedChanged(this, isConnected);
			removeDisconnectableFromParent(this);
		}
	}
	/**
	* Sets the value of the directive's Part outside the normal `update`/`render`
	* lifecycle of a directive.
	*
	* This method should not be called synchronously from a directive's `update`
	* or `render`.
	*
	* @param directive The directive to update
	* @param value The value to set
	*/
	setValue(value) {
		if (isSingleExpression(this.__part)) this.__part._$setValue(value, this);
		else {
			if (this.__attributeIndex === void 0) throw new Error(`Expected this.__attributeIndex to be a number`);
			const newValues = [...this.__part._$committedValue];
			newValues[this.__attributeIndex] = value;
			this.__part._$setValue(newValues, this, 0);
		}
	}
	/**
	* User callbacks for implementing logic to release any resources/subscriptions
	* that may have been retained by this directive. Since directives may also be
	* re-connected, `reconnected` should also be implemented to restore the
	* working state of the directive prior to the next render.
	*/
	disconnected() {}
	reconnected() {}
};

//#endregion
//#region ../../node_modules/.pnpm/lit-html@2.8.0/node_modules/lit-html/development/directives/if-defined.js
/**
* @license
* Copyright 2018 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
/**
* For AttributeParts, sets the attribute if the value is defined and removes
* the attribute if the value is undefined.
*
* For other part types, this directive is a no-op.
*/
const ifDefined = (value) => value !== null && value !== void 0 ? value : nothing;

//#endregion
//#region src/elements/lit/directives/signal.ts
init_dev();
var SignalDirective = class extends AsyncDirective {
	#signal = null;
	#isAttr = false;
	#stop = null;
	constructor(part) {
		super(part);
		this.#isAttr = part.type === PartType.ATTRIBUTE || part.type === PartType.BOOLEAN_ATTRIBUTE;
	}
	render(signal) {
		if (signal !== this.#signal) {
			this.disconnected();
			this.#signal = signal;
			if (this.isConnected) this.#watch();
		}
		return this.#signal ? this.#resolveValue(peek(this.#signal)) : nothing;
	}
	reconnected() {
		this.#watch();
	}
	disconnected() {
		this.#stop?.();
		this.#stop = null;
	}
	#watch() {
		if (!this.#signal) return;
		this.#stop = effect(this.#onValueChange.bind(this));
	}
	#resolveValue(value) {
		return this.#isAttr ? ifDefined(value) : value;
	}
	#setValue(value) {
		this.setValue(this.#resolveValue(value));
	}
	#onValueChange() {
		try {
			this.#setValue(this.#signal?.());
		} catch (error) {
			if (error instanceof Error && error.message.includes("This `ChildPart` has no `parentNode`")) {
				const svelteDynamicImportExample = [
					"{#await import('./Player.svelte') then {default: Player}}",
					"  <svelte:component this={Player} />",
					"{/await}"
				].join("\n");
				console.warn(`[vidstack] Failed to render most likely due to a hydration issue with your framework. Dynamically importing the player should resolve the issue.\n\nSvelte Example:\n\n${svelteDynamicImportExample}`);
			} else console.error(error);
		}
	}
};
function $signal(compute) {
	return directive(SignalDirective)(computed(compute));
}

//#endregion
//#region src/elements/lit/lit-element.ts
var LitElement = class extends HTMLElement {
	rootPart = null;
	connectedCallback() {
		this.rootPart = render(this.render(), this, { renderBefore: this.firstChild });
		this.rootPart.setConnected(true);
	}
	disconnectedCallback() {
		this.rootPart?.setConnected(false);
		this.rootPart = null;
		render(null, this);
	}
};

//#endregion
//#region src/elements/define/layouts/slot-observer.ts
init_dev();
init_std();
var SlotObserver = class {
	#roots;
	#callback;
	elements = /* @__PURE__ */ new Set();
	constructor(roots, callback) {
		this.#roots = roots;
		this.#callback = callback;
	}
	connect() {
		this.#update();
		const observer = new MutationObserver(this.#onMutation);
		for (const root of this.#roots) observer.observe(root, {
			childList: true,
			subtree: true
		});
		onDispose(() => observer.disconnect());
		onDispose(this.disconnect.bind(this));
	}
	disconnect() {
		this.elements.clear();
	}
	assign(template, slot) {
		if (isDOMNode(template)) {
			slot.textContent = "";
			slot.append(template);
		} else {
			render(null, slot);
			render(template, slot);
		}
		if (!slot.style.display) slot.style.display = "contents";
		const el = slot.firstElementChild;
		if (!el) return;
		const classList = slot.getAttribute("data-class");
		if (classList) el.classList.add(...classList.split(" "));
	}
	#onMutation = animationFrameThrottle(this.#update.bind(this));
	#update(entries) {
		if (entries && !entries.some((e) => e.addedNodes.length)) return;
		let changed = false, slots = this.#roots.flatMap((root) => [...root.querySelectorAll("slot")]);
		for (const slot of slots) {
			if (!slot.hasAttribute("name") || this.elements.has(slot)) continue;
			this.elements.add(slot);
			changed = true;
		}
		if (changed) this.#callback(this.elements);
	}
};

//#endregion
//#region src/elements/define/layouts/slot-manager.ts
init_dev();
init_std();
let id = 0, slotIdAttr = "data-slot-id";
var SlotManager = class {
	#roots;
	slots;
	constructor(roots) {
		this.#roots = roots;
		this.slots = new SlotObserver(roots, this.#update.bind(this));
	}
	connect() {
		this.slots.connect();
		this.#update();
		const mutations = new MutationObserver(this.#onMutation);
		for (const root of this.#roots) mutations.observe(root, { childList: true });
		onDispose(() => mutations.disconnect());
	}
	#onMutation = animationFrameThrottle(this.#update.bind(this));
	#update() {
		for (const root of this.#roots) for (const node of root.children) {
			if (node.nodeType !== 1) continue;
			const name = node.getAttribute("slot");
			if (!name) continue;
			node.style.display = "none";
			let slotId = node.getAttribute(slotIdAttr);
			if (!slotId) node.setAttribute(slotIdAttr, slotId = ++id + "");
			for (const slot of this.slots.elements) {
				if (slot.getAttribute("name") !== name || slot.getAttribute(slotIdAttr) === slotId) continue;
				const clone = document.importNode(node, true);
				if (name.includes("-icon")) clone.classList.add("vds-icon");
				clone.style.display = "";
				clone.removeAttribute("slot");
				this.slots.assign(clone, slot);
				slot.setAttribute(slotIdAttr, slotId);
			}
		}
	}
};

//#endregion
//#region ../../node_modules/.pnpm/lit-html@2.8.0/node_modules/lit-html/development/directives/unsafe-html.js
/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
const HTML_RESULT = 1;
var UnsafeHTMLDirective = class extends Directive {
	constructor(partInfo) {
		super(partInfo);
		this._value = nothing;
		if (partInfo.type !== PartType.CHILD) throw new Error(`${this.constructor.directiveName}() can only be used in child bindings`);
	}
	render(value) {
		if (value === nothing || value == null) {
			this._templateResult = void 0;
			return this._value = value;
		}
		if (value === noChange) return value;
		if (typeof value != "string") throw new Error(`${this.constructor.directiveName}() called with a non-string value`);
		if (value === this._value) return this._templateResult;
		this._value = value;
		const strings = [value];
		strings.raw = strings;
		return this._templateResult = {
			["_$litType$"]: this.constructor.resultType,
			strings,
			values: []
		};
	}
};
UnsafeHTMLDirective.directiveName = "unsafeHTML";
UnsafeHTMLDirective.resultType = HTML_RESULT;
/**
* Renders the result as HTML, rather than text.
*
* The values `undefined`, `null`, and `nothing`, will all result in no content
* (empty string) being rendered.
*
* Note, this is unsafe to use with any user-provided input that hasn't been
* sanitized or escaped, as it may lead to cross-site-scripting
* vulnerabilities.
*/
const unsafeHTML = directive(UnsafeHTMLDirective);

//#endregion
//#region ../../node_modules/.pnpm/lit-html@2.8.0/node_modules/lit-html/development/directives/unsafe-svg.js
/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
const SVG_RESULT = 2;
var UnsafeSVGDirective = class extends UnsafeHTMLDirective {};
UnsafeSVGDirective.directiveName = "unsafeSVG";
UnsafeSVGDirective.resultType = SVG_RESULT;
/**
* Renders the result as SVG, rather than text.
*
* The values `undefined`, `null`, and `nothing`, will all result in no content
* (empty string) being rendered.
*
* Note, this is unsafe to use with any user-provided input that hasn't been
* sanitized or escaped, as it may lead to cross-site-scripting
* vulnerabilities.
*/
const unsafeSVG = directive(UnsafeSVGDirective);

//#endregion
//#region src/elements/icon.ts
init_std();
function Icon({ name, class: _class, state, paths, viewBox = "0 0 32 32" }) {
	return html`<svg
    class="${"vds-icon" + (_class ? ` ${_class}` : "")}"
    viewBox="${viewBox}"
    fill="none"
    aria-hidden="true"
    focusable="false"
    xmlns="http://www.w3.org/2000/svg"
    data-icon=${ifDefined(name ?? state)}
  >
    ${!isString(paths) ? $signal(paths) : unsafeSVG(paths)}
  </svg>`;
}

//#endregion
//#region src/elements/define/layouts/icons/icons-loader.ts
var IconsLoader = class {
	#icons = {};
	#loaded = false;
	slots;
	constructor(roots) {
		this.slots = new SlotObserver(roots, this.#insertIcons.bind(this));
	}
	connect() {
		this.slots.connect();
	}
	load() {
		this.loadIcons().then((icons) => {
			this.#icons = icons;
			this.#loaded = true;
			this.#insertIcons();
		});
	}
	*#iterate() {
		for (const iconName of Object.keys(this.#icons)) {
			const slotName = `${iconName}-icon`;
			for (const slot of this.slots.elements) {
				if (slot.name !== slotName) continue;
				yield {
					icon: this.#icons[iconName],
					slot
				};
			}
		}
	}
	#insertIcons() {
		if (!this.#loaded) return;
		for (const { icon, slot } of this.#iterate()) this.slots.assign(icon, slot);
	}
};

//#endregion
//#region src/elements/define/layouts/icons/layout-icons-loader.ts
init_dev();
var LayoutIconsLoader = class extends IconsLoader {
	connect() {
		super.connect();
		const { player } = useMediaContext();
		if (!player.el) return;
		let dispose, observer = new IntersectionObserver((entries) => {
			if (!entries[0]?.isIntersecting) return;
			dispose?.();
			dispose = void 0;
			this.load();
		});
		observer.observe(player.el);
		dispose = onDispose(() => observer.disconnect());
	}
};

//#endregion
//#region src/elements/define/layouts/plyr/icons/plyr-airplay.js
var plyr_airplay_default;
var init_plyr_airplay = __esmMin((() => {
	plyr_airplay_default = `<g><path d="M16,1 L2,1 C1.447,1 1,1.447 1,2 L1,12 C1,12.553 1.447,13 2,13 L5,13 L5,11 L3,11 L3,3 L15,3 L15,11 L13,11 L13,13 L16,13 C16.553,13 17,12.553 17,12 L17,2 C17,1.447 16.553,1 16,1 L16,1 Z"></path><polygon points="4 17 14 17 9 11"></polygon></g>`;
}));

//#endregion
//#region src/elements/define/layouts/plyr/icons/plyr-captions-off.js
var plyr_captions_off_default;
var init_plyr_captions_off = __esmMin((() => {
	plyr_captions_off_default = `<g fill-rule="evenodd" fill-opacity="0.5"><path d="M1,1 C0.4,1 0,1.4 0,2 L0,13 C0,13.6 0.4,14 1,14 L5.6,14 L8.3,16.7 C8.5,16.9 8.7,17 9,17 C9.3,17 9.5,16.9 9.7,16.7 L12.4,14 L17,14 C17.6,14 18,13.6 18,13 L18,2 C18,1.4 17.6,1 17,1 L1,1 Z M5.52,11.15 C7.51,11.15 8.53,9.83 8.8,8.74 L7.51,8.35 C7.32,9.01 6.73,9.8 5.52,9.8 C4.38,9.8 3.32,8.97 3.32,7.46 C3.32,5.85 4.44,5.09 5.5,5.09 C6.73,5.09 7.28,5.84 7.45,6.52 L8.75,6.11 C8.47,4.96 7.46,3.76 5.5,3.76 C3.6,3.76 1.89,5.2 1.89,7.46 C1.89,9.72 3.54,11.15 5.52,11.15 Z M13.09,11.15 C15.08,11.15 16.1,9.83 16.37,8.74 L15.08,8.35 C14.89,9.01 14.3,9.8 13.09,9.8 C11.95,9.8 10.89,8.97 10.89,7.46 C10.89,5.85 12.01,5.09 13.07,5.09 C14.3,5.09 14.85,5.84 15.02,6.52 L16.32,6.11 C16.04,4.96 15.03,3.76 13.07,3.76 C11.17,3.76 9.46,5.2 9.46,7.46 C9.46,9.72 11.11,11.15 13.09,11.15 Z"></path></g>`;
}));

//#endregion
//#region src/elements/define/layouts/plyr/icons/plyr-captions-on.js
var plyr_captions_on_default;
var init_plyr_captions_on = __esmMin((() => {
	plyr_captions_on_default = `<g fill-rule="evenodd"><path d="M1,1 C0.4,1 0,1.4 0,2 L0,13 C0,13.6 0.4,14 1,14 L5.6,14 L8.3,16.7 C8.5,16.9 8.7,17 9,17 C9.3,17 9.5,16.9 9.7,16.7 L12.4,14 L17,14 C17.6,14 18,13.6 18,13 L18,2 C18,1.4 17.6,1 17,1 L1,1 Z M5.52,11.15 C7.51,11.15 8.53,9.83 8.8,8.74 L7.51,8.35 C7.32,9.01 6.73,9.8 5.52,9.8 C4.38,9.8 3.32,8.97 3.32,7.46 C3.32,5.85 4.44,5.09 5.5,5.09 C6.73,5.09 7.28,5.84 7.45,6.52 L8.75,6.11 C8.47,4.96 7.46,3.76 5.5,3.76 C3.6,3.76 1.89,5.2 1.89,7.46 C1.89,9.72 3.54,11.15 5.52,11.15 Z M13.09,11.15 C15.08,11.15 16.1,9.83 16.37,8.74 L15.08,8.35 C14.89,9.01 14.3,9.8 13.09,9.8 C11.95,9.8 10.89,8.97 10.89,7.46 C10.89,5.85 12.01,5.09 13.07,5.09 C14.3,5.09 14.85,5.84 15.02,6.52 L16.32,6.11 C16.04,4.96 15.03,3.76 13.07,3.76 C11.17,3.76 9.46,5.2 9.46,7.46 C9.46,9.72 11.11,11.15 13.09,11.15 Z"></path></g>`;
}));

//#endregion
//#region src/elements/define/layouts/plyr/icons/plyr-download.js
var plyr_download_default;
var init_plyr_download = __esmMin((() => {
	plyr_download_default = `<g transform="translate(2 1)"><path d="M7,12 C7.3,12 7.5,11.9 7.7,11.7 L13.4,6 L12,4.6 L8,8.6 L8,0 L6,0 L6,8.6 L2,4.6 L0.6,6 L6.3,11.7 C6.5,11.9 6.7,12 7,12 Z" /><rect width="14" height="2" y="14" /></g>`;
}));

//#endregion
//#region src/elements/define/layouts/plyr/icons/plyr-enter-fullscreen.js
var plyr_enter_fullscreen_default;
var init_plyr_enter_fullscreen = __esmMin((() => {
	plyr_enter_fullscreen_default = `<polygon points="10 3 13.6 3 9.6 7 11 8.4 15 4.4 15 8 17 8 17 1 10 1"></polygon><polygon points="7 9.6 3 13.6 3 10 1 10 1 17 8 17 8 15 4.4 15 8.4 11"></polygon>`;
}));

//#endregion
//#region src/elements/define/layouts/plyr/icons/plyr-exit-fullscreen.js
var plyr_exit_fullscreen_default;
var init_plyr_exit_fullscreen = __esmMin((() => {
	plyr_exit_fullscreen_default = `<polygon points="1 12 4.6 12 0.6 16 2 17.4 6 13.4 6 17 8 17 8 10 1 10"></polygon><polygon points="16 0.6 12 4.6 12 1 10 1 10 8 17 8 17 6 13.4 6 17.4 2"></polygon>`;
}));

//#endregion
//#region src/elements/define/layouts/plyr/icons/plyr-fast-forward.js
var plyr_fast_forward_default;
var init_plyr_fast_forward = __esmMin((() => {
	plyr_fast_forward_default = `<polygon points="7.875 7.17142857 0 1 0 17 7.875 10.8285714 7.875 17 18 9 7.875 1"></polygon>`;
}));

//#endregion
//#region src/elements/define/layouts/plyr/icons/plyr-muted.js
var plyr_muted_default;
var init_plyr_muted = __esmMin((() => {
	plyr_muted_default = `<polygon points="12.4 12.5 14.5 10.4 16.6 12.5 18 11.1 15.9 9 18 6.9 16.6 5.5 14.5 7.6 12.4 5.5 11 6.9 13.1 9 11 11.1"></polygon><path d="M3.78571429,6.00820648 L0.714285714,6.00820648 C0.285714286,6.00820648 0,6.30901277 0,6.76022222 L0,11.2723167 C0,11.7235261 0.285714286,12.0243324 0.714285714,12.0243324 L3.78571429,12.0243324 L7.85714286,15.8819922 C8.35714286,16.1827985 9,15.8819922 9,15.2803796 L9,2.75215925 C9,2.15054666 8.35714286,1.77453879 7.85714286,2.15054666 L3.78571429,6.00820648 Z"></path>`;
}));

//#endregion
//#region src/elements/define/layouts/plyr/icons/plyr-pause.js
var plyr_pause_default;
var init_plyr_pause = __esmMin((() => {
	plyr_pause_default = `<path d="M6,1 L3,1 C2.4,1 2,1.4 2,2 L2,16 C2,16.6 2.4,17 3,17 L6,17 C6.6,17 7,16.6 7,16 L7,2 C7,1.4 6.6,1 6,1 L6,1 Z"></path><path d="M12,1 C11.4,1 11,1.4 11,2 L11,16 C11,16.6 11.4,17 12,17 L15,17 C15.6,17 16,16.6 16,16 L16,2 C16,1.4 15.6,1 15,1 L12,1 Z"></path>`;
}));

//#endregion
//#region src/elements/define/layouts/plyr/icons/plyr-pip.js
var plyr_pip_default;
var init_plyr_pip = __esmMin((() => {
	plyr_pip_default = `<polygon points="13.293 3.293 7.022 9.564 8.436 10.978 14.707 4.707 17 7 17 1 11 1"></polygon><path d="M13,15 L3,15 L3,5 L8,5 L8,3 L2,3 C1.448,3 1,3.448 1,4 L1,16 C1,16.552 1.448,17 2,17 L14,17 C14.552,17 15,16.552 15,16 L15,10 L13,10 L13,15 L13,15 Z"></path>`;
}));

//#endregion
//#region src/elements/define/layouts/plyr/icons/plyr-play.js
var plyr_play_default;
var init_plyr_play = __esmMin((() => {
	plyr_play_default = `<path d="M15.5615866,8.10002147 L3.87056367,0.225209313 C3.05219207,-0.33727727 2,0.225209313 2,1.12518784 L2,16.8748122 C2,17.7747907 3.05219207,18.3372773 3.87056367,17.7747907 L15.5615866,9.89997853 C16.1461378,9.44998927 16.1461378,8.55001073 15.5615866,8.10002147 L15.5615866,8.10002147 Z"></path>`;
}));

//#endregion
//#region src/elements/define/layouts/plyr/icons/plyr-restart.js
var plyr_restart_default;
var init_plyr_restart = __esmMin((() => {
	plyr_restart_default = `<path d="M9.7,1.2 L10.4,7.6 L12.5,5.5 C14.4,7.4 14.4,10.6 12.5,12.5 C11.6,13.5 10.3,14 9,14 C7.7,14 6.4,13.5 5.5,12.5 C3.6,10.6 3.6,7.4 5.5,5.5 C6.1,4.9 6.9,4.4 7.8,4.2 L7.2,2.3 C6,2.6 4.9,3.2 4,4.1 C1.3,6.8 1.3,11.2 4,14 C5.3,15.3 7.1,16 8.9,16 C10.8,16 12.5,15.3 13.8,14 C16.5,11.3 16.5,6.9 13.8,4.1 L16,1.9 L9.7,1.2 L9.7,1.2 Z"></path>`;
}));

//#endregion
//#region src/elements/define/layouts/plyr/icons/plyr-rewind.js
var plyr_rewind_default;
var init_plyr_rewind = __esmMin((() => {
	plyr_rewind_default = `<polygon points="10.125 1 0 9 10.125 17 10.125 10.8285714 18 17 18 1 10.125 7.17142857"></polygon>`;
}));

//#endregion
//#region src/elements/define/layouts/plyr/icons/plyr-settings.js
var plyr_settings_default;
var init_plyr_settings = __esmMin((() => {
	plyr_settings_default = `<path d="M16.135,7.784 C14.832,7.458 14.214,5.966 14.905,4.815 C15.227,4.279 15.13,3.817 14.811,3.499 L14.501,3.189 C14.183,2.871 13.721,2.774 13.185,3.095 C12.033,3.786 10.541,3.168 10.216,1.865 C10.065,1.258 9.669,1 9.219,1 L8.781,1 C8.331,1 7.936,1.258 7.784,1.865 C7.458,3.168 5.966,3.786 4.815,3.095 C4.279,2.773 3.816,2.87 3.498,3.188 L3.188,3.498 C2.87,3.816 2.773,4.279 3.095,4.815 C3.786,5.967 3.168,7.459 1.865,7.784 C1.26,7.935 1,8.33 1,8.781 L1,9.219 C1,9.669 1.258,10.064 1.865,10.216 C3.168,10.542 3.786,12.034 3.095,13.185 C2.773,13.721 2.87,14.183 3.189,14.501 L3.499,14.811 C3.818,15.13 4.281,15.226 4.815,14.905 C5.967,14.214 7.459,14.832 7.784,16.135 C7.935,16.742 8.331,17 8.781,17 L9.219,17 C9.669,17 10.064,16.742 10.216,16.135 C10.542,14.832 12.034,14.214 13.185,14.905 C13.72,15.226 14.182,15.13 14.501,14.811 L14.811,14.501 C15.129,14.183 15.226,13.72 14.905,13.185 C14.214,12.033 14.832,10.541 16.135,10.216 C16.742,10.065 17,9.669 17,9.219 L17,8.781 C17,8.33 16.74,7.935 16.135,7.784 L16.135,7.784 Z M9,12 C7.343,12 6,10.657 6,9 C6,7.343 7.343,6 9,6 C10.657,6 12,7.343 12,9 C12,10.657 10.657,12 9,12 L9,12 Z"></path>`;
}));

//#endregion
//#region src/elements/define/layouts/plyr/icons/plyr-volume.js
var plyr_volume_default;
var init_plyr_volume = __esmMin((() => {
	plyr_volume_default = `<path d="M15.5999996,3.3 C15.1999996,2.9 14.5999996,2.9 14.1999996,3.3 C13.7999996,3.7 13.7999996,4.3 14.1999996,4.7 C15.3999996,5.9 15.9999996,7.4 15.9999996,9 C15.9999996,10.6 15.3999996,12.1 14.1999996,13.3 C13.7999996,13.7 13.7999996,14.3 14.1999996,14.7 C14.3999996,14.9 14.6999996,15 14.8999996,15 C15.1999996,15 15.3999996,14.9 15.5999996,14.7 C17.0999996,13.2 17.9999996,11.2 17.9999996,9 C17.9999996,6.8 17.0999996,4.8 15.5999996,3.3 L15.5999996,3.3 Z"></path><path d="M11.2819745,5.28197449 C10.9060085,5.65794047 10.9060085,6.22188944 11.2819745,6.59785542 C12.0171538,7.33303477 12.2772954,8.05605449 12.2772954,9.00000021 C12.2772954,9.93588462 11.851678,10.9172014 11.2819745,11.4869049 C10.9060085,11.8628709 10.9060085,12.4268199 11.2819745,12.8027859 C11.4271642,12.9479755 11.9176724,13.0649528 12.2998149,12.9592565 C12.4124479,12.9281035 12.5156669,12.8776063 12.5978555,12.8027859 C13.773371,11.732654 14.1311161,10.1597914 14.1312523,9.00000021 C14.1312723,8.8299555 14.1286311,8.66015647 14.119665,8.4897429 C14.0674781,7.49784946 13.8010171,6.48513613 12.5978554,5.28197449 C12.2218894,4.9060085 11.6579405,4.9060085 11.2819745,5.28197449 Z"></path><path d="M3.78571429,6.00820648 L0.714285714,6.00820648 C0.285714286,6.00820648 0,6.30901277 0,6.76022222 L0,11.2723167 C0,11.7235261 0.285714286,12.0243324 0.714285714,12.0243324 L3.78571429,12.0243324 L7.85714286,15.8819922 C8.35714286,16.1827985 9,15.8819922 9,15.2803796 L9,2.75215925 C9,2.15054666 8.35714286,1.77453879 7.85714286,2.15054666 L3.78571429,6.00820648 Z"></path>`;
}));

//#endregion
//#region src/elements/define/layouts/plyr/icons.ts
var icons_exports = /* @__PURE__ */ __exportAll({ icons: () => icons$1 });
var icons$1;
var init_icons = __esmMin((() => {
	init_plyr_airplay();
	init_plyr_captions_off();
	init_plyr_captions_on();
	init_plyr_download();
	init_plyr_enter_fullscreen();
	init_plyr_exit_fullscreen();
	init_plyr_fast_forward();
	init_plyr_muted();
	init_plyr_pause();
	init_plyr_pip();
	init_plyr_play();
	init_plyr_restart();
	init_plyr_rewind();
	init_plyr_settings();
	init_plyr_volume();
	icons$1 = {
		airplay: plyr_airplay_default,
		"captions-off": plyr_captions_off_default,
		"captions-on": plyr_captions_on_default,
		download: plyr_download_default,
		"enter-fullscreen": plyr_exit_fullscreen_default,
		"exit-fullscreen": plyr_enter_fullscreen_default,
		"fast-forward": plyr_fast_forward_default,
		muted: plyr_muted_default,
		pause: plyr_pause_default,
		"enter-pip": plyr_pip_default,
		"exit-pip": plyr_pip_default,
		play: plyr_play_default,
		restart: plyr_restart_default,
		rewind: plyr_rewind_default,
		settings: plyr_settings_default,
		volume: plyr_volume_default
	};
}));

//#endregion
//#region src/elements/define/layouts/plyr/icons-loader.ts
var PlyrLayoutIconsLoader = class extends LayoutIconsLoader {
	async loadIcons() {
		const paths = (await Promise.resolve().then(() => (init_icons(), icons_exports))).icons, icons = {};
		for (const iconName of Object.keys(paths)) icons[iconName] = Icon({
			name: iconName,
			paths: paths[iconName],
			viewBox: "0 0 18 18"
		});
		return icons;
	}
};

//#endregion
//#region src/components/layouts/plyr/translations.ts
function i18n(translations, word) {
	return translations()?.[word] ?? word;
}

//#endregion
//#region src/elements/define/layouts/plyr/ui.ts
init_dev();
init_std();
init_network();
function PlyrAudioLayout() {
	return AudioControls();
}
function PlyrVideoLayout() {
	const media = useMediaContext(), { load } = media.$props, { canLoad } = media.$state;
	if (computed(() => load() === "play" && !canLoad())()) return [PlayLargeButton(), Poster$1()];
	return [
		OptionalPlayLarge(),
		PreviewScrubbing(),
		Poster$1(),
		VideoControls(),
		Gestures(),
		Captions()
	];
}
function PlayLargeButton() {
	const media = useMediaContext(), { translations } = usePlyrLayoutContext(), { title } = media.$state;
	return html`
    <media-play-button
      class="plyr__control plyr__control--overlaid"
      aria-label=${$signal(() => `${i18n(translations, "Play")}, ${title()}`)}
      data-plyr="play"
    >
      <slot name="play-icon"></slot>
    </button>
  `;
}
function OptionalPlayLarge() {
	const { controls } = usePlyrLayoutContext();
	return $signal(() => controls().includes("play-large") ? PlayLargeButton() : null);
}
function PreviewScrubbing() {
	const { thumbnails, previewTime } = usePlyrLayoutContext();
	return html`
    <media-thumbnail
      .src=${$signal(thumbnails)}
      class="plyr__preview-scrubbing"
      time=${$signal(() => previewTime())}
    ></media-thumbnail>
  `;
}
function Poster$1() {
	const { poster } = useMediaContext().$state;
	return html`<div class="plyr__poster" style=${$signal(() => `background-image: url("${poster()}");`)}></div>`;
}
function AudioControls() {
	const ignore = new Set([
		"captions",
		"pip",
		"airplay",
		"fullscreen"
	]), { controls } = usePlyrLayoutContext();
	return html`<div class="plyr__controls">${$signal(() => controls().filter((type) => !ignore.has(type)).map(Control))}</div>`;
}
function VideoControls() {
	const { controls } = usePlyrLayoutContext();
	return html`<div class="plyr__controls">${$signal(() => controls().map(Control))}</div>`;
}
function Control(type) {
	switch (type) {
		case "airplay": return AirPlayButton();
		case "captions": return CaptionsButton();
		case "current-time": return CurrentTime();
		case "download": return DownloadButton();
		case "duration": return Duration();
		case "fast-forward": return FastForwardButton();
		case "fullscreen": return FullscreenButton();
		case "mute":
		case "volume":
		case "mute+volume": return Volume(type);
		case "pip": return PIPButton();
		case "play": return PlayButton();
		case "progress": return TimeSlider$1();
		case "restart": return RestartButton();
		case "rewind": return RewindButton();
		case "settings": return Settings();
		default: return null;
	}
}
function AirPlayButton() {
	const { translations } = usePlyrLayoutContext();
	return html`
    <media-airplay-button class="plyr__controls__item plyr__control" data-plyr="airplay">
      <slot name="airplay-icon"></slot>
      <span class="plyr__tooltip">${$i18n(translations, "AirPlay")}</span>
    </media-airplay-button>
  `;
}
function CaptionsButton() {
	const { translations } = usePlyrLayoutContext();
	return html`
    <media-caption-button
      class="plyr__controls__item plyr__control"
      data-no-label
      data-plyr="captions"
    >
      <slot name="captions-on-icon" data-class="icon--pressed"></slot>
      <slot name="captions-off-icon" data-class="icon--not-pressed"></slot>
      <span class="label--pressed plyr__tooltip">${$i18n(translations, "Disable captions")}</span>
      <span class="label--not-pressed plyr__tooltip">${$i18n(translations, "Enable captions")}</span>
    </media-caption-button>
  `;
}
function FullscreenButton() {
	const { translations } = usePlyrLayoutContext(), $enterText = $i18n(translations, "Enter Fullscreen");
	return html`
    <media-fullscreen-button
      class="plyr__controls__item plyr__control"
      data-no-label
      data-plyr="fullscreen"
    >
      <slot name="enter-fullscreen-icon" data-class="icon--pressed"></slot>
      <slot name="exit-fullscreen-icon" data-class="icon--not-pressed"></slot>
      <span class="label--pressed plyr__tooltip">${$i18n(translations, "Exit Fullscreen")}</span>
      <span class="label--not-pressed plyr__tooltip">${$enterText}</span>
    </media-fullscreen-button>
  `;
}
function MuteButton() {
	const { translations } = usePlyrLayoutContext(), $muteText = $i18n(translations, "Mute");
	return html`
    <media-mute-button class="plyr__control" data-no-label data-plyr="mute">
      <slot name="muted-icon" data-class="icon--pressed"></slot>
      <slot name="volume-icon" data-class="icon--not-pressed"></slot>
      <span class="label--pressed plyr__tooltip">${$i18n(translations, "Unmute")}</span>
      <span class="label--not-pressed plyr__tooltip">${$muteText}</span>
    </media-mute-button>
  `;
}
function PIPButton() {
	const { translations } = usePlyrLayoutContext(), $enterText = $i18n(translations, "Enter PiP");
	return html`
    <media-pip-button class="plyr__controls__item plyr__control" data-no-label data-plyr="pip">
      <slot name="pip-icon"></slot>
      <slot name="enter-pip-icon" data-class="icon--pressed"></slot>
      <slot name="exit-pip-icon" data-class="icon--not-pressed"></slot>
      <span class="label--pressed plyr__tooltip">${$i18n(translations, "Exit PiP")}</span>
      <span class="label--not-pressed plyr__tooltip">${$enterText}</span>
    </media-pip-button>
  `;
}
function PlayButton() {
	const { translations } = usePlyrLayoutContext(), $playText = $i18n(translations, "Play");
	return html`
    <media-play-button class="plyr__controls__item plyr__control" data-no-label data-plyr="play">
      <slot name="pause-icon" data-class="icon--pressed"></slot>
      <slot name="play-icon" data-class="icon--not-pressed"></slot>
      <span class="label--pressed plyr__tooltip">${$i18n(translations, "Pause")}</span>
      <span class="label--not-pressed plyr__tooltip">${$playText}</span>
    </media-play-button>
  `;
}
function RestartButton() {
	const { translations } = usePlyrLayoutContext(), { remote } = useMediaContext(), $restartText = $i18n(translations, "Restart");
	function onPress(event) {
		if (isKeyboardEvent(event) && !isKeyboardClick(event)) return;
		remote.seek(0, event);
	}
	return html`
    <button
      type="button"
      class="plyr__control"
      data-plyr="restart"
      @pointerup=${onPress}
      @keydown=${onPress}
    >
      <slot name="restart-icon"></slot>
      <span class="plyr__tooltip">${$restartText}</span>
    </button>
  `;
}
function RewindButton() {
	const { translations, seekTime } = usePlyrLayoutContext(), $label = $signal(() => `${i18n(translations, "Rewind")} ${seekTime()}s`);
	return html`
    <media-seek-button
      class="plyr__controls__item plyr__control"
      seconds=${$signal(() => -1 * seekTime())}
      data-no-label
      data-plyr="rewind"
    >
      <slot name="rewind-icon"></slot>
      <span class="plyr__tooltip">${$label}</span>
    </media-seek-button>
  `;
}
function FastForwardButton() {
	const { translations, seekTime } = usePlyrLayoutContext(), $label = $signal(() => `${i18n(translations, "Forward")} ${seekTime()}s`);
	return html`
    <media-seek-button
      class="plyr__controls__item plyr__control"
      seconds=${$signal(seekTime)}
      data-no-label
      data-plyr="fast-forward"
    >
      <slot name="fast-forward-icon"></slot>
      <span class="plyr__tooltip">${$label}</span>
    </media-seek-button>
  `;
}
function TimeSlider$1() {
	let { duration, viewType } = useMediaContext().$state, { translations, markers, thumbnails, seekTime, previewTime } = usePlyrLayoutContext(), $seekText = $i18n(translations, "Seek"), activeMarker = signal(null), $markerLabel = $signal(() => {
		const marker = activeMarker();
		return marker ? html`<span class="plyr__progress__marker-label">${unsafeHTML(marker.label)}<br /></span>` : null;
	});
	function onSeekingRequest(event) {
		previewTime.set(event.detail);
	}
	function onMarkerEnter() {
		activeMarker.set(this);
	}
	function onMarkerLeave() {
		activeMarker.set(null);
	}
	function Preview() {
		const src = thumbnails(), $noClamp = $signal(() => viewType() === "audio");
		return !src ? html`
          <span class="plyr__tooltip">
            ${$markerLabel}
            <media-slider-value></media-slider-value>
          </span>
        ` : html`
          <media-slider-preview class="plyr__slider__preview" ?no-clamp=${$noClamp}>
            <media-slider-thumbnail .src=${src} class="plyr__slider__preview__thumbnail">
              <span class="plyr__slider__preview__time-container">
                ${$markerLabel}
                <media-slider-value class="plyr__slider__preview__time"></media-slider-value>
              </span>
            </media-slider-thumbnail>
          </media-slider-preview>
        `;
	}
	function Markers() {
		const endTime = duration();
		if (!Number.isFinite(endTime)) return null;
		return markers()?.map((marker) => html`
        <span
          class="plyr__progress__marker"
          @mouseenter=${onMarkerEnter.bind(marker)}
          @mouseleave=${onMarkerLeave}
          style=${`left: ${marker.time / endTime * 100}%;`}
        ></span>
      `);
	}
	return html`
    <div class="plyr__controls__item plyr__progress__container">
      <div class="plyr__progress">
        <media-time-slider
          class="plyr__slider"
          data-plyr="seek"
          pause-while-dragging
          key-step=${$signal(seekTime)}
          aria-label=${$seekText}
          @media-seeking-request=${onSeekingRequest}
        >
          <div class="plyr__slider__track"></div>
          <div class="plyr__slider__thumb"></div>
          <div class="plyr__slider__buffer"></div>
          ${$signal(Preview)}${$signal(Markers)}
        </media-time-slider>
      </div>
    </div>
  `;
}
function Volume(type) {
	return $signal(() => {
		const hasMuteButton = type === "mute" || type === "mute+volume", hasVolumeSlider = type === "volume" || type === "mute+volume";
		return html`
      <div class="plyr__controls__item plyr__volume">
        ${[hasMuteButton ? MuteButton() : null, hasVolumeSlider ? VolumeSlider$1() : null]}
      </div>
    `;
	});
}
function VolumeSlider$1() {
	const { translations } = usePlyrLayoutContext();
	return html`
    <media-volume-slider class="plyr__slider" data-plyr="volume" aria-label=${$i18n(translations, "Volume")}>
      <div class="plyr__slider__track"></div>
      <div class="plyr__slider__thumb"></div>
    </media-volume-slider>
  `;
}
function CurrentTime() {
	const media = useMediaContext(), { translations, invertTime, toggleTime, displayDuration } = usePlyrLayoutContext(), invert = signal(peek(invertTime));
	function onPress(event) {
		if (!toggleTime() || displayDuration() || isKeyboardEvent(event) && !isKeyboardClick(event)) return;
		invert.set((n) => !n);
	}
	function MaybeDuration() {
		return $signal(() => displayDuration() ? Duration() : null);
	}
	return $signal(() => {
		const { streamType } = media.$state, $liveText = $i18n(translations, "LIVE"), $currentTimeText = $i18n(translations, "Current time"), $remainder = $signal(() => !displayDuration() && invert());
		return streamType() === "live" || streamType() === "ll-live" ? html`
          <media-live-button
            class="plyr__controls__item plyr__control plyr__live-button"
            data-plyr="live"
          >
            <span class="plyr__live-button__text">${$liveText}</span>
          </media-live-button>
        ` : html`
          <media-time
            type="current"
            class="plyr__controls__item plyr__time plyr__time--current"
            tabindex="0"
            role="timer"
            aria-label=${$currentTimeText}
            ?remainder=${$remainder}
            @pointerup=${onPress}
            @keydown=${onPress}
          ></media-time>
          ${MaybeDuration()}
        `;
	});
}
function Duration() {
	const { translations } = usePlyrLayoutContext();
	return html`
    <media-time
      type="duration"
      class="plyr__controls__item plyr__time plyr__time--duration"
      role="timer"
      tabindex="0"
      aria-label=${$i18n(translations, "Duration")}
    ></media-time>
  `;
}
function DownloadButton() {
	return $signal(() => {
		const media = useMediaContext(), { translations, download } = usePlyrLayoutContext(), { title, source } = media.$state, $src = source(), $download = download(), file = getDownloadFile({
			title: title(),
			src: $src,
			download: $download
		}), $downloadText = $i18n(translations, "Download");
		return isString(file?.url) ? html`
          <a
            class="plyr__controls__item plyr__control"
            href=${appendParamsToURL(file.url, { download: file.name })}
            download=${file.name}
            target="_blank"
          >
            <slot name="download-icon" />
            <span class="plyr__tooltip">${$downloadText}</span>
          </a>
        ` : null;
	});
}
function Gestures() {
	return $signal(() => {
		const { clickToPlay, clickToFullscreen } = usePlyrLayoutContext();
		return [clickToPlay() ? html`
            <media-gesture
              class="plyr__gesture"
              event="pointerup"
              action="toggle:paused"
            ></media-gesture>
          ` : null, clickToFullscreen() ? html`
            <media-gesture
              class="plyr__gesture"
              event="dblpointerup"
              action="toggle:fullscreen"
            ></media-gesture>
          ` : null];
	});
}
function Captions() {
	const media = useMediaContext(), activeCue = signal(void 0), $cueText = $signal(() => unsafeHTML(activeCue()?.text));
	effect(() => {
		const track = media.$state.textTrack();
		if (!track) return;
		function onCueChange() {
			activeCue.set(track?.activeCues[0]);
		}
		onCueChange();
		return listenEvent(track, "cue-change", onCueChange);
	});
	return html`
    <div class="plyr__captions" dir="auto">
      <span class="plyr__caption">${$cueText}</span>
    </div>
  `;
}
function Settings() {
	const { translations } = usePlyrLayoutContext();
	return html`
    <div class="plyr__controls__item plyr__menu">
      <media-menu>
        <media-menu-button class="plyr__control" data-plyr="settings">
          <slot name="settings-icon" />
          <span class="plyr__tooltip">${$i18n(translations, "Settings")}</span>
        </media-menu-button>
        <media-menu-items class="plyr__menu__container" placement="top end">
          <div><div>${[
		AudioMenu(),
		CaptionsMenu(),
		QualityMenu(),
		SpeedMenu()
	]}</div></div>
        </media-menu-items>
      </media-menu>
    </div>
  `;
}
function Menu$1({ label, children }) {
	const open = signal(false), onOpen = () => open.set(true), onClose = () => open.set(false);
	return html`
    <media-menu @open=${onOpen} @close=${onClose}>
      ${MenuButton$1({
		label,
		open
	})}
      <media-menu-items>${children}</media-menu-items>
    </media-menu>
  `;
}
function MenuButton$1({ open, label }) {
	const { translations } = usePlyrLayoutContext(), $class = $signal(() => `plyr__control plyr__control--${open() ? "back" : "forward"}`);
	function GoBackText() {
		const $text = $i18n(translations, "Go back to previous menu");
		return $signal(() => open() ? html`<span class="plyr__sr-only">${$text}</span>` : null);
	}
	return html`
    <media-menu-button class=${$class} data-plyr="settings">
      <span class="plyr__menu__label" aria-hidden=${$aria(open)}>
        ${$i18n(translations, label)}
      </span>
      <span class="plyr__menu__value" data-part="hint"></span>
      ${GoBackText()}
    </media-menu-button>
  `;
}
function AudioMenu() {
	return Menu$1({
		label: "Audio",
		children: AudioRadioGroup$1()
	});
}
function AudioRadioGroup$1() {
	const { translations } = usePlyrLayoutContext();
	return html`
    <media-audio-radio-group empty-label=${$i18n(translations, "Default")}>
      <template>
        <media-radio class="plyr__control" data-plyr="audio">
          <span data-part="label"></span>
        </media-radio>
      </template>
    </media-audio-radio-group>
  `;
}
function SpeedMenu() {
	return Menu$1({
		label: "Speed",
		children: SpeedRadioGroup$1()
	});
}
function SpeedRadioGroup$1() {
	const { translations, speed } = usePlyrLayoutContext();
	return html`
    <media-speed-radio-group .rates=${speed} normal-label=${$i18n(translations, "Normal")}>
      <template>
        <media-radio class="plyr__control" data-plyr="speed">
          <span data-part="label"></span>
        </media-radio>
      </template>
    </media-speed-radio-group>
  `;
}
function CaptionsMenu() {
	return Menu$1({
		label: "Captions",
		children: CaptionsRadioGroup$1()
	});
}
function CaptionsRadioGroup$1() {
	const { translations } = usePlyrLayoutContext();
	return html`
    <media-captions-radio-group off-label=${$i18n(translations, "Disabled")}>
      <template>
        <media-radio class="plyr__control" data-plyr="captions">
          <span data-part="label"></span>
        </media-radio>
      </template>
    </media-captions-radio-group>
  `;
}
function QualityMenu() {
	return Menu$1({
		label: "Quality",
		children: QualityRadioGroup$1()
	});
}
function QualityRadioGroup$1() {
	const { translations } = usePlyrLayoutContext();
	return html`
    <media-quality-radio-group auto-label=${$i18n(translations, "Auto")}>
      <template>
        <media-radio class="plyr__control" data-plyr="quality">
          <span data-part="label"></span>
        </media-radio>
      </template>
    </media-quality-radio-group>
  `;
}
function $aria(signal) {
	return $signal(() => signal() ? "true" : "false");
}
function $i18n(translations, word) {
	return $signal(() => i18n(translations, word));
}

//#endregion
//#region src/elements/define/layouts/plyr/plyr-layout-element.ts
init_dev();
/**
* @docs {@link https://www.vidstack.io/docs/wc/player/components/layouts/plyr-layout}
* @example
* ```html
* <media-player>
*   <media-provider></media-provider>
*   <media-plyr-layout></media-plyr-layout>
* </media-player>
* ```
*/
var MediaPlyrLayoutElement = class extends Host(LitElement, PlyrLayout) {
	static tagName = "media-plyr-layout";
	#media;
	onSetup() {
		this.forwardKeepAlive = false;
		this.#media = useMediaContext();
	}
	onConnect() {
		this.#media.player.el?.setAttribute("data-layout", "plyr");
		onDispose(() => this.#media.player.el?.removeAttribute("data-layout"));
		usePlyrLayoutClasses(this, this.#media);
		effect(() => {
			if (this.$props.customIcons()) new SlotManager([this]).connect();
			else new PlyrLayoutIconsLoader([this]).connect();
		});
	}
	render() {
		return $signal(this.#render.bind(this));
	}
	#render() {
		const { viewType } = this.#media.$state;
		return viewType() === "audio" ? PlyrAudioLayout() : viewType() === "video" ? PlyrVideoLayout() : null;
	}
};

//#endregion
//#region src/components/ui/menu/menu-context.ts
init_dev();
const menuContext = createContext();

//#endregion
//#region src/components/ui/menu/radio/radio-controller.ts
init_dev();
const radioControllerContext = createContext();

//#endregion
//#region src/components/ui/menu/radio/radio-group-controller.ts
init_dev();
init_dom();
var RadioGroupController = class extends ViewController {
	#group = /* @__PURE__ */ new Set();
	#value = signal("");
	#controller = null;
	onValueChange;
	get values() {
		return Array.from(this.#group).map((radio) => radio.value());
	}
	get value() {
		return this.#value();
	}
	set value(value) {
		this.#onChange(value);
	}
	onSetup() {
		provideContext(radioControllerContext, {
			add: this.#addRadio.bind(this),
			remove: this.#removeRadio.bind(this)
		});
	}
	onAttach(el) {
		if (!hasProvidedContext(menuContext)) setAttributeIfEmpty(el, "role", "radiogroup");
		this.setAttributes({ value: this.#value });
	}
	onDestroy() {
		this.#group.clear();
	}
	#addRadio(radio) {
		if (this.#group.has(radio)) return;
		this.#group.add(radio);
		radio.onCheck = this.#onChangeBind;
		radio.check(radio.value() === this.#value());
	}
	#removeRadio(radio) {
		radio.onCheck = null;
		this.#group.delete(radio);
	}
	#onChangeBind = this.#onChange.bind(this);
	#onChange(newValue, trigger) {
		const currentValue = peek(this.#value);
		if (!newValue || newValue === currentValue) return;
		const currentRadio = this.#findRadio(currentValue), newRadio = this.#findRadio(newValue);
		currentRadio?.check(false, trigger);
		newRadio?.check(true, trigger);
		this.#value.set(newValue);
		this.onValueChange?.(newValue, trigger);
	}
	#findRadio(newValue) {
		for (const radio of this.#group) if (newValue === peek(radio.value)) return radio;
		return null;
	}
};

//#endregion
//#region src/components/ui/menu/radio-groups/audio-radio-group.ts
init_dev();
/**
* This component manages audio track radios.
*
* @docs {@link https://www.vidstack.io/docs/wc/player/components/menu/audio-radio-group}
*/
var AudioRadioGroup = class extends Component {
	static props = { emptyLabel: "Default" };
	#menu;
	#media;
	#controller;
	get value() {
		return this.#controller.value;
	}
	get disabled() {
		const { audioTracks } = this.#media.$state;
		return audioTracks().length <= 1;
	}
	constructor() {
		super();
		this.#controller = new RadioGroupController();
		this.#controller.onValueChange = this.#onValueChange.bind(this);
	}
	onSetup() {
		this.#media = useMediaContext();
		if (hasProvidedContext(menuContext)) this.#menu = useContext(menuContext);
	}
	onConnect(el) {
		effect(this.#watchValue.bind(this));
		effect(this.#watchControllerDisabled.bind(this));
		effect(this.#watchHintText.bind(this));
	}
	getOptions() {
		const { audioTracks } = this.#media.$state;
		return audioTracks().map((track) => ({
			track,
			label: track.label,
			value: track.label.toLowerCase()
		}));
	}
	#watchValue() {
		this.#controller.value = this.#getValue();
	}
	#watchHintText() {
		const { emptyLabel } = this.$props, { audioTrack } = this.#media.$state, track = audioTrack();
		this.#menu?.hint.set(track?.label ?? emptyLabel());
	}
	#watchControllerDisabled() {
		this.#menu?.disable(this.disabled);
	}
	#getValue() {
		const { audioTrack } = this.#media.$state;
		const track = audioTrack();
		return track ? track.label.toLowerCase() : "";
	}
	#onValueChange(value, trigger) {
		if (this.disabled) return;
		const index = this.#media.audioTracks.toArray().findIndex((track) => track.label.toLowerCase() === value);
		if (index >= 0) {
			const track = this.#media.audioTracks[index];
			this.#media.remote.changeAudioTrack(index, trigger);
			this.dispatch("change", {
				detail: track,
				trigger
			});
		}
	}
};
const audioradiogroup__proto = AudioRadioGroup.prototype;
prop(audioradiogroup__proto, "value");
prop(audioradiogroup__proto, "disabled");
method(audioradiogroup__proto, "getOptions");

//#endregion
//#region src/elements/define/menus/_template.ts
init_dev();
init_std();
init_dom();
function renderMenuItemsTemplate(el, onCreate) {
	requestScopedAnimationFrame(() => {
		if (!el.connectScope) return;
		const template = el.querySelector("template");
		if (!template) return;
		effect(() => {
			if (!template.content.firstElementChild?.localName && !template.firstElementChild) throw Error("[vidstack] menu items template requires root element");
			const options = el.getOptions();
			cloneTemplate(template, options.length, (radio, i) => {
				const { label, value } = options[i], labelEl = radio.querySelector(`[data-part="label"]`);
				radio.setAttribute("value", value);
				if (labelEl) if (isString(label)) labelEl.textContent = label;
				else effect(() => {
					labelEl.textContent = label();
				});
				onCreate?.(radio, options[i], i);
			});
		});
	});
}

//#endregion
//#region src/elements/define/menus/audio-radio-group-element.ts
/**
* @part label - Contains the audio track option label.
* @docs {@link https://www.vidstack.io/docs/wc/player/components/menu/audio-radio-group}
* @example
* ```html
* <media-menu>
*   <!-- ... -->
*   <media-menu-items>
*     <media-audio-radio-group>
*       <template>
*         <media-radio>
*           <span data-part="label"></span>
*         </media-radio>
*       </template>
*     </media-audio-radio-group>
*   </media-menu-items>
* </media-menu>
* ```
*/
var MediaAudioRadioGroupElement = class extends Host(HTMLElement, AudioRadioGroup) {
	static tagName = "media-audio-radio-group";
	onConnect() {
		renderMenuItemsTemplate(this);
	}
};

//#endregion
//#region src/components/ui/menu/radio-groups/captions-radio-group.ts
init_dev();
init_text_track();
/**
* This component manages caption/subtitle track radio options.
*
* @docs {@link https://www.vidstack.io/docs/wc/player/components/menu/captions-radio-group}
*/
var CaptionsRadioGroup = class extends Component {
	static props = { offLabel: "Off" };
	#media;
	#menu;
	#controller;
	get value() {
		return this.#controller.value;
	}
	get disabled() {
		const { hasCaptions } = this.#media.$state;
		return !hasCaptions();
	}
	constructor() {
		super();
		this.#controller = new RadioGroupController();
		this.#controller.onValueChange = this.#onValueChange.bind(this);
	}
	onSetup() {
		this.#media = useMediaContext();
		if (hasProvidedContext(menuContext)) this.#menu = useContext(menuContext);
	}
	onConnect(el) {
		super.onConnect?.(el);
		effect(this.#watchValue.bind(this));
		effect(this.#watchControllerDisabled.bind(this));
		effect(this.#watchHintText.bind(this));
	}
	getOptions() {
		const { offLabel } = this.$props, { textTracks } = this.#media.$state;
		return [{
			value: "off",
			label: offLabel
		}, ...textTracks().filter(isTrackCaptionKind).map((track) => ({
			track,
			label: track.label,
			value: this.#getTrackValue(track)
		}))];
	}
	#watchValue() {
		this.#controller.value = this.#getValue();
	}
	#watchHintText() {
		const { offLabel } = this.$props, { textTrack } = this.#media.$state, track = textTrack();
		this.#menu?.hint.set(track && isTrackCaptionKind(track) && track.mode === "showing" ? track.label : offLabel());
	}
	#watchControllerDisabled() {
		this.#menu?.disable(this.disabled);
	}
	#getValue() {
		const { textTrack } = this.#media.$state, track = textTrack();
		return track && isTrackCaptionKind(track) && track.mode === "showing" ? this.#getTrackValue(track) : "off";
	}
	#onValueChange(value, trigger) {
		if (this.disabled) return;
		if (value === "off") {
			const track = this.#media.textTracks.selected;
			if (track) {
				const index = this.#media.textTracks.indexOf(track);
				this.#media.remote.changeTextTrackMode(index, "disabled", trigger);
				this.dispatch("change", {
					detail: null,
					trigger
				});
			}
			return;
		}
		const index = this.#media.textTracks.toArray().findIndex((track) => this.#getTrackValue(track) === value);
		if (index >= 0) {
			const track = this.#media.textTracks[index];
			this.#media.remote.changeTextTrackMode(index, "showing", trigger);
			this.dispatch("change", {
				detail: track,
				trigger
			});
		}
	}
	#getTrackValue(track) {
		return track.id + ":" + track.kind + "-" + track.label.toLowerCase();
	}
};
const captionsradiogroup__proto = CaptionsRadioGroup.prototype;
prop(captionsradiogroup__proto, "value");
prop(captionsradiogroup__proto, "disabled");
method(captionsradiogroup__proto, "getOptions");

//#endregion
//#region src/elements/define/menus/captions-radio-group-element.ts
/**
* @part label - Contains the caption/subtitle option label.
* @docs {@link https://www.vidstack.io/docs/wc/player/components/menu/captions-radio-group}
* @example
* ```html
* <media-menu>
*   <!-- ... -->
*   <media-menu-items>
*     <media-captions-radio-group>
*       <template>
*         <media-radio>
*           <span data-part="label"></span>
*         </media-radio>
*       </template>
*     </media-captions-radio-group>
*   </media-menu-items>
* </media-menu>
* ```
*/
var MediaCaptionsRadioGroupElement = class extends Host(HTMLElement, CaptionsRadioGroup) {
	static tagName = "media-captions-radio-group";
	onConnect() {
		renderMenuItemsTemplate(this);
	}
};

//#endregion
//#region src/components/ui/menu/menu-button.ts
init_dev();
init_dom();
/**
* A button that controls the opening and closing of a menu component. The button will become a
* menuitem when used inside a submenu.
*
* @attr data-root - Whether this is the root menu button.
* @attr data-submenu - Whether menu button is part of a submenu.
* @attr data-open - Whether menu is currently open.
* @attr data-focus - Whether button is being keyboard focused.
* @attr data-hocus - Whether button is being keyboard focused or hovered over.
* @docs {@link https://www.vidstack.io/docs/player/components/menu/menu}
*/
var MenuButton = class extends Component {
	static props = { disabled: false };
	#menu;
	#hintEl = signal(null);
	get expanded() {
		return this.#menu?.expanded() ?? false;
	}
	constructor() {
		super();
		new FocusVisibleController();
	}
	onSetup() {
		this.#menu = useContext(menuContext);
	}
	onAttach(el) {
		this.#menu.attachMenuButton(this);
		effect(this.#watchDisabled.bind(this));
		setAttributeIfEmpty(el, "type", "button");
	}
	onConnect(el) {
		effect(this.#watchHintEl.bind(this));
		this.#onMutation();
		const mutations = new MutationObserver(this.#onMutation.bind(this));
		mutations.observe(el, {
			attributeFilter: ["data-part"],
			childList: true,
			subtree: true
		});
		onDispose(() => mutations.disconnect());
		onPress(el, (trigger) => {
			this.dispatch("select", { trigger });
		});
	}
	#watchDisabled() {
		this.#menu.disableMenuButton(this.$props.disabled());
	}
	#watchHintEl() {
		const el = this.#hintEl();
		if (!el) return;
		effect(() => {
			const text = this.#menu.hint();
			if (text) el.textContent = text;
		});
	}
	#onMutation() {
		const hintEl = this.el?.querySelector("[data-part=\"hint\"]");
		this.#hintEl.set(hintEl ?? null);
	}
};
const menubutton__proto = MenuButton.prototype;
prop(menubutton__proto, "expanded");

//#endregion
//#region src/elements/define/menus/menu-button-element.ts
/**
* @docs {@link https://www.vidstack.io/docs/wc/player/components/menu/menu}
* @example
* ```html
* <media-menu>
*   <media-menu-button aria-label="Settings">
*     <media-icon type="settings"></media-icon>
*   </media-menu-button>
*   <media-menu-items>
*     <!-- ... -->
*   </media-menu-items>
* </media-menu>
* ```
*/
var MediaMenuButtonElement = class extends Host(HTMLElement, MenuButton) {
	static tagName = "media-menu-button";
};

//#endregion
//#region src/components/ui/popper/popper.ts
init_dev();
init_std();
init_dom();
var Popper = class extends ViewController {
	#delegate;
	constructor(delegate) {
		super();
		this.#delegate = delegate;
		effect(this.#watchTrigger.bind(this));
	}
	onDestroy() {
		this.#stopAnimationEndListener?.();
		this.#stopAnimationEndListener = null;
	}
	#watchTrigger() {
		const trigger = this.#delegate.trigger();
		if (!trigger) {
			this.hide();
			return;
		}
		const show = this.show.bind(this), hide = this.hide.bind(this);
		this.#delegate.listen(trigger, show, hide);
	}
	#showTimerId = -1;
	#hideRafId = -1;
	#stopAnimationEndListener = null;
	show(trigger) {
		this.#cancelShowing();
		window.cancelAnimationFrame(this.#hideRafId);
		this.#hideRafId = -1;
		this.#stopAnimationEndListener?.();
		this.#stopAnimationEndListener = null;
		this.#showTimerId = window.setTimeout(() => {
			this.#showTimerId = -1;
			const content = this.#delegate.content();
			if (content) content.style.removeProperty("display");
			peek(() => this.#delegate.onChange(true, trigger));
		}, this.#delegate.showDelay?.() ?? 0);
	}
	hide(trigger) {
		this.#cancelShowing();
		peek(() => this.#delegate.onChange(false, trigger));
		this.#hideRafId = requestAnimationFrame(() => {
			this.#cancelShowing();
			this.#hideRafId = -1;
			const content = this.#delegate.content();
			if (content) {
				const onHide = () => {
					content.style.display = "none";
					this.#stopAnimationEndListener = null;
				};
				if (hasAnimation(content)) {
					this.#stopAnimationEndListener?.();
					const stop = listenEvent(content, "animationend", onHide, { once: true });
					this.#stopAnimationEndListener = stop;
				} else onHide();
			}
		});
	}
	#cancelShowing() {
		window.clearTimeout(this.#showTimerId);
		this.#showTimerId = -1;
	}
};

//#endregion
//#region src/components/ui/sliders/slider/slider-context.ts
init_dev();
const sliderContext = createContext();
const sliderObserverContext = createContext();

//#endregion
//#region ../../node_modules/.pnpm/compute-scroll-into-view@3.1.1/node_modules/compute-scroll-into-view/dist/index.js
const t = (t) => "object" == typeof t && null != t && 1 === t.nodeType, e = (t, e) => (!e || "hidden" !== t) && "visible" !== t && "clip" !== t, n = (t, n) => {
	if (t.clientHeight < t.scrollHeight || t.clientWidth < t.scrollWidth) {
		const o = getComputedStyle(t, null);
		return e(o.overflowY, n) || e(o.overflowX, n) || ((t) => {
			const e = ((t) => {
				if (!t.ownerDocument || !t.ownerDocument.defaultView) return null;
				try {
					return t.ownerDocument.defaultView.frameElement;
				} catch (t) {
					return null;
				}
			})(t);
			return !!e && (e.clientHeight < t.scrollHeight || e.clientWidth < t.scrollWidth);
		})(t);
	}
	return !1;
}, o = (t, e, n, o, l, r, i, s) => r < t && i > e || r > t && i < e ? 0 : r <= t && s <= n || i >= e && s >= n ? r - t - o : i > e && s < n || r < t && s > n ? i - e + l : 0, l = (t) => {
	const e = t.parentElement;
	return null == e ? t.getRootNode().host || null : e;
}, r = (e, r) => {
	var i, s, d, h;
	if ("undefined" == typeof document) return [];
	const { scrollMode: c, block: f, inline: u, boundary: a, skipOverflowHiddenElements: g } = r, p = "function" == typeof a ? a : (t) => t !== a;
	if (!t(e)) throw new TypeError("Invalid target");
	const m = document.scrollingElement || document.documentElement, w = [];
	let W = e;
	for (; t(W) && p(W);) {
		if (W = l(W), W === m) {
			w.push(W);
			break;
		}
		null != W && W === document.body && n(W) && !n(document.documentElement) || null != W && n(W, g) && w.push(W);
	}
	const b = null != (s = null == (i = window.visualViewport) ? void 0 : i.width) ? s : innerWidth, H = null != (h = null == (d = window.visualViewport) ? void 0 : d.height) ? h : innerHeight, { scrollX: y, scrollY: M } = window, { height: v, width: E, top: x, right: C, bottom: I, left: R } = e.getBoundingClientRect(), { top: T, right: B, bottom: F, left: V } = ((t) => {
		const e = window.getComputedStyle(t);
		return {
			top: parseFloat(e.scrollMarginTop) || 0,
			right: parseFloat(e.scrollMarginRight) || 0,
			bottom: parseFloat(e.scrollMarginBottom) || 0,
			left: parseFloat(e.scrollMarginLeft) || 0
		};
	})(e);
	let k = "start" === f || "nearest" === f ? x - T : "end" === f ? I + F : x + v / 2 - T + F, D = "center" === u ? R + E / 2 - V + B : "end" === u ? C + B : R - V;
	const L = [];
	for (let t = 0; t < w.length; t++) {
		const e = w[t], { height: l, width: r, top: i, right: s, bottom: d, left: h } = e.getBoundingClientRect();
		if ("if-needed" === c && x >= 0 && R >= 0 && I <= H && C <= b && (e === m && !n(e) || x >= i && I <= d && R >= h && C <= s)) return L;
		const a = getComputedStyle(e), g = parseInt(a.borderLeftWidth, 10), p = parseInt(a.borderTopWidth, 10), W = parseInt(a.borderRightWidth, 10), T = parseInt(a.borderBottomWidth, 10);
		let B = 0, F = 0;
		const V = "offsetWidth" in e ? e.offsetWidth - e.clientWidth - g - W : 0, S = "offsetHeight" in e ? e.offsetHeight - e.clientHeight - p - T : 0, X = "offsetWidth" in e ? 0 === e.offsetWidth ? 0 : r / e.offsetWidth : 0, Y = "offsetHeight" in e ? 0 === e.offsetHeight ? 0 : l / e.offsetHeight : 0;
		if (m === e) B = "start" === f ? k : "end" === f ? k - H : "nearest" === f ? o(M, M + H, H, p, T, M + k, M + k + v, v) : k - H / 2, F = "start" === u ? D : "center" === u ? D - b / 2 : "end" === u ? D - b : o(y, y + b, b, g, W, y + D, y + D + E, E), B = Math.max(0, B + M), F = Math.max(0, F + y);
		else {
			B = "start" === f ? k - i - p : "end" === f ? k - d + T + S : "nearest" === f ? o(i, d, l, p, T + S, k, k + v, v) : k - (i + l / 2) + S / 2, F = "start" === u ? D - h - g : "center" === u ? D - (h + r / 2) + V / 2 : "end" === u ? D - s + W + V : o(h, s, r, g, W + V, D, D + E, E);
			const { scrollLeft: t, scrollTop: n } = e;
			B = 0 === Y ? 0 : Math.max(0, Math.min(n + B / Y, e.scrollHeight - l / Y + S)), F = 0 === X ? 0 : Math.max(0, Math.min(t + F / X, e.scrollWidth - r / X + V)), k += n - B, D += t - F;
		}
		L.push({
			el: e,
			top: B,
			left: F
		});
	}
	return L;
};

//#endregion
//#region src/utils/scroll.ts
function scrollIntoView(el, options) {
	const scrolls = r(el, options);
	for (const { el, top, left } of scrolls) el.scroll({
		top,
		left,
		behavior: options.behavior
	});
}
function scrollIntoCenter(el, options = {}) {
	scrollIntoView(el, {
		scrollMode: "if-needed",
		block: "center",
		inline: "center",
		...options
	});
}

//#endregion
//#region src/components/ui/menu/menu-focus-controller.ts
init_dev();
init_std();
init_dom();
const FOCUSABLE_ELEMENTS_SELECTOR = /* @__PURE__ */ [
	"a[href]",
	"[tabindex]",
	"input",
	"select",
	"button"
].map((selector) => `${selector}:not([aria-hidden='true'])`).join(",");
const VALID_KEYS = /* @__PURE__ */ new Set([
	"Escape",
	"Tab",
	"ArrowUp",
	"ArrowDown",
	"Home",
	"PageUp",
	"End",
	"PageDown",
	"Enter",
	" "
]);
var MenuFocusController = class {
	#index = -1;
	#el = null;
	#elements = [];
	#delegate;
	get items() {
		return this.#elements;
	}
	constructor(delegate) {
		this.#delegate = delegate;
	}
	attachMenu(el) {
		listenEvent(el, "focus", this.#onFocus.bind(this));
		this.#el = el;
		onDispose(() => {
			this.#el = null;
		});
	}
	listen() {
		if (!this.#el) return;
		this.update();
		new EventsController(this.#el).add("keyup", this.#onKeyUp.bind(this)).add("keydown", this.#onKeyDown.bind(this));
		onDispose(() => {
			this.#index = -1;
			this.#elements = [];
		});
	}
	update() {
		this.#index = 0;
		this.#elements = this.#getFocusableElements();
	}
	scroll(index = this.#findActiveIndex()) {
		const element = this.#elements[index];
		if (element) requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				scrollIntoCenter(element, {
					behavior: "smooth",
					boundary: (el) => {
						return !el.hasAttribute("data-root");
					}
				});
			});
		});
	}
	focusActive(scroll = true) {
		const index = this.#findActiveIndex();
		this.#focusAt(index >= 0 ? index : 0, scroll);
	}
	#focusAt(index, scroll = true) {
		this.#index = index;
		if (this.#elements[index]) {
			this.#elements[index].focus({ preventScroll: true });
			if (scroll) this.scroll(index);
		} else this.#el?.focus({ preventScroll: true });
	}
	#findActiveIndex() {
		return this.#elements.findIndex((el) => document.activeElement === el || el.getAttribute("role") === "menuitemradio" && el.getAttribute("aria-checked") === "true");
	}
	#onFocus() {
		if (this.#index >= 0) return;
		this.update();
		this.focusActive();
	}
	#validateKeyEvent(event) {
		const el = event.target;
		if (wasEnterKeyPressed(event) && el instanceof Element) {
			const role = el.getAttribute("role");
			return !/a|input|select|button/.test(el.localName) && !role;
		}
		return VALID_KEYS.has(event.key);
	}
	#onKeyUp(event) {
		if (!this.#validateKeyEvent(event)) return;
		event.stopPropagation();
		event.preventDefault();
	}
	#onKeyDown(event) {
		if (!this.#validateKeyEvent(event)) return;
		event.stopPropagation();
		event.preventDefault();
		switch (event.key) {
			case "Escape":
				this.#delegate.closeMenu(event);
				break;
			case "Tab":
				this.#focusAt(this.#nextIndex(event.shiftKey ? -1 : 1));
				break;
			case "ArrowUp":
				this.#focusAt(this.#nextIndex(-1));
				break;
			case "ArrowDown":
				this.#focusAt(this.#nextIndex(1));
				break;
			case "Home":
			case "PageUp":
				this.#focusAt(0);
				break;
			case "End":
			case "PageDown":
				this.#focusAt(this.#elements.length - 1);
				break;
		}
	}
	#nextIndex(delta) {
		let index = this.#index;
		do
			index = (index + delta + this.#elements.length) % this.#elements.length;
		while (this.#elements[index]?.offsetParent === null);
		return index;
	}
	#getFocusableElements() {
		if (!this.#el) return [];
		const focusableElements = this.#el.querySelectorAll(FOCUSABLE_ELEMENTS_SELECTOR), elements = [];
		const is = (node) => {
			return node.getAttribute("role") === "menu";
		};
		for (const el of focusableElements) if (isHTMLElement(el) && el.offsetParent !== null && isElementParent(this.#el, el, is)) elements.push(el);
		return elements;
	}
};

//#endregion
//#region \0@oxc-project+runtime@0.132.0/helpers/decorate.js
function __decorate(decorators, target, key, desc) {
	var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
	if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
	else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
	return c > 3 && r && Object.defineProperty(target, key, r), r;
}

//#endregion
//#region src/components/ui/menu/menu.ts
init_dev();
init_std();
init_dom();
let idCount = 0;
/**
* Root menu container used to hold and manage a menu button and menu items. This component is
* used to display options in a floating panel. They can be nested to create submenus.
*
* @attr data-root - Whether this is the root menu items.
* @attr data-submenu - Whether menu is a submenu.
* @attr data-open - Whether menu is open.
* @attr data-keyboard - Whether the menu is opened via keyboard.
* @attr data-disabled - Whether menu is disabled.
* @docs {@link https://www.vidstack.io/docs/player/components/menu/menu}
*/
var Menu = class extends Component {
	static props = { showDelay: 0 };
	#media;
	#menuId;
	#menuButtonId;
	#expanded = signal(false);
	#disabled = signal(false);
	#trigger = signal(null);
	#content = signal(null);
	#parentMenu;
	#submenus = /* @__PURE__ */ new Set();
	#menuObserver = null;
	#popper;
	#focus;
	#isSliderActive = false;
	#isTriggerDisabled = signal(false);
	#transitionCallbacks = /* @__PURE__ */ new Set();
	/**
	* The menu trigger element.
	*/
	get triggerElement() {
		return this.#trigger();
	}
	/**
	* The menu items element.
	*/
	get contentElement() {
		return this.#content();
	}
	/**
	* Whether this menu is the child of another menu that contains it.
	*/
	get isSubmenu() {
		return !!this.#parentMenu;
	}
	constructor() {
		super();
		const { showDelay } = this.$props;
		this.#popper = new Popper({
			trigger: this.#trigger,
			content: this.#content,
			showDelay,
			listen: (trigger, show, hide) => {
				onPress(trigger, (event) => {
					if (this.#expanded()) hide(event);
					else show(event);
				});
				const closeTarget = this.#getCloseTarget();
				if (closeTarget) onPress(closeTarget, (event) => {
					event.stopPropagation();
					hide(event);
				});
			},
			onChange: this.#onExpandedChange.bind(this)
		});
	}
	onSetup() {
		this.#media = useMediaContext();
		const currentIdCount = ++idCount;
		this.#menuId = `media-menu-${currentIdCount}`;
		this.#menuButtonId = `media-menu-button-${currentIdCount}`;
		this.#focus = new MenuFocusController({ closeMenu: this.close.bind(this) });
		if (hasProvidedContext(menuContext)) this.#parentMenu = useContext(menuContext);
		this.#observeSliders();
		this.setAttributes({
			"data-open": this.#expanded,
			"data-root": !this.isSubmenu,
			"data-submenu": this.isSubmenu,
			"data-disabled": this.#isDisabled.bind(this)
		});
		provideContext(menuContext, {
			button: this.#trigger,
			content: this.#content,
			expanded: this.#expanded,
			hint: signal(""),
			submenu: !!this.#parentMenu,
			disable: this.#disable.bind(this),
			attachMenuButton: this.#attachMenuButton.bind(this),
			attachMenuItems: this.#attachMenuItems.bind(this),
			attachObserver: this.#attachObserver.bind(this),
			disableMenuButton: this.#disableMenuButton.bind(this),
			addSubmenu: this.#addSubmenu.bind(this),
			onTransitionEvent: (callback) => {
				this.#transitionCallbacks.add(callback);
				onDispose(() => {
					this.#transitionCallbacks.delete(callback);
				});
			}
		});
	}
	onAttach(el) {
		el.style.setProperty("display", "contents");
	}
	onConnect(el) {
		effect(this.#watchExpanded.bind(this));
		if (this.isSubmenu) this.#parentMenu?.addSubmenu(this);
	}
	onDestroy() {
		this.#trigger.set(null);
		this.#content.set(null);
		this.#menuObserver = null;
		this.#transitionCallbacks.clear();
	}
	#observeSliders() {
		let sliderActiveTimer = -1, parentSliderObserver = hasProvidedContext(sliderObserverContext) ? useContext(sliderObserverContext) : null;
		provideContext(sliderObserverContext, {
			onDragStart: () => {
				parentSliderObserver?.onDragStart?.();
				window.clearTimeout(sliderActiveTimer);
				sliderActiveTimer = -1;
				this.#isSliderActive = true;
			},
			onDragEnd: () => {
				parentSliderObserver?.onDragEnd?.();
				sliderActiveTimer = window.setTimeout(() => {
					this.#isSliderActive = false;
					sliderActiveTimer = -1;
				}, 300);
			}
		});
	}
	#watchExpanded() {
		const expanded = this.#isExpanded();
		if (!this.isSubmenu) this.#onResize();
		this.#updateMenuItemsHidden(expanded);
		if (!expanded) return;
		effect(() => {
			const { height } = this.#media.$state, content = this.#content();
			content && setStyle(content, "--player-height", height() + "px");
		});
		this.#focus.listen();
		this.listen("pointerup", this.#onPointerUp.bind(this));
		listenEvent(window, "pointerup", this.#onWindowPointerUp.bind(this));
	}
	#attachMenuButton(button) {
		const el = button.el, isMenuItem = this.isSubmenu, isARIADisabled = $ariaBool(this.#isDisabled.bind(this));
		setAttributeIfEmpty(el, "tabindex", isMenuItem ? "-1" : "0");
		setAttributeIfEmpty(el, "role", isMenuItem ? "menuitem" : "button");
		setAttribute(el, "id", this.#menuButtonId);
		setAttribute(el, "aria-haspopup", "menu");
		setAttribute(el, "aria-expanded", "false");
		setAttribute(el, "data-root", !this.isSubmenu);
		setAttribute(el, "data-submenu", this.isSubmenu);
		const watchAttrs = () => {
			setAttribute(el, "data-open", this.#expanded());
			setAttribute(el, "aria-disabled", isARIADisabled());
		};
		effect(watchAttrs);
		this.#trigger.set(el);
		onDispose(() => {
			this.#trigger.set(null);
		});
	}
	#attachMenuItems(items) {
		const el = items.el;
		el.style.setProperty("display", "none");
		setAttribute(el, "id", this.#menuId);
		setAttributeIfEmpty(el, "role", "menu");
		setAttributeIfEmpty(el, "tabindex", "-1");
		setAttribute(el, "data-root", !this.isSubmenu);
		setAttribute(el, "data-submenu", this.isSubmenu);
		this.#content.set(el);
		onDispose(() => this.#content.set(null));
		const watchAttrs = () => setAttribute(el, "data-open", this.#expanded());
		effect(watchAttrs);
		this.#focus.attachMenu(el);
		this.#updateMenuItemsHidden(false);
		const onTransition = this.#onResizeTransition.bind(this);
		if (!this.isSubmenu) {
			items.listen("transitionstart", onTransition);
			items.listen("transitionend", onTransition);
			items.listen("animationend", this.#onResize);
			items.listen("vds-menu-resize", this.#onResize);
		} else this.#parentMenu?.onTransitionEvent(onTransition);
	}
	#attachObserver(observer) {
		this.#menuObserver = observer;
	}
	#updateMenuItemsHidden(expanded) {
		const content = peek(this.#content);
		if (content) setAttribute(content, "aria-hidden", ariaBool$1(!expanded));
	}
	#disableMenuButton(disabled) {
		this.#isTriggerDisabled.set(disabled);
	}
	#wasKeyboardExpand = false;
	#onExpandedChange(isExpanded, event) {
		this.#wasKeyboardExpand = isKeyboardEvent(event);
		event?.stopPropagation();
		if (this.#expanded() === isExpanded) return;
		if (this.#isDisabled()) {
			if (isExpanded) this.#popper.hide(event);
			return;
		}
		this.el?.dispatchEvent(new Event("vds-menu-resize", {
			bubbles: true,
			composed: true
		}));
		const trigger = this.#trigger(), content = this.#content();
		if (trigger) {
			setAttribute(trigger, "aria-controls", isExpanded && this.#menuId);
			setAttribute(trigger, "aria-expanded", ariaBool$1(isExpanded));
		}
		if (content) setAttribute(content, "aria-labelledby", isExpanded && this.#menuButtonId);
		this.#expanded.set(isExpanded);
		this.#toggleMediaControls(event);
		tick();
		if (this.#wasKeyboardExpand) {
			if (isExpanded) content?.focus();
			else trigger?.focus();
			for (const el of [this.el, content]) el && el.setAttribute("data-keyboard", "");
		} else for (const el of [this.el, content]) el && el.removeAttribute("data-keyboard");
		this.dispatch(isExpanded ? "open" : "close", { trigger: event });
		if (isExpanded) {
			if (!this.isSubmenu && this.#media.activeMenu !== this) {
				this.#media.activeMenu?.close(event);
				this.#media.activeMenu = this;
			}
			this.#menuObserver?.onOpen?.(event);
		} else {
			if (this.isSubmenu) for (const el of this.#submenus) el.close(event);
			else this.#media.activeMenu = null;
			this.#menuObserver?.onClose?.(event);
		}
		if (isExpanded) requestAnimationFrame(this.#updateFocus.bind(this));
	}
	#updateFocus() {
		if (this.#isTransitionActive || this.#isSubmenuOpen) return;
		this.#focus.update();
		requestAnimationFrame(() => {
			if (this.#wasKeyboardExpand) this.#focus.focusActive();
			else this.#focus.scroll();
		});
	}
	#isExpanded() {
		return !this.#isDisabled() && this.#expanded();
	}
	#isDisabled() {
		return this.#disabled() || this.#isTriggerDisabled();
	}
	#disable(disabled) {
		this.#disabled.set(disabled);
	}
	#onPointerUp(event) {
		const content = this.#content();
		if (this.#isSliderActive || content && isEventInside(content, event)) return;
		event.stopPropagation();
	}
	#onWindowPointerUp(event) {
		const content = this.#content();
		if (this.#isSliderActive || content && isEventInside(content, event)) return;
		this.close(event);
	}
	#getCloseTarget() {
		const target = this.el?.querySelector("[data-part=\"close-target\"]");
		return this.el && target && isElementParent(this.el, target, (node) => node.getAttribute("role") === "menu") ? target : null;
	}
	#toggleMediaControls(trigger) {
		if (this.isSubmenu) return;
		if (this.#expanded()) this.#media.remote.pauseControls(trigger);
		else this.#media.remote.resumeControls(trigger);
	}
	#addSubmenu(menu) {
		this.#submenus.add(menu);
		new EventsController(menu).add("open", this.#onSubmenuOpenBind).add("close", this.#onSubmenuCloseBind);
		onDispose(this.#removeSubmenuBind);
	}
	#removeSubmenuBind = this.#removeSubmenu.bind(this);
	#removeSubmenu(menu) {
		this.#submenus.delete(menu);
	}
	#isSubmenuOpen = false;
	#onSubmenuOpenBind = this.#onSubmenuOpen.bind(this);
	#onSubmenuOpen(event) {
		this.#isSubmenuOpen = true;
		const content = this.#content();
		if (this.isSubmenu) this.triggerElement?.setAttribute("aria-hidden", "true");
		for (const target of this.#submenus) if (target !== event.target) for (const el of [target.el, target.triggerElement]) el?.setAttribute("aria-hidden", "true");
		if (content) {
			const el = event.target.el;
			for (const child of content.children) if (child.contains(el)) child.setAttribute("data-open", "");
			else if (child !== el) child.setAttribute("data-hidden", "");
		}
	}
	#onSubmenuCloseBind = this.#onSubmenuClose.bind(this);
	#onSubmenuClose(event) {
		this.#isSubmenuOpen = false;
		const content = this.#content();
		if (this.isSubmenu) this.triggerElement?.setAttribute("aria-hidden", "false");
		for (const target of this.#submenus) for (const el of [target.el, target.triggerElement]) el?.setAttribute("aria-hidden", "false");
		if (content) for (const child of content.children) {
			child.removeAttribute("data-open");
			child.removeAttribute("data-hidden");
		}
	}
	#onResize = animationFrameThrottle(() => {
		const content = peek(this.#content);
		if (!content || false) return;
		let height = 0, styles = getComputedStyle(content), children = [...content.children];
		for (const prop of [
			"paddingTop",
			"paddingBottom",
			"borderTopWidth",
			"borderBottomWidth"
		]) height += parseFloat(styles[prop]) || 0;
		for (const child of children) if (isHTMLElement(child) && child.style.display === "contents") children.push(...child.children);
		else if (child.nodeType === 3) height += parseFloat(getComputedStyle(child).fontSize);
		else if (isHTMLElement(child)) {
			if (!isElementVisible(child)) continue;
			const style = getComputedStyle(child);
			height += child.offsetHeight + (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0);
		}
		setStyle(content, "--menu-height", height + "px");
	});
	#isTransitionActive = false;
	#onResizeTransition(event) {
		const content = this.#content();
		if (content && event.propertyName === "height") {
			this.#isTransitionActive = event.type === "transitionstart";
			setAttribute(content, "data-transition", this.#isTransitionActive ? "height" : null);
			if (this.#expanded()) this.#updateFocus();
		}
		for (const callback of this.#transitionCallbacks) callback(event);
	}
	/**
	* Open this menu. The first menu item will be focused if a `KeyboardEvent` trigger is provided
	*/
	open(trigger) {
		if (peek(this.#expanded)) return;
		this.#popper.show(trigger);
		tick();
	}
	/**
	* Close this menu. The menu button that controls this menu will be focused if a `KeyboardEvent`
	* trigger is provided
	*/
	close(trigger) {
		if (!peek(this.#expanded)) return;
		this.#popper.hide(trigger);
		tick();
	}
};
__decorate([prop], Menu.prototype, "triggerElement", null);
__decorate([prop], Menu.prototype, "contentElement", null);
__decorate([prop], Menu.prototype, "isSubmenu", null);
__decorate([method], Menu.prototype, "open", null);
__decorate([method], Menu.prototype, "close", null);

//#endregion
//#region src/elements/define/menus/menu-element.ts
/**
* @part close-target - Closes menu when pressed.
* @docs {@link https://www.vidstack.io/docs/wc/player/components/menu/menu}
* @example
* ```html
* <media-menu>
*   <media-menu-button aria-label="Settings">
*     <media-icon type="settings"></media-icon>
*   </media-menu-button>
*   <media-menu-items>
*     <!-- ... -->
*   </media-menu-items>
* </media-menu>
* ```
*/
var MediaMenuElement = class extends Host(HTMLElement, Menu) {
	static tagName = "media-menu";
};

//#endregion
//#region src/components/ui/menu/menu-item.ts
/**
* Represents a specific option or action, typically displayed as a text label or icon, which
* users can select to access or perform a particular function or view related content.
*
* @docs {@link https://www.vidstack.io/docs/player/components/menu/menu}
*/
var MenuItem = class extends MenuButton {};

//#endregion
//#region src/elements/define/menus/menu-item-element.ts
/**
* @docs {@link https://www.vidstack.io/docs/wc/player/components/menu/menu}
* @example
* ```html
* <media-menu>
*   <media-menu-items>
*      <media-menu-item></media-menu-item>
*   </media-menu-items>
* </media-menu>
* ```
*/
var MediaMenuItemElement = class extends Host(HTMLElement, MenuItem) {
	static tagName = "media-menu-item";
};

//#endregion
//#region src/components/ui/menu/menu-portal.ts
init_dev();
const menuPortalContext = createContext();

//#endregion
//#region src/components/ui/menu/menu-items.ts
init_dev();
init_dom();
/**
* Menu items can be used to display settings or arbitrary content in a floating panel.
*
* @attr data-root - Whether this is the root menu items.
* @attr data-submenu - Whether menu items are part of a submenu.
* @attr data-open - Whether menu items are currently visible.
* @attr data-keyboard - Whether the menu is opened via keyboard.
* @attr data-placement - The placement prop setting.
* @attr data-focus - Whether item are being keyboard focused.
* @attr data-hocus - Whether items are being keyboard focused or hovered over.
* @attr data-transition - Whether the menu is resizing.
* @docs {@link https://www.vidstack.io/docs/player/components/menu/menu}
*/
var MenuItems = class extends Component {
	static props = {
		placement: null,
		offset: 0,
		alignOffset: 0
	};
	#menu;
	constructor() {
		super();
		new FocusVisibleController();
		const { placement } = this.$props;
		this.setAttributes({ "data-placement": placement });
	}
	onAttach(el) {
		this.#menu = useContext(menuContext);
		this.#menu.attachMenuItems(this);
		if (hasProvidedContext(menuPortalContext)) {
			const portal = useContext(menuPortalContext);
			if (portal) {
				provideContext(menuPortalContext, null);
				portal.attach(el);
				onDispose(() => portal.attach(null));
			}
		}
	}
	onConnect(el) {
		effect(this.#watchPlacement.bind(this));
	}
	#watchPlacement() {
		const { expanded } = this.#menu;
		if (!this.el || !expanded()) return;
		const placement = this.$props.placement();
		if (!placement) return;
		Object.assign(this.el.style, {
			position: "absolute",
			top: 0,
			left: 0,
			width: "max-content"
		});
		const { offset: mainOffset, alignOffset } = this.$props;
		onDispose(autoPlacement(this.el, this.#getButton(), placement, {
			offsetVarName: "media-menu",
			xOffset: alignOffset(),
			yOffset: mainOffset()
		}));
		onDispose(this.#hide.bind(this));
	}
	#hide() {
		if (!this.el) return;
		this.el.removeAttribute("style");
		this.el.style.display = "none";
	}
	#getButton() {
		return this.#menu.button();
	}
};

//#endregion
//#region src/elements/define/menus/menu-items-element.ts
/**
* @docs {@link https://www.vidstack.io/docs/wc/player/components/menu/menu}
* @example
* ```html
* <media-menu>
*   <media-menu-button aria-label="Settings">
*     <media-icon type="settings"></media-icon>
*   </media-menu-button>
*   <media-menu-items>
*     <!-- ... -->
*   </media-menu-items>
* </media-menu>
* ```
*/
var MediaMenuItemsElement = class extends Host(HTMLElement, MenuItems) {
	static tagName = "media-menu-items";
};

//#endregion
//#region src/core/quality/utils.ts
function sortVideoQualities(qualities, desc) {
	return [...qualities].sort(desc ? compareVideoQualityDesc : compareVideoQualityAsc);
}
function compareVideoQualityAsc(a, b) {
	return a.height === b.height ? (a.bitrate ?? 0) - (b.bitrate ?? 0) : a.height - b.height;
}
function compareVideoQualityDesc(a, b) {
	return b.height === a.height ? (b.bitrate ?? 0) - (a.bitrate ?? 0) : b.height - a.height;
}

//#endregion
//#region src/components/ui/menu/radio-groups/quality-radio-group.ts
init_dev();
init_number();
/**
* This component manages video quality radios.
*
* @docs {@link https://www.vidstack.io/docs/wc/player/components/menu/quality-radio-group}
*/
var QualityRadioGroup = class extends Component {
	static props = {
		autoLabel: "Auto",
		hideBitrate: false,
		sort: "descending"
	};
	#media;
	#menu;
	#controller;
	get value() {
		return this.#controller.value;
	}
	get disabled() {
		const { canSetQuality, qualities } = this.#media.$state;
		return !canSetQuality() || qualities().length <= 1;
	}
	#sortedQualities = computed(() => {
		const { sort } = this.$props, { qualities } = this.#media.$state;
		return sortVideoQualities(qualities(), sort() === "descending");
	});
	constructor() {
		super();
		this.#controller = new RadioGroupController();
		this.#controller.onValueChange = this.#onValueChange.bind(this);
	}
	onSetup() {
		this.#media = useMediaContext();
		if (hasProvidedContext(menuContext)) this.#menu = useContext(menuContext);
	}
	onConnect(el) {
		effect(this.#watchValue.bind(this));
		effect(this.#watchControllerDisabled.bind(this));
		effect(this.#watchHintText.bind(this));
	}
	getOptions() {
		const { autoLabel, hideBitrate } = this.$props;
		return [{
			value: "auto",
			label: autoLabel
		}, ...this.#sortedQualities().map((quality) => {
			const bitrate = quality.bitrate && quality.bitrate >= 0 ? `${round(quality.bitrate / 1e6, 2)} Mbps` : null;
			return {
				quality,
				label: quality.height + "p",
				value: this.#getQualityId(quality),
				bitrate: () => !hideBitrate() ? bitrate : null
			};
		})];
	}
	#watchValue() {
		this.#controller.value = this.#getValue();
	}
	#watchHintText() {
		const { autoLabel } = this.$props, { autoQuality, quality } = this.#media.$state, qualityText = quality() ? quality().height + "p" : "";
		this.#menu?.hint.set(!autoQuality() ? qualityText : autoLabel() + (qualityText ? ` (${qualityText})` : ""));
	}
	#watchControllerDisabled() {
		this.#menu?.disable(this.disabled);
	}
	#onValueChange(value, trigger) {
		if (this.disabled) return;
		if (value === "auto") {
			this.#media.remote.changeQuality(-1, trigger);
			this.dispatch("change", {
				detail: "auto",
				trigger
			});
			return;
		}
		const { qualities } = this.#media.$state, index = peek(qualities).findIndex((quality) => this.#getQualityId(quality) === value);
		if (index >= 0) {
			const quality = peek(qualities)[index];
			this.#media.remote.changeQuality(index, trigger);
			this.dispatch("change", {
				detail: quality,
				trigger
			});
		}
	}
	#getValue() {
		const { quality, autoQuality } = this.#media.$state;
		if (autoQuality()) return "auto";
		const currentQuality = quality();
		return currentQuality ? this.#getQualityId(currentQuality) : "auto";
	}
	#getQualityId(quality) {
		return quality.height + "_" + quality.bitrate;
	}
};
const qualityradiogroup__proto = QualityRadioGroup.prototype;
prop(qualityradiogroup__proto, "value");
prop(qualityradiogroup__proto, "disabled");
method(qualityradiogroup__proto, "getOptions");

//#endregion
//#region src/elements/define/menus/quality-radio-group-element.ts
init_dev();
/**
* @part label - Contains the quality option label.
* @part bitrate - Contains the quality option bitrate.
* @docs {@link https://www.vidstack.io/docs/wc/player/components/menu/quality-radio-group}
* @example
* ```html
* <media-menu>
*   <!-- ... -->
*   <media-menu-items>
*     <media-quality-radio-group>
*       <template>
*         <media-radio>
*           <span data-part="label"></span>
*           <span data-part="bitrate"></span>
*         </media-radio>
*       </template>
*     </media-quality-radio-group>
*   </media-menu-items>
* </media-menu>
* ```
*/
var MediaQualityRadioGroupElement = class extends Host(HTMLElement, QualityRadioGroup) {
	static tagName = "media-quality-radio-group";
	onConnect() {
		renderMenuItemsTemplate(this, (el, option) => {
			const bitrate = option.bitrate, bitrateEl = el.querySelector("[data-part=\"bitrate\"]");
			if (bitrate && bitrateEl) effect(() => {
				bitrateEl.textContent = bitrate() || "";
			});
		});
	}
};

//#endregion
//#region src/components/ui/menu/radio/radio.ts
init_dev();
init_dom();
/**
* A radio represents a option that a user can select inside of a radio group. Only one radio
* can be checked in a group.
*
* @attr data-checked - Whether radio is checked.
* @attr data-focus - Whether radio is being keyboard focused.
* @attr data-hocus - Whether radio is being keyboard focused or hovered over.
* @docs {@link https://www.vidstack.io/docs/player/components/menu/radio}
*/
var Radio = class extends Component {
	static props = { value: "" };
	#checked = signal(false);
	#controller = {
		value: this.$props.value,
		check: this.#check.bind(this),
		onCheck: null
	};
	/**
	* Whether this radio is currently checked.
	*/
	get checked() {
		return this.#checked();
	}
	constructor() {
		super();
		new FocusVisibleController();
	}
	onSetup() {
		this.setAttributes({
			value: this.$props.value,
			"data-checked": this.#checked,
			"aria-checked": $ariaBool(this.#checked)
		});
	}
	onAttach(el) {
		const isMenuItem = hasProvidedContext(menuContext);
		setAttributeIfEmpty(el, "tabindex", isMenuItem ? "-1" : "0");
		setAttributeIfEmpty(el, "role", isMenuItem ? "menuitemradio" : "radio");
		effect(this.#watchValue.bind(this));
	}
	onConnect(el) {
		this.#addToGroup();
		onPress(el, this.#onPress.bind(this));
		onDispose(this.#onDisconnect.bind(this));
	}
	#onDisconnect() {
		scoped(() => {
			useContext(radioControllerContext).remove(this.#controller);
		}, this.connectScope);
	}
	#addToGroup() {
		useContext(radioControllerContext).add(this.#controller);
	}
	#watchValue() {
		const { value } = this.$props, newValue = value();
		if (peek(this.#checked)) this.#controller.onCheck?.(newValue);
	}
	#onPress(event) {
		if (peek(this.#checked)) return;
		this.#onChange(true, event);
		this.#onSelect(event);
		this.#controller.onCheck?.(peek(this.$props.value), event);
	}
	#check(value, trigger) {
		if (peek(this.#checked) === value) return;
		this.#onChange(value, trigger);
	}
	#onChange(value, trigger) {
		this.#checked.set(value);
		this.dispatch("change", {
			detail: value,
			trigger
		});
	}
	#onSelect(trigger) {
		this.dispatch("select", { trigger });
	}
};
const radio__proto = Radio.prototype;
prop(radio__proto, "checked");

//#endregion
//#region src/elements/define/menus/radio-element.ts
/**
* @docs {@link https://www.vidstack.io/docs/wc/player/components/menu/radio}
* @example
* ```html
* <media-radio-group value="720">
*   <media-radio value="1080">1080p</media-radio>
*   <media-radio value="720">720p</media-radio>
*   <!-- ... -->
* </media-radio-group>
* ```
*/
var MediaRadioElement = class extends Host(HTMLElement, Radio) {
	static tagName = "media-radio";
};

//#endregion
//#region src/components/ui/menu/radio-groups/speed-radio-group.ts
init_dev();
const DEFAULT_PLAYBACK_RATES = [
	.25,
	.5,
	.75,
	1,
	1.25,
	1.5,
	1.75,
	2
];
/**
* This component manages playback rate radios.
*
* @docs {@link https://www.vidstack.io/docs/wc/player/components/menu/speed-radio-group}
*/
var SpeedRadioGroup = class extends Component {
	static props = {
		normalLabel: "Normal",
		rates: DEFAULT_PLAYBACK_RATES
	};
	#media;
	#menu;
	#controller;
	get value() {
		return this.#controller.value;
	}
	get disabled() {
		const { rates } = this.$props, { canSetPlaybackRate } = this.#media.$state;
		return !canSetPlaybackRate() || rates().length === 0;
	}
	constructor() {
		super();
		this.#controller = new RadioGroupController();
		this.#controller.onValueChange = this.#onValueChange.bind(this);
	}
	onSetup() {
		this.#media = useMediaContext();
		if (hasProvidedContext(menuContext)) this.#menu = useContext(menuContext);
	}
	onConnect(el) {
		effect(this.#watchValue.bind(this));
		effect(this.#watchHintText.bind(this));
		effect(this.#watchControllerDisabled.bind(this));
	}
	getOptions() {
		const { rates, normalLabel } = this.$props;
		return rates().map((rate) => ({
			label: rate === 1 ? normalLabel : rate + "×",
			value: rate.toString()
		}));
	}
	#watchValue() {
		this.#controller.value = this.#getValue();
	}
	#watchHintText() {
		const { normalLabel } = this.$props, { playbackRate } = this.#media.$state, rate = playbackRate();
		this.#menu?.hint.set(rate === 1 ? normalLabel() : rate + "×");
	}
	#watchControllerDisabled() {
		this.#menu?.disable(this.disabled);
	}
	#getValue() {
		const { playbackRate } = this.#media.$state;
		return playbackRate().toString();
	}
	#onValueChange(value, trigger) {
		if (this.disabled) return;
		const rate = +value;
		this.#media.remote.changePlaybackRate(rate, trigger);
		this.dispatch("change", {
			detail: rate,
			trigger
		});
	}
};
const speedradiogroup__proto = SpeedRadioGroup.prototype;
prop(speedradiogroup__proto, "value");
prop(speedradiogroup__proto, "disabled");
method(speedradiogroup__proto, "getOptions");

//#endregion
//#region src/elements/define/menus/speed-radio-group-element.ts
/**
* @part label - Contains the speed option label.
* @docs {@link https://www.vidstack.io/docs/wc/player/components/menu/speed-radio-group}
* @example
* ```html
* <media-menu>
*   <!-- ... -->
*   <media-menu-items>
*     <media-speed-radio-group>
*       <template>
*         <media-radio>
*           <span data-part="label"></span>
*         </media-radio>
*       </template>
*     </media-speed-radio-group>
*   </media-menu-items>
* </media-menu>
* ```
*/
var MediaSpeedRadioGroupElement = class extends Host(HTMLElement, SpeedRadioGroup) {
	static tagName = "media-speed-radio-group";
	onConnect() {
		renderMenuItemsTemplate(this);
	}
};

//#endregion
//#region src/components/ui/poster.ts
init_dev();
init_std();
init_network();
/**
* Loads and displays the current media poster image. By default, the media provider's
* loading strategy is respected meaning the poster won't load until the media can.
*
* @attr data-visible - Whether poster image should be shown.
* @attr data-loading - Whether poster image is loading.
* @attr data-error - Whether an error occurred loading poster.
* @attr data-hidden - Whether poster has no src or has failed to load.
* @docs {@link https://www.vidstack.io/docs/player/components/media/poster}
*/
var Poster = class extends Component {
	static props = {
		src: null,
		alt: null,
		crossOrigin: null
	};
	static state = new State({
		img: null,
		src: null,
		alt: null,
		crossOrigin: null,
		loading: true,
		error: null,
		hidden: false
	});
	#media;
	onSetup() {
		this.#media = useMediaContext();
		this.#watchSrc();
		this.#watchAlt();
		this.#watchCrossOrigin();
		this.#watchHidden();
	}
	onAttach(el) {
		el.style.setProperty("pointer-events", "none");
		effect(this.#watchImg.bind(this));
		effect(this.#watchSrc.bind(this));
		effect(this.#watchAlt.bind(this));
		effect(this.#watchCrossOrigin.bind(this));
		effect(this.#watchHidden.bind(this));
		const { started } = this.#media.$state;
		this.setAttributes({
			"data-visible": () => !started() && !this.$state.hidden(),
			"data-loading": this.#isLoading.bind(this),
			"data-error": this.#hasError.bind(this),
			"data-hidden": this.$state.hidden
		});
	}
	onConnect(el) {
		effect(this.#onPreconnect.bind(this));
		effect(this.#onLoadStart.bind(this));
	}
	#hasError() {
		const { error } = this.$state;
		return !isNull(error());
	}
	#onPreconnect() {
		const { canLoadPoster, poster } = this.#media.$state;
		if (!canLoadPoster() && poster()) preconnect(poster(), "preconnect");
	}
	#watchHidden() {
		const { src } = this.$props, { poster, nativeControls } = this.#media.$state;
		this.el && setAttribute(this.el, "display", nativeControls() ? "none" : null);
		this.$state.hidden.set(this.#hasError() || !(src() || poster()) || nativeControls());
	}
	#isLoading() {
		const { loading, hidden } = this.$state;
		return !hidden() && loading();
	}
	#watchImg() {
		const img = this.$state.img();
		if (!img) return;
		new EventsController(img).add("load", this.#onLoad.bind(this)).add("error", this.#onError.bind(this));
		if (img.complete) this.#onLoad();
	}
	#prevSrc = "";
	#watchSrc() {
		const { poster: defaultPoster } = this.#media.$props, { canLoadPoster, providedPoster, inferredPoster } = this.#media.$state;
		const src = this.$props.src() || "", poster = src || defaultPoster() || inferredPoster();
		if (this.#prevSrc === providedPoster()) providedPoster.set(src);
		this.$state.src.set(canLoadPoster() && poster.length ? poster : null);
		this.#prevSrc = src;
	}
	#watchAlt() {
		const { src } = this.$props, { alt } = this.$state, { poster } = this.#media.$state;
		alt.set(src() || poster() ? this.$props.alt() : null);
	}
	#watchCrossOrigin() {
		const { crossOrigin: crossOriginProp } = this.$props, { crossOrigin: crossOriginState } = this.$state, { crossOrigin: mediaCrossOrigin, poster: src } = this.#media.$state, crossOrigin = crossOriginProp() !== null ? crossOriginProp() : mediaCrossOrigin();
		crossOriginState.set(/ytimg\.com|vimeo/.test(src() || "") ? null : crossOrigin === true ? "anonymous" : crossOrigin);
	}
	#onLoadStart() {
		const { loading, error } = this.$state, { canLoadPoster, poster } = this.#media.$state;
		loading.set(canLoadPoster() && !!poster());
		error.set(null);
	}
	#onLoad() {
		const { loading, error } = this.$state;
		loading.set(false);
		error.set(null);
	}
	#onError(event) {
		const { loading, error } = this.$state;
		loading.set(false);
		error.set(event);
	}
};

//#endregion
//#region src/elements/define/poster-element.ts
init_dev();
init_std();
/**
* @docs {@link https://www.vidstack.io/docs/wc/player/components/display/poster}
* @example
* ```html
* <media-player>
*   <media-poster src="..." alt="Large alien ship hovering over New York."></media-poster>
* </media-player>
* ```
*/
var MediaPosterElement = class extends Host(HTMLElement, Poster) {
	static tagName = "media-poster";
	static attrs = { crossOrigin: "crossorigin" };
	#img = document.createElement("img");
	onSetup() {
		this.$state.img.set(this.#img);
	}
	onConnect() {
		const { src, alt, crossOrigin } = this.$state;
		effect(() => {
			const { loading, hidden } = this.$state;
			this.#img.style.display = loading() || hidden() ? "none" : "";
		});
		effect(() => {
			setAttribute(this.#img, "alt", alt());
			setAttribute(this.#img, "crossorigin", crossOrigin());
			setAttribute(this.#img, "src", src());
		});
		if (this.#img.parentNode !== this) this.prepend(this.#img);
	}
};

//#endregion
//#region src/components/ui/sliders/slider/api/state.ts
init_dev();
const sliderState = new State({
	min: 0,
	max: 100,
	value: 0,
	step: 1,
	pointerValue: 0,
	focused: false,
	dragging: false,
	pointing: false,
	hidden: false,
	get active() {
		return this.dragging || this.focused || this.pointing;
	},
	get fillRate() {
		return calcRate(this.min, this.max, this.value);
	},
	get fillPercent() {
		return this.fillRate * 100;
	},
	get pointerRate() {
		return calcRate(this.min, this.max, this.pointerValue);
	},
	get pointerPercent() {
		return this.pointerRate * 100;
	}
});
function calcRate(min, max, value) {
	const range = max - min, offset = value - min;
	return range > 0 ? offset / range : 0;
}

//#endregion
//#region src/foundation/observers/intersection-observer.ts
init_dev();
var IntersectionObserverController = class extends ViewController {
	#init;
	#observer;
	constructor(init) {
		super();
		this.#init = init;
	}
	onConnect(el) {
		this.#observer = new IntersectionObserver((entries) => {
			this.#init.callback?.(entries, this.#observer);
		}, this.#init);
		this.#observer.observe(el);
		onDispose(this.#onDisconnect.bind(this));
	}
	/**
	* Disconnect any active intersection observers.
	*/
	#onDisconnect() {
		this.#observer?.disconnect();
		this.#observer = void 0;
	}
};

//#endregion
//#region src/components/ui/sliders/slider/utils.ts
init_number();
function getClampedValue(min, max, value, step) {
	return clampNumber(min, round(value, getNumberOfDecimalPlaces(step)), max);
}
function getValueFromRate(min, max, rate, step) {
	const boundRate = clampNumber(0, rate, 1), stepRatio = (max - min) * boundRate / step;
	return min + step * Math.round(stepRatio);
}

//#endregion
//#region src/components/ui/sliders/slider/events-controller.ts
init_dev();
init_std();
init_dom();
/**
* The direction to move the thumb, associated with key symbols.
*/
const SliderKeyDirection = {
	Left: -1,
	ArrowLeft: -1,
	Up: 1,
	ArrowUp: 1,
	Right: 1,
	ArrowRight: 1,
	Down: -1,
	ArrowDown: -1
};
var SliderEventsController = class extends ViewController {
	#delegate;
	#media;
	#observer;
	constructor(delegate, media) {
		super();
		this.#delegate = delegate;
		this.#media = media;
	}
	onSetup() {
		if (hasProvidedContext(sliderObserverContext)) this.#observer = useContext(sliderObserverContext);
	}
	onConnect(el) {
		effect(this.#attachEventListeners.bind(this, el));
		effect(this.#attachPointerListeners.bind(this, el));
		if (this.#delegate.swipeGesture) effect(this.#watchSwipeGesture.bind(this));
	}
	#watchSwipeGesture() {
		const { pointer } = this.#media.$state;
		if (pointer() !== "coarse" || !this.#delegate.swipeGesture()) {
			this.#provider = null;
			this.#resetTouchState();
			return;
		}
		this.#provider = this.#media.player.el?.querySelector("media-provider,[data-media-provider]");
		if (!this.#provider) {
			this.#resetTouchState();
			return;
		}
		new EventsController(this.#provider).add("touchstart", this.#onTouchStart.bind(this), { passive: true }).add("touchmove", this.#onTouchMove.bind(this), { passive: false });
	}
	#provider = null;
	#touch = null;
	#touchStartValue = null;
	#resetTouchState() {
		this.#touch = null;
		this.#touchStartValue = null;
	}
	#onTouchStart(event) {
		this.#touch = event.touches[0];
	}
	#onTouchMove(event) {
		if (isNull(this.#touch) || isTouchPinchEvent(event)) return;
		const touch = event.touches[0], xDiff = touch.clientX - this.#touch.clientX, yDiff = touch.clientY - this.#touch.clientY, isDragging = this.$state.dragging();
		if (!isDragging && Math.abs(yDiff) > 5) return;
		if (isDragging) return;
		event.preventDefault();
		if (Math.abs(xDiff) > 20) {
			this.#touch = touch;
			this.#touchStartValue = this.$state.value();
			this.#onStartDragging(this.#touchStartValue, event);
		}
	}
	#attachEventListeners(el) {
		const { hidden } = this.$props;
		listenEvent(el, "focus", this.#onFocus.bind(this));
		if (hidden() || this.#delegate.isDisabled()) return;
		new EventsController(el).add("keyup", this.#onKeyUp.bind(this)).add("keydown", this.#onKeyDown.bind(this)).add("pointerenter", this.#onPointerEnter.bind(this)).add("pointermove", this.#onPointerMove.bind(this)).add("pointerleave", this.#onPointerLeave.bind(this)).add("pointerdown", this.#onPointerDown.bind(this));
	}
	#attachPointerListeners(el) {
		if (this.#delegate.isDisabled() || !this.$state.dragging()) return;
		new EventsController(document).add("pointerup", this.#onDocumentPointerUp.bind(this), { capture: true }).add("pointermove", this.#onDocumentPointerMove.bind(this)).add("touchmove", this.#onDocumentTouchMove.bind(this), { passive: false });
	}
	#onFocus() {
		this.#updatePointerValue(this.$state.value());
	}
	#updateValue(newValue, trigger) {
		const { value, min, max, dragging } = this.$state;
		const clampedValue = Math.max(min(), Math.min(newValue, max()));
		value.set(clampedValue);
		const event = this.createEvent("value-change", {
			detail: clampedValue,
			trigger
		});
		this.dispatch(event);
		this.#delegate.onValueChange?.(event);
		if (dragging()) {
			const event = this.createEvent("drag-value-change", {
				detail: clampedValue,
				trigger
			});
			this.dispatch(event);
			this.#delegate.onDragValueChange?.(event);
		}
	}
	#updatePointerValue(value, trigger) {
		const { pointerValue, dragging } = this.$state;
		pointerValue.set(value);
		this.dispatch("pointer-value-change", {
			detail: value,
			trigger
		});
		if (dragging()) this.#updateValue(value, trigger);
	}
	#getPointerValue(event) {
		let thumbPositionRate, rect = this.el.getBoundingClientRect(), { min, max } = this.$state;
		if (this.$props.orientation() === "vertical") {
			const { bottom: trackBottom, height: trackHeight } = rect;
			thumbPositionRate = (trackBottom - event.clientY) / trackHeight;
		} else if (this.#touch && isNumber(this.#touchStartValue) && this.#provider) {
			const { width } = this.#provider.getBoundingClientRect(), rate = (event.clientX - this.#touch.clientX) / width, range = max() - min(), diff = range * Math.abs(rate);
			thumbPositionRate = (rate < 0 ? this.#touchStartValue - diff : this.#touchStartValue + diff) / range;
		} else {
			if (this.#touch && isNumber(this.#touchStartValue)) this.#resetTouchState();
			const { left: trackLeft, width: trackWidth } = rect;
			thumbPositionRate = (event.clientX - trackLeft) / trackWidth;
		}
		return Math.max(min(), Math.min(max(), this.#delegate.roundValue(getValueFromRate(min(), max(), thumbPositionRate, this.#delegate.getStep()))));
	}
	#onPointerEnter(event) {
		this.$state.pointing.set(true);
	}
	#onPointerMove(event) {
		const { dragging } = this.$state;
		if (dragging()) return;
		this.#updatePointerValue(this.#getPointerValue(event), event);
	}
	#onPointerLeave(event) {
		this.$state.pointing.set(false);
	}
	#onPointerDown(event) {
		if (event.button !== 0) return;
		const value = this.#getPointerValue(event);
		this.#onStartDragging(value, event);
		this.#updatePointerValue(value, event);
	}
	#onStartDragging(value, trigger) {
		const { dragging } = this.$state;
		if (dragging()) return;
		dragging.set(true);
		this.#media.remote.pauseControls(trigger);
		const event = this.createEvent("drag-start", {
			detail: value,
			trigger
		});
		this.dispatch(event);
		this.#delegate.onDragStart?.(event);
		this.#observer?.onDragStart?.();
	}
	#onStopDragging(value, trigger) {
		const { dragging } = this.$state;
		if (!dragging()) return;
		dragging.set(false);
		this.#media.remote.resumeControls(trigger);
		const event = this.createEvent("drag-end", {
			detail: value,
			trigger
		});
		this.dispatch(event);
		this.#delegate.onDragEnd?.(event);
		this.#resetTouchState();
		this.#observer?.onDragEnd?.();
	}
	#lastDownKey;
	#repeatedKeys = false;
	#onKeyDown(event) {
		if (!Object.keys(SliderKeyDirection).includes(event.key)) return;
		const { key } = event, jumpValue = this.#calcJumpValue(event);
		if (!isNull(jumpValue)) {
			this.#updatePointerValue(jumpValue, event);
			this.#updateValue(jumpValue, event);
			return;
		}
		const newValue = this.#calcNewKeyValue(event);
		if (!this.#repeatedKeys) {
			this.#repeatedKeys = key === this.#lastDownKey;
			if (!this.$state.dragging() && this.#repeatedKeys) this.#onStartDragging(newValue, event);
		}
		this.#updatePointerValue(newValue, event);
		this.#lastDownKey = key;
	}
	#onKeyUp(event) {
		if (!Object.keys(SliderKeyDirection).includes(event.key) || !isNull(this.#calcJumpValue(event))) return;
		const newValue = this.#repeatedKeys ? this.$state.pointerValue() : this.#calcNewKeyValue(event);
		this.#updateValue(newValue, event);
		this.#onStopDragging(newValue, event);
		this.#lastDownKey = "";
		this.#repeatedKeys = false;
	}
	#calcJumpValue(event) {
		let key = event.key, { min, max } = this.$state;
		if (key === "Home" || key === "PageUp") return min();
		else if (key === "End" || key === "PageDown") return max();
		else if (!event.metaKey && /^[0-9]$/.test(key)) return (max() - min()) / 10 * Number(key);
		return null;
	}
	#calcNewKeyValue(event) {
		const { key, shiftKey } = event;
		event.preventDefault();
		event.stopPropagation();
		const { shiftKeyMultiplier } = this.$props;
		const { min, max, value, pointerValue } = this.$state, step = this.#delegate.getStep(), keyStep = this.#delegate.getKeyStep();
		const diff = (!shiftKey ? keyStep : keyStep * shiftKeyMultiplier()) * Number(SliderKeyDirection[key]), steps = ((this.#repeatedKeys ? pointerValue() : this.#delegate.getValue?.() ?? value()) + diff) / step;
		return Math.max(min(), Math.min(max(), Number((step * steps).toFixed(3))));
	}
	#onDocumentPointerUp(event) {
		if (event.button !== 0) return;
		event.preventDefault();
		event.stopImmediatePropagation();
		const value = this.#getPointerValue(event);
		this.#updatePointerValue(value, event);
		this.#onStopDragging(value, event);
	}
	#onDocumentTouchMove(event) {
		event.preventDefault();
	}
	#onDocumentPointerMove = functionThrottle((event) => {
		this.#updatePointerValue(this.#getPointerValue(event), event);
	}, 20, { leading: true });
};

//#endregion
//#region src/components/ui/sliders/slider/format.ts
init_dev();
const sliderValueFormatContext = createContext(() => ({}));

//#endregion
//#region src/components/ui/sliders/slider/slider-controller.ts
init_dev();
init_std();
init_dom();
init_number();
var SliderController = class extends ViewController {
	static props = {
		hidden: false,
		disabled: false,
		step: 1,
		keyStep: 1,
		orientation: "horizontal",
		shiftKeyMultiplier: 5
	};
	#media;
	#delegate;
	#isVisible = signal(true);
	#isIntersecting = signal(true);
	constructor(delegate) {
		super();
		this.#delegate = delegate;
	}
	onSetup() {
		this.#media = useMediaContext();
		const focus = new FocusVisibleController();
		focus.attach(this);
		this.$state.focused = focus.focused.bind(focus);
		if (!hasProvidedContext(sliderValueFormatContext)) provideContext(sliderValueFormatContext, { default: "value" });
		provideContext(sliderContext, {
			orientation: this.$props.orientation,
			disabled: this.#delegate.isDisabled,
			preview: signal(null)
		});
		effect(this.#watchValue.bind(this));
		effect(this.#watchStep.bind(this));
		effect(this.#watchDisabled.bind(this));
		this.#setupAttrs();
		new SliderEventsController(this.#delegate, this.#media).attach(this);
		new IntersectionObserverController({ callback: this.#onIntersectionChange.bind(this) }).attach(this);
	}
	onAttach(el) {
		setAttributeIfEmpty(el, "role", "slider");
		setAttributeIfEmpty(el, "tabindex", "0");
		setAttributeIfEmpty(el, "autocomplete", "off");
		effect(this.#watchCSSVars.bind(this));
	}
	onConnect(el) {
		onDispose(observeVisibility(el, this.#isVisible.set));
		effect(this.#watchHidden.bind(this));
	}
	#onIntersectionChange(entries) {
		this.#isIntersecting.set(entries[0].isIntersecting);
	}
	#watchHidden() {
		const { hidden } = this.$props;
		this.$state.hidden.set(hidden() || !this.#isVisible() || !this.#isIntersecting());
	}
	#watchValue() {
		const { dragging, value, min, max } = this.$state;
		if (peek(dragging)) return;
		value.set(getClampedValue(min(), max(), value(), this.#delegate.getStep()));
	}
	#watchStep() {
		this.$state.step.set(this.#delegate.getStep());
	}
	#watchDisabled() {
		if (!this.#delegate.isDisabled()) return;
		const { dragging, pointing } = this.$state;
		dragging.set(false);
		pointing.set(false);
	}
	#getARIADisabled() {
		return ariaBool$1(this.#delegate.isDisabled());
	}
	#setupAttrs() {
		const { orientation } = this.$props, { dragging, active, pointing } = this.$state;
		this.setAttributes({
			"data-dragging": dragging,
			"data-pointing": pointing,
			"data-active": active,
			"aria-disabled": this.#getARIADisabled.bind(this),
			"aria-valuemin": this.#delegate.aria.valueMin ?? this.$state.min,
			"aria-valuemax": this.#delegate.aria.valueMax ?? this.$state.max,
			"aria-valuenow": this.#delegate.aria.valueNow,
			"aria-valuetext": this.#delegate.aria.valueText,
			"aria-orientation": orientation
		});
	}
	#watchCSSVars() {
		const { fillPercent, pointerPercent } = this.$state;
		this.#updateSliderVars(round(fillPercent(), 3), round(pointerPercent(), 3));
	}
	#updateSliderVars = animationFrameThrottle((fillPercent, pointerPercent) => {
		this.el?.style.setProperty("--slider-fill", fillPercent + "%");
		this.el?.style.setProperty("--slider-pointer", pointerPercent + "%");
	});
};

//#endregion
//#region src/components/ui/sliders/slider/slider.ts
init_dev();
init_number();
/**
* Versatile and user-friendly input control designed for seamless cross-browser compatibility and
* accessibility with ARIA support. It offers a smooth user experience for both mouse and touch
* interactions and is highly customizable in terms of styling. Users can effortlessly input numeric
* values within a specified range, defined by a minimum and maximum value.
*
* @attr data-dragging - Whether slider thumb is being dragged.
* @attr data-pointing - Whether user's pointing device is over slider.
* @attr data-active - Whether slider is being interacted with.
* @attr data-focus - Whether slider is being keyboard focused.
* @attr data-hocus - Whether slider is being keyboard focused or hovered over.
* @docs {@link https://www.vidstack.io/docs/player/components/sliders/slider}
*/
var Slider = class extends Component {
	static props = {
		...SliderController.props,
		min: 0,
		max: 100,
		value: 0
	};
	static state = sliderState;
	constructor() {
		super();
		new SliderController({
			getStep: this.$props.step,
			getKeyStep: this.$props.keyStep,
			roundValue: Math.round,
			isDisabled: this.$props.disabled,
			aria: {
				valueNow: this.#getARIAValueNow.bind(this),
				valueText: this.#getARIAValueText.bind(this)
			}
		});
	}
	onSetup() {
		effect(this.#watchValue.bind(this));
		effect(this.#watchMinMax.bind(this));
	}
	#getARIAValueNow() {
		const { value } = this.$state;
		return Math.round(value());
	}
	#getARIAValueText() {
		const { value, max } = this.$state;
		return round(value() / max() * 100, 2) + "%";
	}
	#watchValue() {
		const { value } = this.$props;
		this.$state.value.set(value());
	}
	#watchMinMax() {
		const { min, max } = this.$props;
		this.$state.min.set(min());
		this.$state.max.set(max());
	}
};

//#endregion
//#region src/components/ui/sliders/slider-preview.ts
init_dev();
init_std();
/**
* Used to provide users with a real-time or interactive preview of the value or selection they
* are making as they move the slider thumb. This can include displaying the current pointer
* value numerically, or displaying a thumbnail over the time slider.
*
* @attr data-visible - Whether the preview is visible.
* @docs {@link https://www.vidstack.io/docs/player/components/sliders/slider#preview}
*/
var SliderPreview = class extends Component {
	static props = {
		offset: 0,
		noClamp: false
	};
	#slider;
	onSetup() {
		this.#slider = useContext(sliderContext);
		const { active } = useState(Slider.state);
		this.setAttributes({ "data-visible": active });
	}
	onAttach(el) {
		Object.assign(el.style, {
			position: "absolute",
			top: 0,
			left: 0,
			width: "max-content"
		});
	}
	onConnect(el) {
		const { preview } = this.#slider;
		preview.set(el);
		onDispose(() => preview.set(null));
		effect(this.#updatePlacement.bind(this));
		const resize = new ResizeObserver(this.#updatePlacement.bind(this));
		resize.observe(el);
		onDispose(() => resize.disconnect());
	}
	#updatePlacement = animationFrameThrottle(() => {
		const { disabled, orientation } = this.#slider;
		if (disabled()) return;
		const el = this.el, { offset, noClamp } = this.$props;
		if (!el) return;
		updateSliderPreviewPlacement(el, {
			clamp: !noClamp(),
			offset: offset(),
			orientation: orientation()
		});
	});
};
function updateSliderPreviewPlacement(el, { clamp, offset, orientation }) {
	const computedStyle = getComputedStyle(el), width = parseFloat(computedStyle.width), height = parseFloat(computedStyle.height), styles = {
		top: null,
		right: null,
		bottom: null,
		left: null
	};
	styles[orientation === "horizontal" ? "bottom" : "left"] = `calc(100% + var(--media-slider-preview-offset, ${offset}px))`;
	if (orientation === "horizontal") {
		const widthHalf = width / 2;
		if (!clamp) styles.left = `calc(var(--slider-pointer) - ${widthHalf}px)`;
		else styles.left = `min(${`max(0px, calc(var(--slider-pointer) - ${widthHalf}px))`}, ${`calc(100% - ${width}px)`})`;
	} else {
		const heightHalf = height / 2;
		if (!clamp) styles.bottom = `calc(var(--slider-pointer) - ${heightHalf}px)`;
		else styles.bottom = `min(${`max(${heightHalf}px, calc(var(--slider-pointer) - ${heightHalf}px))`}, ${`calc(100% - ${height}px)`})`;
	}
	Object.assign(el.style, styles);
}

//#endregion
//#region src/elements/define/sliders/slider-preview-element.ts
/**
* @docs {@link https://www.vidstack.io/docs/wc/player/components/sliders/slider#preview}
*/
var MediaSliderPreviewElement = class extends Host(HTMLElement, SliderPreview) {
	static tagName = "media-slider-preview";
};

//#endregion
//#region src/components/ui/thumbnails/thumbnail-loader.ts
init_dev();
init_std();
init_error();
init_network();
const cache = /* @__PURE__ */ new Map(), pending = /* @__PURE__ */ new Map(), warned = /* @__PURE__ */ new Set();
var ThumbnailsLoader = class ThumbnailsLoader {
	#media;
	#src;
	#crossOrigin;
	$images = signal([]);
	static create(src, crossOrigin) {
		return new ThumbnailsLoader(src, crossOrigin, useMediaContext());
	}
	constructor(src, crossOrigin, media) {
		this.#src = src;
		this.#crossOrigin = crossOrigin;
		this.#media = media;
		effect(this.#onLoadCues.bind(this));
	}
	#onLoadCues() {
		const { canLoad } = this.#media.$state;
		if (!canLoad()) return;
		const src = this.#src();
		if (!src) return;
		if (isString(src) && cache.has(src)) {
			const cues = cache.get(src);
			cache.delete(src);
			cache.set(src, cues);
			if (cache.size > 99) {
				const firstKey = cache.keys().next().value;
				cache.delete(firstKey);
			}
			this.$images.set(cache.get(src));
		} else if (isString(src)) {
			const crossOrigin = this.#crossOrigin(), currentKey = src + "::" + crossOrigin;
			if (!pending.has(currentKey)) {
				const promise = new Promise(async (resolve, reject) => {
					try {
						const response = await fetch(src, { credentials: getRequestCredentials(crossOrigin) });
						if (response.headers.get("content-type") === "application/json") {
							const json = await response.json();
							if (isArray$1(json)) if (json[0] && "text" in json[0]) resolve(this.#processVTTCues(json));
							else {
								for (let i = 0; i < json.length; i++) {
									const image = json[i];
									assert(isObject(image), `Item not an object at index ${i}`);
									assert("url" in image && isString(image.url), `Invalid or missing \`url\` property at index ${i}`);
									assert("startTime" in image && isNumber(image.startTime), `Invalid or missing \`startTime\` property at index ${i}`);
								}
								resolve(json);
							}
							else resolve(this.#processStoryboard(json));
							return;
						}
						import("../media-captions/dist/prod.js").then(async ({ parseResponse }) => {
							try {
								const { cues } = await parseResponse(response);
								resolve(this.#processVTTCues(cues));
							} catch (e) {
								reject(e);
							}
						});
					} catch (e) {
						reject(e);
					}
				}).then((images) => {
					cache.set(currentKey, images);
					return images;
				}).catch((error) => {
					this.#onError(src, error);
				}).finally(() => {
					if (isString(currentKey)) pending.delete(currentKey);
				});
				pending.set(currentKey, promise);
			}
			pending.get(currentKey)?.then((images) => {
				this.$images.set(images || []);
			});
		} else if (isArray$1(src)) try {
			this.$images.set(this.#processImages(src));
		} catch (error) {
			this.#onError(src, error);
		}
		else try {
			this.$images.set(this.#processStoryboard(src));
		} catch (error) {
			this.#onError(src, error);
		}
		return () => {
			this.$images.set([]);
		};
	}
	#processImages(images) {
		const baseURL = this.#resolveBaseUrl();
		return images.map((img, i) => {
			assert(img.url && isString(img.url), `Invalid or missing \`url\` property at index ${i}`);
			assert("startTime" in img && isNumber(img.startTime), `Invalid or missing \`startTime\` property at index ${i}`);
			return {
				...img,
				url: isString(img.url) ? this.#resolveURL(img.url, baseURL) : img.url
			};
		});
	}
	#processStoryboard(board) {
		assert(isString(board.url), "Missing `url` in storyboard object");
		assert(isArray$1(board.tiles) && board.tiles?.length, `Empty tiles in storyboard`);
		const url = new URL(board.url), images = [];
		const tileWidth = "tile_width" in board ? board.tile_width : board.tileWidth, tileHeight = "tile_height" in board ? board.tile_height : board.tileHeight;
		for (const tile of board.tiles) images.push({
			url,
			startTime: "start" in tile ? tile.start : tile.startTime,
			width: tileWidth,
			height: tileHeight,
			coords: {
				x: tile.x,
				y: tile.y
			}
		});
		return images;
	}
	#processVTTCues(cues) {
		for (let i = 0; i < cues.length; i++) {
			const cue = cues[i];
			assert("startTime" in cue && isNumber(cue.startTime), `Invalid or missing \`startTime\` property at index ${i}`);
			assert("text" in cue && isString(cue.text), `Invalid or missing \`text\` property at index ${i}`);
		}
		const images = [], baseURL = this.#resolveBaseUrl();
		for (const cue of cues) {
			const [url, hash] = cue.text.split("#"), data = this.#resolveData(hash);
			images.push({
				url: this.#resolveURL(url, baseURL),
				startTime: cue.startTime,
				endTime: cue.endTime,
				width: data?.w,
				height: data?.h,
				coords: data && isNumber(data.x) && isNumber(data.y) ? {
					x: data.x,
					y: data.y
				} : void 0
			});
		}
		return images;
	}
	#resolveBaseUrl() {
		let baseURL = peek(this.#src);
		if (!isString(baseURL) || !/^https?:/.test(baseURL)) return location.href;
		return baseURL;
	}
	#resolveURL(src, baseURL) {
		return /^https?:/.test(src) ? new URL(src) : new URL(src, baseURL);
	}
	#resolveData(hash) {
		if (!hash) return {};
		const [hashProps, values] = hash.split("="), hashValues = values?.split(","), data = {};
		if (!hashProps || !hashValues) return null;
		for (let i = 0; i < hashProps.length; i++) {
			const value = +hashValues[i];
			if (!isNaN(value)) data[hashProps[i]] = value;
		}
		return data;
	}
	#onError(src, error) {
		if (warned?.has(src)) return;
		this.#media.logger?.errorGroup("[vidstack] failed to load thumbnails").labelledLog("Src", src).labelledLog("Error", error).dispatch();
		warned?.add(src);
	}
};

//#endregion
//#region src/components/ui/thumbnails/thumbnail.ts
init_dev();
init_std();
init_number();
const PRELOAD_SPRITE_BATCH_SIZE = 2, MAX_PRELOADED_SPRITES = 32, preloadedSprites = /* @__PURE__ */ new Map();
/**
* Used to load and display a preview thumbnail at the given `time`.
*
* @attr data-loading - Whether thumbnail image is loading.
* @attr data-error - Whether an error occurred loading thumbnail.
* @attr data-hidden - Whether thumbnail is not available or failed to load.
* @docs {@link https://www.vidstack.io/docs/player/components/display/thumbnail}
*/
var Thumbnail = class extends Component {
	static props = {
		src: null,
		time: 0,
		crossOrigin: null
	};
	static state = new State({
		src: "",
		img: null,
		thumbnails: [],
		activeThumbnail: null,
		crossOrigin: null,
		loading: false,
		error: null,
		hidden: false
	});
	media;
	#loader;
	#styleResets = [];
	onSetup() {
		this.media = useMediaContext();
		this.#watchCrossOrigin();
		this.#loader = ThumbnailsLoader.create(this.$props.src, this.$state.crossOrigin);
		this.setAttributes({
			"data-loading": this.#isLoading.bind(this),
			"data-error": this.#hasError.bind(this),
			"data-hidden": this.$state.hidden,
			"aria-hidden": $ariaBool(this.$state.hidden)
		});
	}
	onConnect(el) {
		effect(this.#watchImg.bind(this));
		effect(this.#watchHidden.bind(this));
		effect(this.#watchCrossOrigin.bind(this));
		effect(this.#onLoadStart.bind(this));
		effect(this.#onFindActiveThumbnail.bind(this));
		effect(this.#onPreloadNextSprites.bind(this));
		effect(this.#resize.bind(this));
	}
	#watchImg() {
		const img = this.$state.img();
		if (!img) return;
		new EventsController(img).add("load", this.#onLoaded.bind(this)).add("error", this.#onError.bind(this));
	}
	#watchCrossOrigin() {
		const { crossOrigin: crossOriginProp } = this.$props, { crossOrigin: crossOriginState } = this.$state, { crossOrigin: mediaCrossOrigin } = this.media.$state, crossOrigin = crossOriginProp() !== null ? crossOriginProp() : mediaCrossOrigin();
		crossOriginState.set(crossOrigin === true ? "anonymous" : crossOrigin);
	}
	#onLoadStart() {
		const { src, loading, error } = this.$state;
		if (src()) {
			loading.set(true);
			error.set(null);
		}
		return () => {
			this.#resetStyles();
			loading.set(false);
			error.set(null);
		};
	}
	#onLoaded() {
		const { loading, error } = this.$state;
		this.#resize();
		loading.set(false);
		error.set(null);
	}
	#onError(event) {
		const { loading, error } = this.$state;
		loading.set(false);
		error.set(event);
	}
	#isLoading() {
		const { loading, hidden } = this.$state;
		return !hidden() && loading();
	}
	#hasError() {
		const { error } = this.$state;
		return !isNull(error());
	}
	#watchHidden() {
		const { hidden } = this.$state, { duration } = this.media.$state, images = this.#loader.$images();
		hidden.set(this.#hasError() || !Number.isFinite(duration()) || images.length === 0);
	}
	getTime() {
		return this.$props.time();
	}
	#onFindActiveThumbnail() {
		let images = this.#loader.$images();
		if (!images.length) return;
		let time = this.getTime(), { src, activeThumbnail } = this.$state, activeIndex = -1, activeImage = null;
		for (let i = images.length - 1; i >= 0; i--) {
			const image = images[i];
			if (time >= image.startTime && (!image.endTime || time < image.endTime)) {
				activeIndex = i;
				break;
			}
		}
		if (images[activeIndex]) activeImage = images[activeIndex];
		src.set(activeImage?.url.href || "");
		activeThumbnail.set(activeImage);
	}
	#onPreloadNextSprites() {
		const images = this.#loader.$images(), activeThumbnail = this.$state.activeThumbnail();
		if (!activeThumbnail) return;
		const activeIndex = images.indexOf(activeThumbnail);
		if (activeIndex < 0) return;
		const activeSrc = activeThumbnail.url.href, crossOrigin = this.$state.crossOrigin(), startIndex = activeIndex + 1, endIndex = Math.min(startIndex + PRELOAD_SPRITE_BATCH_SIZE, images.length);
		for (let i = startIndex; i < endIndex; i++) {
			const src = images[i].url.href;
			if (src !== activeSrc) preloadSprite(src, crossOrigin);
		}
	}
	#resize() {
		if (!this.scope || this.$state.hidden()) return;
		const rootEl = this.el, imgEl = this.$state.img(), thumbnail = this.$state.activeThumbnail();
		if (!imgEl || !thumbnail || !rootEl) return;
		let width = thumbnail.width ?? imgEl.naturalWidth, height = thumbnail?.height ?? imgEl.naturalHeight, { maxWidth, maxHeight, minWidth, minHeight, width: elWidth, height: elHeight } = getComputedStyle(this.el);
		if (minWidth === "100%") minWidth = parseFloat(elWidth) + "";
		if (minHeight === "100%") minHeight = parseFloat(elHeight) + "";
		let minRatio = Math.max(parseInt(minWidth) / width, parseInt(minHeight) / height), maxRatio = Math.min(Math.max(parseInt(minWidth), parseInt(maxWidth)) / width, Math.max(parseInt(minHeight), parseInt(maxHeight)) / height), scale = !isNaN(maxRatio) && maxRatio < 1 ? maxRatio : minRatio > 1 ? minRatio : 1;
		this.#style(rootEl, "--thumbnail-width", `${width * scale}px`);
		this.#style(rootEl, "--thumbnail-height", `${height * scale}px`);
		this.#style(rootEl, "--thumbnail-aspect-ratio", String(round(width / height, 5)));
		this.#style(imgEl, "width", `${imgEl.naturalWidth * scale}px`);
		this.#style(imgEl, "height", `${imgEl.naturalHeight * scale}px`);
		this.#style(imgEl, "transform", thumbnail.coords ? `translate(-${thumbnail.coords.x * scale}px, -${thumbnail.coords.y * scale}px)` : "");
		this.#style(imgEl, "max-width", "none");
	}
	#style(el, name, value) {
		el.style.setProperty(name, value);
		this.#styleResets.push(() => el.style.removeProperty(name));
	}
	#resetStyles() {
		for (const reset of this.#styleResets) reset();
		this.#styleResets = [];
	}
};
function preloadSprite(src, crossOrigin) {
	const key = `${src}::${crossOrigin}`;
	if (preloadedSprites.has(key)) {
		const image = preloadedSprites.get(key);
		preloadedSprites.delete(key);
		preloadedSprites.set(key, image);
		return;
	}
	const image = new Image();
	image.decoding = "async";
	image.crossOrigin = crossOrigin;
	image.src = src;
	preloadedSprites.set(key, image);
	if (preloadedSprites.size > MAX_PRELOADED_SPRITES) {
		const firstKey = preloadedSprites.keys().next().value;
		preloadedSprites.delete(firstKey);
	}
}

//#endregion
//#region src/elements/define/thumbnail-element.ts
init_dev();
init_std();
init_dom();
const imgTemplate = /* @__PURE__ */ createTemplate("<img loading=\"eager\" decoding=\"async\" aria-hidden=\"true\">");
/**
* @docs {@link https://www.vidstack.io/docs/wc/player/components/display/thumbnail}
* @example
* ```html
* <media-player>
*   <!-- ... -->
*   <media-thumbnail
*     src="https://files.vidstack.io/thumbnails.vtt"
*     time="10"
*   ></media-thumbnail>
* </media-player>
* ```
*/
var MediaThumbnailElement = class extends Host(HTMLElement, Thumbnail) {
	static tagName = "media-thumbnail";
	static attrs = { crossOrigin: "crossorigin" };
	#media;
	#img = this.#createImg();
	onSetup() {
		this.#media = useMediaContext();
		this.$state.img.set(this.#img);
	}
	onConnect() {
		const { src, crossOrigin } = this.$state;
		if (this.#img.parentNode !== this) this.prepend(this.#img);
		effect(() => {
			setAttribute(this.#img, "src", src());
			setAttribute(this.#img, "crossorigin", crossOrigin());
		});
	}
	#createImg() {
		return cloneTemplateContent(imgTemplate);
	}
};

//#endregion
//#region src/elements/define/sliders/slider-thumbnail-element.ts
init_dev();
/**
* @example
* ```html
* <media-player >
*   <media-time-slider>
*     <media-slider-preview>
*       <media-slider-thumbnail
*         src="https://files.vidstack.io/thumbnails.vtt"
*       ></media-slider-thumbnail>
*     </media-slider-preview>
*   </media-time-slider>
* </media-player>
* ```
*/
var MediaSliderThumbnailElement = class extends MediaThumbnailElement {
	static tagName = "media-slider-thumbnail";
	#media;
	#slider;
	onSetup() {
		super.onSetup();
		this.#media = useMediaContext();
		this.#slider = useState(Slider.state);
	}
	onConnect() {
		super.onConnect();
		effect(this.#watchTime.bind(this));
	}
	#watchTime() {
		const { duration, clipStartTime } = this.#media.$state;
		this.time = clipStartTime() + this.#slider.pointerRate() * duration();
	}
};

//#endregion
//#region src/utils/time.ts
init_std();
/**
* Casts a number to a string and pads it to match the given `expectedLength`.
*
* @param num - A number to pad.
* @param expectedLength - The expected length of the numbers as a string.
*/
function padNumberWithZeroes(num, expectedLength) {
	const str = String(num);
	const actualLength = str.length;
	if (actualLength < expectedLength) {
		const padLength = expectedLength - actualLength;
		return `${`0`.repeat(padLength)}${num}`;
	}
	return str;
}
/**
* Parses the given `duration` into the following units of time: hours, minutes,
* seconds, fraction (fraction of a second).
*
* @param duration - The length of time to parse in seconds.
*/
function parseTime(duration) {
	return {
		hours: Math.trunc(duration / 3600),
		minutes: Math.trunc(duration % 3600 / 60),
		seconds: Math.trunc(duration % 60),
		fraction: Number((duration - Math.trunc(duration)).toPrecision(3))
	};
}
/**
* Formats the given `duration` into a human readable form that can be displayed to the user.
*
* @param duration - The length of time to parse in seconds.
* @param shouldPadHours - Whether to pad the hours to be length of 2.
* @param shouldPadMinutes - Whether to pad the minutes to be length of 2.
* @param shouldAlwaysShowHours - Whether to always show the hours unit.
* @example `01:20 -> minutes:seconds`
* @example `3:01:20 -> hours:minutes:seconds`
* @example If `shouldPadHours` is `true` - `03:01:20`
* @example If `shouldAlwaysShowHours` is `true` - `0:01:20`
*/
function formatTime(duration, { padHrs = null, padMins = null, showHrs = false, showMs = false } = {}) {
	const { hours, minutes, seconds, fraction } = parseTime(duration), paddedHours = padHrs ? padNumberWithZeroes(hours, 2) : hours, time = `${padMins || isNull(padMins) && duration >= 3600 ? padNumberWithZeroes(minutes, 2) : minutes}:${padNumberWithZeroes(seconds, 2)}${showMs && fraction > 0 ? `.${String(fraction).replace(/^0?\./, "")}` : ""}`;
	return hours > 0 || showHrs ? `${paddedHours}:${time}` : time;
}
/**
* Formats the given `duration` into human spoken form.
*
* @param duration - The length of time to parse in seconds.
* @example `2 hour 3 min 4 sec`
*/
function formatSpokenTime(duration) {
	const spokenParts = [];
	const { hours, minutes, seconds } = parseTime(duration);
	if (hours > 0) spokenParts.push(`${hours} hour`);
	if (minutes > 0) spokenParts.push(`${minutes} min`);
	if (seconds > 0 || spokenParts.length === 0) spokenParts.push(`${seconds} sec`);
	return spokenParts.join(" ");
}

//#endregion
//#region src/components/ui/sliders/slider-value.ts
init_dev();
init_number();
/**
* Displays the specific numeric representation of the current or pointer value of the slider.
* When a user interacts with a slider by moving its thumb along the track, the slider value
* changes accordingly.
*
* @docs {@link https://www.vidstack.io/docs/player/components/sliders/slider-value}
*/
var SliderValue = class extends Component {
	static props = {
		type: "pointer",
		format: null,
		showHours: false,
		showMs: false,
		padHours: null,
		padMinutes: null,
		decimalPlaces: 2
	};
	#format;
	#text;
	#slider;
	onSetup() {
		this.#slider = useState(Slider.state);
		this.#format = useContext(sliderValueFormatContext);
		this.#text = computed(this.getValueText.bind(this));
	}
	/**
	* Returns the current value formatted as text based on prop settings.
	*/
	getValueText() {
		if (!this.scope || !this.#slider || !this.#format) return "";
		const { type, format: $format, decimalPlaces, padHours, padMinutes, showHours, showMs } = this.$props, { value: sliderValue, pointerValue, min, max } = this.#slider, format = $format?.() ?? this.#format.default;
		const value = type() === "current" ? sliderValue() : pointerValue();
		if (format === "percent") {
			const percent = value / (max() - min()) * 100;
			return (this.#format.percent ?? round)(percent, decimalPlaces()) + "%";
		} else if (format === "time") return (this.#format.time ?? formatTime)(value, {
			padHrs: padHours(),
			padMins: padMinutes(),
			showHrs: showHours(),
			showMs: showMs()
		});
		else return (this.#format.value?.(value) ?? value.toFixed(2)) + "";
	}
};
const slidervalue__proto = SliderValue.prototype;
method(slidervalue__proto, "getValueText");

//#endregion
//#region src/elements/define/sliders/slider-value-element.ts
init_dev();
/**
* @docs {@link https://www.vidstack.io/docs/wc/player/components/sliders/slider-value}
* @example
* ```html
* <media-time-slider>
*   <media-slider-preview>
*     <media-slider-value></media-slider-value>
*   </media-slider-preview>
* </media-time-slider>
* ```
* @example
* ```html
* <media-slider-value type="current"></media-slider-value>
* ```
* @example
* ```html
* <media-slider-value show-hours pad-hours></media-slider-value>
* ```
* @example
* ```html
* <media-slider-value decimal-places="2"></media-slider-value>
* ```
*/
var MediaSliderValueElement = class extends Host(HTMLElement, SliderValue) {
	static tagName = "media-slider-value";
	static attrs = { padMinutes: { converter: BOOLEAN } };
	onConnect() {
		effect(() => {
			this.textContent = this.getValueText();
		});
	}
};

//#endregion
//#region src/components/ui/sliders/time-slider/time-slider.ts
init_dev();
init_std();
init_utils$3();
init_dom();
init_number();
/**
* Versatile and user-friendly input time control designed for seamless cross-browser and provider
* compatibility and accessibility with ARIA support. It offers a smooth user experience for both
* mouse and touch interactions and is highly customizable in terms of styling. Users can
* effortlessly change the current playback time within the range 0 to seekable end.
*
* @attr data-dragging - Whether slider thumb is being dragged.
* @attr data-pointing - Whether user's pointing device is over slider.
* @attr data-active - Whether slider is being interacted with.
* @attr data-focus - Whether slider is being keyboard focused.
* @attr data-hocus - Whether slider is being keyboard focused or hovered over.
* @docs {@link https://www.vidstack.io/docs/player/components/sliders/time-slider}
*/
var TimeSlider = class extends Component {
	static props = {
		...SliderController.props,
		step: .1,
		keyStep: 5,
		shiftKeyMultiplier: 2,
		pauseWhileDragging: false,
		noSwipeGesture: false,
		seekingRequestThrottle: 100
	};
	static state = sliderState;
	#media;
	#dispatchSeeking;
	#chapter = signal(null);
	constructor() {
		super();
		const { noSwipeGesture } = this.$props;
		new SliderController({
			swipeGesture: () => !noSwipeGesture(),
			getValue: this.#getValue.bind(this),
			getStep: this.#getStep.bind(this),
			getKeyStep: this.#getKeyStep.bind(this),
			roundValue: this.#roundValue,
			isDisabled: this.#isDisabled.bind(this),
			aria: {
				valueNow: this.#getARIAValueNow.bind(this),
				valueText: this.#getARIAValueText.bind(this)
			},
			onDragStart: this.#onDragStart.bind(this),
			onDragValueChange: this.#onDragValueChange.bind(this),
			onDragEnd: this.#onDragEnd.bind(this),
			onValueChange: this.#onValueChange.bind(this)
		});
	}
	onSetup() {
		this.#media = useMediaContext();
		provideContext(sliderValueFormatContext, {
			default: "time",
			value: this.#formatValue.bind(this),
			time: this.#formatTime.bind(this)
		});
		this.setAttributes({ "data-chapters": this.#hasChapters.bind(this) });
		this.setStyles({ "--slider-progress": this.#calcBufferedPercent.bind(this) });
		effect(this.#watchCurrentTime.bind(this));
		effect(this.#watchSeekingThrottle.bind(this));
	}
	onAttach(el) {
		el.setAttribute("data-media-time-slider", "");
		setAttributeIfEmpty(el, "aria-label", "Seek");
	}
	onConnect(el) {
		effect(this.#watchPreviewing.bind(this));
		watchActiveTextTrack(this.#media.textTracks, "chapters", this.#chapter.set);
	}
	#calcBufferedPercent() {
		const { bufferedEnd, duration } = this.#media.$state;
		return round(Math.min(bufferedEnd() / Math.max(duration(), 1), 1) * 100, 3) + "%";
	}
	#hasChapters() {
		const { duration } = this.#media.$state;
		return this.#chapter()?.cues.length && Number.isFinite(duration()) && duration() > 0;
	}
	#watchSeekingThrottle() {
		this.#dispatchSeeking = functionThrottle(this.#seeking.bind(this), this.$props.seekingRequestThrottle());
	}
	#watchCurrentTime() {
		if (this.$state.hidden()) return;
		const { value, dragging } = this.$state, newValue = this.#getValue();
		if (!peek(dragging)) {
			value.set(newValue);
			this.dispatch("value-change", { detail: newValue });
		}
	}
	#watchPreviewing() {
		const player = this.#media.player.el, { preview } = useContext(sliderContext);
		player && preview() && setAttribute(player, "data-preview", this.$state.active());
	}
	#seeking(time, event) {
		this.#media.remote.seeking(time, event);
	}
	#seek(time, percent, event) {
		this.#dispatchSeeking.cancel();
		const { live } = this.#media.$state;
		if (live() && percent >= 99) {
			this.#media.remote.seekToLiveEdge(event);
			return;
		}
		this.#media.remote.seek(time, event);
	}
	#playingBeforeDragStart = false;
	#onDragStart(event) {
		const { pauseWhileDragging } = this.$props;
		if (pauseWhileDragging()) {
			const { paused } = this.#media.$state;
			this.#playingBeforeDragStart = !paused();
			this.#media.remote.pause(event);
		}
	}
	#onDragValueChange(event) {
		this.#dispatchSeeking(this.#percentToTime(event.detail), event);
	}
	#onDragEnd(event) {
		const { seeking } = this.#media.$state;
		if (!peek(seeking)) this.#seeking(this.#percentToTime(event.detail), event);
		const percent = event.detail;
		this.#seek(this.#percentToTime(percent), percent, event);
		const { pauseWhileDragging } = this.$props;
		if (pauseWhileDragging() && this.#playingBeforeDragStart) {
			this.#media.remote.play(event);
			this.#playingBeforeDragStart = false;
		}
	}
	#onValueChange(event) {
		const { dragging } = this.$state;
		if (dragging() || !event.trigger) return;
		this.#onDragEnd(event);
	}
	#getValue() {
		const { currentTime } = this.#media.$state;
		return this.#timeToPercent(currentTime());
	}
	#getStep() {
		const value = this.$props.step() / this.#media.$state.duration() * 100;
		return Number.isFinite(value) ? value : 1;
	}
	#getKeyStep() {
		const value = this.$props.keyStep() / this.#media.$state.duration() * 100;
		return Number.isFinite(value) ? value : 1;
	}
	#roundValue(value) {
		return round(value, 3);
	}
	#isDisabled() {
		const { disabled } = this.$props, { canSeek } = this.#media.$state;
		return disabled() || !canSeek();
	}
	#getARIAValueNow() {
		const { value } = this.$state;
		return Math.round(value());
	}
	#getARIAValueText() {
		const time = this.#percentToTime(this.$state.value()), { duration } = this.#media.$state;
		return Number.isFinite(time) ? `${formatSpokenTime(time)} out of ${formatSpokenTime(duration())}` : "live";
	}
	#percentToTime(percent) {
		const { duration } = this.#media.$state;
		return round(percent / 100 * duration(), 5);
	}
	#timeToPercent(time) {
		const { liveEdge, duration } = this.#media.$state, rate = Math.max(0, Math.min(1, liveEdge() ? 1 : Math.min(time, duration()) / duration()));
		return Number.isNaN(rate) ? 0 : Number.isFinite(rate) ? rate * 100 : 100;
	}
	#formatValue(percent) {
		const time = this.#percentToTime(percent), { live, duration } = this.#media.$state;
		return Number.isFinite(time) ? (live() ? time - duration() : time).toFixed(0) : "LIVE";
	}
	#formatTime(percent, options) {
		const time = this.#percentToTime(percent), { live, duration } = this.#media.$state, value = live() ? time - duration() : time;
		return Number.isFinite(time) ? `${value < 0 ? "-" : ""}${formatTime(Math.abs(value), options)}` : "LIVE";
	}
};

//#endregion
//#region src/elements/define/sliders/time-slider-element.ts
/**
* @docs {@link https://www.vidstack.io/docs/wc/player/components/sliders/time-slider}
* @example
* ```html
* <media-time-slider>
*   <div class="track"></div>
*   <div class="track-fill"></div>
*   <div class="track-progress"></div>
*   <div class="thumb"></div>
* </media-time-slider>
* ```
* @example
* ```html
* <media-time-slider>
*   <!-- ... -->
*   <media-slider-preview>
*     <media-slider-value></media-slider-value>
*   <media-slider-preview>
* </media-time-slider>
* ```
*/
var MediaTimeSliderElement = class extends Host(HTMLElement, TimeSlider) {
	static tagName = "media-time-slider";
};

//#endregion
//#region src/components/ui/sliders/volume-slider.ts
init_dev();
init_dom();
init_number();
/**
* Versatile and user-friendly input volume control designed for seamless cross-browser and provider
* compatibility and accessibility with ARIA support. It offers a smooth user experience for both
* mouse and touch interactions and is highly customizable in terms of styling. Users can
* effortlessly change the volume level within the range 0 (muted) to 100.
*
* @attr data-dragging - Whether slider thumb is being dragged.
* @attr data-pointing - Whether user's pointing device is over slider.
* @attr data-active - Whether slider is being interacted with.
* @attr data-focus - Whether slider is being keyboard focused.
* @attr data-hocus - Whether slider is being keyboard focused or hovered over.
* @attr data-supported - Whether volume control is supported.
* @docs {@link https://www.vidstack.io/docs/player/components/sliders/volume-slider}
*/
var VolumeSlider = class extends Component {
	static props = {
		...SliderController.props,
		keyStep: 5,
		shiftKeyMultiplier: 2
	};
	static state = sliderState;
	#media;
	onSetup() {
		this.#media = useMediaContext();
		const { audioGain } = this.#media.$state;
		provideContext(sliderValueFormatContext, {
			default: "percent",
			value(value) {
				return (value * (audioGain() ?? 1)).toFixed(2);
			},
			percent(value) {
				return Math.round(value * (audioGain() ?? 1));
			}
		});
		new SliderController({
			getStep: this.$props.step,
			getKeyStep: this.$props.keyStep,
			roundValue: Math.round,
			isDisabled: this.#isDisabled.bind(this),
			aria: {
				valueMax: this.#getARIAValueMax.bind(this),
				valueNow: this.#getARIAValueNow.bind(this),
				valueText: this.#getARIAValueText.bind(this)
			},
			onDragValueChange: this.#onDragValueChange.bind(this),
			onValueChange: this.#onValueChange.bind(this)
		}).attach(this);
		effect(this.#watchVolume.bind(this));
	}
	onAttach(el) {
		el.setAttribute("data-media-volume-slider", "");
		setAttributeIfEmpty(el, "aria-label", "Volume");
		const { canSetVolume } = this.#media.$state;
		this.setAttributes({
			"data-supported": canSetVolume,
			"aria-hidden": $ariaBool(() => !canSetVolume())
		});
	}
	#getARIAValueNow() {
		const { value } = this.$state, { audioGain } = this.#media.$state;
		return Math.round(value() * (audioGain() ?? 1));
	}
	#getARIAValueText() {
		const { value, max } = this.$state, { audioGain } = this.#media.$state;
		return round(value() / max() * (audioGain() ?? 1) * 100, 2) + "%";
	}
	#getARIAValueMax() {
		const { audioGain } = this.#media.$state;
		return this.$state.max() * (audioGain() ?? 1);
	}
	#isDisabled() {
		const { disabled } = this.$props, { canSetVolume } = this.#media.$state;
		return disabled() || !canSetVolume();
	}
	#watchVolume() {
		const { muted, volume } = this.#media.$state;
		const newValue = muted() ? 0 : volume() * 100;
		this.$state.value.set(newValue);
		this.dispatch("value-change", { detail: newValue });
	}
	#throttleVolumeChange = functionThrottle(this.#onVolumeChange.bind(this), 25);
	#onVolumeChange(event) {
		if (!event.trigger) return;
		const mediaVolume = round(event.detail / 100, 3);
		this.#media.remote.changeVolume(mediaVolume, event);
	}
	#onValueChange(event) {
		this.#throttleVolumeChange(event);
	}
	#onDragValueChange(event) {
		this.#throttleVolumeChange(event);
	}
};

//#endregion
//#region src/elements/define/sliders/volume-slider-element.ts
/**
* @docs {@link https://www.vidstack.io/docs/wc/player/components/sliders/volume-slider}
* @example
* ```html
* <media-volume-slider>
*   <div class="track"></div>
*   <div class="track-fill"></div>
*   <div class="track-progress"></div>
*   <div class="thumb"></div>
* </media-volume-slider>
* ```
* @example
* ```html
* <media-volume-slider>
*   <!-- ... -->
*   <media-slider-preview>
*     <media-slider-value></media-slider-value>
*   </media-slider-preview>
* </media-volume-slider>
* ```
*/
var MediaVolumeSliderElement = class extends Host(HTMLElement, VolumeSlider) {
	static tagName = "media-volume-slider";
};

//#endregion
//#region src/components/ui/time.ts
init_dev();
init_std();
init_dom();
/**
* Outputs a media duration (eg: `currentTime`, `duration`, `bufferedAmount`, etc.) value as time
* formatted text.
*
* @attr data-type - The type prop setting (current, duration, etc.).
* @attr data-remainder - Whether time remaining is being shown.
* @docs {@link https://www.vidstack.io/docs/player/components/display/time}
*/
var Time = class extends Component {
	static props = {
		type: "current",
		showHours: false,
		padHours: null,
		padMinutes: null,
		remainder: false,
		toggle: false,
		hidden: false
	};
	static state = new State({
		timeText: "",
		hidden: false
	});
	#media;
	#invert = signal(null);
	#isVisible = signal(true);
	#isIntersecting = signal(true);
	onSetup() {
		this.#media = useMediaContext();
		this.#watchTime();
		const { type } = this.$props;
		this.setAttributes({
			"data-type": type,
			"data-remainder": this.#shouldInvert.bind(this)
		});
		new IntersectionObserverController({ callback: this.#onIntersectionChange.bind(this) }).attach(this);
	}
	onAttach(el) {
		if (!el.hasAttribute("role")) effect(this.#watchRole.bind(this));
		effect(this.#watchTime.bind(this));
	}
	onConnect(el) {
		onDispose(observeVisibility(el, this.#isVisible.set));
		effect(this.#watchHidden.bind(this));
		effect(this.#watchToggle.bind(this));
	}
	#onIntersectionChange(entries) {
		this.#isIntersecting.set(entries[0].isIntersecting);
	}
	#watchHidden() {
		const { hidden } = this.$props;
		this.$state.hidden.set(hidden() || !this.#isVisible() || !this.#isIntersecting());
	}
	#watchToggle() {
		if (!this.$props.toggle()) {
			this.#invert.set(null);
			return;
		}
		if (this.el) onPress(this.el, this.#onToggle.bind(this));
	}
	#watchTime() {
		const { hidden, timeText } = this.$state, { duration } = this.#media.$state;
		if (hidden()) return;
		const { type, padHours, padMinutes, showHours } = this.$props, seconds = this.#getSeconds(type()), $duration = duration(), shouldInvert = this.#shouldInvert();
		if (!Number.isFinite(seconds + $duration)) {
			timeText.set("LIVE");
			return;
		}
		const formattedTime = formatTime(shouldInvert ? Math.max(0, $duration - seconds) : seconds, {
			padHrs: padHours(),
			padMins: padMinutes(),
			showHrs: showHours()
		});
		timeText.set((shouldInvert ? "-" : "") + formattedTime);
	}
	#watchRole() {
		if (!this.el) return;
		const { toggle } = this.$props;
		setAttribute(this.el, "role", toggle() ? "timer" : null);
		setAttribute(this.el, "tabindex", toggle() ? 0 : null);
	}
	#getSeconds(type) {
		const { bufferedEnd, duration, currentTime } = this.#media.$state;
		switch (type) {
			case "buffered": return bufferedEnd();
			case "duration": return duration();
			default: return currentTime();
		}
	}
	#shouldInvert() {
		return this.$props.remainder() && this.#invert() !== false;
	}
	#onToggle(event) {
		event.preventDefault();
		if (this.#invert() === null) {
			this.#invert.set(!this.$props.remainder());
			return;
		}
		this.#invert.set((v) => !v);
	}
};

//#endregion
//#region src/elements/define/time-element.ts
init_dev();
/**
* @docs {@link https://www.vidstack.io/docs/wc/player/components/display/time}
* @example
* ```html
* <media-time type="current"></media-time>
* ```
* @example
* ```html
* <!-- Remaining time. -->
* <media-time type="current" remainder></media-time>
* ```
*/
var MediaTimeElement = class extends Host(HTMLElement, Time) {
	static tagName = "media-time";
	onConnect() {
		effect(() => {
			this.textContent = this.$state.timeText();
		});
	}
};

//#endregion
//#region src/elements/bundles/player-layouts/plyr.ts
defineCustomElement(MediaPlyrLayoutElement);
defineCustomElement(MediaPosterElement);
defineCustomElement(MediaPlayButtonElement);
defineCustomElement(MediaMuteButtonElement);
defineCustomElement(MediaCaptionButtonElement);
defineCustomElement(MediaPIPButtonElement);
defineCustomElement(MediaFullscreenButtonElement);
defineCustomElement(MediaSeekButtonElement);
defineCustomElement(MediaAirPlayButtonElement);
defineCustomElement(MediaLiveButtonElement);
defineCustomElement(MediaVolumeSliderElement);
defineCustomElement(MediaTimeSliderElement);
defineCustomElement(MediaSliderPreviewElement);
defineCustomElement(MediaSliderThumbnailElement);
defineCustomElement(MediaSliderValueElement);
defineCustomElement(MediaMenuElement);
defineCustomElement(MediaMenuButtonElement);
defineCustomElement(MediaMenuItemsElement);
defineCustomElement(MediaMenuItemElement);
defineCustomElement(MediaAudioRadioGroupElement);
defineCustomElement(MediaCaptionsRadioGroupElement);
defineCustomElement(MediaSpeedRadioGroupElement);
defineCustomElement(MediaQualityRadioGroupElement);
defineCustomElement(MediaRadioElement);
defineCustomElement(MediaTimeElement);
defineCustomElement(MediaThumbnailElement);

//#endregion
//#region src/global/plyr.ts
init_std();
init_dom();
init_support();
let activePlyr = null, defaults = mediaState.record, forwardedPlayerState = [
	"playing",
	"paused",
	"ended",
	"currentTime",
	"seeking",
	"duration",
	"volume",
	"muted",
	"loop",
	"poster"
], eventMap = {
	ratechange: "rate-change",
	ready: "can-play",
	timeupdate: "time-update",
	volumechange: "volume-change"
}, icons = [
	"airplay",
	"captions-off",
	"captions-on",
	"download",
	"enter-fullscreen",
	"exit-fullscreen",
	"fast-forward",
	"muted",
	"pause",
	"pip",
	"play",
	"restart",
	"rewind",
	"settings",
	"volume"
];
var Plyr = class Plyr {
	target;
	config;
	static setup(targets, config) {
		if (isString(targets)) targets = document.querySelectorAll(targets);
		return [...targets].map((target) => new Plyr(target, config));
	}
	static supported(type, provider) {
		return true;
	}
	player;
	provider;
	layout;
	fullscreen = new PlyrFullscreenAdapter(this);
	playing = defaults.playing;
	paused = defaults.paused;
	ended = defaults.ended;
	currentTime = defaults.currentTime;
	seeking = defaults.seeking;
	duration = defaults.duration;
	volume = defaults.volume;
	muted = defaults.muted;
	loop = defaults.loop;
	poster = defaults.poster;
	get type() {
		return this.player.provider?.type ?? "";
	}
	get isHTML5() {
		return /audio|video|hls/.test(this.type);
	}
	get isEmbed() {
		return /youtube|vimeo/.test(this.type);
	}
	get buffered() {
		const { bufferedEnd, seekableEnd } = this.player.state;
		return seekableEnd > 0 ? bufferedEnd / seekableEnd : 0;
	}
	get stopped() {
		return this.paused && this.currentTime === 0;
	}
	get hasAudio() {
		if (!this.isHTML5) return true;
		const media = this.player.provider.media;
		return Boolean(media.mozHasAudio || media.webkitAudioDecodedByteCount || media.audioTracks?.length || this.player.audioTracks.length);
	}
	get speed() {
		return this.player.playbackRate;
	}
	set speed(speed) {
		this.player.remoteControl.changePlaybackRate(speed);
	}
	get currentTrack() {
		return this.player.textTracks.selectedIndex;
	}
	set currentTrack(index) {
		this.player.remoteControl.changeTextTrackMode(index, "showing");
	}
	get pip() {
		return this.player.state.pictureInPicture;
	}
	set pip(isActive) {
		if (isActive) this.player.enterPictureInPicture();
		else this.player.exitPictureInPicture();
	}
	get quality() {
		return this.player.state.quality?.height ?? null;
	}
	set quality(value) {
		let qualities = this.player.qualities, index = -1;
		if (value !== null) {
			let minScore = Infinity;
			for (let i = 0; i < qualities.length; i++) {
				const score = Math.abs(qualities[i].height - value);
				if (score < minScore) {
					index = i;
					minScore = score;
				}
			}
		}
		this.player.remoteControl.changeQuality(index);
	}
	#source = null;
	get source() {
		return this.#source;
	}
	set source(source) {
		const { type: viewType = "video", sources = "", title = "", poster = "", thumbnails = "", tracks = [] } = source ?? {};
		this.player.src = sources;
		this.player.viewType = viewType;
		this.player.title = title;
		this.player.poster = poster;
		this.layout.thumbnails = thumbnails;
		this.player.textTracks.clear();
		for (const track of tracks) this.player.textTracks.add(track);
		this.#source = source;
	}
	#ratio = null;
	get ratio() {
		return this.#ratio;
	}
	set ratio(ratio) {
		if (ratio) ratio = ratio.replace(/\s*:\s*/, " / ");
		setStyle(this.player, "aspect-ratio", ratio ?? "unset");
		this.#ratio = ratio;
	}
	get download() {
		return this.layout.download;
	}
	set download(download) {
		this.layout.download = download;
	}
	#disposal = createDisposalBin();
	constructor(target, config = {}) {
		this.target = target;
		this.config = config;
		if (isString(target)) target = document.querySelector(target);
		else if (!isHTMLElement(target)) target = target[0];
		if (!isHTMLElement(target)) throw Error(`[plyr] target must be of type \`HTMLElement\`, found \`${typeof target}\``);
		const dataConfig = target.getAttribute("data-plyr-config");
		if (dataConfig) try {
			config = {
				...config,
				...JSON.parse(dataConfig)
			};
		} catch (error) {
			console.error(`[plyr] failed to parse \`data-plyr-config\`\n\n`, error);
		}
		const { enabled = true, debug = "warn", autoPause = true, ratio = null, hideControls = true, resetOnEnd = false, disableContextMenu = true, iconUrl = null, iconPrefix = "plyr", keyboard = {
			focused: true,
			global: false
		}, i18n = null, tracks, ...props } = config;
		this.player = document.createElement("media-player");
		this.provider = document.createElement("media-provider");
		this.layout = document.createElement("media-plyr-layout");
		if (!enabled) return;
		for (const prop of forwardedPlayerState) Object.defineProperty(this, prop, {
			get: () => this.player[prop],
			set: (value) => void (this.player[prop] = value)
		});
		if (isString(debug)) this.player.logLevel = debug;
		else if (debug) this.player.logLevel = "warn";
		if (autoPause) this.#disposal.add(listenEvent(this.player, "play", this.#onPlay.bind(this)));
		this.ratio = ratio;
		this.layout.translations = i18n;
		if (!hideControls) this.player.controls.canIdle = false;
		if (resetOnEnd) this.#disposal.add(listenEvent(this.player, "ended", this.#onReset.bind(this)));
		if (disableContextMenu) {}
		if (iconUrl) {
			this.layout.customIcons = true;
			const id = `sprite-${iconPrefix}`, exists = document.getElementById(id);
			const addIcons = () => {
				for (const icon of icons) {
					const namepsace = "http://www.w3.org/2000/svg";
					const svg = document.createElementNS(namepsace, "svg");
					setAttribute(svg, "fill", "none");
					setAttribute(svg, "slot", `${icon}-icon`);
					setAttribute(svg, "aria-hidden", "true");
					setAttribute(svg, "viewBox", "0 0 18 18");
					const use = document.createElementNS(namepsace, "use");
					use.setAttributeNS("http://www.w3.org/1999/xlink", "href", `#${iconPrefix}-${icon}`);
					svg.append(use);
					this.layout.append(svg);
				}
			};
			if (!exists) fetch(iconUrl).then((response) => response.text()).then((data) => {
				const container = document.createElement("div");
				setAttribute(container, "id", id);
				setAttribute(container, "hidden", "");
				container.innerHTML = data;
				document.body.insertAdjacentElement("afterbegin", container);
				addIcons();
			}).catch((error) => {
				console.error("[plyr] failed tol oad sprite:\n\n", error);
				this.layout.customIcons = false;
			});
			else addIcons();
		}
		if (keyboard.global) this.player.keyTarget = "document";
		else if (keyboard.focused) this.player.keyTarget = "player";
		else this.player.keyDisabled = true;
		target.removeAttribute("controls");
		const title = target.getAttribute("title");
		if (title) this.player.setAttribute("title", title);
		const width = target.getAttribute("width"), height = target.getAttribute("height");
		if (width || height) {
			if (width) this.player.style.width = width;
			if (height) this.player.style.height = height;
			this.player.style.aspectRatio = "unset";
		}
		for (const attr of target.attributes) {
			const name = attr.name.replace("data-", ""), propName = kebabToCamelCase(name);
			if (propName in this.player) this.player.setAttribute(name, attr.value);
			else if (propName in this.layout) this.layout.setAttribute(name, attr.value);
		}
		for (const [prop, value] of Object.entries(props)) if (prop in this.player) this.player[prop] = value;
		else if (prop in this.layout) this.layout[prop] = value;
		if (tracks) for (const track of tracks) this.player.textTracks.add(track);
		this.player.append(this.provider, this.layout);
		if (!isHTMLAudioElement(target) && !isHTMLVideoElement(target) && !isHTMLIFrameElement(target)) target.append(this.player);
		else {
			for (const child of [...target.children]) this.provider.append(child);
			target.replaceWith(this.player);
		}
		const embedProvider = target.getAttribute("data-plyr-provider"), embedId = target.getAttribute("data-plyr-embed-id");
		if (embedProvider && /youtube|vimeo/.test(embedProvider) && embedId) this.player.src = `${embedProvider}/${embedId}`;
	}
	#onPlay() {
		if (activePlyr !== this) activePlyr?.pause();
		activePlyr = this;
	}
	#onReset() {
		this.currentTime = 0;
		this.paused = true;
	}
	play() {
		return this.player.play();
	}
	pause() {
		return this.player.pause();
	}
	togglePlay(toggle = this.paused) {
		if (toggle) return this.player.play();
		else return this.player.pause();
	}
	toggleCaptions(toggle = !this.player.textTracks.selected) {
		const controller = this.player.remoteControl;
		if (toggle) controller.showCaptions();
		else controller.disableCaptions();
	}
	toggleControls(toggle = !this.player.controls.showing) {
		const controls = this.player.controls;
		if (toggle) controls.show();
		else controls.hide();
	}
	restart() {
		this.currentTime = 0;
	}
	stop() {
		this.pause();
		this.player.currentTime = 0;
	}
	forward(seekTime = this.config.seekTime ?? 10) {
		this.currentTime += seekTime;
	}
	rewind(seekTime = this.config.seekTime ?? 10) {
		this.currentTime -= seekTime;
	}
	increaseVolume(step = 5) {
		this.volume += step;
	}
	decreaseVolume(step = 5) {
		this.volume -= step;
	}
	airplay() {
		return this.player.requestAirPlay();
	}
	on(type, callback) {
		this.#listen(type, callback);
	}
	once(type, callback) {
		this.#listen(type, callback, { once: true });
	}
	off(type, callback) {
		this.#listen(type, callback, { remove: true });
	}
	#listeners = [];
	#listen(type, callback, options = {}) {
		let eventType = type, toggle = null;
		switch (type) {
			case "captionsenabled":
			case "captionsdisabled":
				eventType = "text-track-change";
				toggle = type === "captionsenabled";
				break;
			case "controlsshown":
			case "controlshidden":
				eventType = "controls-change";
				toggle = type === "controlsshown";
				break;
			case "enterfullscreen":
			case "exitfullscreen":
				eventType = "fullscreen-change";
				toggle = type === "enterfullscreen";
				break;
			default:
		}
		const mappedEventType = eventMap[eventType] ?? eventType;
		const listener = (event) => {
			if (isBoolean(toggle) && !!event.detail !== toggle) return;
			if (mappedEventType !== type) {
				callback(new DOMEvent(type, {
					...event,
					trigger: event
				}));
				return;
			}
			callback(event);
		};
		if (options.remove) {
			let index = -1;
			do {
				index = this.#listeners.findIndex((t) => t.type === type && t.callback === callback);
				if (index >= 0) {
					const { listener } = this.#listeners[index];
					this.player.removeEventListener(mappedEventType, listener);
					this.#listeners.splice(index, 1);
				}
			} while (index >= 0);
		} else {
			this.#listeners.push({
				type,
				callback,
				listener
			});
			this.player.addEventListener(mappedEventType, listener, { once: options.once });
		}
	}
	supports(type) {
		return !!type && canPlayVideoType(null, type);
	}
	destroy() {
		for (const { type, listener } of this.#listeners) this.player.removeEventListener(eventMap[type] ?? type, listener);
		this.#source = null;
		this.#listeners.length = 0;
		if (activePlyr === this) activePlyr = null;
		this.#disposal.empty();
		this.player.destroy();
	}
};
var PlyrFullscreenAdapter = class {
	#plyr;
	constructor(plyr) {
		this.#plyr = plyr;
	}
	get #player() {
		return this.#plyr.player;
	}
	/**
	* 	Returns a boolean indicating if the current player has fullscreen enabled.
	*/
	get enabled() {
		return this.#player.state.canFullscreen;
	}
	/**
	* Returns a boolean indicating if the current player is in fullscreen mode.
	*/
	get active() {
		return this.#player.state.fullscreen;
	}
	/**
	* Request to enter fullscreen.
	*/
	enter() {
		return this.#player.requestFullscreen();
	}
	/**
	* Request to exit fullscreen.
	*/
	exit() {
		return this.#player.exitFullscreen();
	}
	/**
	* Request to toggle fullscreen.
	*/
	toggle() {
		if (this.active) return this.exit();
		else return this.enter();
	}
};
window.Plyr = Plyr;

//#endregion
//#region src/core/tracks/text/render/libass-text-renderer.ts
init_std();
init_symbols$2();
var LibASSTextRenderer = class {
	loader;
	config;
	priority = 1;
	#instance = null;
	#track = null;
	#typeRE = /(ssa|ass)$/;
	constructor(loader, config) {
		this.loader = loader;
		this.config = config;
	}
	canRender(track, video) {
		return !!video && !!track.src && (isString(track.type) && this.#typeRE.test(track.type) || this.#typeRE.test(track.src));
	}
	attach(video) {
		if (!video) return;
		this.loader().then(async (mod) => {
			this.#instance = new mod.default({
				...this.config,
				video,
				subUrl: this.#track?.src || ""
			});
			new EventsController(this.#instance).add("ready", () => {
				const canvas = this.#instance?._canvas;
				if (canvas) canvas.style.pointerEvents = "none";
			}).add("error", (event) => {
				if (!this.#track) return;
				this.#track[TextTrackSymbol.readyState] = 3;
				this.#track.dispatchEvent(new DOMEvent("error", {
					trigger: event,
					detail: event.error
				}));
			});
		});
	}
	changeTrack(track) {
		if (!track || track.readyState === 3) this.#freeTrack();
		else if (this.#track !== track) {
			this.#instance?.setTrackByUrl(track.src);
			this.#track = track;
		}
	}
	detach() {
		this.#freeTrack();
	}
	#freeTrack() {
		this.#instance?.freeTrack();
		this.#track = null;
	}
};

//#endregion
export { ARIAKeyShortcuts, AudioTrackList, LibASSTextRenderer, LocalMediaStorage, MEDIA_KEY_SHORTCUTS, MediaControls, MediaRemoteControl, Plyr, PlyrFullscreenAdapter, TextRenderers, TextTrack, TextTrackList, TimeRange, VideoQualityList, boundTime, findActiveCue, getTimeRangesEnd, getTimeRangesStart, isCueActive, isTrackCaptionKind, isVideoQualitySrc, mediaContext, mediaState, normalizeTimeIntervals, parseJSONCaptionsFile, softResetMediaState, sortVideoQualities, updateTimeIntervals, watchActiveTextTrack, watchCueTextChange };