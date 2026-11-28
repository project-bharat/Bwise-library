import { Capacitor, registerPlugin } from '@capacitor/core';
const scanner = registerPlugin('ShelfScanner');
export const canScan = Capacitor.getPlatform() === 'android';
export const scanEdition = prompt => scanner.scan({ prompt });
