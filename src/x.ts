import * as _ from 'lodash';

interface ResX {
    district: string;
    lang: string;
    res: any;
    x: object;
}

const arr:ResX[] = [];

export function x(res:any) {
    let func = function() {};
    let pt = func.prototype;
    let ret = new func();
    arr.push({
        district: undefined,
        lang: undefined,
        res: res,
        x: ret,
    });
    return ret;
}

export function setXLang(lang:string, district:string) {
    for (let rx of arr) {
        rx.lang = lang;
        rx.district = district;
        let r = rx.res;
        if (r === undefined) continue;
        let r$ = r.$;
        if (r$ !== undefined) mergeProps(rx.x, r$);
        let l = r[lang];
        if (l === undefined) continue;
        let l$ = l.$;
        if (l$ !== undefined) mergeProps(rx.x, l$);
        let d = l[district];
        if (d === undefined) continue;
        let d$ = d.$;
        if (d$ !== undefined) mergeProps(rx.x, d$);
    }
}

function mergeProps(to, src) {
    let prototype = buildPrototype(src);
    Object.setPrototypeOf(to, prototype);
}

function buildPrototype(src) {
    if (typeof src !== 'object') return src;
    let pt = {};
    for (let i in src) {
        let obj = buildPrototype(src[i]);
        Object.defineProperty(pt, i, {
            enumerable: true,
            get: function() {
                if (typeof obj === 'function') return obj();
                return obj;
            }
        });
    }
    return pt;
}

const zero = '00000000000000';
export function left0(num:number, fix:number) {
    if (num === undefined) return '';
    let r = num.toString();
    let len = fix - r.length;
    if (len <= 0) return r;
    return zero.substr(0, len) + r;
}