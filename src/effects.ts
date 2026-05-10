/**
 * Module that contains JSAV effects support.
 */
import $ from 'jquery';
import { JSAV } from './core';

export namespace effects {
  export function transition(elem: JQuery, props: any, options?: any): void {
    elem.css(props);
  }
}

(JSAV as any).effects = effects;
