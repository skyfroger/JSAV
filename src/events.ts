/**
 * Module that contains JSAV events support.
 */
import $ from 'jquery';
import { JSAV, JSAVInstance } from './core';

(JSAV as any).prototype.logEvent = function(event: any): void {
  // Placeholder for event logging
  console.log('JSAV Event:', event);
};
