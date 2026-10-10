/** LAN host addresses typed by players: "192.168.1.5", "192.168.1.5:3002", "http://…", or a full ws:// URL. */
export const DEFAULT_LAN_PORT=3001;

export function socketUrlFromHost(input:string):string{
 const raw=input.trim();
 if(!raw)throw new Error('Enter the host computer’s address, for example 192.168.1.5');
 let url:URL;
 try{url=new URL(/^[a-z]+:\/\//i.test(raw)?raw:`ws://${raw}`);}catch{throw new Error('That address is not valid. Use the address printed by the host, such as 192.168.1.5:3001');}
 if(url.protocol==='http:')url.protocol='ws:';
 else if(url.protocol==='https:')url.protocol='wss:';
 if(!['ws:','wss:'].includes(url.protocol))throw new Error('Use a ws://, wss:// or plain host address');
 if(!url.hostname)throw new Error('Enter the host computer’s address');
 if(!url.port&&url.protocol==='ws:')url.port=String(DEFAULT_LAN_PORT);
 if(url.pathname==='/'||url.pathname==='')url.pathname='/ws';
 url.search='';url.hash='';
 return url.toString();
}

/** Short form shown to players, e.g. "192.168.1.5:3001". */
export function hostLabel(socketUrl:string){try{const url=new URL(socketUrl);return url.port?`${url.hostname}:${url.port}`:url.hostname;}catch{return socketUrl;}}

const KEY='empire-lan-host';
export function rememberedHost(){try{return localStorage.getItem(KEY)??'';}catch{return'';}}
export function rememberHost(value:string){try{localStorage.setItem(KEY,value);}catch{/* private mode: nothing to remember */}}
