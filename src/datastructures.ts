/**
 * Module that contains the data structure implementations.
 * Depends on core, anim, utils, effects
 */
import $ from 'jquery';
import { JSAV } from './core';
import { utils } from './utils';

// Extend jQuery with getstyles
declare global {
  interface JQuery {
    getstyles(...args: any[]): any;
  }
}

$.fn.getstyles = function(...args: any[]) {
  const res: any = {};
  let arg: any;
  
  for (let i = 0; i < args.length; i++) {
    arg = args[i];
    if ($.isArray(arg)) {
      for (let j = 0; j < arg.length; j++) {
        res[arg[j]] = this.css(arg[j]);
      }
    } else {
      res[arg] = this.css(arg);
    }
  }
  return res;
};

// Common properties/functions for all data structures
export class JSAVDataStructure {
  jsav?: any;
  element!: JQuery;
  svg?: any;
  options?: any;
  
  getSvg(): any {
    if (!this.svg) {
      // @ts-ignore - Raphael is available globally
      this.svg = new Raphael(this.element[0]);
      this.svg.renderfix();
      const style = this.svg.canvas.style;
      style.position = "absolute";
    }
    return this.svg;
  }
  
  _toggleVisible(options?: any): void {}
  show(options?: any): void {}
  hide(options?: any): void {}
  addClass(className: string, options?: any): any { return this; }
  removeClass(className: string, options?: any): any { return this; }
  hasClass(className: string): boolean { return false; }
  toggleClass(className: string, options?: any): any { return this; }
  initialize(): void {}
  initializeFromElement(): void {}
  clone(): any {}
  css(cssprop: any, value?: any, options?: any): any { return this; }
  _setcss(cssprop: any, value?: any, options?: any): any { return this; }
  state(newState?: any): any { return this; }
  position(): any { return { left: 0, top: 0 }; }
  id(): string { return ""; }
  value(newVal?: any, options?: any): any { return this; }
  _setvalue(newValue: any, options?: any): any { return this; }
  highlight(options?: any): any { return this; }
  unhighlight(options?: any): any { return this; }
  isHighlight(): boolean { return false; }
}

// Edge implementation
export interface EdgeOptions {
  display?: boolean;
  weight?: any;
  [key: string]: any;
}

export class Edge extends JSAVDataStructure {
  jsav: any;
  startnode: any;
  endnode: any;
  options: EdgeOptions;
  container: any;
  g: any;
  _weight?: any;
  _label?: any;
  _labelPositionUpdate?: Function;
  
  constructor(jsav: any, start: any, end: any, options?: EdgeOptions) {
    super();
    this.jsav = jsav;
    this.startnode = start;
    this.endnode = end;
    this.options = $.extend(true, { display: true }, options);
    this.container = start.container;
    
    const startPos = start ? start.element.position() : { left: 0, top: 0 };
    const endPos = end ? end.element.position() : { left: 0, top: 0 };
    
    if (startPos.left === endPos.left && startPos.top === endPos.top) {
      this.g = this.jsav.g.line(-1, -1, -1, -1, $.extend({ container: this.container }, this.options));
    } else {
      if (end) {
        endPos.left += end.element.outerWidth() / 2;
        endPos.top += end.element.outerHeight();
      }
      if (!startPos.left && !startPos.top) {
        startPos = endPos;
      }
      this.g = this.jsav.g.line(
        startPos.left, startPos.top, endPos.left, endPos.top,
        $.extend({ container: this.container }, this.options)
      );
    }
    
    this.element = $(this.g.rObj.node);
    
    const visible = typeof this.options.display === "boolean" && this.options.display === true;
    this.g.rObj.attr({ opacity: 0 });
    this.element.addClass("jsavedge");
    
    if (start) {
      this.element[0].setAttribute("data-startnode", this.startnode.id());
    }
    if (end) {
      this.element[0].setAttribute("data-endnode", this.endnode.id());
    }
    this.element[0].setAttribute("data-container", this.container.id());
    this.element.data("edge", this);
    
    if (typeof this.options.weight !== "undefined") {
      this._weight = this.options.weight;
      this.label(this._weight);
    }
    if (visible) {
      this.g.show();
    }
  }
  
  start(node?: any, options?: any): any {
    if (typeof node === "undefined") {
      return this.startnode;
    } else {
      this.startnode = node;
      this.g.rObj.node.setAttribute("data-startnode", this.startnode ? this.startnode.id() : "");
      return this;
    }
  }
  
  end(node?: any, options?: any): any {
    if (typeof node === "undefined") {
      return this.endnode;
    } else {
      this.endnode = node;
      this.g.rObj.node.setAttribute("data-endnode", this.endnode ? this.endnode.id() : "");
      return this;
    }
  }
  
  _setweight(newWeight: any): any {
    const oldWeight = this._weight;
    this._weight = newWeight;
    return [oldWeight];
  }
  
  weight(newWeight?: any): any {
    if (typeof newWeight === "undefined") {
      return this._weight;
    } else {
      this._setweight(newWeight);
      this.label(newWeight);
    }
  }
  
  clear(): void {
    this.g.rObj.remove();
  }
  
  hide(options?: any): void {
    if (this.g.isVisible()) {
      this.g.hide(options);
      if (this._label) { this._label.hide(options); }
    }
  }
  
  show(options?: any): void {
    if (!this.g.isVisible()) {
      this.g.show(options);
      if (this._label) { this._label.show(options); }
    }
  }
  
  isVisible(): boolean {
    return this.g.isVisible();
  }
  
  label(newLabel?: any, options?: any): any {
    if (typeof newLabel === "undefined") {
      if (this._label && this._label.element.filter(":visible").length > 0) {
        return this._label.text();
      } else {
        return undefined;
      }
    } else {
      if (!this._label) {
        const self = this;
        const _labelPositionUpdate = function(options?: any) {
          if (!self._label) { return; }
          const bbox = (options && options.bbox) ? options.bbox : self.g.bounds();
          const lbbox = self._label.bounds();
          const newTop = bbox.top + (bbox.height - lbbox.height) / 2;
          const newLeft = bbox.left + (bbox.width - lbbox.width) / 2;
          if (newTop !== lbbox.top || newLeft !== lbbox.left) {
            self._label.css({ top: newTop, left: newLeft }, options);
          }
        };
        this._labelPositionUpdate = _labelPositionUpdate;
        this._label = this.jsav.label(newLabel, { container: this.container.element });
        this._label.element.addClass("jsavedgelabel");
      } else {
        this._label.text(newLabel, options);
      }
    }
  }
  
  equals(otherEdge: any, options?: any): boolean {
    if (!otherEdge || !(otherEdge instanceof Edge)) {
      return false;
    }
    if (options && !options.dontCheckNodes) {
      if (!this.startnode.equals(otherEdge.startnode) || !this.endnode.equals(otherEdge.endnode)) {
        return false;
      }
    }
    if (this._weight !== otherEdge._weight) { return false; }
    
    if (options && 'css' in options) {
      const cssEquals = utils._helpers.cssEquals(this, otherEdge, options.css);
      if (!cssEquals) { return false; }
    }
    
    if (options && 'class' in options) {
      const classEquals = utils._helpers.classEquals(this, otherEdge, options['class']);
      if (!classEquals) { return false; }
    }
    
    return true;
  }
  
  _setcss(cssprop: any, value?: any, options?: any): any {
    const oldProps = $.extend(true, {}, cssprop);
    const el = this.g.rObj;
    let newprops: any;
    
    if (typeof cssprop === "string" && typeof value !== "undefined") {
      oldProps[cssprop] = el.attr(cssprop);
      newprops = {};
      newprops[cssprop] = value;
    } else {
      for (const i in cssprop) {
        if (cssprop.hasOwnProperty(i)) {
          oldProps[i] = el.attr(i);
        }
      }
      newprops = cssprop;
    }
    
    if (this.jsav._shouldAnimate()) {
      el.animate(newprops, this.jsav.SPEED);
    } else {
      el.attr(newprops);
    }
    return [oldProps];
  }
  
  css(cssprop: any, value?: any, options?: any): any {
    if (typeof cssprop === "string" && typeof value === "undefined") {
      return this.g.rObj.attr(cssprop);
    } else {
      return this._setcss(cssprop, value, options);
    }
  }
  
  state(newState?: any): any {
    if (typeof newState !== "undefined") {
      this.g.css(newState.a);
      utils._helpers.setElementClasses(this.element, newState.cls || []);
      if (newState.l) {
        this.label(newState.l, { record: false });
      } else if (this.label()) {
        this.label("");
      }
      if (newState.w) {
        this.weight(newState.w);
      } else if (this.weight()) {
        this.weight("");
      }
    } else {
      const state: any = { a: this.g.rObj.attrs };
      const cls = utils._helpers.elementClasses(this.element);
      if (cls.length > 0) { state.cls = cls; }
      if (this.label()) { state.l = this.label(); }
      if (this._weight) { state.w = this.weight(); }
      return state;
    }
  }
  
  position(): any {
    const bbox = this.g.bounds();
    return { left: bbox.left, top: bbox.top };
  }
  
  addClass(className: string, options?: any): any {
    if (!this.element.hasClass(className)) {
      return this.toggleClass(className, options);
    } else {
      return this;
    }
  }
  
  removeClass(className: string, options?: any): any {
    if (this.element.hasClass(className)) {
      return this.toggleClass(className, options);
    } else {
      return this;
    }
  }
  
  hasClass(className: string): boolean {
    return this.element.hasClass(className);
  }
  
  toggleClass(className: string, options?: any): any {
    this.element.toggleClass(className);
    return [className, options];
  }
  
  highlight(options?: any): void {
    this.addClass("jsavhighlight", options);
  }
  
  unhighlight(options?: any): void {
    this.removeClass("jsavhighlight", options);
  }
  
  layout(options?: any): void {
    const sElem = this.start().element;
    const eElem = this.end().element;
    const start = (options && options.start) ? options.start : this.start().position();
    const end = (options && options.end) ? options.end : this.end().position();
    const sWidth = sElem.outerWidth() / 2.0;
    const sHeight = sElem.outerHeight() / 2.0;
    const eWidth = eElem.outerWidth() / 2.0;
    const eHeight = eElem.outerHeight() / 2.0;
    const fromX = (options && options.fromPoint) ? options.fromPoint[0] : Math.round(start.left + sWidth);
    const fromY = (options && options.fromPoint) ? options.fromPoint[1] : Math.round(start.top + sHeight);
    const toX = Math.round(end.left + eWidth);
    const toY = Math.round(end.top + eHeight);
    const fromAngle = normalizeAngle(2 * Math.PI - Math.atan2(toY - fromY, toX - fromX));
    const toAngle = normalizeAngle(2 * Math.PI - Math.atan2(fromY - toY, fromX - toX));
    const startRadius = parseInt(sElem.css("borderBottomRightRadius"), 10) || 0;
    const ADJUSTMENT_MAGIC = 2.2;
    const strokeWidth = parseInt(this.g.element.css("stroke-width"), 10);
    const startStrokeAdjust = this.options["arrow-begin"] ? strokeWidth * ADJUSTMENT_MAGIC : 0;
    const fromPoint = (options && options.fromPoint) ? options.fromPoint :
      getNodeBorderAtAngle(
        { width: sWidth + startStrokeAdjust, height: sHeight + startStrokeAdjust, x: fromX, y: fromY },
        { x: toX, y: toY },
        fromAngle,
        startRadius
      );
    const endRadius = parseInt(eElem.css("borderBottomRightRadius"), 10) || 0;
    const endStrokeAdjust = this.options["arrow-end"] ? strokeWidth * ADJUSTMENT_MAGIC : 0;
    const toPoint = getNodeBorderAtAngle(
      { width: eWidth + endStrokeAdjust, height: eHeight + endStrokeAdjust, x: toX, y: toY },
      { x: fromX, y: fromY },
      toAngle,
      endRadius
    );
    
    this.g.movePoints([[0].concat(fromPoint), [1].concat(toPoint)], options);
    
    if ($.isFunction(this._labelPositionUpdate)) {
      const bbtop = Math.min(fromPoint[1], toPoint[1]);
      const bbleft = Math.min(fromPoint[0], toPoint[0]);
      const bbwidth = Math.abs(fromPoint[0] - toPoint[0]);
      const bbheight = Math.abs(fromPoint[1] - toPoint[1]);
      const bbox = { top: bbtop, left: bbleft, width: bbwidth, height: bbheight };
      this._labelPositionUpdate($.extend({ bbox: bbox }, options));
    }
    
    if (this.start().value() === "jsavnull" || this.end().value() === "jsavnull") {
      this.addClass("jsavedge", options).addClass("jsavnulledge", options);
    } else {
      this.addClass("jsavedge", options).removeClass("jsavnulledge");
    }
  }
}

// Helper functions for edge position calculation
function normalizeAngle(angle: number): number {
  const pi = Math.PI;
  while (angle < 0) {
    angle += 2 * pi;
  }
  while (angle >= 2 * pi) {
    angle -= 2 * pi;
  }
  return angle;
}

interface LineCircleResult {
  inside?: boolean;
  enters?: { x: number; y: number };
  exit?: { x: number; y: number };
  intersects?: boolean;
}

function lineIntersectCircle(pointa: { x: number; y: number }, pointb: { x: number; y: number }, 
                            center: { x: number; y: number }, radius: number): LineCircleResult {
  const result: LineCircleResult = {};
  const a = (pointb.x - pointa.x) ** 2 + (pointb.y - pointa.y) ** 2;
  const b = 2 * ((pointb.x - pointa.x) * (pointa.x - center.x) + (pointb.y - pointa.y) * (pointa.y - center.y));
  const cc = center.x ** 2 + center.y ** 2 + pointa.x ** 2 + pointa.y ** 2 - 
             2 * (center.x * pointa.x + center.y * pointa.y) - radius ** 2;
  const deter = b * b - 4 * a * cc;
  
  function interpolate(p1: { x: number; y: number }, p2: { x: number; y: number }, d: number) {
    return { x: p1.x + (p2.x - p1.x) * d, y: p1.y + (p2.y - p1.y) * d };
  }
  
  if (deter <= 0) {
    result.inside = false;
  } else {
    const e = Math.sqrt(deter);
    const u1 = (-b + e) / (2 * a);
    const u2 = (-b - e) / (2 * a);
    
    if ((u1 < 0 || u1 > 1) && (u2 < 0 || u2 > 1)) {
      if ((u1 < 0 && u2 < 0) || (u1 > 1 && u2 > 1)) {
        result.inside = false;
      } else {
        result.inside = true;
      }
    } else {
      if (0 <= u2 && u2 <= 1) {
        result.enter = interpolate(pointa, pointb, u2);
      }
      if (0 <= u1 && u1 <= 1) {
        result.exit = interpolate(pointa, pointb, u1);
      }
      result.intersects = true;
    }
  }
  return result;
}

function getNodeBorderAtAngle(dim: { width: number; height: number; x: number; y: number }, 
                              targetNodeCenter: { x: number; y: number }, 
                              angle: number, radius: number): [number, number] {
  dim.width = Math.max(dim.width, 1);
  dim.height = Math.max(dim.height, 1);
  
  let x: number, y: number;
  const pi = Math.PI;
  const urCornerA = Math.atan2(dim.height * 2.0, dim.width * 2.0);
  const ulCornerA = pi - urCornerA;
  const lrCornerA = 2 * pi - urCornerA;
  const llCornerA = urCornerA + pi;
  
  let intersect: LineCircleResult | undefined;
  let topAngle: number, bottomAngle: number, leftAngle: number, rightAngle: number;
  
  radius = Math.min(radius, dim.width, dim.height);
  
  if (angle < urCornerA || angle > lrCornerA) {
    topAngle = Math.atan2(dim.height - radius, dim.width);
    bottomAngle = 2 * pi - topAngle;
    x = dim.x + dim.width;
    y = dim.y - dim.width * Math.tan(angle);
    
    if (radius > 0 && angle > topAngle && angle < bottomAngle) {
      if (angle < bottomAngle && angle > pi) {
        intersect = lineIntersectCircle(
          { x: dim.x, y: dim.y }, targetNodeCenter,
          { x: dim.x + dim.width - radius, y: dim.y + dim.height - radius }, radius
        );
      } else {
        intersect = lineIntersectCircle(
          { x: dim.x, y: dim.y }, targetNodeCenter,
          { x: dim.x + dim.width - radius, y: dim.y - dim.height + radius }, radius
        );
      }
    }
  } else if (angle > ulCornerA && angle < llCornerA) {
    topAngle = pi - Math.atan2(dim.height - radius, dim.width);
    bottomAngle = 2 * pi - topAngle;
    x = dim.x - dim.width;
    y = dim.y + dim.width * Math.tan(angle);
    
    if (radius > 0 && (angle < topAngle || angle > bottomAngle)) {
      if (topAngle > angle) {
        intersect = lineIntersectCircle(
          { x: dim.x, y: dim.y }, targetNodeCenter,
          { x: dim.x - dim.width + radius, y: dim.y - dim.height + radius }, radius
        );
      } else {
        intersect = lineIntersectCircle(
          { x: dim.x, y: dim.y }, targetNodeCenter,
          { x: dim.x - dim.width + radius, y: dim.y + dim.height - radius }, radius
        );
      }
    }
  } else if (angle <= ulCornerA) {
    rightAngle = Math.atan2(dim.height, dim.width - radius);
    leftAngle = pi - rightAngle;
    y = dim.y - dim.height;
    x = dim.x + (dim.height) / Math.tan(angle);
    
    if (radius > 0 && (angle > leftAngle || angle < rightAngle)) {
      if (angle > leftAngle) {
        intersect = lineIntersectCircle(
          { x: dim.x, y: dim.y }, targetNodeCenter,
          { x: dim.x - dim.width + radius, y: dim.y - dim.height + radius }, radius
        );
      } else {
        intersect = lineIntersectCircle(
          { x: dim.x, y: dim.y }, targetNodeCenter,
          { x: dim.x + dim.width - radius, y: dim.y - dim.height + radius }, radius
        );
      }
    }
  } else {
    leftAngle = pi + Math.atan2(dim.height, dim.width - radius);
    rightAngle = 2 * pi - Math.atan2(dim.height, dim.width - radius);
    y = dim.y + dim.height;
    x = dim.x - (dim.height) / Math.tan(angle);
    
    if (radius > 0 && (angle < leftAngle || angle > rightAngle)) {
      if (angle > rightAngle) {
        intersect = lineIntersectCircle(
          { x: dim.x, y: dim.y }, targetNodeCenter,
          { x: dim.x + dim.width - radius, y: dim.y + dim.height - radius }, radius
        );
      } else {
        intersect = lineIntersectCircle(
          { x: dim.x, y: dim.y }, targetNodeCenter,
          { x: dim.x - dim.width + radius, y: dim.y + dim.height - radius }, radius
        );
      }
    }
  }
  
  if (intersect && intersect.exit) {
    x = intersect.exit.x;
    y = intersect.exit.y;
  }
  
  return [Math.round(x), Math.round(y)];
}

// Node implementation
export class Node extends JSAVDataStructure {
  _valstring(value: any): string {
    return `<span class='jsavvaluelabel'>${value}</span>`;
  }
  
  value(newVal?: any, options?: any): any {
    if (typeof newVal === "undefined") {
      return utils.value2type(
        this.element.attr("data-value"),
        this.element.attr("data-value-type")
      );
    } else {
      this._setvalue(newVal, options);
    }
    return this;
  }
  
  _setvalue(newValue: any, options?: any): any {
    const oldVal = this.value();
    let valtype = typeof(newValue);
    if (typeof oldVal === "undefined") { oldVal = ""; }
    if (valtype === "object") { valtype = "string"; }
    
    this.element
      .find(".jsavvalue")
      .html(this._valstring(newValue))
      .end()
      .attr({ "data-value": newValue, "data-value-type": valtype });
    
    return [oldVal];
  }
  
  highlight(options?: any): any {
    return this.addClass("jsavhighlight");
  }
  
  unhighlight(options?: any): any {
    return this.removeClass("jsavhighlight");
  }
  
  isHighlight(): boolean {
    return this.hasClass("jsavhighlight");
  }
  
  state(newState?: any): any {
    if (typeof newState !== "undefined") {
      this.value(newState.v, { record: false });
      utils._helpers.setElementClasses(this.element, newState.cls || []);
      this.element.attr("style", newState.css || "");
    } else {
      const state: any = { v: this.value() };
      const style = this.element.attr("style");
      const cls = utils._helpers.elementClasses(this.element);
      if (cls.length > 0) { state.cls = cls; }
      if (style) { state.css = style; }
      return state;
    }
  }
  
  css(cssprop: any, value?: any, options?: any): any {
    if (typeof value === "undefined") {
      return this.element.css(cssprop);
    } else {
      return this._setcss(cssprop, value, options);
    }
  }
  
  _setcss(cssprop: any, value?: any, options?: any): any {
    const oldProps = $.extend(true, {}, cssprop);
    const el = this.element;
    let newprops: any;
    
    if (typeof cssprop === "string" && typeof value !== "undefined") {
      oldProps[cssprop] = el.css(cssprop);
      newprops = {};
      newprops[cssprop] = value;
    } else {
      for (const i in cssprop) {
        if (cssprop.hasOwnProperty(i)) {
          oldProps[i] = el.css(i);
        }
      }
      newprops = cssprop;
    }
    
    if (this.jsav && this.jsav._shouldAnimate()) {
      this.jsav.effects.transition(el, newprops, options);
    } else {
      el.css(newprops);
    }
    return [oldProps];
  }
}

// Register with JSAV
if (typeof window !== 'undefined') {
  const jsav = (window as any).JSAV;
  if (jsav) {
    jsav._types.ds = {
      JSAVDataStructure: JSAVDataStructure,
      Edge: Edge,
      Node: Node
    };
    
    jsav.ext.ds = { layout: {} };
  }
}
