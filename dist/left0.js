const zero = '00000000000000';
export function left0(num, fix) {
    if (num === undefined)
        return '';
    let r = num.toString();
    let len = fix - r.length;
    if (len <= 0)
        return r;
    return zero.substr(0, len) + r;
}
//# sourceMappingURL=left0.js.map