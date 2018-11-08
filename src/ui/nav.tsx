import * as React from 'react';
import {observable} from 'mobx';
import {fetchLocalCheck} from '../net/fetchLocalCheck';
import {User, decodeToken} from '../user';
import {Page} from './page';
import {netToken} from '../net/netToken';
import FetchErrorView from './fetchErrorView';
import {FetchError} from '../fetchError';
import {appUrl, setMeInFrame, isBridged, logoutUsqTokens} from '../net/appBridge';
import {LocalData} from '../local';
import {logoutApis, setCenterUrl, setCenterToken, WSChannel, getCenterUrl, centerDebugHost} from '../net';
import 'font-awesome/css/font-awesome.min.css';
import '../css/va.css';
import '../css/animation.css';
import { WsBase, wsBridge } from '../net/wsChannel';
import { uid } from '../uid';

const regEx = new RegExp('Android|webOS|iPhone|iPad|' +
    'BlackBerry|Windows Phone|'  +
    'Opera Mini|IEMobile|Mobile' , 
    'i');
const isMobile = regEx.test(navigator.userAgent);
export const mobileHeaderStyle = isMobile? {
    minHeight:  '3em'
} : undefined;

const logo = require('../img/logo.svg');
const logs:string[] = [];

export interface Props //extends React.Props<Nav>
{
    //view: JSX.Element | (()=>JSX.Element);
    start?: ()=>Promise<void>;
    onLogined: ()=>Promise<void>;
    notLogined?: ()=>Promise<void>;
};
let stackKey = 1;
export interface StackItem {
    key: number;
    view: JSX.Element;
    ceased: boolean;
    confirmClose?: ()=>Promise<boolean>;
    disposer?: ()=>void;
}
export interface State {
    stack: StackItem[];
    wait: 0|1|2;
    fetchError: FetchError
}

//let ws:WSChannel;
export class NavView extends React.Component<Props, State> {
    private stack: StackItem[];
    private htmlTitle: string;
    private waitCount: number = 0;
    private waitTimeHandler?: NodeJS.Timer;

    constructor(props) {
        super(props);
        this.back = this.back.bind(this);
        this.navBack = this.navBack.bind(this);
        this.stack = [];
        this.state = {
            stack: this.stack,
            wait: 0,
            fetchError: undefined
        };
    }
    async componentWillMount() {
        window.addEventListener('popstate', this.navBack);
    }

    async componentDidMount()
    {
        nav.set(this);
        let start = this.props.start;
        if (start !== undefined) {
            await start();
        }
        else {
            await nav.start();
        }
    }

    get level(): number {
        return this.stack.length;
    }

    startWait() {
        if (this.waitCount === 0) {
            this.setState({wait: 1});
            this.waitTimeHandler = global.setTimeout(
                () => {
                    this.waitTimeHandler = undefined;
                    this.setState({wait: 2});
                },
                1000) as NodeJS.Timer;
        }
        ++this.waitCount;
        this.setState({
            fetchError: undefined,
        });
    }

    endWait() {
        setTimeout(() => {
            /*
            this.setState({
                fetchError: undefined,
            });*/
            --this.waitCount;
            if (this.waitCount === 0) {
                if (this.waitTimeHandler !== undefined) {
                    clearTimeout(this.waitTimeHandler);
                    this.waitTimeHandler = undefined;
                }
                this.setState({wait: 0});
            }
        },100);
    }

    async onError(fetchError: FetchError)
    {
        let err = fetchError.error;
        if (err !== undefined && err.unauthorized === true) {
            await nav.showLogin();
            return;
        }
        this.setState({
            fetchError: fetchError,
        });
    }

    show(view: JSX.Element, disposer?: ()=>void): void {
        this.clear();
        this.push(view, disposer);
    }

    push(view: JSX.Element, disposer?: ()=>void): void {
        this.removeCeased();
        if (this.stack.length > 0) {
            window.history.pushState('forward', null, null);
        }
        this.stack.push({
            key: stackKey++, 
            view: view, 
            ceased: false,
            disposer: disposer
        });
        this.refresh();
        //console.log('push: %s pages', this.stack.length);
    }

    replace(view: JSX.Element, disposer?: ()=>void): void {
        let item:StackItem = undefined;
        let stack = this.stack;
        if (stack.length > 0) {
            item = stack.pop();
            //this.popAndDispose();
        }
        this.stack.push({
            key: stackKey++, 
            view: view, 
            ceased: false,
            disposer: disposer
        });
        if (item !== undefined) this.dispose(item.disposer);
        this.refresh();
        //console.log('replace: %s pages', this.stack.length);
    }

    ceaseTop(level:number = 1) {
        let p = this.stack.length - 1;
        for (let i=0; i<level; i++, p--) {
            if (p < 0) break;
            let item = this.stack[p];
            item.ceased = true;
            
        }
    }

    pop(level:number = 1) {
        let stack = this.stack;
        let len = stack.length;
        //console.log('pop start: %s pages level=%s', len, level);
        if (level <= 0 || len <= 1) return;
        if (len < level) level = len;
        let backLevel = 0;
        for (let i = 0; i < level; i++) {
            if (stack.length === 0) break;
            //stack.pop();
            this.popAndDispose();
            ++backLevel;
        }
        if (backLevel >= len) backLevel--;
        this.refresh();
        if (this.isHistoryBack !== true) {
            //window.removeEventListener('popstate', this.navBack);
            //window.history.back(backLevel);
            //window.addEventListener('popstate', this.navBack);
        }
        //console.log('pop: %s pages', stack.length);
    }

    removeCeased() {
        for (;;) {
            let p=this.stack.length-1;
            if (p < 0) break;
            let top = this.stack[p];
            if (top.ceased === false) break;
            let item = this.stack.pop();
            let {disposer} = item;
            this.dispose(disposer);
        }
        this.refresh();
    }

    private popAndDispose() {
        this.removeCeased();
        let item = this.stack.pop();
        if (item === undefined) return;
        let {disposer} = item;
        this.dispose(disposer);
        this.removeCeased();
        return item;
    }

    private dispose(disposer:()=>void) {
        if (disposer === undefined) return;
        let item = this.stack.find(v => v.disposer === disposer);
        if (item === undefined) disposer();
    }

    clear() {
        let len = this.stack.length;
        while (this.stack.length > 0) this.popAndDispose();
        this.refresh();
        if (len > 1) {
            //window.removeEventListener('popstate', this.navBack);
            //window.history.back(len-1);
            //window.addEventListener('popstate', this.navBack);
        }
    }

    regConfirmClose(confirmClose:()=>Promise<boolean>) {
        let stack = this.stack;
        let len = stack.length;
        if (len === 0) return;
        let top = stack[len-1];
        top.confirmClose = confirmClose;
    }

    private isHistoryBack:boolean = false;
    navBack() {
        nav.log('backbutton pressed - nav level: ' + this.stack.length);
        this.isHistoryBack = true;
        this.back(true);
        this.isHistoryBack = false;
    }

    async back(confirm:boolean = true) {
        let stack = this.stack;
        let len = stack.length;
        if (len === 0) return;
        if (len === 1) {
            if (self != window.top) {
                window.top.postMessage({type:'pop-app'}, '*');
            }
            return;
        }
        let top = stack[len-1];
        if (confirm===true && top.confirmClose) {
            if (await top.confirmClose()===true) this.pop();
        }
        else {
            this.pop();
        }
    }

    confirmBox(message?:string): boolean {
        return window.confirm(message);
    }
    clearError = () => {
        this.setState({fetchError: undefined});
    }
    render() {
        const {wait, fetchError} = this.state;
        let stack = this.state.stack;
        let top = stack.length - 1;
        let elWait = null, elError = null;
        switch (wait) {
            case 1:
                elWait = <li className="va-wait va-wait1">
                </li>;
                break;
            case 2:
                elWait = <li className="va-wait va-wait2">
                    <i className="fa fa-spinner fa-spin fa-3x fa-fw"></i>
                    <span className="sr-only">Loading...</span>
                </li>;
                break;
        }
        if (fetchError)
            elError = <FetchErrorView clearError={this.clearError} {...fetchError} />
        return (
        <ul className='va'>
            {
                stack.map((item, index) => {
                    let {key, view} = item;
                    return <li key={key} style={index<top? {visibility: 'hidden'}:undefined}>
                        {view}
                    </li>
                })
            }
            {elWait}
            {elError}
        </ul>
        );
    }

    private refresh() {
        // this.setState({flag: !this.state.flag});
        this.setState({stack: this.stack });
        // this.forceUpdate();
    }
}

interface UrlAndWs {
    url: string;
    ws: string;
}

function centerUrlAndWs():UrlAndWs {
    let host = 'REACT_APP_CENTER_HOST';
    let centerHost = process.env[host];
    if (centerHost === undefined) return {url:undefined, ws:undefined};
    return {
        url: 'http://' + centerHost + '/',
        ws: 'ws://' + centerHost + '/tv/',
    }
}

function centerDebugUrlAndWs():UrlAndWs {
    let centerHost = process.env.REACT_APP_CENTER_DEBUG_HOST || centerDebugHost;
    return {
        url: 'http://' + centerHost + ':3000/',
        ws: 'ws://' + centerHost + ':3000/tv/',
    }
}

async function loadCenterUrl():Promise<{url:string, ws:string}> {
    let urlAndWs:UrlAndWs = centerUrlAndWs();
    let debugUrlAndWs:UrlAndWs = centerDebugUrlAndWs();
    let hash = document.location.hash;
    if (hash.includes('sheet_debug') === true) {
        return debugUrlAndWs;
    }
    if (process.env.NODE_ENV==='development') {
        if (debugUrlAndWs.url !== undefined) {
            try {
                console.log('try connect debug url');
                //let ret = await fetch(debugUrlAndWs.url);
                let ret = await fetchLocalCheck(debugUrlAndWs.url);
                console.log('connected');
                return debugUrlAndWs;
            }
            catch (err) {
                //console.error(err);
            }
        }
    }
    return urlAndWs;
}

export class Nav {
    private nav:NavView;
    //private loginView: JSX.Element;
    private ws: WsBase;
    private wsHost: string;
    local: LocalData = new LocalData();
    @observable user: User = undefined; // = {id:undefined, name:undefined, token:undefined};
    language: string;
    culture: string;

    constructor() {
        let language = navigator.languages && navigator.languages[0] || // Chrome / Firefox
               navigator.language; // ||   // All browsers
               //navigator.userLanguage; // IE <= 10
        if (!language) {
            this.language = 'zh';
            this.culture = 'CN';
        }
        let parts = language.split('-');
        this.language = parts[0];
        if (parts.length > 1) this.culture = parts[1];
    }
    
    set(nav:NavView) {
        //this.logo = logo;
        this.nav = nav;
    }

    registerReceiveHandler(handler: (message:any)=>Promise<void>):number {
        if (this.ws === undefined) return;
        return this.ws.onWsReceiveAny(handler);
    }

    unregisterReceiveHandler(handlerId:number) {
        if (this.ws === undefined) return;
        if (handlerId === undefined) return;
        this.ws.endWsReceive(handlerId);
    }

    private isInFrame:boolean;
    async start() {
        nav.push(<Page header={false}>
            <div style={{height:'100%'}} className="d-flex flex-fill align-items-center justify-content-center">
            <div className="d-flex align-items-center justify-content-center slide text-info" style={{width:'5em', height:'2em'}}>
                加载中...
            </div>
            </div>
        </Page>);

        let {url, ws} = await loadCenterUrl();
        setCenterUrl(url);
        this.wsHost = ws;

        let hash = document.location.hash;
        // document.title = document.location.origin;
        console.log("url=%s hash=%s", document.location.origin, hash);
        this.isInFrame = hash !== undefined && hash !== '' && hash.startsWith('#tv');
        if (this.isInFrame === true) {
            let mif = setMeInFrame(hash);
            if (mif !== undefined) {
                this.ws = wsBridge;
                console.log('this.ws = wsBridge in sub frame');
                //nav.user = {id:0} as User;
                if (self !== window.parent) {
                    window.parent.postMessage({type:'sub-frame-started', hash: mif.hash}, '*');
                }
                // 下面这一句，已经移到 appBridge.ts 里面的 initSubWin，也就是响应从main frame获得user之后开始。
                //await this.showAppView();
                return;
            }
        }
        let device: string = this.local.device.get();
        let user: User = this.local.user.get();
        if (device === undefined) {
            device = uid();
            this.local.device.set(device);
            user = undefined;
        }
        if (user === undefined || user.device !== device) {
            let {notLogined} = this.nav.props;
            if (notLogined !== undefined) {
                await notLogined();
            }
            else {
                await nav.showLogin();
            }
            return;
        }

        await nav.logined(user);
    }

    async showAppView() {
        let {onLogined} = this.nav.props;
        if (onLogined === undefined) {
            nav.push(<div>NavView has no prop onLogined</div>);
            return;
        }
        await onLogined();
        console.log('logined: AppView shown');
    }

    async logined(user: User) {
        let ws:WSChannel = this.ws = new WSChannel(this.wsHost, user.token);
        ws.connect();

        console.log("logined: %s", JSON.stringify(user));
        this.local.user.set(user);
        netToken.set(user.token);
        this.user = user;
        console.log('ws.connect() in app main frame');
        await this.showAppView();
    }

    async showLogin(withBack?:boolean) {
        //if (this.loginView === undefined) {
        let lv = await import('../entry/login');
        //this.loginView = <lv.default logo={logo} />;
        let loginView = <lv.default withBack={withBack} />;
        //}
        if (withBack !== true) {
            this.nav.clear();
            this.pop();
        }
        //this.nav.show(loginView);
        this.nav.push(loginView);
    }

    async logout(notShowLogin?:boolean) {
        this.local.logoutClear();
        this.user = undefined; //{} as User;
        logoutApis();
        logoutUsqTokens();
        setCenterToken(undefined);
        this.ws = undefined;
        if (notShowLogin === true) return;
        await this.showLogin();
    }

    get level(): number {
        return this.nav.level;
    }
    startWait() {
        this.nav.startWait();
    }
    endWait() {
        this.nav.endWait();
    }
    async onError(error: FetchError) {
        await this.nav.onError(error);
    }
    show (view: JSX.Element, disposer?: ()=>void): void {
        this.nav.show(view, disposer);
    }
    push(view: JSX.Element, disposer?: ()=>void): void {
        this.nav.push(view, disposer);
    }
    replace(view: JSX.Element, disposer?: ()=>void): void {
        this.nav.replace(view, disposer);
    }
    pop(level:number = 1) {
        this.nav.pop(level);
    }
    clear() {
        this.nav.clear();
    }
    navBack() {
        this.nav.navBack();
    }
    ceaseTop(level?:number) {
        this.nav.ceaseTop(level);
    }
    removeCeased() {
        this.nav.removeCeased();
    }
    async back(confirm:boolean = true) {
        await this.nav.back(confirm);
    }
    regConfirmClose(confirmClose: ()=>Promise<boolean>) {
        this.nav.regConfirmClose(confirmClose);
    }
    confirmBox(message?:string): boolean {
        return this.nav.confirmBox(message);
    }
    navToApp(url: string, unitId: number, apiId?:number, sheetType?:number, sheetId?:number) {
        let centerUrl = getCenterUrl();
        let sheet = centerUrl.includes('http://localhost:') === true? 'sheet_debug':'sheet'
        let uh = sheetId === undefined?
                appUrl(url, unitId) :
                appUrl(url, unitId, sheet, [apiId, sheetType, sheetId]);
        console.log('navToApp: %s', JSON.stringify(uh));
        nav.push(<article className='app-container'>
            <span id={uh.hash} onClick={()=>this.back()} style={mobileHeaderStyle}>
                <i className="fa fa-arrow-left" />
            </span>
            <iframe src={uh.url} />
        </article>);
    }

    navToSite(url: string) {
        // show in new window
        window.open(url);
    }

    get logs() {return logs};
    log(msg:string) {
        logs.push(msg);
    } 
}
export const nav: Nav = new Nav();
