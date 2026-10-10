import {describe,it,expect} from 'vitest';
import {normalizeSettings,defaultSettings} from '../apps/web/src/storage';
import {socketUrlFromHost,hostLabel} from '../apps/web/src/lan-address';

describe('settings',()=>{
 it('migrates the earlier speed:"reduced" format and keeps saved choices',()=>{
  expect(normalizeSettings({speed:'reduced',quality:'low',sound:false})).toMatchObject({speed:'normal',reducedMotion:true,quality:'low',sound:false,haptics:true,camera:'normal'});
  expect(normalizeSettings({speed:'fast',quality:'high',sound:true})).toMatchObject({speed:'fast',reducedMotion:false,quality:'high'});
 });
 it('falls back to defaults for missing or corrupt values',()=>{
  expect(normalizeSettings(null)).toEqual(defaultSettings());
  expect(normalizeSettings({quality:'ultra',camera:'wild',textSize:7,highlightMine:'yes'})).toEqual(defaultSettings());
 });
});

describe('LAN host addresses',()=>{
 it('accepts what players type and adds the default port and path',()=>{
  expect(socketUrlFromHost('192.168.1.5')).toBe('ws://192.168.1.5:3001/ws');
  expect(socketUrlFromHost(' 192.168.1.5:3002 ')).toBe('ws://192.168.1.5:3002/ws');
  expect(socketUrlFromHost('http://10.0.0.4:3001')).toBe('ws://10.0.0.4:3001/ws');
  expect(socketUrlFromHost('ws://10.0.0.4:3001/ws')).toBe('ws://10.0.0.4:3001/ws');
  expect(socketUrlFromHost('https://game.example')).toBe('wss://game.example/ws');
 });
 it('rejects empty and malformed addresses with guidance',()=>{
  expect(()=>socketUrlFromHost('')).toThrow(/address/);expect(()=>socketUrlFromHost('ftp://x')).toThrow();expect(()=>socketUrlFromHost('http://')).toThrow();
 });
 it('shows a short label',()=>{expect(hostLabel('ws://192.168.1.5:3001/ws')).toBe('192.168.1.5:3001');});
});
