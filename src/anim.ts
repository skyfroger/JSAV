/**
 * Module that contains JSAV animation support.
 */
import { JSAV } from './core';

JSAV.anim = function(fn: Function): Function {
  return fn;
};
