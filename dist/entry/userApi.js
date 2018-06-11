var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { CenterApi } from '../net';
import { decodeToken } from '../user';
export class UserApi extends CenterApi {
    login(params) {
        return __awaiter(this, void 0, void 0, function* () {
            let ret = yield this.get('login', params);
            /*
            .then((token?:string) => {
                    if (token !== undefined) return decodeToken(token);
                });
            */
            debugger;
            switch (typeof ret) {
                default: return;
                case 'string': return decodeToken(ret);
                case 'object':
                    let token = ret.token;
                    let user = decodeToken(token);
                    let { nick, icon } = ret;
                    if (nick)
                        user.nick = nick;
                    if (icon)
                        user.icon = icon;
                    return user;
            }
            // !== undefined) return decodeToken(token);
        });
    }
    register(params) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.post('register', params);
        });
    }
}
const userApi = new UserApi('tv/user/', undefined);
export default userApi;
//# sourceMappingURL=userApi.js.map