import { User, Guest } from './user';
export declare const isDevelopment: boolean;
export interface ClearableData {
    clear(): void;
}
export declare class Data<T> implements ClearableData {
    private name;
    private value?;
    constructor(name: string);
    get(): T;
    set(value: T): void;
    clear(): void;
}
export declare class LocalData {
    user: Data<User>;
    guest: Data<Guest>;
    homeTabCur: Data<number>;
    logoutClear(): void;
}
