/**
 * Module that contains the array data structure implementations.
 * Depends on core, anim, utils, effects, datastructures
 */
import $ from 'jquery';
import { JSAV } from './core';
import { utils } from './utils';

// Type definitions
export interface ArrayOptions {
  autoresize?: boolean;
  center?: boolean;
  layout?: string;
  indexed?: boolean;
  template?: string;
  element?: any;
  visible?: boolean;
  [key: string]: any;
}

export interface ArrayIndexInstance {
  jsav: any;
  container: any;
  index: number;
  options: ArrayOptions;
  element: JQuery;
  
  value(newValue?: any, options?: any): any;
  _setvalue(newValue?: any, options?: any): any;
  show(): void;
  hide(): void;
  equals(otherIndex: any, options?: any): boolean;
  css(cssprop: any, options?: any): any;
  state(newstate?: any): any;
}

export interface AVArrayInstance {
  jsav: any;
  options: ArrayOptions;
  element: JQuery;
  _indices: ArrayIndexInstance[];
  _values: any[];
  
  isHighlight(index: number, options?: any): boolean;
  highlight(indices: any, options?: any): AVArrayInstance;
  unhighlight(indices: any, options?: any): AVArrayInstance;
  swap(index1: number, index2: number, options?: any): any;
  clone(): AVArrayInstance;
  size(): number;
  value(index: number, newValue?: any, options?: any): any;
  index(index: number): ArrayIndexInstance;
  css(indices: any, cssprop?: any, options?: any): any;
  initialize(data: any[]): void;
  initializeFromElement(): void;
  layout(options?: any): any;
  state(newstate?: any): any;
  equals(otherArray: any, options?: any): boolean;
  toggleClass(index: any, className: string, options?: any): any;
  addClass(index: any, className: string, options?: any): AVArrayInstance;
  removeClass(index: any, className: string, options?: any): AVArrayInstance;
  hasClass(index: any, className: string): boolean;
  isEmpty(): boolean;
  toggleArrow(indices: any, options?: any): void;
  toggleLine(index: number, options?: any): any;
  id(): string;
  position(): any;
  logEvent(event: any): void;
  
  // Event handlers
  click(data: any, handler: any): AVArrayInstance;
  dblclick(data: any, handler: any): AVArrayInstance;
  mousedown(data: any, handler: any): AVArrayInstance;
  mousemove(data: any, handler: any): AVArrayInstance;
  mouseup(data: any, handler: any): AVArrayInstance;
  mouseenter(data: any, handler: any): AVArrayInstance;
  mouseleave(data: any, handler: any): AVArrayInstance;
  on(eventName: string, data: any, handler: any): AVArrayInstance;
}

// Templates used to create new elements into the array, depending on the layout options
const templates: { [key: string]: string } = {};
templates.array = '<span class="jsavvalue">' +
                         '<span class="jsavvaluelabel">{{value}}</span>' +
                       '</span>';
templates["array-indexed"] = templates.array +
                         '<span class="jsavindexlabel">{{index}}</span>';
templates.vertical = templates.array;
templates["vertical-indexed"] = templates["array-indexed"];
templates.bar = '<span class="jsavvaluebar"></span>' + templates.array;
templates["bar-indexed"] = templates.bar + '<span class="jsavindexlabel">{{index}}</span>';

// ArrayIndex class
class ArrayIndex implements ArrayIndexInstance {
  jsav: any;
  container: any;
  index: number;
  options: ArrayOptions;
  element: JQuery;
  
  constructor(container: any, value: any, index: number, options: ArrayOptions) {
    this.jsav = container.jsav;
    this.container = container;
    this.index = index;
    // Always have indices visible, visibility is controlled by the array
    this.options = $.extend(true, {}, options, { visible: true });
    
    const indHtml = container.options.template
        .replace("{{value}}", value)
        .replace("{{index}}", index);
    const ind = $(`<li class='jsavnode jsavindex'>${indHtml}</li>`);
    this.element = ind;
    
    if (this.options.autoresize) {
      ind.addClass("jsavautoresize");
    }
    this.container.element.append(ind);
  }
  
  value(newValue?: any, options?: any): any {
    return this.container.value(this.index, newValue, options);
  }
  
  _setvalue(newValue?: any, options?: any): any {
    return this.container._setvalue(this.index, newValue, options);
  }
  
  // Show/hide of indices makes no sense, so replace them with noop functions
  show(): void {}
  hide(): void {}
  
  equals(otherIndex: any, options?: any): boolean {
    if (!otherIndex || this.value() !== otherIndex.value() || !(otherIndex instanceof ArrayIndex)) {
      return false;
    }
    if (options && 'css' in options) {
      const cssEquals = utils._helpers.cssEquals(this, otherIndex, options.css);
      if (!cssEquals) { return false; }
    }
    if (options && 'class' in options) {
      const classEquals = utils._helpers.classEquals(this, otherIndex, options['class']);
      if (!classEquals) { return false; }
    }
    return true;
  }
  
  css(cssprop: any, options?: any): any {
    return this.element.css(cssprop);
  }
  
  state(newstate?: any): any {
    if (newstate) {
      this.element.attr("style", newstate.style || "");
      utils._helpers.setElementClasses(this.element, newstate.classes || []);
    } else {
      const state: any = {};
      const style = this.element.attr("style");
      if (style) {
        state.style = style;
      }
      const cls = utils._helpers.elementClasses(this.element);
      if (cls.length > 0) {
        state.classes = cls;
      }
      return state;
    }
  }
}

// AVArray class
export class AVArray implements AVArrayInstance {
  jsav: any;
  options: ArrayOptions;
  element: JQuery;
  _indices: ArrayIndexInstance[];
  _values: any[];
  
  static _templates = templates;
  
  constructor(jsav: any, element: any, options?: ArrayOptions) {
    this.jsav = jsav;
    this.options = $.extend(true, { autoresize: true, center: true, layout: "array" }, options);
    
    if (!this.options.template) {
      const layoutKey = this.options.layout + (this.options.indexed ? "-indexed" : "");
      this.options.template = templates[layoutKey];
    }
    
    this._indices = [];
    
    if ($.isArray(element)) {
      this.initialize(element);
    } else if (element) {
      this.element = $(element);
      this.initializeFromElement();
    }
  }
  
  isHighlight(index: number, options?: any): boolean {
    return this.hasClass(index, "jsavhighlight");
  }
  
  highlight(indices: any, options?: any): AVArrayInstance {
    this.addClass(indices, "jsavhighlight", options);
    return this;
  }
  
  unhighlight(indices: any, options?: any): AVArrayInstance {
    this.removeClass(indices, "jsavhighlight", options);
    return this;
  }
  
  _setarraycss(cssprops: any, options?: any): any {
    const oldProps = $.extend(true, {}, cssprops);
    const el = this.element;
    
    if (typeof cssprops !== "object") {
      return [cssprops];
    } else {
      for (const i in cssprops) {
        if (cssprops.hasOwnProperty(i)) {
          oldProps[i] = el.css(i);
        }
      }
    }
    
    if (this.jsav._shouldAnimate()) {
      this.jsav.effects.transition(this.element, cssprops, options);
    } else {
      this.element.css(cssprops);
    }
    return [oldProps];
  }
  
  css(indices: any, cssprop?: any, options?: any): any {
    let $elems: JQuery;
    
    if (typeof cssprop === "string") {
      $elems = utils._helpers.getIndices($(this.element).find("li"), indices);
      return $elems.css(cssprop);
    } else if (typeof indices === "string") {
      return this.element.css(indices);
    } else if (!$.isArray(indices) && typeof indices === "object") {
      return this._setarraycss(indices, options);
    } else {
      const indArray = utils._helpers.normalizeIndices($(this.element).find("li.jsavindex"), indices);
      for (let i = 0, l = indArray.length; i < l; i++) {
        this._indices[indArray[i]].css(cssprop, options);
      }
      return this;
    }
  }
  
  index(index: number): ArrayIndexInstance {
    return this._indices[index];
  }
  
  swap(index1: number, index2: number, options?: any): any {
    const $pi1 = $(this.element).find(`li:eq(${index1})`);
    const $pi2 = $(this.element).find(`li:eq(${index2})`);
    const tmp = this._values[index1];
    
    this._values[index1] = this._values[index2];
    this._values[index2] = tmp;
    
    this.jsav.effects.swap($pi1, $pi2, options);
    return [index1, index2, options];
  }
  
  clone(): AVArrayInstance {
    const vals = this._values;
    const newArray = new AVArray(this.jsav, vals, $.extend(true, {}, this.options, { visible: false }));
    newArray.state(this.state());
    return newArray;
  }
  
  size(): number {
    return this.element.find("li").length;
  }
  
  value(index: number, newValue?: any, options?: any): any {
    if (typeof newValue === "undefined") {
      return this._values[index];
    } else {
      return this._setvalue(index, newValue, options);
    }
  }
  
  _newindex(value: any, index: number): ArrayIndexInstance {
    if (typeof value === "undefined") {
      value = "";
    }
    if (typeof index === "undefined") {
      index = this._indices.length;
    }
    const ind = new ArrayIndex(this, value, index, this.options);
    this._indices[index] = ind;
    return ind;
  }
  
  _setvalue(index: number, newValue: any, options?: any): any {
    const size = this.size();
    const oldval = this.value(index);
    
    while (index > size - 1) {
      const newli = this._newindex("", size);
      this._values[size] = "";
      size = this.size();
    }
    
    const $index = this.element.find(`li:eq(${index})`);
    this._values[index] = newValue;
    $index.find(".jsavvaluelabel").html("" + newValue);
    return [index, oldval];
  }
  
  _initOptionClasses(): void {
    if (this.options.autoresize) {
      this.element.addClass("jsavautoresize");
    }
    if (this.options.center) {
      this.element.addClass("jsavcenter");
    }
    if (this.options.indexed) {
      this.element.addClass("jsavindexed");
    }
  }
  
  initialize(data: any[]): void {
    let el = this.options.element || $("<ol/>");
    let key: string, val: any, i: number;
    
    if (!this.options.element) {
      $(this.jsav.canvas).append(el);
    }
    
    this.element = el;
    this._initOptionClasses();
    this._values = data.slice(0);
    
    // Replace null values with empty strings
    for (i = 0; i < data.length; i++) {
      if (data[i] === null || data[i] === undefined) {
        this._values[i] = "";
      }
    }
    
    el.addClass("jsavarray");
    this.options = $.extend({ visible: true }, this.options);
    
    for (key in this.options) {
      if (this.options.hasOwnProperty(key)) {
        val = this.options[key];
        if (typeof(val) === "string" || typeof(val) === "number" || typeof(val) === "boolean") {
          el.attr("data-" + key, val);
        }
      }
    }
    
    for (i = 0; i < data.length; i++) {
      this._newindex(data[i], i);
    }
    
    utils._helpers.handlePosition(this);
    this.layout();
    el.css("display", "none");
    utils._helpers.handleVisibility(this, this.options);
  }
  
  initializeFromElement(): void {
    if (!this.element) { return; }
    
    const $elem = this.element;
    const $elems = $elem.find("li");
    const data = $elem.data();
    const that = this;
    
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        this.options[key] = data[key];
      }
    }
    
    $elem.addClass("jsavarray");
    this._initOptionClasses();
    
    this._values = [];
    $elems.each((index, elem) => {
      const $this = $(elem);
      const value = utils.value2type(
        $this.attr("data-value") || $this.html(),
        $this.attr("data-value-type") || "string"
      );
      const $newElem = that._newindex(value, index);
      that._values[index] = value;
      $this.remove();
    });
    
    this.layout();
  }
  
  layout(options?: any): any {
    const layoutAlg = this.options.layout || "_default";
    this.element.removeClass("jsavbararray");
    return (this.jsav.ds.layout.array as any)[layoutAlg](this, options);
  }
  
  state(newstate?: any): any {
    if (newstate) {
      this.element.attr("style", newstate.style || "");
      utils._helpers.setElementClasses(this.element, newstate.classes || []);
      
      const currIndices = this._indices;
      const newIndices = newstate.ind;
      let i = 0;
      const curr = currIndices.length;
      const newl = newIndices.length;
      
      for (; i < curr && i < newl; i++) {
        currIndices[i].state(newIndices[i]);
      }
      
      while (i < curr) {
        const lastInd = currIndices.length - 1;
        currIndices[lastInd].element.remove();
        currIndices.splice(lastInd, 1);
        this._values.splice(lastInd, 1);
        i++;
      }
      
      while (i < newl) {
        const newInd = this._newindex("", i);
        newInd.state(newIndices[i]);
        i++;
      }
    } else {
      const state: any = { ind: [] };
      const indices = state.ind;
      
      for (let i = 0, l = this._indices.length; i < l; i++) {
        indices.push(this._indices[i].state());
      }
      
      const style = this.element.attr("style");
      if (style) {
        state.style = style;
      }
      
      const cls = utils._helpers.elementClasses(this.element);
      if (cls.length > 0) {
        state.classes = cls;
      }
      
      return state;
    }
  }
  
  equals(otherArray: any, options?: any): boolean {
    const opts = options || {};
    let i: number, j: number, equal: boolean, cssprop: string, clazzname: string, len: number;
    
    if ($.isArray(otherArray)) {
      if (!options) {
        len = otherArray.length;
        if (this.size() !== len) {
          return false;
        }
        for (i = 0; i < len; i++) {
          equal = this.value(i) == otherArray[i];
          if (!equal) { return false; }
        }
        return true;
      } else {
        if ('css' in opts) {
          cssprop = opts.css;
          for (i = 0; i < len; i++) {
            equal = this.css(i, cssprop) === otherArray[i];
            if (!equal) { return false; }
          }
          return true;
        }
      }
    } else {
      len = otherArray.size();
      if (this.size() !== len) {
        return false;
      }
      
      if (!('value' in opts) || opts.value) {
        for (i = 0; i < len; i++) {
          equal = this.value(i) == otherArray.value(i);
          if (!equal) { return false; }
        }
      }
      
      if ('css' in opts) {
        if ($.isArray(opts.css)) {
          for (i = 0; i < opts.css.length; i++) {
            cssprop = opts.css[i];
            for (j = 0; j < len; j++) {
              equal = this.css(j, cssprop) === otherArray.css(j, cssprop);
              if (!equal) { return false; }
            }
          }
        } else {
          cssprop = opts.css;
          for (i = 0; i < len; i++) {
            equal = this.css(i, cssprop) === otherArray.css(i, cssprop);
            if (!equal) { return false; }
          }
        }
      }
      
      if ('class' in opts) {
        if ($.isArray(opts['class'])) {
          for (i = 0; i < opts['class'].length; i++) {
            clazzname = opts['class'][i];
            for (j = 0; j < len; j++) {
              equal = this.hasClass(j, clazzname) === otherArray.hasClass(j, clazzname);
              if (!equal) { return false; }
            }
          }
        } else {
          clazzname = opts['class'];
          for (i = 0; i < len; i++) {
            equal = this.hasClass(i, clazzname) === otherArray.hasClass(i, clazzname);
            if (!equal) { return false; }
          }
        }
      }
      
      return true;
    }
    
    return false;
  }
  
  toggleClass(index: any, className: string, options?: any): any {
    const $elems = utils._helpers.getIndices($(this.element).find("li.jsavindex"), index);
    if (this.jsav._shouldAnimate()) {
      this.jsav.effects._toggleClass($elems, className, options);
    } else {
      $elems.toggleClass(className);
    }
    return [index, className, options];
  }
  
  addClass(index: any, className: string, options?: any): AVArrayInstance {
    const indices = utils._helpers.normalizeIndices(
      $(this.element).find("li.jsavindex"),
      index,
      ":not(." + className + ")"
    );
    if (indices.length > 0) {
      return this.toggleClass(indices, className, options) as unknown as AVArrayInstance;
    } else {
      return this;
    }
  }
  
  removeClass(index: any, className: string, options?: any): AVArrayInstance {
    const indices = utils._helpers.normalizeIndices(
      $(this.element).find("li.jsavindex"),
      index,
      "." + className
    );
    if (indices.length > 0) {
      return this.toggleClass(indices, className, options) as unknown as AVArrayInstance;
    } else {
      return this;
    }
  }
  
  hasClass(index: any, className: string): boolean {
    const $elems = utils._helpers.getIndices($(this.element).find("li.jsavindex"), index);
    return $elems.hasClass(className);
  }
  
  isEmpty(): boolean {
    for (let i = 0; i < this.size(); i++) {
      if (this.value(i) !== "") { return false; }
    }
    return true;
  }
  
  toggleArrow(indices: any, options?: any): void {
    this.toggleClass(indices, "jsavarrow", options);
  }
  
  toggleLine(index: number, options?: any): any {
    if (this.options.layout !== "bar") { return; }
    
    const valelem = this.element.find("li .jsavvalue").eq(index);
    const lielem = valelem.parent();
    
    if (valelem.length === 0) { return; }
    
    const opts = $.extend({ startIndex: 0, endIndex: this.size() - 1 }, options);
    
    const $mark = lielem.find(".jsavmark");
    const $markline = lielem.find(".jsavmarkline");
    
    if ($markline.length === 0 && $mark.length === 0) {
      if (opts.markStyle !== null) {
        const $markNew = $("<div class='jsavmark' />");
        lielem.prepend($markNew);
        if (opts.markStyle) { $markNew.css(opts.markStyle); }
        $markNew.css({
          bottom: valelem.height() - $markNew.outerHeight()! / 2,
          left: valelem.position().left + valelem.width()! / 2 - $markNew.outerWidth()! / 2,
          display: "block"
        });
      }
      
      if (opts.lineStyle !== null) {
        const $marklineNew = $("<div class='jsavmarkline' />");
        lielem.prepend($marklineNew);
        if (opts.lineStyle) { $marklineNew.css(opts.lineStyle); }
        
        const startelem = this.element.find(`li:eq(${opts.startIndex})`);
        const endelem = this.element.find(`li:eq(${opts.endIndex})`);
        
        $marklineNew.css({
          width: endelem.position().left - startelem.position().left + endelem.width(),
          left: startelem.position().left - lielem.position().left,
          bottom: valelem.height() - $marklineNew.outerHeight()! / 2,
          display: "block"
        });
      }
    } else {
      $mark.remove();
      $markline.remove();
    }
    
    return [index, opts];
  }
  
  id(): string {
    return this.element.attr("id") || "";
  }
  
  position(): any {
    return this.element.position();
  }
  
  logEvent(event: any): void {
    if (this.jsav && this.jsav.logEvent) {
      this.jsav.logEvent(event);
    }
  }
  
  // Event handlers
  private _setupEventHandler(eventType: string, data: any, handler: any): void {
    const self = this;
    this.element.on(eventType, ".jsavindex", function(e) {
      const index = self.element.find(".jsavindex").index(this);
      self.jsav.logEvent({ type: "jsav-array-" + eventType, arrayid: self.id(), index: index });
      
      if ($.isFunction(data)) {
        data.call(self, index, e);
      } else if ($.isFunction(handler)) {
        const params = $.isArray(data) ? data.slice(0) : [data];
        params.unshift(index);
        params.push(e);
        handler.apply(self, params);
      }
    });
  }
  
  click(data: any, handler: any): AVArrayInstance {
    this._setupEventHandler("click", data, handler);
    return this;
  }
  
  dblclick(data: any, handler: any): AVArrayInstance {
    this._setupEventHandler("dblclick", data, handler);
    return this;
  }
  
  mousedown(data: any, handler: any): AVArrayInstance {
    this._setupEventHandler("mousedown", data, handler);
    return this;
  }
  
  mousemove(data: any, handler: any): AVArrayInstance {
    this._setupEventHandler("mousemove", data, handler);
    return this;
  }
  
  mouseup(data: any, handler: any): AVArrayInstance {
    this._setupEventHandler("mouseup", data, handler);
    return this;
  }
  
  mouseenter(data: any, handler: any): AVArrayInstance {
    this._setupEventHandler("mouseenter", data, handler);
    return this;
  }
  
  mouseleave(data: any, handler: any): AVArrayInstance {
    this._setupEventHandler("mouseleave", data, handler);
    return this;
  }
  
  on(eventName: string, data: any, handler: any): AVArrayInstance {
    this._setupEventHandler(eventName, data, handler);
    return this;
  }
}

// Register with JSAV
if (typeof window !== 'undefined') {
  const jsav = (window as any).JSAV;
  if (jsav) {
    jsav._types.ds.AVArray = AVArray;
    jsav._types.ds.ArrayIndex = ArrayIndex;
    
    jsav.ext.ds.array = function(element: any, options: ArrayOptions) {
      return new AVArray(this, element, options);
    };
  }
}

// Array layout functions
function setArrayWidth(array: AVArray, $lastItem: JQuery, options: any): void {
  let width = 0;
  array.element.find("li").each((index, item) => {
    width += $(item).outerWidth(true)!;
  });
  
  if (width !== array.element.width()) {
    array.css({ "width": (width + 1) + "px" });
  }
}

function horizontalArray(array: AVArray, options: any): any {
  const $arr = $(array.element).addClass("jsavhorizontalarray");
  const $items = $arr.find("li");
  let maxHeight = -1;
  
  $items.each((index, item) => {
    const $i = $(item);
    maxHeight = Math.max(maxHeight, $i.outerHeight()!);
  });
  
  $arr.height(maxHeight + (array.options.indexed ? 30 : 0));
  setArrayWidth(array, $items.last(), options);
  
  const arrPos = $arr.position();
  return {
    width: $arr.outerWidth(),
    height: $arr.outerHeight(),
    left: arrPos.left,
    top: arrPos.top
  };
}

function verticalArray(array: AVArray, options: any): any {
  const $arr = $(array.element).addClass("jsavverticalarray");
  const $items = $arr.find("li");
  let maxWidth = -1;
  const indexed = !!array.options.indexed;
  
  if (indexed) {
    let indexMaxWidth = -1;
    $items.each((index, item) => {
      const $i = $(item);
      const $indexLabel = $i.find(".jsavindexlabel");
      indexMaxWidth = Math.max(indexMaxWidth, $indexLabel.innerWidth()!);
      $indexLabel.css({
        top: $i.innerHeight()! / 2 - $indexLabel.outerHeight()! / 2
      });
    });
    $items.css("margin-left", indexMaxWidth);
  }
  
  $items.each((index, item) => {
    maxWidth = Math.max(maxWidth, $(item).outerWidth()!);
  });
  
  if (maxWidth !== array.element.width()) {
    array.css({ "width": (maxWidth + 1) + "px" });
  }
  
  const arrPos = $arr.position();
  return {
    width: $arr.outerWidth(),
    height: $arr.outerHeight(),
    left: arrPos.left,
    top: arrPos.top
  };
}

function barArray(array: AVArray, options: any): any {
  const $arr = $(array.element).addClass("jsavbararray");
  const $items = $arr.find("li.jsavindex");
  let maxValue = Number.MIN_VALUE;
  const width = $items.first().outerWidth()!;
  const size = array.size();
  
  for (let i = 0; i < size; i++) {
    maxValue = Math.max(maxValue, array.value(i));
  }
  maxValue *= 1.15;
  
  const setBarHeight = function(elem: JQuery, newHeight: number, options?: any) {
    const oldHeight = elem.height()!;
    if (array.jsav._shouldAnimate()) {
      array.jsav.effects.transition(elem, { height: newHeight }, options);
    } else {
      elem.css({ height: newHeight });
    }
    return [elem, oldHeight];
  };
  
  $items.each((index, item) => {
    const $i = $(item);
    const $valueBar = $i.find(".jsavvaluebar");
    const $value = $i.find(".jsavvalue");
    const valueBarHeight = $valueBar.height()!;
    const newBarHeight = Math.round(valueBarHeight * (array.value(index) / maxValue));
    
    if (newBarHeight !== $value.height()) {
      setBarHeight($value, newBarHeight);
    }
  });
  
  setArrayWidth(array, $items.last(), options);
  return {
    width: array.element.outerWidth(),
    height: array.element.outerHeight(),
    left: array.position().left,
    top: array.position().top
  };
}

// Register layout functions
if (typeof window !== 'undefined') {
  const jsav = (window as any).JSAV;
  if (jsav && jsav.ext && jsav.ext.ds) {
    jsav.ext.ds.layout = jsav.ext.ds.layout || {};
    jsav.ext.ds.layout.array = {
      "_default": horizontalArray,
      "bar": barArray,
      "array": horizontalArray,
      "vertical": verticalArray
    };
  }
}

export { ArrayIndex };
