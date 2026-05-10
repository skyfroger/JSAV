/**
 * Module that contains JSAV utility functions.
 */
import $ from 'jquery';
import { JSAV } from './core';

export namespace utils {
  export function createUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  export function extend(child: any, parent: any): void {
    child.prototype = Object.create(parent.prototype);
    child.prototype.constructor = child;
  }
  
  export namespace _helpers {
    export function getIndices(indices: any): number[] {
      if (typeof indices === "number") {
        return [indices];
      } else if ($.isArray(indices)) {
        return indices;
      } else {
        return [];
      }
    }
    
    export function addClass(obj: any, className: string, options?: any): void {
      obj.element.addClass(className);
    }
    
    export function removeClass(obj: any, className: string, options?: any): void {
      obj.element.removeClass(className);
    }
    
    export function hasClass(obj: any, className: string): boolean {
      return obj.element.hasClass(className);
    }
    
    export function cssEquals(obj1: any, obj2: any, props: string[]): boolean {
      for (const prop of props) {
        if (obj1.css(prop) !== obj2.css(prop)) {
          return false;
        }
      }
      return true;
    }
    
    export function classEquals(obj1: any, obj2: any, classNames: string[]): boolean {
      for (const className of classNames) {
        if (obj1.hasClass(className) !== obj2.hasClass(className)) {
          return false;
        }
      }
      return true;
    }
    
    export function _toggleClass(obj: any, className: string, options?: any): void {
      obj.element.toggleClass(className);
    }
  }
}

// Export to JSAV
(JSAV as any).utils = utils;
