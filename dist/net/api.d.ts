import { ApiBase } from './apiBase';
import { HttpChannel } from './httpChannel';
export declare function logoutApis(): void;
export declare class Api extends ApiBase {
    private apiName;
    constructor(path: string, apiName: string, showWaiting?: boolean);
    protected getHttpChannel(): Promise<HttpChannel>;
}