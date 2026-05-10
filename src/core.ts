/**
 * Module that contains JSAV core.
 */
import $ from 'jquery';

export interface JSAVOptions {
  autoresize?: boolean;
  scroll?: boolean;
  element?: string | HTMLElement | JQuery;
  [key: string]: any;
}

export interface JSAVInstance {
  container: JQuery;
  canvas: JQuery;
  options: JSAVOptions;
  svg: any; // Raphael paper
  RECORD: boolean;
  _initialHTML: string;
  _shutter: JQuery;
  
  getSvg(): any;
  id(): string;
  clear(): void;
  logEvent(event: any): void;
}

export class JSAV {
  static _types: { [key: string]: any } = {};
  static ext: { [key: string]: any } = {};
  static init: { (fn: (this: JSAVInstance, options: JSAVOptions) => void): void; functions: Array<(this: JSAVInstance, options: JSAVOptions) => void> };
  static position(elem: HTMLElement | JQuery): { left: number; top: number };
  
  container!: JQuery;
  canvas!: JQuery;
  options!: JSAVOptions;
  svg!: any;
  RECORD!: boolean;
  _initialHTML!: string;
  _shutter!: JQuery;
  
  constructor(containerOrOptions?: string | HTMLElement | JQuery | JSAVOptions, options?: JSAVOptions) {
    this._create(containerOrOptions, options);
  }
  
  private _create(containerOrOptions?: string | HTMLElement | JQuery | JSAVOptions, options?: JSAVOptions): void {
    if (typeof containerOrOptions === "string") {
      this.container = $(document.getElementById(containerOrOptions));
    } else if (containerOrOptions instanceof HTMLElement) {
      this.container = $(containerOrOptions);
    } else if (containerOrOptions && typeof containerOrOptions === "object" && (containerOrOptions as any).constructor === $) {
      this.container = containerOrOptions as JQuery;
    }

    const defaultOptions: JSAVOptions = $.extend({
      autoresize: true,
      scroll: true
    }, window.JSAV_OPTIONS);
    
    if (this.container) {
      this.options = $.extend(true, defaultOptions, options);
    } else {
      this.options = $.extend(true, defaultOptions, containerOrOptions as JSAVOptions);
      this.container = $(this.options.element!);
    }

    const initialHTML = this.container.clone().wrap("<p/>").parent().html()!;
    this._initialHTML = this.container.html()!;

    this.container.addClass("jsavcontainer");
    this.canvas = this.container.find(".jsavcanvas");
    if (this.canvas.length === 0) {
      this.canvas = $("<div />").addClass("jsavcanvas").appendTo(this.container);
    }
    
    const shutter = $("<div class='jsavshutter' />").appendTo(this.container);
    this._shutter = shutter;

    this.RECORD = true;
    $.fx.off = true;
    
    this._initializations(this.options);
    this._extensions(this, JSAV.ext);

    this.logEvent({ type: "jsav-init", initialHTML: initialHTML });
  }
  
  private _initializations(options: JSAVOptions): void {
    const fs = JSAV.init.functions;
    for (let i = 0; i < fs.length; i++) {
      if ($.isFunction(fs[i])) {
        fs[i].call(this as JSAVInstance, options);
      }
    }
  }
  
  private _extensions(jsav: JSAVInstance, con: any, add: any): void {
    for (const prop in add) {
      if (add.hasOwnProperty(prop) && !(prop in con)) {
        switch (typeof add[prop]) {
          case "function":
            ((f) => {
              con[prop] = con === jsav ? f : function() { return f.apply(jsav, arguments); };
            })(add[prop]);
            break;
          case "object":
            con[prop] = con[prop] || {};
            this._extensions(jsav, con[prop], add[prop]);
            break;
          default:
            con[prop] = add[prop];
            break;
        }
      }
    }
  }
  
  getSvg(): any {
    if (!this.svg) {
      this.svg = Raphael(this.canvas[0]);
      const style = this.svg.canvas.style;
      style.position = "absolute";
    }
    return this.svg;
  }
  
  id(): string {
    let id = this.container[0].id;
    if (!id) {
      id = JSAV.utils.createUUID();
      this.container[0].id = id;
    }
    return id;
  }
  
  clear(): void {
    this.container.html(this._initialHTML);
    this.canvas = this.container.find(".jsavcanvas");
  }
  
  logEvent(event: any): void {
    // Implementation will be added from events module
  }
  
  static anim(fn: Function): Function {
    return fn;
  }
}

// Initialize static properties
JSAV.init = function(fn) {
  JSAV.init.functions.push(fn);
} as any;
JSAV.init.functions = [];

// Autoresize handler
JSAV.init(function() {
  if (this.options.autoresize) {
    const that = this;
    this.container.on("jsav-updaterelative", function() {
      let maxTop = parseInt(that.canvas.css("minHeight"), 10),
          maxLeft = parseInt(that.canvas.css("minWidth"), 10);

      that.canvas.children().each(function(index, item) {
        const $item = $(item),
            itemPos = $item.position();
        if (item.nodeName.toLowerCase() !== "svg") {
          maxTop = Math.max(maxTop, itemPos.top + $item.outerHeight(true)!);
          maxLeft = Math.max(maxLeft, itemPos.left + $item.outerWidth(true)!);
        }
      });
      
      if (that.svg) {
        let curr = that.svg.bottom,
            bbox: any, strokeWidth: number;
        while (curr) {
          bbox = curr.getBBox();
          strokeWidth = curr.attr("stroke-width");
          maxTop = Math.max(maxTop, bbox.y2 + strokeWidth);
          maxLeft = Math.max(maxLeft, bbox.x2 + strokeWidth);
          curr = curr.next;
        }
      }
      
      if (that.options.scroll) {
        const parentWidth = that.canvas.parent().width()!;
        maxLeft = Math.min(maxLeft, parentWidth);
      }
      
      that.canvas.css({ "minHeight": maxTop, "minWidth": maxLeft });
    });
  }
});

// Export to window
if (typeof window !== 'undefined') {
  (window as any).JSAV = JSAV;
  
  (window as any).JSAV_OPTIONS = {
    narration: {
      enabled: false,
      replacements: [
        { searchValue: /<[^>]*>/g, replaceValue: "" },
        { searchValue: /\$/g, replaceValue: "" },
        { searchValue: /\\mathbf/gi, replaceValue: "" },
        { searchValue: /\\displaystyle/gi, replaceValue: "" },
        { searchValue: /\\mbox/gi, replaceValue: "" },
        { searchValue: /n-/gi, replaceValue: "n minus" },
        { searchValue: /m-/gi, replaceValue: "m minus" },
        { searchValue: /%/gi, replaceValue: "remainder" }
      ],
      langMap: {
        "en": "en-US",
        "fr": "fr-FR"
      }
    }
  };
}

// Add utils namespace placeholder
(JSAV as any).utils = {};

